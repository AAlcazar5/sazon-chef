// backend/prisma/seed-recipes.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const recipes = [
  // Mediterranean Recipes
  {
    title: "Mediterranean Quinoa Bowl",
    description: "Healthy quinoa bowl with Mediterranean vegetables and herbs",
    cookTime: 20,
    cuisine: "Mediterranean",
    calories: 320,
    protein: 12,
    carbs: 45,
    fat: 8,
    fiber: 6,
    sugar: 4,
    ingredients: [
      { text: "1 cup quinoa", order: 1 },
      { text: "1 cucumber, diced", order: 2 },
      { text: "1 tomato, diced", order: 3 },
      { text: "1/2 red onion, sliced", order: 4 },
      { text: "1/4 cup feta cheese", order: 5 },
      { text: "2 tbsp olive oil", order: 6 },
      { text: "1 tbsp lemon juice", order: 7 },
      { text: "Fresh herbs (oregano, basil)", order: 8 }
    ],
    instructions: [
      { text: "Cook quinoa according to package instructions", step: 1 },
      { text: "Dice all vegetables", step: 2 },
      { text: "Mix vegetables with cooked quinoa", step: 3 },
      { text: "Add feta cheese and herbs", step: 4 },
      { text: "Drizzle with olive oil and lemon juice", step: 5 }
    ]
  },
  {
    title: "Greek Chicken Souvlaki",
    description: "Traditional Greek chicken skewers with tzatziki",
    cookTime: 30,
    cuisine: "Mediterranean",
    calories: 280,
    protein: 35,
    carbs: 8,
    fat: 12,
    fiber: 2,
    sugar: 3,
    ingredients: [
      { text: "2 chicken breasts, cubed", order: 1 },
      { text: "1/4 cup olive oil", order: 2 },
      { text: "2 tbsp lemon juice", order: 3 },
      { text: "2 cloves garlic, minced", order: 4 },
      { text: "1 tsp oregano", order: 5 },
      { text: "1/2 cup Greek yogurt", order: 6 },
      { text: "1 cucumber, grated", order: 7 },
      { text: "1 tbsp dill", order: 8 }
    ],
    instructions: [
      { text: "Marinate chicken in olive oil, lemon, garlic, and oregano", step: 1 },
      { text: "Thread chicken onto skewers", step: 2 },
      { text: "Grill for 8-10 minutes per side", step: 3 },
      { text: "Make tzatziki with yogurt, cucumber, and dill", step: 4 },
      { text: "Serve skewers with tzatziki", step: 5 }
    ]
  },

  // Asian Recipes
  {
    title: "Quick Asian Stir Fry",
    description: "Fast and healthy vegetable stir fry with soy sauce",
    cookTime: 15,
    cuisine: "Asian",
    calories: 180,
    protein: 8,
    carbs: 25,
    fat: 6,
    fiber: 4,
    sugar: 8,
    ingredients: [
      { text: "2 cups mixed vegetables", order: 1 },
      { text: "2 tbsp soy sauce", order: 2 },
      { text: "1 tbsp sesame oil", order: 3 },
      { text: "1 clove garlic, minced", order: 4 },
      { text: "1 tsp ginger, grated", order: 5 },
      { text: "1 tbsp cornstarch", order: 6 },
      { text: "2 tbsp water", order: 7 }
    ],
    instructions: [
      { text: "Heat sesame oil in wok or large pan", step: 1 },
      { text: "Add garlic and ginger, cook 30 seconds", step: 2 },
      { text: "Add vegetables, stir fry for 5-7 minutes", step: 3 },
      { text: "Mix soy sauce with cornstarch and water", step: 4 },
      { text: "Add sauce to vegetables, cook until thickened", step: 5 }
    ]
  },
  {
    title: "Thai Coconut Curry",
    description: "Creamy coconut curry with vegetables and rice",
    cookTime: 25,
    cuisine: "Asian",
    calories: 420,
    protein: 15,
    carbs: 35,
    fat: 25,
    fiber: 6,
    sugar: 12,
    ingredients: [
      { text: "1 can coconut milk", order: 1 },
      { text: "2 tbsp red curry paste", order: 2 },
      { text: "1 bell pepper, sliced", order: 3 },
      { text: "1 cup broccoli florets", order: 4 },
      { text: "1 carrot, sliced", order: 5 },
      { text: "1 cup jasmine rice", order: 6 },
      { text: "2 tbsp fish sauce", order: 7 },
      { text: "1 tbsp brown sugar", order: 8 }
    ],
    instructions: [
      { text: "Cook rice according to package instructions", step: 1 },
      { text: "Heat curry paste in large pot", step: 2 },
      { text: "Add coconut milk, bring to simmer", step: 3 },
      { text: "Add vegetables, cook 10-12 minutes", step: 4 },
      { text: "Season with fish sauce and brown sugar", step: 5 },
      { text: "Serve over rice", step: 6 }
    ]
  },
  {
    title: "Japanese Miso Soup",
    description: "Traditional Japanese miso soup with tofu and seaweed",
    cookTime: 10,
    cuisine: "Asian",
    calories: 80,
    protein: 6,
    carbs: 8,
    fat: 3,
    fiber: 2,
    sugar: 2,
    ingredients: [
      { text: "4 cups dashi stock", order: 1 },
      { text: "3 tbsp white miso paste", order: 2 },
      { text: "1/2 cup silken tofu, cubed", order: 3 },
      { text: "2 sheets nori, torn", order: 4 },
      { text: "2 green onions, sliced", order: 5 },
      { text: "1 tsp wakame seaweed", order: 6 }
    ],
    instructions: [
      { text: "Heat dashi stock to just below boiling", step: 1 },
      { text: "Dissolve miso paste in small amount of stock", step: 2 },
      { text: "Add miso mixture to stock", step: 3 },
      { text: "Add tofu, nori, and wakame", step: 4 },
      { text: "Garnish with green onions", step: 5 }
    ]
  },

  // Mexican Recipes
  {
    title: "Mexican Tacos",
    description: "Authentic Mexican street tacos with fresh toppings",
    cookTime: 20,
    cuisine: "Mexican",
    calories: 350,
    protein: 25,
    carbs: 30,
    fat: 15,
    fiber: 5,
    sugar: 4,
    ingredients: [
      { text: "1 lb ground beef", order: 1 },
      { text: "1 packet taco seasoning", order: 2 },
      { text: "8 corn tortillas", order: 3 },
      { text: "1 cup lettuce, shredded", order: 4 },
      { text: "1 tomato, diced", order: 5 },
      { text: "1/2 cup cheddar cheese", order: 6 },
      { text: "1/4 cup sour cream", order: 7 },
      { text: "1 lime, cut into wedges", order: 8 }
    ],
    instructions: [
      { text: "Brown ground beef in large skillet", step: 1 },
      { text: "Add taco seasoning and water", step: 2 },
      { text: "Simmer until liquid is absorbed", step: 3 },
      { text: "Warm tortillas in dry skillet", step: 4 },
      { text: "Fill tortillas with beef and toppings", step: 5 },
      { text: "Serve with lime wedges", step: 6 }
    ]
  },
  {
    title: "Vegetarian Burrito Bowl",
    description: "Healthy burrito bowl with black beans and rice",
    cookTime: 30,
    cuisine: "Mexican",
    calories: 380,
    protein: 18,
    carbs: 55,
    fat: 12,
    fiber: 12,
    sugar: 6,
    ingredients: [
      { text: "1 cup brown rice", order: 1 },
      { text: "1 can black beans", order: 2 },
      { text: "1 bell pepper, diced", order: 3 },
      { text: "1/2 red onion, diced", order: 4 },
      { text: "1 avocado, sliced", order: 5 },
      { text: "1/4 cup corn kernels", order: 6 },
      { text: "2 tbsp lime juice", order: 7 },
      { text: "1 tsp cumin", order: 8 }
    ],
    instructions: [
      { text: "Cook rice according to package instructions", step: 1 },
      { text: "Heat black beans with cumin", step: 2 },
      { text: "Sauté bell pepper and onion", step: 3 },
      { text: "Mix rice with lime juice", step: 4 },
      { text: "Layer rice, beans, vegetables, and avocado", step: 5 }
    ]
  },

  // Italian Recipes
  {
    title: "Classic Spaghetti Carbonara",
    description: "Traditional Italian pasta with eggs, cheese, and pancetta",
    cookTime: 20,
    cuisine: "Italian",
    calories: 520,
    protein: 22,
    carbs: 45,
    fat: 28,
    fiber: 2,
    sugar: 3,
    ingredients: [
      { text: "1 lb spaghetti", order: 1 },
      { text: "4 oz pancetta, diced", order: 2 },
      { text: "4 large eggs", order: 3 },
      { text: "1 cup parmesan cheese, grated", order: 4 },
      { text: "2 cloves garlic, minced", order: 5 },
      { text: "Black pepper", order: 6 },
      { text: "Salt", order: 7 }
    ],
    instructions: [
      { text: "Cook pasta according to package instructions", step: 1 },
      { text: "Cook pancetta until crispy", step: 2 },
      { text: "Whisk eggs with parmesan and black pepper", step: 3 },
      { text: "Drain pasta, reserving 1 cup pasta water", step: 4 },
      { text: "Toss hot pasta with pancetta and egg mixture", step: 5 },
      { text: "Add pasta water if needed for creaminess", step: 6 }
    ]
  },
  {
    title: "Margherita Pizza",
    description: "Simple and classic Italian pizza with tomato, mozzarella, and basil",
    cookTime: 25,
    cuisine: "Italian",
    calories: 280,
    protein: 12,
    carbs: 35,
    fat: 10,
    fiber: 2,
    sugar: 4,
    ingredients: [
      { text: "1 pizza dough", order: 1 },
      { text: "1/2 cup tomato sauce", order: 2 },
      { text: "8 oz fresh mozzarella", order: 3 },
      { text: "Fresh basil leaves", order: 4 },
      { text: "2 tbsp olive oil", order: 5 },
      { text: "Salt and pepper", order: 6 }
    ],
    instructions: [
      { text: "Preheat oven to 450°F", step: 1 },
      { text: "Roll out pizza dough", step: 2 },
      { text: "Spread tomato sauce on dough", step: 3 },
      { text: "Top with mozzarella slices", step: 4 },
      { text: "Drizzle with olive oil", step: 5 },
      { text: "Bake for 12-15 minutes", step: 6 },
      { text: "Top with fresh basil", step: 7 }
    ]
  },

  // American Recipes
  {
    title: "Classic Burger",
    description: "Juicy beef burger with all the fixings",
    cookTime: 20,
    cuisine: "American",
    calories: 650,
    protein: 35,
    carbs: 45,
    fat: 35,
    fiber: 3,
    sugar: 8,
    ingredients: [
      { text: "1 lb ground beef (80/20)", order: 1 },
      { text: "4 burger buns", order: 2 },
      { text: "4 slices cheddar cheese", order: 3 },
      { text: "1 tomato, sliced", order: 4 },
      { text: "1 onion, sliced", order: 5 },
      { text: "Lettuce leaves", order: 6 },
      { text: "Ketchup and mustard", order: 7 },
      { text: "Salt and pepper", order: 8 }
    ],
    instructions: [
      { text: "Form ground beef into 4 patties", step: 1 },
      { text: "Season patties with salt and pepper", step: 2 },
      { text: "Grill or pan-fry patties 4-5 minutes per side", step: 3 },
      { text: "Add cheese during last minute of cooking", step: 4 },
      { text: "Toast burger buns", step: 5 },
      { text: "Assemble burgers with toppings", step: 6 }
    ]
  },
  {
    title: "BBQ Chicken Wings",
    description: "Crispy chicken wings with homemade BBQ sauce",
    cookTime: 45,
    cuisine: "American",
    calories: 320,
    protein: 28,
    carbs: 15,
    fat: 18,
    fiber: 1,
    sugar: 12,
    ingredients: [
      { text: "2 lbs chicken wings", order: 1 },
      { text: "1/2 cup BBQ sauce", order: 2 },
      { text: "2 tbsp honey", order: 3 },
      { text: "1 tbsp apple cider vinegar", order: 4 },
      { text: "1 tsp garlic powder", order: 5 },
      { text: "1 tsp paprika", order: 6 },
      { text: "Salt and pepper", order: 7 }
    ],
    instructions: [
      { text: "Preheat oven to 400°F", step: 1 },
      { text: "Season wings with salt, pepper, and paprika", step: 2 },
      { text: "Bake wings for 35-40 minutes", step: 3 },
      { text: "Mix BBQ sauce with honey and vinegar", step: 4 },
      { text: "Toss wings with BBQ sauce", step: 5 },
      { text: "Return to oven for 5 minutes", step: 6 }
    ]
  },

  // Indian Recipes
  {
    title: "Indian Curry",
    description: "Aromatic Indian curry with vegetables and spices",
    cookTime: 35,
    cuisine: "Indian",
    calories: 280,
    protein: 12,
    carbs: 35,
    fat: 12,
    fiber: 8,
    sugar: 10,
    ingredients: [
      { text: "1 onion, diced", order: 1 },
      { text: "2 cloves garlic, minced", order: 2 },
      { text: "1 tbsp ginger, grated", order: 3 },
      { text: "2 tbsp curry powder", order: 4 },
      { text: "1 can coconut milk", order: 5 },
      { text: "2 cups mixed vegetables", order: 6 },
      { text: "1 cup basmati rice", order: 7 },
      { text: "2 tbsp vegetable oil", order: 8 }
    ],
    instructions: [
      { text: "Cook rice according to package instructions", step: 1 },
      { text: "Heat oil in large pot", step: 2 },
      { text: "Sauté onion, garlic, and ginger", step: 3 },
      { text: "Add curry powder, cook 1 minute", step: 4 },
      { text: "Add coconut milk and vegetables", step: 5 },
      { text: "Simmer for 20-25 minutes", step: 6 },
      { text: "Serve over rice", step: 7 }
    ]
  },
  {
    title: "Chicken Tikka Masala",
    description: "Creamy tomato-based curry with tender chicken",
    cookTime: 40,
    cuisine: "Indian",
    calories: 420,
    protein: 35,
    carbs: 20,
    fat: 22,
    fiber: 4,
    sugar: 8,
    ingredients: [
      { text: "1 lb chicken breast, cubed", order: 1 },
      { text: "1 cup yogurt", order: 2 },
      { text: "2 tbsp tikka masala paste", order: 3 },
      { text: "1 can diced tomatoes", order: 4 },
      { text: "1/2 cup heavy cream", order: 5 },
      { text: "1 onion, diced", order: 6 },
      { text: "2 cloves garlic", order: 7 },
      { text: "1 cup basmati rice", order: 8 }
    ],
    instructions: [
      { text: "Marinate chicken in yogurt and tikka paste", step: 1 },
      { text: "Cook rice according to package instructions", step: 2 },
      { text: "Sauté onion and garlic", step: 3 },
      { text: "Add marinated chicken", step: 4 },
      { text: "Add tomatoes and cream", step: 5 },
      { text: "Simmer for 20-25 minutes", step: 6 },
      { text: "Serve over rice", step: 7 }
    ]
  },

  // French Recipes
  {
    title: "French Onion Soup",
    description: "Classic French soup with caramelized onions and cheese",
    cookTime: 60,
    cuisine: "French",
    calories: 320,
    protein: 18,
    carbs: 25,
    fat: 18,
    fiber: 3,
    sugar: 8,
    ingredients: [
      { text: "4 large onions, sliced", order: 1 },
      { text: "4 tbsp butter", order: 2 },
      { text: "4 cups beef broth", order: 3 },
      { text: "1/2 cup white wine", order: 4 },
      { text: "1 cup gruyere cheese, grated", order: 5 },
      { text: "4 slices French bread", order: 6 },
      { text: "2 cloves garlic", order: 7 },
      { text: "Salt and pepper", order: 8 }
    ],
    instructions: [
      { text: "Caramelize onions in butter for 30 minutes", step: 1 },
      { text: "Add wine and broth to onions", step: 2 },
      { text: "Simmer for 20 minutes", step: 3 },
      { text: "Toast bread slices", step: 4 },
      { text: "Rub bread with garlic", step: 5 },
      { text: "Top soup with bread and cheese", step: 6 },
      { text: "Broil until cheese is golden", step: 7 }
    ]
  },

  // Japanese Recipes
  {
    title: "Teriyaki Salmon",
    description: "Glazed salmon with homemade teriyaki sauce",
    cookTime: 20,
    cuisine: "Japanese",
    calories: 320,
    protein: 35,
    carbs: 15,
    fat: 12,
    fiber: 1,
    sugar: 12,
    ingredients: [
      { text: "4 salmon fillets", order: 1 },
      { text: "1/4 cup soy sauce", order: 2 },
      { text: "2 tbsp honey", order: 3 },
      { text: "1 tbsp rice vinegar", order: 4 },
      { text: "1 tsp ginger, grated", order: 5 },
      { text: "1 clove garlic, minced", order: 6 },
      { text: "1 tbsp sesame oil", order: 7 },
      { text: "Sesame seeds", order: 8 }
    ],
    instructions: [
      { text: "Mix soy sauce, honey, vinegar, ginger, and garlic", step: 1 },
      { text: "Heat sesame oil in large skillet", step: 2 },
      { text: "Cook salmon 4-5 minutes per side", step: 3 },
      { text: "Add teriyaki sauce to pan", step: 4 },
      { text: "Simmer until sauce thickens", step: 5 },
      { text: "Garnish with sesame seeds", step: 6 }
    ]
  },

  // Chinese Recipes
  {
    title: "Kung Pao Chicken",
    description: "Spicy Chinese stir-fry with peanuts and vegetables",
    cookTime: 25,
    cuisine: "Chinese",
    calories: 380,
    protein: 32,
    carbs: 18,
    fat: 22,
    fiber: 4,
    sugar: 10,
    ingredients: [
      { text: "1 lb chicken breast, cubed", order: 1 },
      { text: "2 bell peppers, diced", order: 2 },
      { text: "1/2 cup peanuts", order: 3 },
      { text: "3 tbsp soy sauce", order: 4 },
      { text: "2 tbsp rice vinegar", order: 5 },
      { text: "1 tbsp hoisin sauce", order: 6 },
      { text: "2 cloves garlic, minced", order: 7 },
      { text: "1 tsp red pepper flakes", order: 8 }
    ],
    instructions: [
      { text: "Mix soy sauce, vinegar, and hoisin sauce", step: 1 },
      { text: "Stir-fry chicken until cooked through", step: 2 },
      { text: "Add bell peppers and garlic", step: 3 },
      { text: "Add sauce mixture", step: 4 },
      { text: "Add peanuts and red pepper flakes", step: 5 },
      { text: "Cook until sauce thickens", step: 6 }
    ]
  }
];

async function seedRecipes() {
  console.log('🌱 Starting recipe seeding...');
  
  try {
    // Clear existing recipes
    console.log('🧹 Clearing existing recipes...');
    await prisma.recipeIngredient.deleteMany();
    await prisma.recipeInstruction.deleteMany();
    await prisma.recipe.deleteMany();
    
    // Create recipes
    for (const recipeData of recipes) {
      const { ingredients, instructions, ...recipe } = recipeData;
      
      const createdRecipe = await prisma.recipe.create({
        data: {
          ...recipe,
          isUserCreated: false,
          ingredients: {
            create: ingredients.map(ingredient => ({
              text: ingredient.text,
              order: ingredient.order
            }))
          },
          instructions: {
            create: instructions.map(instruction => ({
              text: instruction.text,
              step: instruction.step
            }))
          }
        }
      });
      
      console.log(`✅ Recipe created: ${createdRecipe.title}`);
    }
    
    console.log(`🎉 Recipe seeding completed! Created ${recipes.length} recipes.`);
  } catch (error) {
    console.error('❌ Error seeding recipes:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedRecipes();
