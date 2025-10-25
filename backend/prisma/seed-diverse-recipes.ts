// backend/prisma/seed-diverse-recipes.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const diverseRecipes = [
  // Quick & Easy Recipes (High Enhanced Scores)
  {
    title: '5-Minute Avocado Toast',
    description: 'Quick and healthy breakfast option',
    cuisine: 'American',
    cookTime: 5,
    calories: 250,
    protein: 8,
    carbs: 25,
    fat: 12,
    fiber: 8,
    sugar: 3,
    imageUrl: 'https://example.com/avocado-toast.jpg',
    isUserCreated: false,
    ingredients: [
      { text: '2 slices whole grain bread', order: 1 },
      { text: '1 ripe avocado', order: 2 },
      { text: '1 tbsp olive oil', order: 3 },
      { text: 'Salt and pepper to taste', order: 4 },
      { text: 'Red pepper flakes (optional)', order: 5 }
    ],
    instructions: [
      { step: 1, text: 'Toast the bread slices until golden brown' },
      { step: 2, text: 'Mash the avocado with olive oil, salt, and pepper' },
      { step: 3, text: 'Spread the avocado mixture on toast' },
      { step: 4, text: 'Garnish with red pepper flakes if desired' }
    ]
  },
  {
    title: '10-Minute Greek Yogurt Parfait',
    description: 'Healthy and quick breakfast or snack',
    cuisine: 'Greek',
    cookTime: 10,
    calories: 200,
    protein: 15,
    carbs: 20,
    fat: 5,
    fiber: 3,
    sugar: 12,
    imageUrl: 'https://example.com/parfait.jpg',
    isUserCreated: false,
    ingredients: [
      { text: '1 cup Greek yogurt', order: 1 },
      { text: '1/2 cup mixed berries', order: 2 },
      { text: '2 tbsp granola', order: 3 },
      { text: '1 tbsp honey', order: 4 },
      { text: '1 tbsp chopped nuts', order: 5 }
    ],
    instructions: [
      { step: 1, text: 'Layer half the yogurt in a glass' },
      { step: 2, text: 'Add half the berries and granola' },
      { step: 3, text: 'Repeat the layers' },
      { step: 4, text: 'Drizzle with honey and top with nuts' }
    ]
  },

  // High-Protein Recipes (Good Macro Scores)
  {
    title: 'Grilled Salmon with Quinoa',
    description: 'High-protein, heart-healthy meal',
    cuisine: 'Mediterranean',
    cookTime: 25,
    calories: 450,
    protein: 35,
    carbs: 30,
    fat: 20,
    fiber: 4,
    sugar: 2,
    imageUrl: 'https://example.com/salmon-quinoa.jpg',
    isUserCreated: false,
    ingredients: [
      { text: '6 oz salmon fillet', order: 1 },
      { text: '1/2 cup quinoa', order: 2 },
      { text: '1 cup mixed vegetables', order: 3 },
      { text: '2 tbsp olive oil', order: 4 },
      { text: 'Lemon juice and herbs', order: 5 }
    ],
    instructions: [
      { step: 1, text: 'Cook quinoa according to package directions' },
      { step: 2, text: 'Season salmon with herbs and lemon' },
      { step: 3, text: 'Grill salmon for 4-5 minutes per side' },
      { step: 4, text: 'Serve over quinoa with steamed vegetables' }
    ]
  },
  {
    title: 'Chicken and Sweet Potato Bowl',
    description: 'Balanced macro meal with lean protein',
    cuisine: 'American',
    cookTime: 30,
    calories: 400,
    protein: 30,
    carbs: 35,
    fat: 15,
    fiber: 6,
    sugar: 8,
    imageUrl: 'https://example.com/chicken-bowl.jpg',
    isUserCreated: false,
    ingredients: [
      { text: '4 oz chicken breast', order: 1 },
      { text: '1 medium sweet potato', order: 2 },
      { text: '1 cup broccoli', order: 3 },
      { text: '1 tbsp olive oil', order: 4 },
      { text: 'Garlic and spices', order: 5 }
    ],
    instructions: [
      { step: 1, text: 'Dice sweet potato and roast for 20 minutes' },
      { step: 2, text: 'Season and cook chicken breast' },
      { step: 3, text: 'Steam broccoli until tender' },
      { step: 4, text: 'Combine all ingredients in a bowl' }
    ]
  },

  // Popular Cuisines (Better Behavioral Scores)
  {
    title: 'Authentic Italian Margherita Pizza',
    description: 'Classic Italian pizza with fresh ingredients',
    cuisine: 'Italian',
    cookTime: 15,
    calories: 300,
    protein: 12,
    carbs: 35,
    fat: 12,
    fiber: 2,
    sugar: 4,
    imageUrl: 'https://example.com/margherita.jpg',
    isUserCreated: false,
    ingredients: [
      { text: 'Pizza dough', order: 1 },
      { text: '1/2 cup tomato sauce', order: 2 },
      { text: '4 oz fresh mozzarella', order: 3 },
      { text: 'Fresh basil leaves', order: 4 },
      { text: '2 tbsp olive oil', order: 5 }
    ],
    instructions: [
      { step: 1, text: 'Preheat oven to 450°F' },
      { step: 2, text: 'Roll out pizza dough' },
      { step: 3, text: 'Spread tomato sauce and add mozzarella' },
      { step: 4, text: 'Bake for 12-15 minutes until golden' },
      { step: 5, text: 'Top with fresh basil and olive oil' }
    ]
  },
  {
    title: 'Japanese Teriyaki Chicken',
    description: 'Sweet and savory Japanese-style chicken',
    cuisine: 'Japanese',
    cookTime: 20,
    calories: 350,
    protein: 28,
    carbs: 25,
    fat: 15,
    fiber: 1,
    sugar: 18,
    imageUrl: 'https://example.com/teriyaki.jpg',
    isUserCreated: false,
    ingredients: [
      { text: '4 oz chicken thigh', order: 1 },
      { text: '3 tbsp teriyaki sauce', order: 2 },
      { text: '1 tbsp soy sauce', order: 3 },
      { text: '1 tsp sesame oil', order: 4 },
      { text: 'Sesame seeds and green onions', order: 5 }
    ],
    instructions: [
      { step: 1, text: 'Cut chicken into bite-sized pieces' },
      { step: 2, text: 'Cook chicken in sesame oil' },
      { step: 3, text: 'Add teriyaki and soy sauce' },
      { step: 4, text: 'Simmer until sauce thickens' },
      { step: 5, text: 'Garnish with sesame seeds and green onions' }
    ]
  },

  // Time-Specific Recipes (Better Temporal Scores)
  {
    title: 'Hearty Breakfast Scramble',
    description: 'Perfect morning meal with eggs and vegetables',
    cuisine: 'American',
    cookTime: 15,
    calories: 320,
    protein: 20,
    carbs: 15,
    fat: 20,
    fiber: 3,
    sugar: 5,
    imageUrl: 'https://example.com/scramble.jpg',
    isUserCreated: false,
    ingredients: [
      { text: '3 large eggs', order: 1 },
      { text: '1/4 cup diced bell peppers', order: 2 },
      { text: '1/4 cup diced onions', order: 3 },
      { text: '1/4 cup spinach', order: 4 },
      { text: '1 tbsp butter', order: 5 },
      { text: 'Salt and pepper', order: 6 }
    ],
    instructions: [
      { step: 1, text: 'Heat butter in a pan' },
      { step: 2, text: 'Sauté vegetables until tender' },
      { step: 3, text: 'Add eggs and scramble gently' },
      { step: 4, text: 'Season with salt and pepper' }
    ]
  },
  {
    title: 'Evening Pasta Primavera',
    description: 'Light dinner with seasonal vegetables',
    cuisine: 'Italian',
    cookTime: 25,
    calories: 380,
    protein: 15,
    carbs: 45,
    fat: 12,
    fiber: 6,
    sugar: 8,
    imageUrl: 'https://example.com/primavera.jpg',
    isUserCreated: false,
    ingredients: [
      { text: '8 oz whole wheat pasta', order: 1 },
      { text: '2 cups mixed vegetables', order: 2 },
      { text: '3 tbsp olive oil', order: 3 },
      { text: '2 cloves garlic', order: 4 },
      { text: 'Fresh herbs and parmesan', order: 5 }
    ],
    instructions: [
      { step: 1, text: 'Cook pasta according to package directions' },
      { step: 2, text: 'Sauté vegetables in olive oil' },
      { step: 3, text: 'Add garlic and herbs' },
      { step: 4, text: 'Toss with pasta and serve' }
    ]
  }
];

async function seedDiverseRecipes() {
  console.log('🌱 Starting diverse recipe seeding...');
  
  try {
    // Clear existing recipes (except user-created ones)
    await prisma.recipe.deleteMany({
      where: { isUserCreated: false }
    });
    
    console.log('🧹 Cleared existing system recipes');

    // Create diverse recipes
    for (const recipeData of diverseRecipes) {
      const { ingredients, instructions, ...recipe } = recipeData;
      
      const createdRecipe = await prisma.recipe.create({
        data: {
          ...recipe,
          userId: 'temp-user-id', // System recipes
          ingredients: {
            create: ingredients
          },
          instructions: {
            create: instructions
          }
        }
      });
      
      console.log(`✅ Created recipe: ${createdRecipe.title}`);
    }
    
    console.log(`🎉 Successfully seeded ${diverseRecipes.length} diverse recipes!`);
  } catch (error) {
    console.error('❌ Error seeding diverse recipes:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
if (require.main === module) {
  seedDiverseRecipes()
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { seedDiverseRecipes };
