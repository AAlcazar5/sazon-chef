// backend/prisma/seed-behavioral-data.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedBehavioralData() {
  console.log('🌱 Starting behavioral data seeding...');
  
  try {
    const userId = 'temp-user-id';
    
    // Get some recipes to create behavioral data for
    const recipes = await prisma.recipe.findMany({
      where: { isUserCreated: false },
      take: 5
    });
    
    if (recipes.length === 0) {
      console.log('❌ No recipes found to create behavioral data for');
      return;
    }
    
    console.log(`📊 Found ${recipes.length} recipes to create behavioral data for`);
    
    // Create some liked recipes
    await prisma.recipeFeedback.createMany({
      data: [
        {
          userId,
          recipeId: recipes[0].id,
          liked: true,
          disliked: false
        },
        {
          userId,
          recipeId: recipes[1].id,
          liked: true,
          disliked: false
        }
      ]
    });
    
    console.log('✅ Created liked recipe feedback');
    
    // Create some saved recipes
    await prisma.savedRecipe.createMany({
      data: [
        {
          userId,
          recipeId: recipes[0].id,
          savedDate: new Date()
        },
        {
          userId,
          recipeId: recipes[2].id,
          savedDate: new Date()
        }
      ]
    });
    
    console.log('✅ Created saved recipes');
    
    // Create some meal history (consumed recipes)
    await prisma.mealHistory.createMany({
      data: [
        {
          userId,
          recipeId: recipes[0].id,
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          consumed: true,
          feedback: 'Liked'
        },
        {
          userId,
          recipeId: recipes[1].id,
          date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          consumed: true,
          feedback: 'Liked'
        },
        {
          userId,
          recipeId: recipes[3].id,
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          consumed: true,
          feedback: 'Disliked'
        }
      ]
    });
    
    console.log('✅ Created meal history');
    
    console.log('🎉 Successfully seeded behavioral data!');
    console.log('📊 User now has:');
    console.log('   - 2 liked recipes');
    console.log('   - 2 saved recipes');
    console.log('   - 3 consumed meals (2 liked, 1 disliked)');
    
  } catch (error) {
    console.error('❌ Error seeding behavioral data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
if (require.main === module) {
  seedBehavioralData()
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { seedBehavioralData };
