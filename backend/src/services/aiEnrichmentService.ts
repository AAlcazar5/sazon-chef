import axios from 'axios'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function safeParseJSON(text: string) {
  try {
    return JSON.parse(text)
  } catch {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start !== -1 && end !== -1 && end > start) {
      try { return JSON.parse(text.slice(start, end + 1)) } catch {}
    }
    return null
  }
}

export const aiEnrichmentService = {
  isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY
  },

  async enrichRecipeData(recipe: any) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return null

    const url = 'https://api.openai.com/v1/chat/completions'
    const model = 'gpt-4o-mini'

    const recipeBrief = {
      title: recipe.title,
      description: recipe.description,
      cuisine: recipe.cuisine,
      cookTime: recipe.cookTime,
      calories: recipe.calories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fat: recipe.fat,
    }

    const messages = [
      {
        role: 'system',
        content: 'You are a culinary assistant returning ONLY strict JSON with numeric fields in valid ranges.'
      },
      {
        role: 'user',
        content: `Given this recipe summary: ${JSON.stringify(recipeBrief)}\nReturn ONLY JSON with keys: externalId, externalSource, qualityScore, popularityScore, healthScore, aggregateLikes, spoonacularScore, pricePerServing, sourceUrl, sourceName.\nRules: externalSource='openai', externalId='openai:' + a short slug from title. qualityScore, popularityScore, healthScore are integers 0-100. aggregateLikes integer 0-500. spoonacularScore integer 0-100. pricePerServing number in USD between 1 and 10. sourceUrl empty string. sourceName 'OpenAI'.`,
      },
    ]

    try {
      const resp = await axios.post(url, {
        model,
        messages,
        temperature: 0.2,
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        }
      })

      const text = resp.data?.choices?.[0]?.message?.content?.trim() || ''
      const data = safeParseJSON(text)
      if (!data) return null

      const cleaned = {
        externalId: String(data.externalId || `openai:${(recipeBrief.title || 'recipe').toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,32)}`),
        externalSource: 'openai',
        qualityScore: clamp(Number(data.qualityScore ?? 60), 0, 100),
        popularityScore: clamp(Number(data.popularityScore ?? 50), 0, 100),
        healthScore: clamp(Number(data.healthScore ?? 55), 0, 100),
        aggregateLikes: Math.max(0, Math.min(500, parseInt(String(data.aggregateLikes ?? 50), 10) || 0)),
        spoonacularScore: data.spoonacularScore == null ? null : clamp(Number(data.spoonacularScore), 0, 100),
        pricePerServing: Number.isFinite(Number(data.pricePerServing)) ? Number(data.pricePerServing) : 3.5,
        sourceUrl: data.sourceUrl ? String(data.sourceUrl) : null,
        sourceName: 'OpenAI',
      }

      return cleaned
    } catch (e) {
      return null
    }
  },
}
