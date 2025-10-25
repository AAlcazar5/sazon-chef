// backend/debug-scoring.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugScoring() {
  console.log('🔍 Debugging scoring system...');
  
  try {
    const userId = 'temp-user-id';
    
    // Check if behavioral data exists
    const feedback = await prisma.recipeFeedback.findMany({
      where: { userId },
      include: { recipe: true }
    });
    
    console.log(`📊 Recipe feedback records: ${feedback.length}`);
    feedback.forEach(f => {
      console.log(`  - ${f.recipe.title}: liked=${f.liked}, disliked=${f.disliked}`);
    });
    
    // Check saved recipes
    const saved = await prisma.savedRecipe.findMany({
      where: { userId },
      include: { recipe: true }
    });
    
    console.log(`💾 Saved recipes: ${saved.length}`);
    saved.forEach(s => {
      console.log(`  - ${s.recipe.title} (saved: ${s.savedDate})`);
    });
    
    // Check meal history
    const meals = await prisma.mealHistory.findMany({
      where: { userId },
      include: { recipe: true }
    });
    
    console.log(`🍽️ Meal history: ${meals.length}`);
    meals.forEach(m => {
      console.log(`  - ${m.recipe.title} (${m.date}): ${m.feedback}`);
    });
    
    // Test behavioral scoring function
    const { calculateBehavioralScore } = require('./dist/utils/behavioralScoring');
    
    const userBehavior = {
      likedRecipes: feedback.filter(f => f.liked).map(f => ({
        recipeId: f.recipeId,
        cuisine: f.recipe.cuisine,
        cookTime: f.recipe.cookTime,
        calories: f.recipe.calories,
        protein: f.recipe.protein,
        carbs: f.recipe.carbs,
        fat: f.recipe.fat,
        ingredients: f.recipe.ingredients,
        createdAt: f.createdAt
      })),
      dislikedRecipes: feedback.filter(f => f.disliked).map(f => ({
        recipeId: f.recipeId,
        cuisine: f.recipe.cuisine,
        cookTime: f.recipe.cookTime,
        calories: f.recipe.calories,
        protein: f.recipe.protein,
        carbs: f.recipe.carbs,
        fat: f.recipe.fat,
        ingredients: f.recipe.ingredients,
        createdAt: f.createdAt
      })),
      savedRecipes: saved.map(s => ({
        recipeId: s.recipeId,
        cuisine: s.recipe.cuisine,
        cookTime: s.recipe.cookTime,
        calories: s.recipe.calories,
        protein: s.recipe.protein,
        carbs: s.recipe.carbs,
        fat: s.recipe.fat,
        ingredients: s.recipe.ingredients,
        savedDate: s.savedDate
      })),
      consumedRecipes: meals.map(m => ({
        recipeId: m.recipeId,
        cuisine: m.recipe.cuisine,
        cookTime: m.recipe.cookTime,
        calories: m.recipe.calories,
        protein: m.recipe.protein,
        carbs: m.recipe.carbs,
        fat: m.recipe.fat,
        ingredients: m.recipe.ingredients,
        date: m.date
      }))
    };
    
    console.log('\n🧪 Testing behavioral scoring...');
    console.log(`User behavior: ${userBehavior.likedRecipes.length} liked, ${userBehavior.dislikedRecipes.length} disliked, ${userBehavior.savedRecipes.length} saved, ${userBehavior.consumedRecipes.length} consumed`);
    
    // Test with a sample recipe
    const testRecipe = {
      id: 'test',
      title: 'Test Recipe',
      cuisine: 'American',
      cookTime: 20,
      calories: 400,
      protein: 25,
      carbs: 30,
      fat: 15,
      ingredients: [{ text: 'test ingredient' }]
    };
    
    const score = calculateBehavioralScore(testRecipe, userBehavior);
    console.log('🎯 Behavioral score result:', score);
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugScoring();
