// backend/prisma/seed-random-likes.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedRandomLikes() {
  console.log('🎲 Starting random recipe likes seeding...');
  
  try {
    const userId = 'temp-user-id';
    
    // Clear existing behavioral data
    await prisma.recipeFeedback.deleteMany({ where: { userId } });
    await prisma.savedRecipe.deleteMany({ where: { userId } });
    await prisma.mealHistory.deleteMany({ where: { userId } });
    console.log('🧹 Cleared existing behavioral data');
    
    // Get all recipes
    const recipes = await prisma.recipe.findMany({
      where: { isUserCreated: false }
    });
    
    if (recipes.length === 0) {
      console.log('❌ No recipes found to like');
      return;
    }
    
    console.log(`📊 Found ${recipes.length} recipes to randomly like`);
    
    // Randomly select 3-5 recipes to like
    const numToLike = Math.floor(Math.random() * 3) + 3; // 3-5 recipes
    const shuffled = recipes.sort(() => 0.5 - Math.random());
    const recipesToLike = shuffled.slice(0, numToLike);
    
    console.log(`🎯 Randomly liking ${recipesToLike.length} recipes:`);
    
    // Create likes for selected recipes
    for (const recipe of recipesToLike) {
      await prisma.recipeFeedback.create({
        data: {
          userId,
          recipeId: recipe.id,
          liked: true,
          disliked: false
        }
      });
      console.log(`✅ Liked: ${recipe.title} (${recipe.cuisine})`);
    }
    
    // Also save 1-2 of the liked recipes
    const numToSave = Math.floor(Math.random() * 2) + 1; // 1-2 recipes
    const recipesToSave = recipesToLike.slice(0, numToSave);
    
    for (const recipe of recipesToSave) {
      await prisma.savedRecipe.create({
        data: {
          userId,
          recipeId: recipe.id,
          savedDate: new Date()
        }
      });
      console.log(`💾 Saved: ${recipe.title}`);
    }
    
    // Create some meal history (consumed meals)
    const numToConsume = Math.floor(Math.random() * 3) + 2; // 2-4 meals
    const recipesToConsume = recipesToLike.slice(0, numToConsume);
    
    for (let i = 0; i < recipesToConsume.length; i++) {
      const recipe = recipesToConsume[i];
      const daysAgo = Math.floor(Math.random() * 7) + 1; // 1-7 days ago
      const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      
      await prisma.mealHistory.create({
        data: {
          userId,
          recipeId: recipe.id,
          date,
          consumed: true,
          feedback: Math.random() > 0.2 ? 'Liked' : 'Disliked' // 80% liked, 20% disliked
        }
      });
      
      const feedback = Math.random() > 0.2 ? 'Liked' : 'Disliked';
      console.log(`🍽️ Consumed: ${recipe.title} (${daysAgo} days ago) - ${feedback}`);
    }
    
    console.log('🎉 Successfully seeded random recipe preferences!');
    console.log(`📊 User now has:`);
    console.log(`   - ${recipesToLike.length} liked recipes`);
    console.log(`   - ${recipesToSave.length} saved recipes`);
    console.log(`   - ${recipesToConsume.length} consumed meals`);
    
  } catch (error) {
    console.error('❌ Error seeding random likes:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
if (require.main === module) {
  seedRandomLikes()
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { seedRandomLikes };
