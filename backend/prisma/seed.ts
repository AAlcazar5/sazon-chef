// backend/prisma/seed-one.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  console.log('🧹 Clearing existing data...');
  await prisma.recipeIngredient.deleteMany();
  await prisma.recipeInstruction.deleteMany();
  await prisma.savedRecipe.deleteMany();
  await prisma.recipeFeedback.deleteMany();
  await prisma.mealHistory.deleteMany();
  await prisma.recipe.deleteMany();
  
  // Clear user data
  await prisma.bannedIngredient.deleteMany();
  await prisma.likedCuisine.deleteMany();
  await prisma.dietaryRestriction.deleteMany();
  await prisma.userPreferences.deleteMany();
  await prisma.macroGoals.deleteMany();
  await prisma.user.deleteMany();

  // Create test user with preferences
  console.log('👤 Creating test user...');
  const user = await prisma.user.create({
    data: {
      id: 'temp-user-id', // Match the ID used in controllers
      email: 'test@sazonchef.com',
      name: 'Test User',
      preferences: {
        create: {
          cookTimePreference: 30,
          spiceLevel: 'medium',
          bannedIngredients: {
            create: [
              { name: 'mushrooms' },
              { name: 'cilantro' }
            ]
          },
          likedCuisines: {
            create: [
              { name: 'Mediterranean' },
              { name: 'Asian' },
              { name: 'Mexican' }
            ]
          },
          dietaryRestrictions: {
            create: []
          }
        }
      },
      macroGoals: {
        create: {
          calories: 2000,
          protein: 150,
          carbs: 200,
          fat: 65
        }
      }
    }
  });
  console.log('✅ User created:', user.email);

  // Create ONE simple recipe
  console.log('🍳 Creating one simple recipe...');

  const recipe = await prisma.recipe.create({
    data: {
      title: 'Simple Greek Chicken Bowl',
      description: 'Easy grilled chicken with quinoa and vegetables',
      cookTime: 25,
      cuisine: 'Mediterranean',
      calories: 380,
      protein: 35,
      carbs: 30,
      fat: 15,
      ingredients: {
        create: [
          { text: '2 chicken breasts', order: 1 },
          { text: '1 cup quinoa', order: 2 },
          { text: '1 cucumber', order: 3 }
        ]
      },
      instructions: {
        create: [
          { text: 'Grill chicken until cooked through', step: 1 },
          { text: 'Cook quinoa according to package instructions', step: 2 },
          { text: 'Chop vegetables and assemble bowl', step: 3 }
        ]
      }
    },
  });
  console.log('✅ Recipe created:', recipe.title);
  console.log('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });