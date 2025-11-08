// backend/prisma/seed-one.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Check if we should clear existing data (only if CLEAR_DB=true env var is set)
  const shouldClear = process.env.CLEAR_DB === 'true';
  
  if (shouldClear) {
    console.log('⚠️  CLEAR_DB=true detected - Clearing existing data...');
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
  } else {
    console.log('ℹ️  Preserving existing data (set CLEAR_DB=true to clear)');
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { id: 'temp-user-id' }
    });
    
    if (existingUser) {
      console.log('ℹ️  Test user already exists, skipping user creation');
      return;
    }
  }

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

  // Create multiple diverse recipes
  console.log('🍳 Creating recipes...');

  const recipes = [
    {
      title: 'Greek Chicken Bowl',
      description: 'Grilled chicken with quinoa, cucumber, tomatoes, and tzatziki',
      cookTime: 25,
      cuisine: 'Mediterranean',
      calories: 380,
      protein: 35,
      carbs: 30,
      fat: 15,
      imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=600&fit=crop',
      ingredients: [
        { text: '2 chicken breasts', order: 1 },
        { text: '1 cup quinoa', order: 2 },
        { text: '1 cucumber, diced', order: 3 },
        { text: '1 cup cherry tomatoes', order: 4 },
        { text: '1/2 cup tzatziki sauce', order: 5 }
      ],
      instructions: [
        { text: 'Grill chicken until cooked through', step: 1 },
        { text: 'Cook quinoa according to package instructions', step: 2 },
        { text: 'Chop vegetables and assemble bowl with tzatziki', step: 3 }
      ]
    },
    {
      title: 'Chicken Stir Fry',
      description: 'Quick Asian-style stir fry with vegetables and soy sauce',
      cookTime: 20,
      cuisine: 'Asian',
      calories: 420,
      protein: 32,
      carbs: 45,
      fat: 12,
      imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop',
      ingredients: [
        { text: '1 lb chicken breast, sliced', order: 1 },
        { text: '2 cups mixed vegetables', order: 2 },
        { text: '3 tbsp soy sauce', order: 3 },
        { text: '2 cloves garlic, minced', order: 4 },
        { text: '1 tbsp sesame oil', order: 5 }
      ],
      instructions: [
        { text: 'Heat sesame oil in a wok over high heat', step: 1 },
        { text: 'Stir fry chicken until golden, about 5 minutes', step: 2 },
        { text: 'Add vegetables and garlic, cook 3 minutes', step: 3 },
        { text: 'Add soy sauce and toss to coat', step: 4 }
      ]
    },
    {
      title: 'Chicken Tacos',
      description: 'Spicy chicken tacos with fresh toppings',
      cookTime: 30,
      cuisine: 'Mexican',
      calories: 450,
      protein: 28,
      carbs: 38,
      fat: 18,
      imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop',
      ingredients: [
        { text: '1 lb chicken thighs', order: 1 },
        { text: '8 corn tortillas', order: 2 },
        { text: '1 cup salsa', order: 3 },
        { text: '1 avocado, sliced', order: 4 },
        { text: '1/2 cup sour cream', order: 5 },
        { text: '2 tsp taco seasoning', order: 6 }
      ],
      instructions: [
        { text: 'Season chicken with taco seasoning', step: 1 },
        { text: 'Cook chicken in skillet until done, 8-10 minutes', step: 2 },
        { text: 'Warm tortillas and assemble tacos with toppings', step: 3 }
      ]
    },
    {
      title: 'Salmon with Roasted Vegetables',
      description: 'Baked salmon with colorful roasted vegetables',
      cookTime: 35,
      cuisine: 'American',
      calories: 480,
      protein: 38,
      carbs: 25,
      fat: 24,
      imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&h=600&fit=crop',
      ingredients: [
        { text: '2 salmon fillets', order: 1 },
        { text: '2 cups broccoli florets', order: 2 },
        { text: '1 red bell pepper, sliced', order: 3 },
        { text: '2 tbsp olive oil', order: 4 },
        { text: 'Lemon wedges', order: 5 }
      ],
      instructions: [
        { text: 'Preheat oven to 400°F', step: 1 },
        { text: 'Toss vegetables with olive oil and spread on baking sheet', step: 2 },
        { text: 'Place salmon on same sheet, season with salt and pepper', step: 3 },
        { text: 'Bake for 20-25 minutes until salmon is cooked through', step: 4 }
      ]
    },
    {
      title: 'Pasta Carbonara',
      description: 'Classic Italian pasta with bacon and creamy sauce',
      cookTime: 20,
      cuisine: 'Italian',
      calories: 620,
      protein: 24,
      carbs: 58,
      fat: 32,
      imageUrl: 'https://images.unsplash.com/photo-1612874742237-652622088e37?w=800&h=600&fit=crop',
      ingredients: [
        { text: '12 oz spaghetti', order: 1 },
        { text: '6 oz bacon, diced', order: 2 },
        { text: '3 eggs', order: 3 },
        { text: '1 cup parmesan cheese', order: 4 },
        { text: 'Black pepper to taste', order: 5 }
      ],
      instructions: [
        { text: 'Cook pasta according to package directions', step: 1 },
        { text: 'Fry bacon until crispy', step: 2 },
        { text: 'Whisk eggs and parmesan together', step: 3 },
        { text: 'Toss hot pasta with bacon and egg mixture', step: 4 }
      ]
    },
    {
      title: 'Thai Green Curry',
      description: 'Aromatic coconut curry with vegetables',
      cookTime: 30,
      cuisine: 'Asian',
      calories: 390,
      protein: 18,
      carbs: 42,
      fat: 16,
      imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop',
      ingredients: [
        { text: '1 can coconut milk', order: 1 },
        { text: '2 tbsp green curry paste', order: 2 },
        { text: '1 lb chicken or tofu', order: 3 },
        { text: '2 cups mixed vegetables', order: 4 },
        { text: 'Fresh basil leaves', order: 5 }
      ],
      instructions: [
        { text: 'Heat curry paste in pot for 1 minute', step: 1 },
        { text: 'Add coconut milk and bring to simmer', step: 2 },
        { text: 'Add protein and vegetables, cook 15 minutes', step: 3 },
        { text: 'Garnish with basil and serve over rice', step: 4 }
      ]
    },
    {
      title: 'Beef Burrito Bowl',
      description: 'Hearty burrito bowl with seasoned beef and toppings',
      cookTime: 25,
      cuisine: 'Mexican',
      calories: 520,
      protein: 35,
      carbs: 48,
      fat: 20,
      imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop',
      ingredients: [
        { text: '1 lb ground beef', order: 1 },
        { text: '2 cups cooked rice', order: 2 },
        { text: '1 can black beans', order: 3 },
        { text: '1 cup corn', order: 4 },
        { text: '1 cup shredded cheese', order: 5 },
        { text: '1 cup salsa', order: 6 }
      ],
      instructions: [
        { text: 'Brown ground beef with taco seasoning', step: 1 },
        { text: 'Warm beans and corn', step: 2 },
        { text: 'Assemble bowls with rice, beef, beans, corn, cheese, and salsa', step: 3 }
      ]
    },
    {
      title: 'Caprese Salad',
      description: 'Fresh mozzarella, tomatoes, and basil with balsamic',
      cookTime: 10,
      cuisine: 'Italian',
      calories: 280,
      protein: 14,
      carbs: 12,
      fat: 20,
      imageUrl: 'https://images.unsplash.com/photo-1506257266358-0e1a8f416b3b?w=800&h=600&fit=crop',
      ingredients: [
        { text: '8 oz fresh mozzarella', order: 1 },
        { text: '3 large tomatoes', order: 2 },
        { text: 'Fresh basil leaves', order: 3 },
        { text: '2 tbsp balsamic glaze', order: 4 },
        { text: '2 tbsp olive oil', order: 5 }
      ],
      instructions: [
        { text: 'Slice tomatoes and mozzarella', step: 1 },
        { text: 'Arrange alternating slices on plate', step: 2 },
        { text: 'Top with basil, drizzle with oil and balsamic', step: 3 }
      ]
    },
    {
      title: 'Teriyaki Chicken',
      description: 'Sweet and savory glazed chicken with vegetables',
      cookTime: 25,
      cuisine: 'Asian',
      calories: 410,
      protein: 34,
      carbs: 38,
      fat: 14,
      imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop',
      ingredients: [
        { text: '1.5 lb chicken thighs', order: 1 },
        { text: '1/2 cup teriyaki sauce', order: 2 },
        { text: '2 cups broccoli', order: 3 },
        { text: '1 tbsp sesame seeds', order: 4 },
        { text: '2 cups cooked rice', order: 5 }
      ],
      instructions: [
        { text: 'Marinate chicken in teriyaki sauce for 15 minutes', step: 1 },
        { text: 'Cook chicken in skillet until done, 6-8 minutes per side', step: 2 },
        { text: 'Steam broccoli and serve with chicken over rice', step: 3 },
        { text: 'Sprinkle with sesame seeds', step: 4 }
      ]
    },
    {
      title: 'Mediterranean Quinoa Salad',
      description: 'Healthy quinoa salad with feta and vegetables',
      cookTime: 20,
      cuisine: 'Mediterranean',
      calories: 320,
      protein: 12,
      carbs: 42,
      fat: 12,
      imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=600&fit=crop',
      ingredients: [
        { text: '2 cups cooked quinoa', order: 1 },
        { text: '1 cucumber, diced', order: 2 },
        { text: '1 cup cherry tomatoes', order: 3 },
        { text: '1/2 cup feta cheese', order: 4 },
        { text: '1/4 cup olive oil', order: 5 },
        { text: '2 tbsp lemon juice', order: 6 }
      ],
      instructions: [
        { text: 'Cook quinoa and let cool', step: 1 },
        { text: 'Chop all vegetables', step: 2 },
        { text: 'Mix quinoa, vegetables, and feta', step: 3 },
        { text: 'Dress with olive oil and lemon juice', step: 4 }
      ]
    }
  ];

  for (const recipeData of recipes) {
    const recipe = await prisma.recipe.create({
      data: {
        title: recipeData.title,
        description: recipeData.description,
        cookTime: recipeData.cookTime,
        cuisine: recipeData.cuisine,
        calories: recipeData.calories,
        protein: recipeData.protein,
        carbs: recipeData.carbs,
        fat: recipeData.fat,
        imageUrl: recipeData.imageUrl,
        ingredients: {
          create: recipeData.ingredients
        },
        instructions: {
          create: recipeData.instructions
        }
      },
    });
    console.log('✅ Recipe created:', recipe.title);
  }
  
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