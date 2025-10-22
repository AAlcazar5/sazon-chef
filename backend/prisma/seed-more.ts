// backend/prisma/seed-more.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting additional recipe seed...');

  // Clear existing recipes first
  console.log('🧹 Clearing existing recipes...');
  await prisma.recipeIngredient.deleteMany();
  await prisma.recipeInstruction.deleteMany();
  await prisma.recipe.deleteMany();

  // Create multiple recipes
  console.log('🍳 Creating multiple recipes...');

  // Recipe 1 - Greek Chicken Bowl
  const recipe1 = await prisma.recipe.create({
    data: {
      title: 'Greek Chicken Bowl',
      description: 'Grilled chicken with quinoa, vegetables, and tzatziki',
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
          { text: '1 cucumber, diced', order: 3 },
          { text: '1/2 cup cherry tomatoes, halved', order: 4 },
          { text: '1/4 cup tzatziki sauce', order: 5 },
          { text: '1 tbsp olive oil', order: 6 },
          { text: '1 lemon, juiced', order: 7 }
        ]
      },
      instructions: {
        create: [
          { text: 'Season chicken breasts with salt, pepper, and lemon juice', step: 1 },
          { text: 'Grill chicken for 6-7 minutes per side until cooked through', step: 2 },
          { text: 'Cook quinoa according to package instructions', step: 3 },
          { text: 'Dice cucumber and halve cherry tomatoes', step: 4 },
          { text: 'Slice grilled chicken and assemble bowls with quinoa, vegetables, and chicken', step: 5 },
          { text: 'Top with tzatziki sauce and serve', step: 6 }
        ]
      }
    },
  });

  // Recipe 2 - Vegetable Curry
  const recipe2 = await prisma.recipe.create({
    data: {
      title: 'Vegetable Coconut Curry',
      description: 'Spicy coconut curry with seasonal vegetables and rice',
      cookTime: 30,
      cuisine: 'Indian',
      calories: 320,
      protein: 12,
      carbs: 45,
      fat: 18,
      fiber: 8,
      ingredients: {
        create: [
          { text: '1 can coconut milk', order: 1 },
          { text: '2 cups mixed vegetables (bell peppers, carrots, broccoli)', order: 2 },
          { text: '1 onion, chopped', order: 3 },
          { text: '2 cloves garlic, minced', order: 4 },
          { text: '1 tbsp curry powder', order: 5 },
          { text: '1 tsp turmeric', order: 6 },
          { text: '1 cup basmati rice', order: 7 },
          { text: '2 tbsp olive oil', order: 8 }
        ]
      },
      instructions: {
        create: [
          { text: 'Cook basmati rice according to package instructions', step: 1 },
          { text: 'Heat oil in a large pan over medium heat', step: 2 },
          { text: 'Sauté onion and garlic until fragrant', step: 3 },
          { text: 'Add curry powder and turmeric, cook for 1 minute', step: 4 },
          { text: 'Add vegetables and cook for 5 minutes', step: 5 },
          { text: 'Pour in coconut milk and simmer for 15 minutes', step: 6 },
          { text: 'Serve curry over rice', step: 7 }
        ]
      }
    },
  });

  // Recipe 3 - Salmon with Roasted Vegetables
  const recipe3 = await prisma.recipe.create({
    data: {
      title: 'Baked Salmon with Roasted Vegetables',
      description: 'Healthy baked salmon with asparagus and sweet potatoes',
      cookTime: 35,
      cuisine: 'American',
      calories: 410,
      protein: 28,
      carbs: 25,
      fat: 22,
      ingredients: {
        create: [
          { text: '2 salmon fillets', order: 1 },
          { text: '1 sweet potato, cubed', order: 2 },
          { text: '1 bunch asparagus, trimmed', order: 3 },
          { text: '2 tbsp olive oil', order: 4 },
          { text: '1 lemon, sliced', order: 5 },
          { text: '2 cloves garlic, minced', order: 6 },
          { text: 'Salt and pepper to taste', order: 7 }
        ]
      },
      instructions: {
        create: [
          { text: 'Preheat oven to 400°F (200°C)', step: 1 },
          { text: 'Toss sweet potato and asparagus with olive oil, garlic, salt, and pepper', step: 2 },
          { text: 'Place vegetables on baking sheet and roast for 15 minutes', step: 3 },
          { text: 'Season salmon with salt, pepper, and lemon slices', step: 4 },
          { text: 'Add salmon to baking sheet and bake for 12-15 minutes until cooked', step: 5 },
          { text: 'Serve immediately', step: 6 }
        ]
      }
    },
  });

  // Recipe 4 - Black Bean Tacos
  const recipe4 = await prisma.recipe.create({
    data: {
      title: 'Black Bean Tacos',
      description: 'Quick and easy vegetarian tacos with avocado and salsa',
      cookTime: 15,
      cuisine: 'Mexican',
      calories: 280,
      protein: 12,
      carbs: 35,
      fat: 10,
      fiber: 9,
      ingredients: {
        create: [
          { text: '1 can black beans, drained and rinsed', order: 1 },
          { text: '8 corn tortillas', order: 2 },
          { text: '1 avocado, sliced', order: 3 },
          { text: '1/2 cup salsa', order: 4 },
          { text: '1/4 cup cilantro, chopped', order: 5 },
          { text: '1 lime, cut into wedges', order: 6 },
          { text: '1/2 cup shredded lettuce', order: 7 },
          { text: '1/4 cup Greek yogurt or sour cream', order: 8 }
        ]
      },
      instructions: {
        create: [
          { text: 'Heat black beans in a saucepan until warm', step: 1 },
          { text: 'Warm tortillas in a dry skillet or microwave', step: 2 },
          { text: 'Slice avocado and prepare other toppings', step: 3 },
          { text: 'Assemble tacos with beans and desired toppings', step: 4 },
          { text: 'Serve with lime wedges', step: 5 }
        ]
      }
    },
  });

  // Recipe 5 - Mediterranean Quinoa Salad
  const recipe5 = await prisma.recipe.create({
    data: {
      title: 'Mediterranean Quinoa Salad',
      description: 'Fresh quinoa salad with feta, olives, and lemon dressing',
      cookTime: 20,
      cuisine: 'Mediterranean',
      calories: 290,
      protein: 14,
      carbs: 32,
      fat: 12,
      fiber: 6,
      ingredients: {
        create: [
          { text: '1 cup quinoa', order: 1 },
          { text: '2 cups vegetable broth', order: 2 },
          { text: '1 cucumber, diced', order: 3 },
          { text: '1 cup cherry tomatoes, halved', order: 4 },
          { text: '1/2 cup feta cheese, crumbled', order: 5 },
          { text: '1/4 cup kalamata olives, pitted', order: 6 },
          { text: '2 tbsp olive oil', order: 7 },
          { text: '1 lemon, juiced', order: 8 },
          { text: '1/4 cup red onion, finely chopped', order: 9 }
        ]
      },
      instructions: {
        create: [
          { text: 'Cook quinoa in vegetable broth according to package instructions', step: 1 },
          { text: 'Let quinoa cool to room temperature', step: 2 },
          { text: 'Dice cucumber and halve cherry tomatoes', step: 3 },
          { text: 'Chop red onion and pit olives', step: 4 },
          { text: 'Whisk together olive oil and lemon juice for dressing', step: 5 },
          { text: 'Combine all ingredients in a large bowl and toss with dressing', step: 6 },
          { text: 'Top with crumbled feta cheese and serve', step: 7 }
        ]
      }
    },
  });

  console.log('✅ Created recipes:');
  console.log('   - Greek Chicken Bowl');
  console.log('   - Vegetable Coconut Curry');
  console.log('   - Baked Salmon with Roasted Vegetables');
  console.log('   - Black Bean Tacos');
  console.log('   - Mediterranean Quinoa Salad');
  console.log('🎉 Additional recipe seeding completed!');
  console.log(`📊 Total: 5 recipes created`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });