import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Target ~100 additional recipes across 12 cuisines (no external API)
const CUISINES: { name: string; count: number; words: string[] }[] = [
  { name: 'Indian', count: 12, words: ['Curry', 'Masala', 'Biryani', 'Paneer', 'Tikka'] },
  { name: 'Middle Eastern', count: 10, words: ['Shawarma', 'Kebab', 'Falafel', 'Hummus', 'Tabbouleh'] },
  { name: 'Latin American', count: 10, words: ['Arepa', 'Empanada', 'Ceviche', 'Tostada', 'Asado'] },
  { name: 'French', count: 8, words: ['Ratatouille', 'Quiche', 'Bouillabaisse', 'Coq au Vin', 'Salade'] },
  { name: 'Japanese', count: 10, words: ['Teriyaki', 'Ramen', 'Tempura', 'Sushi Bowl', 'Katsu'] },
  { name: 'Thai', count: 10, words: ['Pad Thai', 'Green Curry', 'Red Curry', 'Tom Yum', 'Basil Stir Fry'] },
  { name: 'Chinese', count: 10, words: ['Kung Pao', 'Fried Rice', 'Dumplings', 'Mapo Tofu', 'Chow Mein'] },
  { name: 'Italian', count: 8, words: ['Pasta', 'Risotto', 'Gnocchi', 'Panzanella', 'Piccata'] },
  { name: 'Mediterranean', count: 8, words: ['Greek Bowl', 'Quinoa Salad', 'Chicken Pita', 'Orzo Salad', 'Meze'] },
  { name: 'Mexican', count: 8, words: ['Tacos', 'Burrito Bowl', 'Enchiladas', 'Quesadilla', 'Fajitas'] },
  { name: 'Asian', count: 3, words: ['Stir Fry', 'Sesame Noodles', 'Rice Bowl', 'Satay', 'Coconut Curry'] },
  { name: 'American', count: 10, words: ['BBQ Bowl', 'Burger Bowl', 'Mac & Cheese', 'Chicken Salad', 'Chili'] },
]

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function makeTitle(cuisine: string, words: string[], i: number) {
  const w = words[i % words.length]
  // Ensure unique-ish titles by appending an index
  return `${cuisine} ${w} ${i + 1}`
}

function imageForCuisine(cuisine: string) {
  const q = encodeURIComponent(cuisine + ' food')
  return `https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop&auto=format&q=80&ixlib=rb-4.0.3&cuisine=${q}`
}

async function createIfNotExists(data: {
  title: string
  description: string
  cookTime: number
  cuisine: string
  calories: number
  protein: number
  carbs: number
  fat: number
  imageUrl: string
  ingredients: { text: string; order: number }[]
  instructions: { text: string; step: number }[]
}) {
  const exists = await prisma.recipe.findFirst({ where: { title: data.title } })
  if (exists) return false

  await prisma.recipe.create({
    data: {
      title: data.title,
      description: data.description,
      cookTime: data.cookTime,
      cuisine: data.cuisine,
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat,
      imageUrl: data.imageUrl,
      ingredients: { create: data.ingredients },
      instructions: { create: data.instructions },
      // Mark as system-provided, not user-created
      isUserCreated: false,
    },
  })
  return true
}

async function main() {
  console.log('🍽  Seeding local recipes (no external API)...')

  let totalAdded = 0

  for (const c of CUISINES) {
    let added = 0
    for (let i = 0; i < c.count; i++) {
      const title = makeTitle(c.name, c.words, i)

      const cookTime = randInt(15, 60)
      const calories = randInt(300, 700)
      const protein = randInt(15, 40)
      const carbs = randInt(20, 70)
      const fat = randInt(8, 30)

      const ok = await createIfNotExists({
        title,
        description: `A tasty ${c.name} dish: ${title}. Quick to prepare and packed with flavor.`,
        cookTime,
        cuisine: c.name,
        calories,
        protein,
        carbs,
        fat,
        imageUrl: imageForCuisine(c.name),
        ingredients: [
          { text: '1 tbsp olive oil', order: 1 },
          { text: '2 cloves garlic, minced', order: 2 },
          { text: '2 cups mixed vegetables', order: 3 },
          { text: '1 lb protein of choice', order: 4 },
          { text: 'Salt and pepper to taste', order: 5 },
        ],
        instructions: [
          { text: 'Prep the ingredients and heat the pan.', step: 1 },
          { text: 'Cook protein until done; add vegetables and aromatics.', step: 2 },
          { text: 'Season and simmer until flavors combine.', step: 3 },
          { text: 'Serve hot and enjoy.', step: 4 },
        ],
      })

      if (ok) {
        added++
        totalAdded++
      }
    }
    console.log(`   ✅ Added ${added}/${c.count} ${c.name} recipes`)
  }

  console.log(`\n🎉 Local recipe seeding complete! Added ${totalAdded} recipes.`)

  const stats = await prisma.recipe.groupBy({ by: ['cuisine'], _count: { _all: true } })
  console.log('\n📊 Database by cuisine:')
  for (const row of stats) {
    // @ts-ignore - _count shape depends on Prisma version
    console.log(`   ${row.cuisine}: ${row._count._all}`)
  }

  const total = await prisma.recipe.count()
  console.log(`\n📈 Total recipes: ${total}`)
}

main()
  .catch((e) => {
    console.error('❌ Local seed error:', e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
