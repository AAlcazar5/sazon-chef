import axios from 'axios'

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)) }
function safeParseJSON(text: string) {
  try { return JSON.parse(text) } catch { const s=text.indexOf('{'); const e=text.lastIndexOf('}'); if(s!==-1&&e!==-1&&e>s){ try{return JSON.parse(text.slice(s,e+1))}catch{}} return null }
}

type GenerateOptions = {
  preferredCuisines?: string[]
  maxCookTime?: number
  macroGoals?: { calories: number; protein: number; carbs: number; fat: number }
}

type GeneratedRecipe = {
  title: string
  description: string
  cuisine: string
  cookTime: number
  calories: number
  protein: number
  carbs: number
  fat: number
  imageUrl?: string | null
  ingredients: { text: string }[]
  instructions: { text: string }[]
}

export const recipeGenerationService = {
  isConfigured(): boolean { return !!process.env.OPENAI_API_KEY },

  async generateRecipe(opts: GenerateOptions): Promise<GeneratedRecipe | null> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return null

    const url = 'https://api.openai.com/v1/chat/completions'
    const model = 'gpt-4o-mini'

    const constraints = {
      preferredCuisines: opts.preferredCuisines || [],
      maxCookTime: opts.maxCookTime || 40,
      macroGoals: opts.macroGoals || { calories: 500, protein: 30, carbs: 50, fat: 15 }
    }

    const schema = `Return ONLY strict JSON with keys: title, description, cuisine, cookTime, calories, protein, carbs, fat, imageUrl, ingredients, instructions.
- ingredients: array of objects {text}
- instructions: array of objects {text}
- cuisine must be one of: American, Asian, Chinese, French, Indian, Italian, Japanese, Latin American, Mediterranean, Mexican, Middle Eastern, Thai.
- cookTime integer minutes <= ${constraints.maxCookTime}
- macros as integers near calories=${constraints.macroGoals.calories}, protein=${constraints.macroGoals.protein}, carbs=${constraints.macroGoals.carbs}, fat=${constraints.macroGoals.fat}
- no markdown, no prose, JSON only.`

    const userPrompt = {
      preferredCuisines: constraints.preferredCuisines,
      macroGoals: constraints.macroGoals,
      maxCookTime: constraints.maxCookTime
    }

    const messages = [
      { role: 'system', content: 'You are a culinary assistant that produces valid compact JSON only.' },
      { role: 'user', content: `${schema}\n${JSON.stringify(userPrompt)}` }
    ]

    const resp = await axios.post(url, { model, messages, temperature: 0.4 }, { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } })
    const text = resp.data?.choices?.[0]?.message?.content?.trim() || ''
    const data = safeParseJSON(text)
    if (!data) return null

    const cooked: GeneratedRecipe = {
      title: String(data.title || 'AI Recipe'),
      description: String(data.description || 'Delicious AI-generated recipe'),
      cuisine: String(data.cuisine || (constraints.preferredCuisines[0] || 'American')),
      cookTime: clamp(parseInt(data.cookTime ?? 30, 10) || 30, 5, 120),
      calories: clamp(parseInt(data.calories ?? constraints.macroGoals.calories, 10) || 500, 100, 1200),
      protein: clamp(parseInt(data.protein ?? constraints.macroGoals.protein, 10) || 30, 0, 150),
      carbs: clamp(parseInt(data.carbs ?? constraints.macroGoals.carbs, 10) || 50, 0, 200),
      fat: clamp(parseInt(data.fat ?? constraints.macroGoals.fat, 10) || 15, 0, 100),
      imageUrl: data.imageUrl ? String(data.imageUrl) : null,
      ingredients: Array.isArray(data.ingredients) ? data.ingredients.map((x:any)=>({ text: String(x.text || x) })).slice(0,15) : [{ text: '1 tbsp olive oil' }, { text: 'Salt and pepper to taste' }],
      instructions: Array.isArray(data.instructions) ? data.instructions.map((x:any)=>({ text: String(x.text || x) })).slice(0,12) : [ { text: 'Prep ingredients.' }, { text: 'Cook and combine.' } ]
    }

    return cooked
  }
}
