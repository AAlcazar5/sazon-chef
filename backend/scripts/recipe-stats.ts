import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const total = await prisma.recipe.count()
  console.log(`\n📈 Total recipes: ${total}`)

  const byCuisine = await prisma.recipe.groupBy({
    by: ['cuisine'],
    _count: { _all: true },
    orderBy: { cuisine: 'asc' }
  })

  console.log('\n📊 Recipes by cuisine:')
  for (const row of byCuisine) {
    // @ts-ignore - _count shape depends on Prisma version
    console.log(`   ${row.cuisine}: ${row._count._all}`)
  }
}

main()
  .catch((e) => {
    console.error('❌ Stats error:', e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
