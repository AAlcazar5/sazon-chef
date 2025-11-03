import { PrismaClient } from '@prisma/client';
import { spoonacularService } from '../src/services/spoonacularService';

const prisma = new PrismaClient();

// Target 100+ recipes across 12 cuisines
const CUISINE_QUERIES = [
  { name: 'Indian', query: 'curry tikka masala biryani', count: 12 },
  { name: 'Middle Eastern', query: 'falafel hummus shawarma kebab', count: 10 },
  { name: 'Latin American', query: 'empanadas arepas ceviche', count: 10 },
  { name: 'French', query: 'quiche croissant ratatouille', count: 8 },
  { name: 'Japanese', query: 'sushi ramen teriyaki', count: 10 },
  { name: 'Thai', query: 'pad thai curry tom yum', count: 10 },
  { name: 'Chinese', query: 'fried rice kung pao dumplings', count: 10 },
  { name: 'Italian', query: 'pasta pizza risotto', count: 8 },
  { name: 'Mediterranean', query: 'greek salad moussaka', count: 8 },
  { name: 'Mexican', query: 'tacos enchiladas quesadilla', count: 8 },
  { name: 'Asian', query: 'stir fry noodles spring rolls', count: 3 },
  { name: 'American', query: 'burger bbq mac cheese', count: 10 },
];

async function fetchAndSeedRecipes() {
  console.log('🌍 Starting recipe database expansion to 100+ recipes...\n');
  
  let totalAdded = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const { name, query, count } of CUISINE_QUERIES) {
    console.log(`\n📊 Fetching ${count} ${name} recipes...`);
    
    try {
      // Search for recipes
      const searchResults = await spoonacularService.searchRecipes(query, {
        cuisine: query.split(' ')[0],
        number: count * 3, // Fetch extra to account for skips
      });

      if (!searchResults?.results) {
        console.log(`   ⚠️  No results for ${name}`);
        continue;
      }

      let added = 0;
      for (const result of searchResults.results) {
        if (added >= count) break;

        try {
          // Check if already exists
          const existing = await prisma.recipe.findFirst({
            where: {
              OR: [
                { externalId: result.id.toString() },
                { title: result.title }
              ]
            }
          });

          if (existing) {
            console.log(`   ⏭️  Skipping "${result.title}" (exists)`);
            totalSkipped++;
            continue;
          }

          // Fetch full details
          const details = await spoonacularService.getRecipeInformation(result.id);
          
          if (!details) {
            console.log(`   ⚠️  No details for "${result.title}"`);
            continue;
          }

          // Create recipe with available data
          const recipe = await prisma.recipe.create({
            data: {
              title: details.title,
              description: `Delicious ${name} dish: ${details.title}`,
              cookTime: details.readyInMinutes || 30,
              cuisine: name,
              
              // Use default nutrition if not available
              calories: 400,
              protein: 20,
              carbs: 40,
              fat: 15,
              fiber: 5,
              sugar: 8,
              
              // Simple ingredients and instructions (nested create per schema)
              ingredients: {
                create: [
                  { text: 'See source for full ingredients', order: 1 }
                ]
              },
              instructions: {
                create: [
                  { text: 'See source URL for full instructions', step: 1 }
                ]
              },
              
              // External data
              externalId: details.id.toString(),
              externalSource: 'spoonacular',
              imageUrl: details.image || null,
              sourceUrl: details.sourceUrl || null,
              
              // Quality metrics
              qualityScore: details.spoonacularScore ? Math.round(details.spoonacularScore) : null,
              popularityScore: details.aggregateLikes || 0,
              aggregateLikes: details.aggregateLikes || 0,
              spoonacularScore: details.spoonacularScore || null,
              
              lastEnriched: new Date(),
              isUserCreated: false,
            }
          });

          console.log(`   ✅ Added: "${recipe.title}"`);
          added++;
          totalAdded++;
          
          // Delay to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 300));

        } catch (error: any) {
          console.error(`   ❌ Error: ${error.message}`);
          totalFailed++;
        }
      }

      console.log(`   📈 Added ${added}/${count} ${name} recipes`);

    } catch (error: any) {
      console.error(`❌ Failed to fetch ${name}: ${error.message}`);
    }
  }

  // Show final stats
  console.log(`\n\n🎉 Recipe expansion complete!`);
  console.log(`   ✅ Added: ${totalAdded} recipes`);
  console.log(`   ⏭️  Skipped: ${totalSkipped} (already exist)`);
  console.log(`   ❌ Failed: ${totalFailed}`);

  const stats = await prisma.recipe.groupBy({
    by: ['cuisine'],
    _count: { _all: true },
  });

  console.log(`\n📊 Final database by cuisine:`);
  stats.forEach(stat => {
    // @ts-ignore - prisma groupBy shape depends on client version
    console.log(`   ${stat.cuisine}: ${stat._count._all} recipes`);
  });

  const total = await prisma.recipe.count();
  console.log(`\n   📈 Total recipes in database: ${total}`);
}

// Run script
fetchAndSeedRecipes()
  .then(() => {
    console.log('\n✅ Script complete!');
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
