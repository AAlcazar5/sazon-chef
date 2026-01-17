// backend/prisma/seed-snacks-desserts.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const snacks = [
  {
    title: "Greek Yogurt with Berries and Granola",
    description: "Protein-rich Greek yogurt topped with fresh berries and crunchy granola",
    cookTime: 5,
    cuisine: "Mediterranean",
    mealType: "snack",
    calories: 180,
    protein: 15,
    carbs: 25,
    fat: 4,
    fiber: 3,
    sugar: 12,
    ingredients: [
      { text: "1 cup Greek yogurt", order: 1 },
      { text: "1/2 cup mixed berries (strawberries, blueberries)", order: 2 },
      { text: "2 tbsp granola", order: 3 },
      { text: "1 tsp honey", order: 4 }
    ],
    instructions: [
      { text: "Scoop Greek yogurt into a bowl", step: 1 },
      { text: "Top with fresh berries", step: 2 },
      { text: "Sprinkle granola on top", step: 3 },
      { text: "Drizzle with honey and serve", step: 4 }
    ]
  },
  {
    title: "Apple Slices with Almond Butter",
    description: "Crisp apple slices paired with creamy almond butter for a satisfying snack",
    cookTime: 2,
    cuisine: "American",
    mealType: "snack",
    calories: 200,
    protein: 6,
    carbs: 28,
    fat: 9,
    fiber: 6,
    sugar: 20,
    ingredients: [
      { text: "1 medium apple, sliced", order: 1 },
      { text: "2 tbsp almond butter", order: 2 },
      { text: "Pinch of cinnamon (optional)", order: 3 }
    ],
    instructions: [
      { text: "Slice apple into wedges", step: 1 },
      { text: "Serve with almond butter for dipping", step: 2 },
      { text: "Sprinkle with cinnamon if desired", step: 3 }
    ]
  },
  {
    title: "Cheese and Grapes with Crackers",
    description: "Classic combination of cheese, grapes, and whole grain crackers",
    cookTime: 3,
    cuisine: "Mediterranean",
    mealType: "snack",
    calories: 220,
    protein: 10,
    carbs: 22,
    fat: 11,
    fiber: 2,
    sugar: 15,
    ingredients: [
      { text: "1 oz cheese (cheddar, gouda, or brie)", order: 1 },
      { text: "1/2 cup red grapes", order: 2 },
      { text: "6 whole grain crackers", order: 3 }
    ],
    instructions: [
      { text: "Arrange cheese on a plate", step: 1 },
      { text: "Add grapes and crackers", step: 2 },
      { text: "Serve immediately", step: 3 }
    ]
  },
  {
    title: "Protein Bar (Homemade)",
    description: "No-bake protein bars with oats, nuts, and protein powder",
    cookTime: 15,
    cuisine: "American",
    mealType: "snack",
    calories: 250,
    protein: 20,
    carbs: 22,
    fat: 10,
    fiber: 4,
    sugar: 12,
    ingredients: [
      { text: "1 cup rolled oats", order: 1 },
      { text: "1/2 cup protein powder", order: 2 },
      { text: "1/4 cup almond butter", order: 3 },
      { text: "1/4 cup honey", order: 4 },
      { text: "1/4 cup chopped nuts", order: 5 },
      { text: "2 tbsp dark chocolate chips", order: 6 }
    ],
    instructions: [
      { text: "Mix oats, protein powder, and nuts in a bowl", step: 1 },
      { text: "Heat almond butter and honey until smooth", step: 2 },
      { text: "Combine wet and dry ingredients", step: 3 },
      { text: "Press into a lined pan and refrigerate for 2 hours", step: 4 },
      { text: "Cut into bars and store in refrigerator", step: 5 }
    ]
  },
  {
    title: "Hummus with Vegetable Sticks",
    description: "Creamy hummus served with fresh vegetable sticks",
    cookTime: 5,
    cuisine: "Mediterranean",
    mealType: "snack",
    calories: 150,
    protein: 6,
    carbs: 18,
    fat: 6,
    fiber: 5,
    sugar: 3,
    ingredients: [
      { text: "1/2 cup hummus", order: 1 },
      { text: "1 cup mixed vegetable sticks (carrots, celery, bell peppers)", order: 2 },
      { text: "1 tbsp olive oil", order: 3 },
      { text: "Paprika for garnish", order: 4 }
    ],
    instructions: [
      { text: "Prepare vegetable sticks", step: 1 },
      { text: "Scoop hummus into a bowl", step: 2 },
      { text: "Drizzle with olive oil and sprinkle with paprika", step: 3 },
      { text: "Serve with vegetable sticks for dipping", step: 4 }
    ]
  },
  {
    title: "Trail Mix",
    description: "Energy-boosting mix of nuts, dried fruit, and seeds",
    cookTime: 5,
    cuisine: "American",
    mealType: "snack",
    calories: 200,
    protein: 6,
    carbs: 20,
    fat: 12,
    fiber: 4,
    sugar: 14,
    ingredients: [
      { text: "1/4 cup mixed nuts (almonds, walnuts, cashews)", order: 1 },
      { text: "2 tbsp dried cranberries", order: 2 },
      { text: "2 tbsp dark chocolate chips", order: 3 },
      { text: "1 tbsp pumpkin seeds", order: 4 }
    ],
    instructions: [
      { text: "Combine all ingredients in a bowl", step: 1 },
      { text: "Mix well and portion into servings", step: 2 },
      { text: "Store in an airtight container", step: 3 }
    ]
  },
  {
    title: "Cottage Cheese with Pineapple",
    description: "High-protein cottage cheese topped with fresh pineapple",
    cookTime: 2,
    cuisine: "American",
    mealType: "snack",
    calories: 160,
    protein: 18,
    carbs: 18,
    fat: 2,
    fiber: 1,
    sugar: 15,
    ingredients: [
      { text: "1/2 cup cottage cheese", order: 1 },
      { text: "1/2 cup fresh pineapple chunks", order: 2 },
      { text: "1 tsp chia seeds (optional)", order: 3 }
    ],
    instructions: [
      { text: "Scoop cottage cheese into a bowl", step: 1 },
      { text: "Top with pineapple chunks", step: 2 },
      { text: "Sprinkle with chia seeds if desired", step: 3 }
    ]
  },
  {
    title: "Rice Cakes with Avocado",
    description: "Whole grain rice cakes topped with mashed avocado and seasonings",
    cookTime: 5,
    cuisine: "American",
    mealType: "snack",
    calories: 180,
    protein: 4,
    carbs: 22,
    fat: 9,
    fiber: 5,
    sugar: 1,
    ingredients: [
      { text: "2 brown rice cakes", order: 1 },
      { text: "1/2 avocado, mashed", order: 2 },
      { text: "Pinch of salt and pepper", order: 3 },
      { text: "Red pepper flakes (optional)", order: 4 }
    ],
    instructions: [
      { text: "Mash avocado with salt and pepper", step: 1 },
      { text: "Spread avocado on rice cakes", step: 2 },
      { text: "Sprinkle with red pepper flakes if desired", step: 3 },
      { text: "Serve immediately", step: 4 }
    ]
  },
  {
    title: "Banana with Peanut Butter",
    description: "Simple and satisfying banana slices with creamy peanut butter",
    cookTime: 2,
    cuisine: "American",
    mealType: "snack",
    calories: 190,
    protein: 7,
    carbs: 26,
    fat: 8,
    fiber: 4,
    sugar: 18,
    ingredients: [
      { text: "1 medium banana, sliced", order: 1 },
      { text: "2 tbsp peanut butter", order: 2 }
    ],
    instructions: [
      { text: "Slice banana", step: 1 },
      { text: "Serve with peanut butter for dipping", step: 2 }
    ]
  },
  {
    title: "Hard-Boiled Eggs",
    description: "Protein-packed hard-boiled eggs, perfect for a quick snack",
    cookTime: 10,
    cuisine: "American",
    mealType: "snack",
    calories: 140,
    protein: 12,
    carbs: 1,
    fat: 10,
    fiber: 0,
    sugar: 1,
    ingredients: [
      { text: "2 large eggs", order: 1 },
      { text: "Pinch of salt and pepper", order: 2 }
    ],
    instructions: [
      { text: "Place eggs in boiling water", step: 1 },
      { text: "Boil for 8-10 minutes", step: 2 },
      { text: "Cool in ice water", step: 3 },
      { text: "Peel and season with salt and pepper", step: 4 }
    ]
  },
  {
    title: "Celery Sticks with Peanut Butter",
    description: "Crunchy celery filled with protein-rich peanut butter",
    cookTime: 3,
    cuisine: "American",
    mealType: "snack",
    calories: 150,
    protein: 6,
    carbs: 8,
    fat: 11,
    fiber: 2,
    sugar: 4,
    ingredients: [
      { text: "3 celery stalks, cut into sticks", order: 1 },
      { text: "2 tbsp peanut butter", order: 2 },
      { text: "Raisins (optional)", order: 3 }
    ],
    instructions: [
      { text: "Cut celery into 4-inch sticks", step: 1 },
      { text: "Fill celery groove with peanut butter", step: 2 },
      { text: "Top with raisins if desired", step: 3 }
    ]
  },
  {
    title: "Mixed Nuts",
    description: "Assorted nuts for a healthy, protein-rich snack",
    cookTime: 1,
    cuisine: "American",
    mealType: "snack",
    calories: 170,
    protein: 6,
    carbs: 6,
    fat: 15,
    fiber: 3,
    sugar: 2,
    ingredients: [
      { text: "1/4 cup mixed nuts (almonds, walnuts, cashews, pistachios)", order: 1 }
    ],
    instructions: [
      { text: "Portion out mixed nuts", step: 1 },
      { text: "Serve as a quick snack", step: 2 }
    ]
  },
  {
    title: "Edamame",
    description: "Steamed soybeans, a protein-rich snack",
    cookTime: 5,
    cuisine: "Asian",
    mealType: "snack",
    calories: 120,
    protein: 11,
    carbs: 10,
    fat: 5,
    fiber: 5,
    sugar: 2,
    ingredients: [
      { text: "1 cup frozen edamame", order: 1 },
      { text: "Pinch of sea salt", order: 2 }
    ],
    instructions: [
      { text: "Steam edamame for 5 minutes", step: 1 },
      { text: "Sprinkle with sea salt", step: 2 },
      { text: "Serve warm", step: 3 }
    ]
  },
  {
    title: "Sliced Bell Peppers with Guacamole",
    description: "Fresh bell pepper slices with homemade guacamole",
    cookTime: 10,
    cuisine: "Mexican",
    mealType: "snack",
    calories: 160,
    protein: 3,
    carbs: 12,
    fat: 12,
    fiber: 6,
    sugar: 6,
    ingredients: [
      { text: "1 bell pepper, sliced", order: 1 },
      { text: "1/2 avocado, mashed", order: 2 },
      { text: "1 tbsp lime juice", order: 3 },
      { text: "Pinch of salt", order: 4 }
    ],
    instructions: [
      { text: "Slice bell pepper into strips", step: 1 },
      { text: "Mash avocado with lime juice and salt", step: 2 },
      { text: "Serve peppers with guacamole for dipping", step: 3 }
    ]
  },
  {
    title: "String Cheese",
    description: "Portable, protein-rich string cheese",
    cookTime: 0,
    cuisine: "American",
    mealType: "snack",
    calories: 80,
    protein: 7,
    carbs: 1,
    fat: 6,
    fiber: 0,
    sugar: 0,
    ingredients: [
      { text: "1 string cheese", order: 1 }
    ],
    instructions: [
      { text: "Remove from packaging", step: 1 },
      { text: "Enjoy as a quick snack", step: 2 }
    ]
  },
  {
    title: "Carrot Sticks with Ranch",
    description: "Fresh carrot sticks with creamy ranch dip",
    cookTime: 5,
    cuisine: "American",
    mealType: "snack",
    calories: 100,
    protein: 2,
    carbs: 10,
    fat: 6,
    fiber: 3,
    sugar: 5,
    ingredients: [
      { text: "1 cup carrot sticks", order: 1 },
      { text: "2 tbsp ranch dressing", order: 2 }
    ],
    instructions: [
      { text: "Cut carrots into sticks", step: 1 },
      { text: "Serve with ranch for dipping", step: 2 }
    ]
  },
  {
    title: "Smoothie Bowl",
    description: "Thick, creamy smoothie bowl topped with fresh fruit and granola",
    cookTime: 5,
    cuisine: "American",
    mealType: "snack",
    calories: 220,
    protein: 8,
    carbs: 35,
    fat: 6,
    fiber: 5,
    sugar: 25,
    ingredients: [
      { text: "1 frozen banana", order: 1 },
      { text: "1/2 cup frozen berries", order: 2 },
      { text: "1/4 cup Greek yogurt", order: 3 },
      { text: "2 tbsp granola", order: 4 },
      { text: "Fresh fruit for topping", order: 5 }
    ],
    instructions: [
      { text: "Blend banana, berries, and yogurt until thick", step: 1 },
      { text: "Pour into bowl", step: 2 },
      { text: "Top with granola and fresh fruit", step: 3 }
    ]
  },
  {
    title: "Roasted Chickpeas",
    description: "Crispy, seasoned roasted chickpeas",
    cookTime: 30,
    cuisine: "Mediterranean",
    mealType: "snack",
    calories: 130,
    protein: 6,
    carbs: 22,
    fat: 3,
    fiber: 6,
    sugar: 4,
    ingredients: [
      { text: "1 can chickpeas, drained and rinsed", order: 1 },
      { text: "1 tbsp olive oil", order: 2 },
      { text: "1 tsp paprika", order: 3 },
      { text: "1/2 tsp garlic powder", order: 4 },
      { text: "Pinch of salt", order: 5 }
    ],
    instructions: [
      { text: "Preheat oven to 400°F (200°C)", step: 1 },
      { text: "Toss chickpeas with oil and spices", step: 2 },
      { text: "Spread on baking sheet", step: 3 },
      { text: "Roast for 25-30 minutes until crispy", step: 4 }
    ]
  },
  {
    title: "Cucumber Slices with Tzatziki",
    description: "Fresh cucumber slices with Greek tzatziki dip",
    cookTime: 5,
    cuisine: "Mediterranean",
    mealType: "snack",
    calories: 80,
    protein: 3,
    carbs: 8,
    fat: 4,
    fiber: 1,
    sugar: 4,
    ingredients: [
      { text: "1 cucumber, sliced", order: 1 },
      { text: "1/4 cup tzatziki", order: 2 }
    ],
    instructions: [
      { text: "Slice cucumber into rounds", step: 1 },
      { text: "Serve with tzatziki for dipping", step: 2 }
    ]
  },
  {
    title: "Beef Jerky",
    description: "High-protein beef jerky, perfect for on-the-go snacking",
    cookTime: 240,
    cuisine: "American",
    mealType: "snack",
    calories: 115,
    protein: 9,
    carbs: 3,
    fat: 7,
    fiber: 0,
    sugar: 2,
    ingredients: [
      { text: "1 lb lean beef, sliced thin", order: 1 },
      { text: "2 tbsp soy sauce", order: 2 },
      { text: "1 tsp Worcestershire sauce", order: 3 },
      { text: "1/2 tsp black pepper", order: 4 }
    ],
    instructions: [
      { text: "Marinate beef in soy sauce, Worcestershire, and pepper", step: 1 },
      { text: "Dehydrate at 165°F for 4-6 hours", step: 2 },
      { text: "Store in airtight container", step: 3 }
    ]
  },
  {
    title: "Kale Chips",
    description: "Crispy, baked kale chips with seasonings",
    cookTime: 15,
    cuisine: "American",
    mealType: "snack",
    calories: 60,
    protein: 3,
    carbs: 8,
    fat: 2,
    fiber: 2,
    sugar: 2,
    ingredients: [
      { text: "4 cups kale, torn into pieces", order: 1 },
      { text: "1 tbsp olive oil", order: 2 },
      { text: "1/4 tsp salt", order: 3 },
      { text: "1/4 tsp garlic powder", order: 4 }
    ],
    instructions: [
      { text: "Preheat oven to 350°F (175°C)", step: 1 },
      { text: "Toss kale with oil and seasonings", step: 2 },
      { text: "Spread on baking sheet", step: 3 },
      { text: "Bake for 10-12 minutes until crispy", step: 4 }
    ]
  },
  {
    title: "Tuna Salad on Crackers",
    description: "Protein-rich tuna salad served on whole grain crackers",
    cookTime: 5,
    cuisine: "American",
    mealType: "snack",
    calories: 180,
    protein: 15,
    carbs: 15,
    fat: 7,
    fiber: 2,
    sugar: 2,
    ingredients: [
      { text: "1 can tuna, drained", order: 1 },
      { text: "2 tbsp Greek yogurt", order: 2 },
      { text: "1 tbsp diced celery", order: 3 },
      { text: "6 whole grain crackers", order: 4 }
    ],
    instructions: [
      { text: "Mix tuna with yogurt and celery", step: 1 },
      { text: "Season with salt and pepper", step: 2 },
      { text: "Serve on crackers", step: 3 }
    ]
  },
  {
    title: "Fruit Salad",
    description: "Fresh mixed fruit salad",
    cookTime: 5,
    cuisine: "American",
    mealType: "snack",
    calories: 90,
    protein: 1,
    carbs: 22,
    fat: 0,
    fiber: 3,
    sugar: 18,
    ingredients: [
      { text: "1/2 cup strawberries, sliced", order: 1 },
      { text: "1/2 cup blueberries", order: 2 },
      { text: "1/2 cup grapes", order: 3 },
      { text: "1/2 cup melon chunks", order: 4 }
    ],
    instructions: [
      { text: "Wash and prepare all fruits", step: 1 },
      { text: "Combine in a bowl", step: 2 },
      { text: "Serve chilled", step: 3 }
    ]
  },
  {
    title: "Pita Chips with Hummus",
    description: "Crispy pita chips with creamy hummus",
    cookTime: 10,
    cuisine: "Mediterranean",
    mealType: "snack",
    calories: 200,
    protein: 7,
    carbs: 28,
    fat: 7,
    fiber: 4,
    sugar: 2,
    ingredients: [
      { text: "2 pita breads, cut into triangles", order: 1 },
      { text: "1 tbsp olive oil", order: 2 },
      { text: "1/2 cup hummus", order: 3 }
    ],
    instructions: [
      { text: "Preheat oven to 400°F (200°C)", step: 1 },
      { text: "Brush pita with oil and bake for 8-10 minutes", step: 2 },
      { text: "Serve with hummus", step: 3 }
    ]
  },
  {
    title: "Energy Balls",
    description: "No-bake energy balls with dates, nuts, and cocoa",
    cookTime: 15,
    cuisine: "American",
    mealType: "snack",
    calories: 120,
    protein: 3,
    carbs: 15,
    fat: 6,
    fiber: 3,
    sugar: 11,
    ingredients: [
      { text: "1 cup dates, pitted", order: 1 },
      { text: "1/2 cup almonds", order: 2 },
      { text: "2 tbsp cocoa powder", order: 3 },
      { text: "1 tbsp coconut oil", order: 4 }
    ],
    instructions: [
      { text: "Process dates and almonds in food processor", step: 1 },
      { text: "Add cocoa and coconut oil", step: 2 },
      { text: "Form into balls", step: 3 },
      { text: "Refrigerate for 1 hour", step: 4 }
    ]
  },
  {
    title: "Sliced Turkey Roll-Ups",
    description: "Turkey slices rolled with cheese and vegetables",
    cookTime: 3,
    cuisine: "American",
    mealType: "snack",
    calories: 100,
    protein: 12,
    carbs: 2,
    fat: 4,
    fiber: 1,
    sugar: 1,
    ingredients: [
      { text: "2 oz sliced turkey", order: 1 },
      { text: "1 slice cheese", order: 2 },
      { text: "2 lettuce leaves", order: 3 }
    ],
    instructions: [
      { text: "Layer cheese and lettuce on turkey", step: 1 },
      { text: "Roll up tightly", step: 2 },
      { text: "Serve immediately", step: 3 }
    ]
  },
  {
    title: "Roasted Almonds",
    description: "Simple roasted almonds with sea salt",
    cookTime: 15,
    cuisine: "American",
    mealType: "snack",
    calories: 170,
    protein: 6,
    carbs: 6,
    fat: 15,
    fiber: 3,
    sugar: 1,
    ingredients: [
      { text: "1/4 cup raw almonds", order: 1 },
      { text: "1 tsp olive oil", order: 2 },
      { text: "Pinch of sea salt", order: 3 }
    ],
    instructions: [
      { text: "Preheat oven to 350°F (175°C)", step: 1 },
      { text: "Toss almonds with oil and salt", step: 2 },
      { text: "Roast for 12-15 minutes", step: 3 },
      { text: "Cool before serving", step: 4 }
    ]
  },
  {
    title: "Veggie Sticks with Ranch",
    description: "Assorted fresh vegetables with ranch dip",
    cookTime: 5,
    cuisine: "American",
    mealType: "snack",
    calories: 110,
    protein: 2,
    carbs: 8,
    fat: 8,
    fiber: 2,
    sugar: 5,
    ingredients: [
      { text: "1/2 cup carrot sticks", order: 1 },
      { text: "1/2 cup celery sticks", order: 2 },
      { text: "1/2 cup bell pepper strips", order: 3 },
      { text: "2 tbsp ranch dressing", order: 4 }
    ],
    instructions: [
      { text: "Cut vegetables into sticks", step: 1 },
      { text: "Arrange on plate", step: 2 },
      { text: "Serve with ranch for dipping", step: 3 }
    ]
  },
  {
    title: "Chia Pudding",
    description: "Creamy chia seed pudding with berries",
    cookTime: 5,
    cuisine: "American",
    mealType: "snack",
    calories: 180,
    protein: 5,
    carbs: 22,
    fat: 8,
    fiber: 10,
    sugar: 12,
    ingredients: [
      { text: "3 tbsp chia seeds", order: 1 },
      { text: "1 cup almond milk", order: 2 },
      { text: "1 tsp honey", order: 3 },
      { text: "1/4 cup berries", order: 4 }
    ],
    instructions: [
      { text: "Mix chia seeds with almond milk and honey", step: 1 },
      { text: "Refrigerate for at least 4 hours", step: 2 },
      { text: "Top with berries before serving", step: 3 }
    ]
  },
  {
    title: "Sliced Pear with Cheese",
    description: "Fresh pear slices with sharp cheddar cheese",
    cookTime: 2,
    cuisine: "American",
    mealType: "snack",
    calories: 150,
    protein: 6,
    carbs: 20,
    fat: 5,
    fiber: 4,
    sugar: 15,
    ingredients: [
      { text: "1 medium pear, sliced", order: 1 },
      { text: "1 oz sharp cheddar cheese", order: 2 }
    ],
    instructions: [
      { text: "Slice pear into wedges", step: 1 },
      { text: "Serve with cheese slices", step: 2 }
    ]
  },
  {
    title: "Popcorn",
    description: "Light, airy popcorn - a low-calorie snack",
    cookTime: 5,
    cuisine: "American",
    mealType: "snack",
    calories: 100,
    protein: 3,
    carbs: 20,
    fat: 1,
    fiber: 4,
    sugar: 0,
    ingredients: [
      { text: "1/4 cup popcorn kernels", order: 1 },
      { text: "1 tsp olive oil", order: 2 },
      { text: "Pinch of salt", order: 3 }
    ],
    instructions: [
      { text: "Heat oil in large pot", step: 1 },
      { text: "Add kernels and cover", step: 2 },
      { text: "Shake until popping stops", step: 3 },
      { text: "Season with salt", step: 4 }
    ]
  },
  {
    title: "Sliced Cucumber with Salt",
    description: "Simple, refreshing cucumber slices",
    cookTime: 2,
    cuisine: "American",
    mealType: "snack",
    calories: 16,
    protein: 1,
    carbs: 4,
    fat: 0,
    fiber: 1,
    sugar: 2,
    ingredients: [
      { text: "1 medium cucumber, sliced", order: 1 },
      { text: "Pinch of salt", order: 2 }
    ],
    instructions: [
      { text: "Slice cucumber into rounds", step: 1 },
      { text: "Sprinkle with salt", step: 2 },
      { text: "Serve immediately", step: 3 }
    ]
  },
  {
    title: "Sunflower Seeds",
    description: "Roasted sunflower seeds for a quick snack",
    cookTime: 0,
    cuisine: "American",
    mealType: "snack",
    calories: 165,
    protein: 6,
    carbs: 6,
    fat: 14,
    fiber: 3,
    sugar: 1,
    ingredients: [
      { text: "1/4 cup roasted sunflower seeds", order: 1 }
    ],
    instructions: [
      { text: "Portion out sunflower seeds", step: 1 },
      { text: "Enjoy as a snack", step: 2 }
    ]
  },
  {
    title: "Sliced Tomatoes with Mozzarella",
    description: "Fresh tomato and mozzarella slices",
    cookTime: 3,
    cuisine: "Italian",
    mealType: "snack",
    calories: 120,
    protein: 8,
    carbs: 6,
    fat: 7,
    fiber: 1,
    sugar: 4,
    ingredients: [
      { text: "1 medium tomato, sliced", order: 1 },
      { text: "2 oz fresh mozzarella, sliced", order: 2 },
      { text: "1 tsp balsamic vinegar", order: 3 },
      { text: "Fresh basil leaves", order: 4 }
    ],
    instructions: [
      { text: "Slice tomato and mozzarella", step: 1 },
      { text: "Arrange on plate", step: 2 },
      { text: "Drizzle with balsamic and top with basil", step: 3 }
    ]
  },
  {
    title: "Oatmeal with Berries",
    description: "Warm oatmeal topped with fresh berries",
    cookTime: 5,
    cuisine: "American",
    mealType: "snack",
    calories: 200,
    protein: 6,
    carbs: 38,
    fat: 4,
    fiber: 5,
    sugar: 12,
    ingredients: [
      { text: "1/2 cup rolled oats", order: 1 },
      { text: "1 cup water or milk", order: 2 },
      { text: "1/2 cup mixed berries", order: 3 },
      { text: "1 tsp honey", order: 4 }
    ],
    instructions: [
      { text: "Cook oats according to package directions", step: 1 },
      { text: "Top with berries and honey", step: 2 },
      { text: "Serve warm", step: 3 }
    ]
  },
  {
    title: "Sliced Bell Peppers",
    description: "Fresh, crunchy bell pepper slices",
    cookTime: 2,
    cuisine: "American",
    mealType: "snack",
    calories: 30,
    protein: 1,
    carbs: 7,
    fat: 0,
    fiber: 2,
    sugar: 5,
    ingredients: [
      { text: "1 bell pepper, any color, sliced", order: 1 }
    ],
    instructions: [
      { text: "Wash and slice bell pepper", step: 1 },
      { text: "Remove seeds and membranes", step: 2 },
      { text: "Serve as a crunchy snack", step: 3 }
    ]
  },
  {
    title: "Pistachios",
    description: "Shelled pistachios, a protein and fiber-rich snack",
    cookTime: 0,
    cuisine: "Mediterranean",
    mealType: "snack",
    calories: 160,
    protein: 6,
    carbs: 8,
    fat: 13,
    fiber: 3,
    sugar: 2,
    ingredients: [
      { text: "1/4 cup shelled pistachios", order: 1 }
    ],
    instructions: [
      { text: "Portion out pistachios", step: 1 },
      { text: "Enjoy as a healthy snack", step: 2 }
    ]
  },
  {
    title: "Sliced Mango",
    description: "Fresh, sweet mango slices",
    cookTime: 3,
    cuisine: "Tropical",
    mealType: "snack",
    calories: 100,
    protein: 1,
    carbs: 25,
    fat: 0,
    fiber: 3,
    sugar: 23,
    ingredients: [
      { text: "1 medium mango, peeled and sliced", order: 1 }
    ],
    instructions: [
      { text: "Peel and slice mango", step: 1 },
      { text: "Remove pit", step: 2 },
      { text: "Serve fresh", step: 3 }
    ]
  },
  {
    title: "Cottage Cheese with Berries",
    description: "High-protein cottage cheese with fresh mixed berries",
    cookTime: 2,
    cuisine: "American",
    mealType: "snack",
    calories: 150,
    protein: 16,
    carbs: 18,
    fat: 2,
    fiber: 2,
    sugar: 14,
    ingredients: [
      { text: "1/2 cup cottage cheese", order: 1 },
      { text: "1/2 cup mixed berries", order: 2 }
    ],
    instructions: [
      { text: "Scoop cottage cheese into bowl", step: 1 },
      { text: "Top with fresh berries", step: 2 }
    ]
  },
  {
    title: "Sliced Watermelon",
    description: "Refreshing, hydrating watermelon slices",
    cookTime: 3,
    cuisine: "American",
    mealType: "snack",
    calories: 46,
    protein: 1,
    carbs: 12,
    fat: 0,
    fiber: 1,
    sugar: 10,
    ingredients: [
      { text: "1 cup watermelon, sliced", order: 1 }
    ],
    instructions: [
      { text: "Cut watermelon into slices or cubes", step: 1 },
      { text: "Serve chilled", step: 2 }
    ]
  },
  {
    title: "Greek Yogurt with Honey",
    description: "Simple Greek yogurt drizzled with honey",
    cookTime: 1,
    cuisine: "Mediterranean",
    mealType: "snack",
    calories: 150,
    protein: 12,
    carbs: 20,
    fat: 3,
    fiber: 0,
    sugar: 19,
    ingredients: [
      { text: "1/2 cup Greek yogurt", order: 1 },
      { text: "1 tbsp honey", order: 2 }
    ],
    instructions: [
      { text: "Scoop yogurt into bowl", step: 1 },
      { text: "Drizzle with honey", step: 2 },
      { text: "Serve immediately", step: 3 }
    ]
  },
  {
    title: "Sliced Oranges",
    description: "Fresh, vitamin C-rich orange slices",
    cookTime: 2,
    cuisine: "American",
    mealType: "snack",
    calories: 62,
    protein: 1,
    carbs: 15,
    fat: 0,
    fiber: 3,
    sugar: 12,
    ingredients: [
      { text: "1 medium orange, peeled and sliced", order: 1 }
    ],
    instructions: [
      { text: "Peel orange", step: 1 },
      { text: "Separate into segments", step: 2 },
      { text: "Serve fresh", step: 3 }
    ]
  },
  {
    title: "Almonds and Raisins",
    description: "Classic combination of almonds and raisins",
    cookTime: 0,
    cuisine: "American",
    mealType: "snack",
    calories: 180,
    protein: 5,
    carbs: 20,
    fat: 10,
    fiber: 3,
    sugar: 16,
    ingredients: [
      { text: "2 tbsp almonds", order: 1 },
      { text: "2 tbsp raisins", order: 2 }
    ],
    instructions: [
      { text: "Combine almonds and raisins", step: 1 },
      { text: "Mix and serve", step: 2 }
    ]
  },
  {
    title: "Sliced Kiwi",
    description: "Tart and sweet kiwi slices",
    cookTime: 2,
    cuisine: "Tropical",
    mealType: "snack",
    calories: 42,
    protein: 1,
    carbs: 10,
    fat: 0,
    fiber: 2,
    sugar: 6,
    ingredients: [
      { text: "1 medium kiwi, peeled and sliced", order: 1 }
    ],
    instructions: [
      { text: "Peel kiwi", step: 1 },
      { text: "Slice into rounds", step: 2 },
      { text: "Serve fresh", step: 3 }
    ]
  },
  {
    title: "Sliced Radishes",
    description: "Peppery, crisp radish slices",
    cookTime: 2,
    cuisine: "American",
    mealType: "snack",
    calories: 19,
    protein: 1,
    carbs: 4,
    fat: 0,
    fiber: 2,
    sugar: 2,
    ingredients: [
      { text: "4-5 radishes, sliced", order: 1 },
      { text: "Pinch of salt", order: 2 }
    ],
    instructions: [
      { text: "Wash and slice radishes", step: 1 },
      { text: "Sprinkle with salt", step: 2 },
      { text: "Serve as a crunchy snack", step: 3 }
    ]
  },
  {
    title: "Sliced Jicama",
    description: "Crisp, refreshing jicama slices",
    cookTime: 3,
    cuisine: "Mexican",
    mealType: "snack",
    calories: 46,
    protein: 1,
    carbs: 11,
    fat: 0,
    fiber: 6,
    sugar: 2,
    ingredients: [
      { text: "1 cup jicama, peeled and sliced", order: 1 },
      { text: "1 tsp lime juice", order: 2 },
      { text: "Pinch of chili powder", order: 3 }
    ],
    instructions: [
      { text: "Peel and slice jicama", step: 1 },
      { text: "Toss with lime juice and chili powder", step: 2 },
      { text: "Serve chilled", step: 3 }
    ]
  },
  {
    title: "Sliced Zucchini",
    description: "Fresh zucchini slices, perfect for dipping",
    cookTime: 2,
    cuisine: "American",
    mealType: "snack",
    calories: 20,
    protein: 1,
    carbs: 4,
    fat: 0,
    fiber: 1,
    sugar: 3,
    ingredients: [
      { text: "1 medium zucchini, sliced", order: 1 }
    ],
    instructions: [
      { text: "Wash and slice zucchini", step: 1 },
      { text: "Serve as a fresh snack", step: 2 }
    ]
  },
  {
    title: "Sliced Peaches",
    description: "Sweet, juicy peach slices",
    cookTime: 2,
    cuisine: "American",
    mealType: "snack",
    calories: 60,
    protein: 1,
    carbs: 15,
    fat: 0,
    fiber: 2,
    sugar: 13,
    ingredients: [
      { text: "1 medium peach, pitted and sliced", order: 1 }
    ],
    instructions: [
      { text: "Wash and pit peach", step: 1 },
      { text: "Slice into wedges", step: 2 },
      { text: "Serve fresh", step: 3 }
    ]
  },
  {
    title: "Sliced Plums",
    description: "Sweet and tart plum slices",
    cookTime: 2,
    cuisine: "American",
    mealType: "snack",
    calories: 30,
    protein: 0,
    carbs: 8,
    fat: 0,
    fiber: 1,
    sugar: 7,
    ingredients: [
      { text: "1 medium plum, pitted and sliced", order: 1 }
    ],
    instructions: [
      { text: "Wash and pit plum", step: 1 },
      { text: "Slice into wedges", step: 2 },
      { text: "Serve fresh", step: 3 }
    ]
  },
  {
    title: "Sliced Cherries",
    description: "Sweet cherry halves",
    cookTime: 2,
    cuisine: "American",
    mealType: "snack",
    calories: 50,
    protein: 1,
    carbs: 12,
    fat: 0,
    fiber: 2,
    sugar: 10,
    ingredients: [
      { text: "1/2 cup cherries, pitted and halved", order: 1 }
    ],
    instructions: [
      { text: "Wash and pit cherries", step: 1 },
      { text: "Halve cherries", step: 2 },
      { text: "Serve fresh", step: 3 }
    ]
  },
  {
    title: "Sliced Strawberries",
    description: "Fresh, sweet strawberry slices",
    cookTime: 2,
    cuisine: "American",
    mealType: "snack",
    calories: 49,
    protein: 1,
    carbs: 12,
    fat: 0,
    fiber: 3,
    sugar: 7,
    ingredients: [
      { text: "1 cup strawberries, hulled and sliced", order: 1 }
    ],
    instructions: [
      { text: "Wash and hull strawberries", step: 1 },
      { text: "Slice into halves or quarters", step: 2 },
      { text: "Serve fresh", step: 3 }
    ]
  },
  {
    title: "Sliced Blueberries",
    description: "Antioxidant-rich fresh blueberries",
    cookTime: 1,
    cuisine: "American",
    mealType: "snack",
    calories: 42,
    protein: 1,
    carbs: 11,
    fat: 0,
    fiber: 2,
    sugar: 7,
    ingredients: [
      { text: "1/2 cup fresh blueberries", order: 1 }
    ],
    instructions: [
      { text: "Wash blueberries", step: 1 },
      { text: "Serve fresh", step: 2 }
    ]
  },
  {
    title: "Sliced Raspberries",
    description: "Tart and sweet fresh raspberries",
    cookTime: 1,
    cuisine: "American",
    mealType: "snack",
    calories: 32,
    protein: 1,
    carbs: 7,
    fat: 0,
    fiber: 4,
    sugar: 3,
    ingredients: [
      { text: "1/2 cup fresh raspberries", order: 1 }
    ],
    instructions: [
      { text: "Wash raspberries gently", step: 1 },
      { text: "Serve fresh", step: 2 }
    ]
  },
  {
    title: "Sliced Blackberries",
    description: "Sweet and tart fresh blackberries",
    cookTime: 1,
    cuisine: "American",
    mealType: "snack",
    calories: 31,
    protein: 1,
    carbs: 7,
    fat: 0,
    fiber: 4,
    sugar: 3,
    ingredients: [
      { text: "1/2 cup fresh blackberries", order: 1 }
    ],
    instructions: [
      { text: "Wash blackberries gently", step: 1 },
      { text: "Serve fresh", step: 2 }
    ]
  },
  {
    title: "Sliced Cantaloupe",
    description: "Sweet, hydrating cantaloupe slices",
    cookTime: 3,
    cuisine: "American",
    mealType: "snack",
    calories: 54,
    protein: 1,
    carbs: 13,
    fat: 0,
    fiber: 1,
    sugar: 12,
    ingredients: [
      { text: "1 cup cantaloupe, cubed", order: 1 }
    ],
    instructions: [
      { text: "Cut cantaloupe in half and remove seeds", step: 1 },
      { text: "Slice or cube the flesh", step: 2 },
      { text: "Serve chilled", step: 3 }
    ]
  },
  {
    title: "Sliced Honeydew",
    description: "Sweet, refreshing honeydew melon",
    cookTime: 3,
    cuisine: "American",
    mealType: "snack",
    calories: 61,
    protein: 1,
    carbs: 16,
    fat: 0,
    fiber: 1,
    sugar: 14,
    ingredients: [
      { text: "1 cup honeydew, cubed", order: 1 }
    ],
    instructions: [
      { text: "Cut honeydew in half and remove seeds", step: 1 },
      { text: "Slice or cube the flesh", step: 2 },
      { text: "Serve chilled", step: 3 }
    ]
  },
  {
    title: "Sliced Pineapple",
    description: "Tropical, sweet pineapple chunks",
    cookTime: 3,
    cuisine: "Tropical",
    mealType: "snack",
    calories: 82,
    protein: 1,
    carbs: 22,
    fat: 0,
    fiber: 2,
    sugar: 16,
    ingredients: [
      { text: "1 cup fresh pineapple chunks", order: 1 }
    ],
    instructions: [
      { text: "Peel and core pineapple", step: 1 },
      { text: "Cut into chunks", step: 2 },
      { text: "Serve fresh", step: 3 }
    ]
  },
  {
    title: "Sliced Papaya",
    description: "Tropical, sweet papaya slices",
    cookTime: 3,
    cuisine: "Tropical",
    mealType: "snack",
    calories: 55,
    protein: 1,
    carbs: 14,
    fat: 0,
    fiber: 3,
    sugar: 8,
    ingredients: [
      { text: "1 cup papaya, cubed", order: 1 }
    ],
    instructions: [
      { text: "Peel and seed papaya", step: 1 },
      { text: "Cut into cubes", step: 2 },
      { text: "Serve fresh", step: 3 }
    ]
  },
  {
    title: "Sliced Grapes",
    description: "Sweet, juicy grape halves",
    cookTime: 1,
    cuisine: "American",
    mealType: "snack",
    calories: 62,
    protein: 1,
    carbs: 16,
    fat: 0,
    fiber: 1,
    sugar: 15,
    ingredients: [
      { text: "1 cup grapes, halved", order: 1 }
    ],
    instructions: [
      { text: "Wash grapes", step: 1 },
      { text: "Halve larger grapes if desired", step: 2 },
      { text: "Serve fresh", step: 3 }
    ]
  },
  {
    title: "Cottage Cheese with Pineapple",
    description: "Protein-rich cottage cheese topped with sweet pineapple chunks",
    cookTime: 2,
    cuisine: "American",
    mealType: "snack",
    calories: 150,
    protein: 14,
    carbs: 18,
    fat: 2,
    fiber: 1,
    sugar: 15,
    ingredients: [
      { text: "1/2 cup cottage cheese", order: 1 },
      { text: "1/2 cup pineapple chunks", order: 2 }
    ],
    instructions: [
      { text: "Scoop cottage cheese into a bowl", step: 1 },
      { text: "Top with pineapple chunks", step: 2 },
      { text: "Serve immediately", step: 3 }
    ]
  },
  {
    title: "Rice Cakes with Avocado",
    description: "Whole grain rice cakes topped with mashed avocado and sea salt",
    cookTime: 3,
    cuisine: "American",
    mealType: "snack",
    calories: 180,
    protein: 4,
    carbs: 22,
    fat: 9,
    fiber: 4,
    sugar: 1,
    ingredients: [
      { text: "2 brown rice cakes", order: 1 },
      { text: "1/2 avocado, mashed", order: 2 },
      { text: "Pinch of sea salt", order: 3 },
      { text: "Red pepper flakes (optional)", order: 4 }
    ],
    instructions: [
      { text: "Mash avocado with a fork", step: 1 },
      { text: "Spread on rice cakes", step: 2 },
      { text: "Sprinkle with sea salt and red pepper flakes", step: 3 }
    ]
  },
  {
    title: "Trail Mix",
    description: "Homemade trail mix with nuts, dried fruit, and dark chocolate",
    cookTime: 5,
    cuisine: "American",
    mealType: "snack",
    calories: 200,
    protein: 6,
    carbs: 20,
    fat: 12,
    fiber: 4,
    sugar: 12,
    ingredients: [
      { text: "1/4 cup almonds", order: 1 },
      { text: "1/4 cup cashews", order: 2 },
      { text: "2 tbsp dried cranberries", order: 3 },
      { text: "2 tbsp dark chocolate chips", order: 4 },
      { text: "1 tbsp pumpkin seeds", order: 5 }
    ],
    instructions: [
      { text: "Combine all ingredients in a bowl", step: 1 },
      { text: "Mix well", step: 2 },
      { text: "Portion into snack-sized servings", step: 3 }
    ]
  },
  {
    title: "Smoothie Bowl",
    description: "Thick smoothie bowl topped with fresh fruit and granola",
    cookTime: 5,
    cuisine: "American",
    mealType: "snack",
    calories: 250,
    protein: 8,
    carbs: 45,
    fat: 6,
    fiber: 6,
    sugar: 30,
    ingredients: [
      { text: "1 frozen banana", order: 1 },
      { text: "1/2 cup frozen berries", order: 2 },
      { text: "1/4 cup Greek yogurt", order: 3 },
      { text: "2 tbsp granola", order: 4 },
      { text: "Fresh berries for topping", order: 5 }
    ],
    instructions: [
      { text: "Blend frozen banana, berries, and yogurt until thick", step: 1 },
      { text: "Pour into a bowl", step: 2 },
      { text: "Top with granola and fresh berries", step: 3 }
    ]
  },
  {
    title: "Cucumber Slices with Tzatziki",
    description: "Fresh cucumber slices with creamy Greek tzatziki dip",
    cookTime: 5,
    cuisine: "Mediterranean",
    mealType: "snack",
    calories: 80,
    protein: 3,
    carbs: 8,
    fat: 4,
    fiber: 1,
    sugar: 4,
    ingredients: [
      { text: "1 cucumber, sliced", order: 1 },
      { text: "1/4 cup tzatziki sauce", order: 2 }
    ],
    instructions: [
      { text: "Slice cucumber into rounds", step: 1 },
      { text: "Serve with tzatziki for dipping", step: 2 }
    ]
  },
  {
    title: "Oatmeal Energy Bites",
    description: "No-bake oatmeal bites with peanut butter and honey",
    cookTime: 20,
    cuisine: "American",
    mealType: "snack",
    calories: 140,
    protein: 4,
    carbs: 18,
    fat: 6,
    fiber: 2,
    sugar: 10,
    ingredients: [
      { text: "1 cup rolled oats", order: 1 },
      { text: "1/2 cup peanut butter", order: 2 },
      { text: "1/3 cup honey", order: 3 },
      { text: "1/4 cup mini chocolate chips", order: 4 },
      { text: "1 tsp vanilla extract", order: 5 }
    ],
    instructions: [
      { text: "Mix all ingredients in a bowl", step: 1 },
      { text: "Form into small balls", step: 2 },
      { text: "Refrigerate for 30 minutes", step: 3 }
    ]
  },
  {
    title: "Bell Pepper Strips with Guacamole",
    description: "Colorful bell pepper strips with fresh guacamole",
    cookTime: 5,
    cuisine: "Mexican",
    mealType: "snack",
    calories: 120,
    protein: 2,
    carbs: 10,
    fat: 9,
    fiber: 4,
    sugar: 6,
    ingredients: [
      { text: "1 bell pepper, cut into strips", order: 1 },
      { text: "1/4 cup guacamole", order: 2 }
    ],
    instructions: [
      { text: "Cut bell pepper into strips", step: 1 },
      { text: "Serve with guacamole for dipping", step: 2 }
    ]
  },
  {
    title: "Chia Pudding",
    description: "Creamy chia seed pudding with vanilla and berries",
    cookTime: 5,
    cuisine: "American",
    mealType: "snack",
    calories: 180,
    protein: 6,
    carbs: 20,
    fat: 9,
    fiber: 10,
    sugar: 8,
    ingredients: [
      { text: "3 tbsp chia seeds", order: 1 },
      { text: "1 cup almond milk", order: 2 },
      { text: "1 tsp vanilla extract", order: 3 },
      { text: "1 tsp honey", order: 4 },
      { text: "Fresh berries for topping", order: 5 }
    ],
    instructions: [
      { text: "Mix chia seeds, almond milk, vanilla, and honey", step: 1 },
      { text: "Stir well and refrigerate for 4 hours or overnight", step: 2 },
      { text: "Top with fresh berries before serving", step: 3 }
    ]
  },
  {
    title: "Roasted Chickpeas",
    description: "Crispy roasted chickpeas with spices",
    cookTime: 30,
    cuisine: "Mediterranean",
    mealType: "snack",
    calories: 130,
    protein: 7,
    carbs: 20,
    fat: 3,
    fiber: 6,
    sugar: 4,
    ingredients: [
      { text: "1 can chickpeas, drained and rinsed", order: 1 },
      { text: "1 tbsp olive oil", order: 2 },
      { text: "1 tsp paprika", order: 3 },
      { text: "1/2 tsp garlic powder", order: 4 },
      { text: "Salt to taste", order: 5 }
    ],
    instructions: [
      { text: "Preheat oven to 400°F (200°C)", step: 1 },
      { text: "Pat chickpeas dry", step: 2 },
      { text: "Toss with oil and spices", step: 3 },
      { text: "Roast for 25-30 minutes until crispy", step: 4 }
    ]
  },
  {
    title: "String Cheese with Crackers",
    description: "Classic string cheese paired with whole grain crackers",
    cookTime: 1,
    cuisine: "American",
    mealType: "snack",
    calories: 150,
    protein: 10,
    carbs: 12,
    fat: 8,
    fiber: 2,
    sugar: 1,
    ingredients: [
      { text: "1 string cheese", order: 1 },
      { text: "4 whole grain crackers", order: 2 }
    ],
    instructions: [
      { text: "Serve string cheese with crackers", step: 1 }
    ]
  },
  {
    title: "Apple with Cinnamon",
    description: "Sliced apple sprinkled with cinnamon",
    cookTime: 2,
    cuisine: "American",
    mealType: "snack",
    calories: 80,
    protein: 0,
    carbs: 21,
    fat: 0,
    fiber: 4,
    sugar: 16,
    ingredients: [
      { text: "1 medium apple, sliced", order: 1 },
      { text: "1/2 tsp cinnamon", order: 2 }
    ],
    instructions: [
      { text: "Slice apple", step: 1 },
      { text: "Sprinkle with cinnamon", step: 2 },
      { text: "Serve immediately", step: 3 }
    ]
  },
  {
    title: "Yogurt Parfait",
    description: "Layered yogurt parfait with granola and fresh fruit",
    cookTime: 5,
    cuisine: "American",
    mealType: "snack",
    calories: 200,
    protein: 12,
    carbs: 30,
    fat: 5,
    fiber: 3,
    sugar: 20,
    ingredients: [
      { text: "1/2 cup Greek yogurt", order: 1 },
      { text: "2 tbsp granola", order: 2 },
      { text: "1/4 cup fresh berries", order: 3 },
      { text: "1 tsp honey", order: 4 }
    ],
    instructions: [
      { text: "Layer yogurt, granola, and berries in a glass", step: 1 },
      { text: "Drizzle with honey", step: 2 },
      { text: "Serve immediately", step: 3 }
    ]
  },
  {
    title: "Beef Jerky",
    description: "Protein-packed beef jerky, perfect for on-the-go snacking",
    cookTime: 240,
    cuisine: "American",
    mealType: "snack",
    calories: 100,
    protein: 15,
    carbs: 3,
    fat: 3,
    fiber: 0,
    sugar: 2,
    ingredients: [
      { text: "4 oz lean beef", order: 1 },
      { text: "2 tbsp soy sauce", order: 2 },
      { text: "1 tsp Worcestershire sauce", order: 3 },
      { text: "1/2 tsp black pepper", order: 4 }
    ],
    instructions: [
      { text: "Slice beef into thin strips", step: 1 },
      { text: "Marinate in soy sauce, Worcestershire, and pepper", step: 2 },
      { text: "Dehydrate at 160°F for 4-6 hours", step: 3 }
    ]
  },
  {
    title: "Seaweed Snacks",
    description: "Crispy roasted seaweed sheets",
    cookTime: 5,
    cuisine: "Asian",
    mealType: "snack",
    calories: 30,
    protein: 2,
    carbs: 2,
    fat: 1,
    fiber: 1,
    sugar: 0,
    ingredients: [
      { text: "1 package roasted seaweed sheets", order: 1 },
      { text: "Sesame oil (optional)", order: 2 }
    ],
    instructions: [
      { text: "Open package of seaweed", step: 1 },
      { text: "Serve as a light, crispy snack", step: 2 }
    ]
  },
  {
    title: "Pumpkin Seeds",
    description: "Roasted pumpkin seeds with salt",
    cookTime: 20,
    cuisine: "American",
    mealType: "snack",
    calories: 150,
    protein: 7,
    carbs: 5,
    fat: 13,
    fiber: 1,
    sugar: 0,
    ingredients: [
      { text: "1/4 cup pumpkin seeds", order: 1 },
      { text: "1 tsp olive oil", order: 2 },
      { text: "Salt to taste", order: 3 }
    ],
    instructions: [
      { text: "Preheat oven to 300°F (150°C)", step: 1 },
      { text: "Toss seeds with oil and salt", step: 2 },
      { text: "Roast for 15-20 minutes until golden", step: 3 }
    ]
  },
  {
    title: "Rice Paper Rolls",
    description: "Fresh rice paper rolls with vegetables and herbs",
    cookTime: 15,
    cuisine: "Asian",
    mealType: "snack",
    calories: 90,
    protein: 3,
    carbs: 18,
    fat: 1,
    fiber: 2,
    sugar: 3,
    ingredients: [
      { text: "2 rice paper sheets", order: 1 },
      { text: "1/4 cup shredded carrots", order: 2 },
      { text: "1/4 cup cucumber strips", order: 3 },
      { text: "Fresh mint leaves", order: 4 },
      { text: "2 tbsp hoisin sauce", order: 5 }
    ],
    instructions: [
      { text: "Soak rice paper in warm water until pliable", step: 1 },
      { text: "Fill with vegetables and mint", step: 2 },
      { text: "Roll tightly and serve with hoisin sauce", step: 3 }
    ]
  },
  {
    title: "Kale Chips",
    description: "Crispy baked kale chips with olive oil and salt",
    cookTime: 15,
    cuisine: "American",
    mealType: "snack",
    calories: 60,
    protein: 3,
    carbs: 6,
    fat: 3,
    fiber: 2,
    sugar: 0,
    ingredients: [
      { text: "2 cups kale leaves, torn", order: 1 },
      { text: "1 tbsp olive oil", order: 2 },
      { text: "Salt to taste", order: 3 }
    ],
    instructions: [
      { text: "Preheat oven to 350°F (175°C)", step: 1 },
      { text: "Toss kale with oil and salt", step: 2 },
      { text: "Bake for 10-12 minutes until crispy", step: 3 }
    ]
  },
  {
    title: "Coconut Chips",
    description: "Toasted coconut chips, naturally sweet",
    cookTime: 10,
    cuisine: "American",
    mealType: "snack",
    calories: 120,
    protein: 1,
    carbs: 5,
    fat: 12,
    fiber: 3,
    sugar: 2,
    ingredients: [
      { text: "1/2 cup unsweetened coconut flakes", order: 1 },
      { text: "Pinch of salt", order: 2 }
    ],
    instructions: [
      { text: "Preheat oven to 325°F (165°C)", step: 1 },
      { text: "Spread coconut on baking sheet", step: 2 },
      { text: "Bake for 5-7 minutes until golden", step: 3 }
    ]
  },
  {
    title: "Sunflower Seeds",
    description: "Roasted sunflower seeds",
    cookTime: 15,
    cuisine: "American",
    mealType: "snack",
    calories: 160,
    protein: 6,
    carbs: 6,
    fat: 14,
    fiber: 3,
    sugar: 1,
    ingredients: [
      { text: "1/4 cup sunflower seeds", order: 1 },
      { text: "Salt to taste", order: 2 }
    ],
    instructions: [
      { text: "Roast seeds in a dry pan over medium heat", step: 1 },
      { text: "Stir frequently until golden", step: 2 },
      { text: "Season with salt", step: 3 }
    ]
  },
  {
    title: "Cucumber Sandwiches",
    description: "Mini cucumber sandwiches on whole grain bread",
    cookTime: 5,
    cuisine: "American",
    mealType: "snack",
    calories: 120,
    protein: 4,
    carbs: 18,
    fat: 4,
    fiber: 3,
    sugar: 3,
    ingredients: [
      { text: "2 slices whole grain bread", order: 1 },
      { text: "1/4 cucumber, thinly sliced", order: 2 },
      { text: "2 tbsp cream cheese", order: 3 },
      { text: "Fresh dill", order: 4 }
    ],
    instructions: [
      { text: "Spread cream cheese on bread", step: 1 },
      { text: "Layer cucumber slices", step: 2 },
      { text: "Top with dill and serve", step: 3 }
    ]
  },
  {
    title: "Watermelon Cubes",
    description: "Fresh, hydrating watermelon cubes",
    cookTime: 2,
    cuisine: "American",
    mealType: "snack",
    calories: 46,
    protein: 1,
    carbs: 12,
    fat: 0,
    fiber: 1,
    sugar: 10,
    ingredients: [
      { text: "1 cup watermelon, cubed", order: 1 }
    ],
    instructions: [
      { text: "Cut watermelon into cubes", step: 1 },
      { text: "Serve chilled", step: 2 }
    ]
  },
  {
    title: "Cherry Tomatoes",
    description: "Sweet cherry tomatoes, perfect for snacking",
    cookTime: 1,
    cuisine: "American",
    mealType: "snack",
    calories: 27,
    protein: 1,
    carbs: 6,
    fat: 0,
    fiber: 2,
    sugar: 4,
    ingredients: [
      { text: "1 cup cherry tomatoes", order: 1 },
      { text: "Pinch of salt (optional)", order: 2 }
    ],
    instructions: [
      { text: "Wash tomatoes", step: 1 },
      { text: "Serve fresh with optional salt", step: 2 }
    ]
  },
  {
    title: "Mango Slices",
    description: "Fresh, sweet mango slices",
    cookTime: 3,
    cuisine: "American",
    mealType: "snack",
    calories: 100,
    protein: 1,
    carbs: 25,
    fat: 0,
    fiber: 3,
    sugar: 23,
    ingredients: [
      { text: "1 medium mango, sliced", order: 1 }
    ],
    instructions: [
      { text: "Peel and slice mango", step: 1 },
      { text: "Serve fresh", step: 2 }
    ]
  },
  {
    title: "Pear Slices",
    description: "Crisp, sweet pear slices",
    cookTime: 2,
    cuisine: "American",
    mealType: "snack",
    calories: 100,
    protein: 1,
    carbs: 27,
    fat: 0,
    fiber: 6,
    sugar: 17,
    ingredients: [
      { text: "1 medium pear, sliced", order: 1 }
    ],
    instructions: [
      { text: "Wash and slice pear", step: 1 },
      { text: "Serve immediately", step: 2 }
    ]
  },
  {
    title: "Orange Segments",
    description: "Fresh orange segments, rich in vitamin C",
    cookTime: 2,
    cuisine: "American",
    mealType: "snack",
    calories: 62,
    protein: 1,
    carbs: 15,
    fat: 0,
    fiber: 3,
    sugar: 12,
    ingredients: [
      { text: "1 medium orange, segmented", order: 1 }
    ],
    instructions: [
      { text: "Peel orange and separate into segments", step: 1 },
      { text: "Serve fresh", step: 2 }
    ]
  },
  {
    title: "Kiwi Slices",
    description: "Tart and sweet kiwi slices",
    cookTime: 2,
    cuisine: "American",
    mealType: "snack",
    calories: 42,
    protein: 1,
    carbs: 10,
    fat: 0,
    fiber: 2,
    sugar: 6,
    ingredients: [
      { text: "1 kiwi, sliced", order: 1 }
    ],
    instructions: [
      { text: "Peel and slice kiwi", step: 1 },
      { text: "Serve fresh", step: 2 }
    ]
  },
  {
    title: "Strawberry Slices",
    description: "Fresh strawberry slices",
    cookTime: 2,
    cuisine: "American",
    mealType: "snack",
    calories: 49,
    protein: 1,
    carbs: 12,
    fat: 0,
    fiber: 3,
    sugar: 7,
    ingredients: [
      { text: "1 cup strawberries, sliced", order: 1 }
    ],
    instructions: [
      { text: "Wash and slice strawberries", step: 1 },
      { text: "Serve fresh", step: 2 }
    ]
  },
  {
    title: "Blueberry Bowl",
    description: "Fresh blueberries in a bowl",
    cookTime: 1,
    cuisine: "American",
    mealType: "snack",
    calories: 84,
    protein: 1,
    carbs: 21,
    fat: 0,
    fiber: 4,
    sugar: 15,
    ingredients: [
      { text: "1 cup fresh blueberries", order: 1 }
    ],
    instructions: [
      { text: "Wash blueberries", step: 1 },
      { text: "Serve fresh", step: 2 }
    ]
  },
  {
    title: "Raspberry Bowl",
    description: "Fresh raspberries, tart and sweet",
    cookTime: 1,
    cuisine: "American",
    mealType: "snack",
    calories: 64,
    protein: 1,
    carbs: 15,
    fat: 1,
    fiber: 8,
    sugar: 5,
    ingredients: [
      { text: "1 cup fresh raspberries", order: 1 }
    ],
    instructions: [
      { text: "Wash raspberries", step: 1 },
      { text: "Serve fresh", step: 2 }
    ]
  },
  {
    title: "Blackberry Bowl",
    description: "Fresh blackberries",
    cookTime: 1,
    cuisine: "American",
    mealType: "snack",
    calories: 62,
    protein: 2,
    carbs: 14,
    fat: 1,
    fiber: 8,
    sugar: 7,
    ingredients: [
      { text: "1 cup fresh blackberries", order: 1 }
    ],
    instructions: [
      { text: "Wash blackberries", step: 1 },
      { text: "Serve fresh", step: 2 }
    ]
  },
  {
    title: "Peach Slices",
    description: "Juicy peach slices",
    cookTime: 2,
    cuisine: "American",
    mealType: "snack",
    calories: 60,
    protein: 1,
    carbs: 15,
    fat: 0,
    fiber: 2,
    sugar: 13,
    ingredients: [
      { text: "1 medium peach, sliced", order: 1 }
    ],
    instructions: [
      { text: "Wash and slice peach", step: 1 },
      { text: "Serve fresh", step: 2 }
    ]
  },
  {
    title: "Plum Slices",
    description: "Sweet and tart plum slices",
    cookTime: 2,
    cuisine: "American",
    mealType: "snack",
    calories: 46,
    protein: 1,
    carbs: 11,
    fat: 0,
    fiber: 1,
    sugar: 10,
    ingredients: [
      { text: "1 medium plum, sliced", order: 1 }
    ],
    instructions: [
      { text: "Wash and slice plum", step: 1 },
      { text: "Serve fresh", step: 2 }
    ]
  },
  {
    title: "Apricot Halves",
    description: "Fresh apricot halves",
    cookTime: 2,
    cuisine: "American",
    mealType: "snack",
    calories: 34,
    protein: 1,
    carbs: 9,
    fat: 0,
    fiber: 1,
    sugar: 8,
    ingredients: [
      { text: "2 apricots, halved", order: 1 }
    ],
    instructions: [
      { text: "Wash and halve apricots", step: 1 },
      { text: "Remove pit and serve", step: 2 }
    ]
  },
  {
    title: "Cantaloupe Cubes",
    description: "Sweet cantaloupe cubes",
    cookTime: 3,
    cuisine: "American",
    mealType: "snack",
    calories: 54,
    protein: 1,
    carbs: 13,
    fat: 0,
    fiber: 1,
    sugar: 12,
    ingredients: [
      { text: "1 cup cantaloupe, cubed", order: 1 }
    ],
    instructions: [
      { text: "Peel and cube cantaloupe", step: 1 },
      { text: "Serve chilled", step: 2 }
    ]
  },
  {
    title: "Honeydew Cubes",
    description: "Refreshing honeydew melon cubes",
    cookTime: 3,
    cuisine: "American",
    mealType: "snack",
    calories: 61,
    protein: 1,
    carbs: 16,
    fat: 0,
    fiber: 1,
    sugar: 14,
    ingredients: [
      { text: "1 cup honeydew, cubed", order: 1 }
    ],
    instructions: [
      { text: "Peel and cube honeydew", step: 1 },
      { text: "Serve chilled", step: 2 }
    ]
  },
  {
    title: "Pomegranate Seeds",
    description: "Jewel-like pomegranate seeds",
    cookTime: 5,
    cuisine: "Mediterranean",
    mealType: "snack",
    calories: 72,
    protein: 1,
    carbs: 16,
    fat: 1,
    fiber: 4,
    sugar: 12,
    ingredients: [
      { text: "1/2 cup pomegranate seeds", order: 1 }
    ],
    instructions: [
      { text: "Remove seeds from pomegranate", step: 1 },
      { text: "Serve fresh", step: 2 }
    ]
  },
  {
    title: "Dried Apricots",
    description: "Chewy dried apricots, naturally sweet",
    cookTime: 1,
    cuisine: "American",
    mealType: "snack",
    calories: 78,
    protein: 1,
    carbs: 20,
    fat: 0,
    fiber: 2,
    sugar: 16,
    ingredients: [
      { text: "5 dried apricot halves", order: 1 }
    ],
    instructions: [
      { text: "Serve dried apricots", step: 1 }
    ]
  },
  {
    title: "Dried Dates",
    description: "Sweet, chewy dried dates",
    cookTime: 1,
    cuisine: "Mediterranean",
    mealType: "snack",
    calories: 66,
    protein: 0,
    carbs: 18,
    fat: 0,
    fiber: 2,
    sugar: 16,
    ingredients: [
      { text: "2 Medjool dates", order: 1 }
    ],
    instructions: [
      { text: "Remove pits from dates", step: 1 },
      { text: "Serve fresh", step: 2 }
    ]
  },
  {
    title: "Dried Figs",
    description: "Sweet, chewy dried figs",
    cookTime: 1,
    cuisine: "Mediterranean",
    mealType: "snack",
    calories: 47,
    protein: 1,
    carbs: 12,
    fat: 0,
    fiber: 2,
    sugar: 10,
    ingredients: [
      { text: "2 dried figs", order: 1 }
    ],
    instructions: [
      { text: "Serve dried figs", step: 1 }
    ]
  }
];

const desserts = [
  {
    title: "Chocolate Chip Cookies",
    description: "Classic homemade chocolate chip cookies, soft and chewy",
    cookTime: 25,
    cuisine: "American",
    mealType: "dessert",
    calories: 180,
    protein: 2,
    carbs: 24,
    fat: 9,
    fiber: 1,
    sugar: 14,
    ingredients: [
      { text: "1 cup all-purpose flour", order: 1 },
      { text: "1/2 cup butter, softened", order: 2 },
      { text: "1/2 cup brown sugar", order: 3 },
      { text: "1/4 cup white sugar", order: 4 },
      { text: "1 egg", order: 5 },
      { text: "1 tsp vanilla extract", order: 6 },
      { text: "1/2 tsp baking soda", order: 7 },
      { text: "1/2 cup chocolate chips", order: 8 }
    ],
    instructions: [
      { text: "Preheat oven to 375°F (190°C)", step: 1 },
      { text: "Cream butter and sugars together", step: 2 },
      { text: "Beat in egg and vanilla", step: 3 },
      { text: "Mix in flour and baking soda", step: 4 },
      { text: "Stir in chocolate chips", step: 5 },
      { text: "Drop rounded tablespoons onto baking sheet", step: 6 },
      { text: "Bake for 9-11 minutes until golden", step: 7 },
      { text: "Cool on baking sheet for 2 minutes, then transfer to wire rack", step: 8 }
    ]
  },
  {
    title: "Vanilla Ice Cream",
    description: "Creamy homemade vanilla ice cream",
    cookTime: 30,
    cuisine: "American",
    mealType: "dessert",
    calories: 200,
    protein: 3,
    carbs: 22,
    fat: 11,
    fiber: 0,
    sugar: 20,
    ingredients: [
      { text: "2 cups heavy cream", order: 1 },
      { text: "1 cup whole milk", order: 2 },
      { text: "3/4 cup sugar", order: 3 },
      { text: "1 tbsp vanilla extract", order: 4 },
      { text: "Pinch of salt", order: 5 }
    ],
    instructions: [
      { text: "Heat milk and sugar until sugar dissolves", step: 1 },
      { text: "Remove from heat and stir in cream and vanilla", step: 2 },
      { text: "Add salt and mix well", step: 3 },
      { text: "Chill mixture completely", step: 4 },
      { text: "Churn in ice cream maker according to manufacturer's instructions", step: 5 },
      { text: "Freeze until firm, about 4 hours", step: 6 }
    ]
  },
  {
    title: "Chocolate Cake",
    description: "Rich and moist chocolate layer cake",
    cookTime: 45,
    cuisine: "American",
    mealType: "dessert",
    calories: 320,
    protein: 5,
    carbs: 45,
    fat: 14,
    fiber: 2,
    sugar: 30,
    ingredients: [
      { text: "1 3/4 cups all-purpose flour", order: 1 },
      { text: "2 cups sugar", order: 2 },
      { text: "3/4 cup cocoa powder", order: 3 },
      { text: "2 tsp baking soda", order: 4 },
      { text: "1 tsp baking powder", order: 5 },
      { text: "1 tsp salt", order: 6 },
      { text: "2 eggs", order: 7 },
      { text: "1 cup buttermilk", order: 8 },
      { text: "1 cup strong black coffee", order: 9 },
      { text: "1/2 cup vegetable oil", order: 10 }
    ],
    instructions: [
      { text: "Preheat oven to 350°F (175°C)", step: 1 },
      { text: "Grease and flour two 9-inch round pans", step: 2 },
      { text: "Mix dry ingredients in a large bowl", step: 3 },
      { text: "Add eggs, buttermilk, coffee, and oil", step: 4 },
      { text: "Beat on medium speed for 2 minutes", step: 5 },
      { text: "Pour into prepared pans", step: 6 },
      { text: "Bake for 30-35 minutes until toothpick comes out clean", step: 7 },
      { text: "Cool completely before frosting", step: 8 }
    ]
  },
  {
    title: "Apple Pie",
    description: "Classic American apple pie with flaky crust",
    cookTime: 60,
    cuisine: "American",
    mealType: "dessert",
    calories: 280,
    protein: 3,
    carbs: 38,
    fat: 13,
    fiber: 2,
    sugar: 22,
    ingredients: [
      { text: "2 pie crusts (store-bought or homemade)", order: 1 },
      { text: "6-7 medium apples, peeled and sliced", order: 2 },
      { text: "3/4 cup sugar", order: 3 },
      { text: "2 tbsp all-purpose flour", order: 4 },
      { text: "1 tsp cinnamon", order: 5 },
      { text: "1/4 tsp nutmeg", order: 6 },
      { text: "2 tbsp butter", order: 7 },
      { text: "1 egg, beaten (for egg wash)", order: 8 }
    ],
    instructions: [
      { text: "Preheat oven to 425°F (220°C)", step: 1 },
      { text: "Line pie dish with one crust", step: 2 },
      { text: "Mix apples with sugar, flour, and spices", step: 3 },
      { text: "Fill pie crust with apple mixture", step: 4 },
      { text: "Dot with butter and cover with top crust", step: 5 },
      { text: "Seal edges and cut vents in top", step: 6 },
      { text: "Brush with egg wash", step: 7 },
      { text: "Bake for 45-50 minutes until golden", step: 8 }
    ]
  },
  {
    title: "Cheesecake",
    description: "Creamy New York-style cheesecake",
    cookTime: 90,
    cuisine: "American",
    mealType: "dessert",
    calories: 350,
    protein: 7,
    carbs: 28,
    fat: 23,
    fiber: 0,
    sugar: 24,
    ingredients: [
      { text: "2 cups graham cracker crumbs", order: 1 },
      { text: "1/2 cup butter, melted", order: 2 },
      { text: "24 oz cream cheese, softened", order: 3 },
      { text: "1 cup sugar", order: 4 },
      { text: "3 eggs", order: 5 },
      { text: "1 cup sour cream", order: 6 },
      { text: "1 tsp vanilla extract", order: 7 }
    ],
    instructions: [
      { text: "Preheat oven to 325°F (165°C)", step: 1 },
      { text: "Mix graham cracker crumbs with melted butter", step: 2 },
      { text: "Press into bottom of springform pan", step: 3 },
      { text: "Beat cream cheese and sugar until smooth", step: 4 },
      { text: "Add eggs one at a time, then sour cream and vanilla", step: 5 },
      { text: "Pour over crust", step: 6 },
      { text: "Bake for 55-60 minutes until center is set", step: 7 },
      { text: "Cool completely, then refrigerate overnight", step: 8 }
    ]
  },
  {
    title: "Brownies",
    description: "Fudgy chocolate brownies",
    cookTime: 35,
    cuisine: "American",
    mealType: "dessert",
    calories: 240,
    protein: 3,
    carbs: 32,
    fat: 12,
    fiber: 2,
    sugar: 26,
    ingredients: [
      { text: "1/2 cup butter", order: 1 },
      { text: "1 cup sugar", order: 2 },
      { text: "2 eggs", order: 3 },
      { text: "1 tsp vanilla extract", order: 4 },
      { text: "1/3 cup cocoa powder", order: 5 },
      { text: "1/2 cup all-purpose flour", order: 6 },
      { text: "1/4 tsp salt", order: 7 },
      { text: "1/4 tsp baking powder", order: 8 },
      { text: "1/2 cup chocolate chips", order: 9 }
    ],
    instructions: [
      { text: "Preheat oven to 350°F (175°C)", step: 1 },
      { text: "Melt butter and mix with sugar", step: 2 },
      { text: "Beat in eggs and vanilla", step: 3 },
      { text: "Stir in cocoa powder", step: 4 },
      { text: "Mix in flour, salt, and baking powder", step: 5 },
      { text: "Fold in chocolate chips", step: 6 },
      { text: "Pour into greased 8x8 pan", step: 7 },
      { text: "Bake for 25-30 minutes until set", step: 8 }
    ]
  },
  {
    title: "Tiramisu",
    description: "Classic Italian coffee-flavored dessert",
    cookTime: 30,
    cuisine: "Italian",
    mealType: "dessert",
    calories: 280,
    protein: 6,
    carbs: 28,
    fat: 16,
    fiber: 1,
    sugar: 20,
    ingredients: [
      { text: "6 egg yolks", order: 1 },
      { text: "3/4 cup sugar", order: 2 },
      { text: "1 1/4 cups mascarpone cheese", order: 3 },
      { text: "1 3/4 cups heavy cream", order: 4 },
      { text: "2 cups strong coffee, cooled", order: 5 },
      { text: "24 ladyfinger cookies", order: 6 },
      { text: "Cocoa powder for dusting", order: 7 }
    ],
    instructions: [
      { text: "Beat egg yolks and sugar until thick and pale", step: 1 },
      { text: "Fold in mascarpone cheese", step: 2 },
      { text: "Whip cream to stiff peaks and fold into mixture", step: 3 },
      { text: "Dip ladyfingers in coffee and layer in dish", step: 4 },
      { text: "Spread half of mascarpone mixture over ladyfingers", step: 5 },
      { text: "Repeat layers", step: 6 },
      { text: "Dust with cocoa powder", step: 7 },
      { text: "Refrigerate for at least 4 hours before serving", step: 8 }
    ]
  },
  {
    title: "Chocolate Mousse",
    description: "Light and airy chocolate mousse",
    cookTime: 20,
    cuisine: "French",
    mealType: "dessert",
    calories: 220,
    protein: 4,
    carbs: 22,
    fat: 14,
    fiber: 2,
    sugar: 18,
    ingredients: [
      { text: "8 oz dark chocolate, chopped", order: 1 },
      { text: "4 eggs, separated", order: 2 },
      { text: "1/4 cup sugar", order: 3 },
      { text: "1 cup heavy cream", order: 4 },
      { text: "1 tsp vanilla extract", order: 5 }
    ],
    instructions: [
      { text: "Melt chocolate in a double boiler", step: 1 },
      { text: "Beat egg yolks and sugar until pale", step: 2 },
      { text: "Fold melted chocolate into egg yolks", step: 3 },
      { text: "Whip cream to soft peaks", step: 4 },
      { text: "Beat egg whites to stiff peaks", step: 5 },
      { text: "Fold cream and egg whites into chocolate mixture", step: 6 },
      { text: "Spoon into serving dishes", step: 7 },
      { text: "Chill for at least 2 hours before serving", step: 8 }
    ]
  },
  {
    title: "Strawberry Shortcake",
    description: "Classic strawberry shortcake with fresh berries and whipped cream",
    cookTime: 30,
    cuisine: "American",
    mealType: "dessert",
    calories: 280,
    protein: 4,
    carbs: 38,
    fat: 12,
    fiber: 2,
    sugar: 24,
    ingredients: [
      { text: "2 cups all-purpose flour", order: 1 },
      { text: "1/4 cup sugar", order: 2 },
      { text: "1 tbsp baking powder", order: 3 },
      { text: "1/2 cup butter, cold", order: 4 },
      { text: "2/3 cup milk", order: 5 },
      { text: "2 cups fresh strawberries, sliced", order: 6 },
      { text: "1 cup whipped cream", order: 7 }
    ],
    instructions: [
      { text: "Preheat oven to 425°F (220°C)", step: 1 },
      { text: "Mix flour, sugar, and baking powder", step: 2 },
      { text: "Cut in butter until crumbly", step: 3 },
      { text: "Stir in milk to form dough", step: 4 },
      { text: "Drop onto baking sheet and bake for 12-15 minutes", step: 5 },
      { text: "Split shortcakes and top with strawberries and whipped cream", step: 6 }
    ]
  },
  {
    title: "Lemon Bars",
    description: "Tangy lemon bars with a buttery shortbread crust",
    cookTime: 50,
    cuisine: "American",
    mealType: "dessert",
    calories: 200,
    protein: 3,
    carbs: 28,
    fat: 9,
    fiber: 1,
    sugar: 20,
    ingredients: [
      { text: "1 cup all-purpose flour", order: 1 },
      { text: "1/2 cup butter, softened", order: 2 },
      { text: "1/4 cup powdered sugar", order: 3 },
      { text: "2 eggs", order: 4 },
      { text: "1 cup sugar", order: 5 },
      { text: "2 tbsp all-purpose flour", order: 6 },
      { text: "3 tbsp lemon juice", order: 7 },
      { text: "1 tsp lemon zest", order: 8 }
    ],
    instructions: [
      { text: "Preheat oven to 350°F (175°C)", step: 1 },
      { text: "Mix flour, butter, and powdered sugar for crust", step: 2 },
      { text: "Press into 8x8 pan and bake for 20 minutes", step: 3 },
      { text: "Whisk eggs, sugar, flour, lemon juice, and zest", step: 4 },
      { text: "Pour over hot crust and bake for 25 minutes", step: 5 },
      { text: "Cool and dust with powdered sugar", step: 6 }
    ]
  },
  {
    title: "Peach Cobbler",
    description: "Warm peach cobbler with a golden biscuit topping",
    cookTime: 45,
    cuisine: "American",
    mealType: "dessert",
    calories: 250,
    protein: 3,
    carbs: 42,
    fat: 9,
    fiber: 2,
    sugar: 28,
    ingredients: [
      { text: "6 cups sliced peaches", order: 1 },
      { text: "1/2 cup sugar", order: 2 },
      { text: "1 tbsp cornstarch", order: 3 },
      { text: "1 cup all-purpose flour", order: 4 },
      { text: "1/4 cup sugar", order: 5 },
      { text: "1 1/2 tsp baking powder", order: 6 },
      { text: "1/2 cup milk", order: 7 },
      { text: "1/4 cup butter, melted", order: 8 }
    ],
    instructions: [
      { text: "Preheat oven to 375°F (190°C)", step: 1 },
      { text: "Mix peaches with sugar and cornstarch", step: 2 },
      { text: "Pour into baking dish", step: 3 },
      { text: "Mix flour, sugar, baking powder, milk, and butter", step: 4 },
      { text: "Drop spoonfuls over peaches", step: 5 },
      { text: "Bake for 35-40 minutes until golden", step: 6 }
    ]
  },
  {
    title: "Key Lime Pie",
    description: "Tart and creamy key lime pie with graham cracker crust",
    cookTime: 30,
    cuisine: "American",
    mealType: "dessert",
    calories: 300,
    protein: 5,
    carbs: 35,
    fat: 16,
    fiber: 1,
    sugar: 26,
    ingredients: [
      { text: "1 1/2 cups graham cracker crumbs", order: 1 },
      { text: "1/3 cup butter, melted", order: 2 },
      { text: "14 oz sweetened condensed milk", order: 3 },
      { text: "3/4 cup key lime juice", order: 4 },
      { text: "3 egg yolks", order: 5 },
      { text: "1 tsp lime zest", order: 6 }
    ],
    instructions: [
      { text: "Preheat oven to 350°F (175°C)", step: 1 },
      { text: "Mix graham cracker crumbs with butter", step: 2 },
      { text: "Press into pie pan and bake for 10 minutes", step: 3 },
      { text: "Whisk condensed milk, lime juice, egg yolks, and zest", step: 4 },
      { text: "Pour into crust and bake for 15 minutes", step: 5 },
      { text: "Chill for at least 2 hours before serving", step: 6 }
    ]
  },
  {
    title: "Bread Pudding",
    description: "Warm, comforting bread pudding with vanilla sauce",
    cookTime: 60,
    cuisine: "American",
    mealType: "dessert",
    calories: 280,
    protein: 7,
    carbs: 38,
    fat: 11,
    fiber: 1,
    sugar: 22,
    ingredients: [
      { text: "6 cups day-old bread, cubed", order: 1 },
      { text: "2 cups milk", order: 2 },
      { text: "4 eggs", order: 3 },
      { text: "1/2 cup sugar", order: 4 },
      { text: "1 tsp vanilla extract", order: 5 },
      { text: "1/2 tsp cinnamon", order: 6 },
      { text: "1/4 cup raisins", order: 7 }
    ],
    instructions: [
      { text: "Preheat oven to 350°F (175°C)", step: 1 },
      { text: "Place bread cubes in baking dish", step: 2 },
      { text: "Whisk milk, eggs, sugar, vanilla, and cinnamon", step: 3 },
      { text: "Pour over bread and add raisins", step: 4 },
      { text: "Let soak for 15 minutes", step: 5 },
      { text: "Bake for 45-50 minutes until set", step: 6 }
    ]
  },
  {
    title: "Rice Pudding",
    description: "Creamy, cinnamon-spiced rice pudding",
    cookTime: 45,
    cuisine: "American",
    mealType: "dessert",
    calories: 220,
    protein: 5,
    carbs: 38,
    fat: 5,
    fiber: 0,
    sugar: 24,
    ingredients: [
      { text: "1/2 cup white rice", order: 1 },
      { text: "1 cup water", order: 2 },
      { text: "2 cups milk", order: 3 },
      { text: "1/3 cup sugar", order: 4 },
      { text: "1/4 tsp salt", order: 5 },
      { text: "1 egg, beaten", order: 6 },
      { text: "1/2 tsp vanilla extract", order: 7 },
      { text: "1/4 tsp cinnamon", order: 8 }
    ],
    instructions: [
      { text: "Cook rice in water until tender", step: 1 },
      { text: "Add milk, sugar, and salt", step: 2 },
      { text: "Simmer for 20 minutes, stirring frequently", step: 3 },
      { text: "Temper egg with hot mixture, then add back", step: 4 },
      { text: "Cook 2 more minutes", step: 5 },
      { text: "Stir in vanilla and cinnamon", step: 6 },
      { text: "Serve warm or chilled", step: 7 }
    ]
  },
  {
    title: "Banana Pudding",
    description: "Classic Southern banana pudding with vanilla wafers",
    cookTime: 20,
    cuisine: "American",
    mealType: "dessert",
    calories: 240,
    protein: 4,
    carbs: 38,
    fat: 8,
    fiber: 1,
    sugar: 28,
    ingredients: [
      { text: "1 package vanilla wafers", order: 1 },
      { text: "3-4 bananas, sliced", order: 2 },
      { text: "1 package instant vanilla pudding", order: 3 },
      { text: "2 cups milk", order: 4 },
      { text: "1 cup whipped cream", order: 5 }
    ],
    instructions: [
      { text: "Prepare pudding according to package directions", step: 1 },
      { text: "Layer wafers, bananas, and pudding in dish", step: 2 },
      { text: "Repeat layers", step: 3 },
      { text: "Top with whipped cream", step: 4 },
      { text: "Chill for at least 2 hours", step: 5 }
    ]
  },
  {
    title: "Panna Cotta",
    description: "Silky Italian panna cotta with berry sauce",
    cookTime: 15,
    cuisine: "Italian",
    mealType: "dessert",
    calories: 200,
    protein: 4,
    carbs: 22,
    fat: 11,
    fiber: 1,
    sugar: 20,
    ingredients: [
      { text: "2 cups heavy cream", order: 1 },
      { text: "1/3 cup sugar", order: 2 },
      { text: "1 packet unflavored gelatin", order: 3 },
      { text: "2 tbsp cold water", order: 4 },
      { text: "1 tsp vanilla extract", order: 5 },
      { text: "1/2 cup mixed berries", order: 6 }
    ],
    instructions: [
      { text: "Sprinkle gelatin over cold water, let bloom", step: 1 },
      { text: "Heat cream and sugar until sugar dissolves", step: 2 },
      { text: "Remove from heat and stir in gelatin", step: 3 },
      { text: "Add vanilla and pour into ramekins", step: 4 },
      { text: "Chill for at least 4 hours", step: 5 },
      { text: "Serve with berry sauce", step: 6 }
    ]
  },
  {
    title: "Creme Brulee",
    description: "Classic French creme brulee with caramelized sugar top",
    cookTime: 60,
    cuisine: "French",
    mealType: "dessert",
    calories: 280,
    protein: 5,
    carbs: 24,
    fat: 18,
    fiber: 0,
    sugar: 22,
    ingredients: [
      { text: "2 cups heavy cream", order: 1 },
      { text: "1/2 cup sugar", order: 2 },
      { text: "5 egg yolks", order: 3 },
      { text: "1 tsp vanilla extract", order: 4 },
      { text: "2 tbsp sugar for topping", order: 5 }
    ],
    instructions: [
      { text: "Preheat oven to 325°F (165°C)", step: 1 },
      { text: "Heat cream until just simmering", step: 2 },
      { text: "Whisk egg yolks and sugar", step: 3 },
      { text: "Temper with hot cream, then add rest", step: 4 },
      { text: "Stir in vanilla and strain", step: 5 },
      { text: "Pour into ramekins and bake in water bath for 40 minutes", step: 6 },
      { text: "Chill, then caramelize sugar on top before serving", step: 7 }
    ]
  },
  {
    title: "Chocolate Fudge",
    description: "Rich, creamy chocolate fudge",
    cookTime: 15,
    cuisine: "American",
    mealType: "dessert",
    calories: 180,
    protein: 2,
    carbs: 24,
    fat: 9,
    fiber: 1,
    sugar: 22,
    ingredients: [
      { text: "3 cups sugar", order: 1 },
      { text: "3/4 cup butter", order: 2 },
      { text: "2/3 cup evaporated milk", order: 3 },
      { text: "12 oz chocolate chips", order: 4 },
      { text: "7 oz marshmallow creme", order: 5 },
      { text: "1 tsp vanilla extract", order: 6 }
    ],
    instructions: [
      { text: "Line 9x9 pan with foil", step: 1 },
      { text: "Heat sugar, butter, and milk to boiling", step: 2 },
      { text: "Boil for 5 minutes, stirring constantly", step: 3 },
      { text: "Remove from heat and stir in chocolate chips", step: 4 },
      { text: "Add marshmallow creme and vanilla", step: 5 },
      { text: "Pour into pan and cool completely", step: 6 }
    ]
  },
  {
    title: "Peanut Butter Cookies",
    description: "Classic soft and chewy peanut butter cookies",
    cookTime: 25,
    cuisine: "American",
    mealType: "dessert",
    calories: 150,
    protein: 4,
    carbs: 16,
    fat: 8,
    fiber: 1,
    sugar: 12,
    ingredients: [
      { text: "1 cup peanut butter", order: 1 },
      { text: "1 cup sugar", order: 2 },
      { text: "1 egg", order: 3 },
      { text: "1 tsp vanilla extract", order: 4 },
      { text: "1 tsp baking soda", order: 5 }
    ],
    instructions: [
      { text: "Preheat oven to 350°F (175°C)", step: 1 },
      { text: "Mix all ingredients until well combined", step: 2 },
      { text: "Form into 1-inch balls", step: 3 },
      { text: "Place on baking sheet and flatten with fork", step: 4 },
      { text: "Bake for 10-12 minutes", step: 5 },
      { text: "Cool on baking sheet for 2 minutes", step: 6 }
    ]
  },
  {
    title: "Sugar Cookies",
    description: "Soft, buttery sugar cookies with frosting",
    cookTime: 30,
    cuisine: "American",
    mealType: "dessert",
    calories: 140,
    protein: 2,
    carbs: 20,
    fat: 6,
    fiber: 0,
    sugar: 12,
    ingredients: [
      { text: "2 3/4 cups all-purpose flour", order: 1 },
      { text: "1 tsp baking soda", order: 2 },
      { text: "1/2 tsp baking powder", order: 3 },
      { text: "1 cup butter, softened", order: 4 },
      { text: "1 1/2 cups sugar", order: 5 },
      { text: "1 egg", order: 6 },
      { text: "1 tsp vanilla extract", order: 7 }
    ],
    instructions: [
      { text: "Preheat oven to 375°F (190°C)", step: 1 },
      { text: "Mix flour, baking soda, and baking powder", step: 2 },
      { text: "Cream butter and sugar", step: 3 },
      { text: "Beat in egg and vanilla", step: 4 },
      { text: "Gradually mix in flour mixture", step: 5 },
      { text: "Roll out and cut into shapes", step: 6 },
      { text: "Bake for 8-10 minutes", step: 7 }
    ]
  },
  {
    title: "Oatmeal Raisin Cookies",
    description: "Chewy oatmeal cookies with plump raisins",
    cookTime: 25,
    cuisine: "American",
    mealType: "dessert",
    calories: 160,
    protein: 3,
    carbs: 24,
    fat: 6,
    fiber: 2,
    sugar: 14,
    ingredients: [
      { text: "1 cup butter, softened", order: 1 },
      { text: "1 cup brown sugar", order: 2 },
      { text: "1/2 cup white sugar", order: 3 },
      { text: "2 eggs", order: 4 },
      { text: "1 tsp vanilla extract", order: 5 },
      { text: "1 1/2 cups all-purpose flour", order: 6 },
      { text: "1 tsp baking soda", order: 7 },
      { text: "1 tsp cinnamon", order: 8 },
      { text: "3 cups rolled oats", order: 9 },
      { text: "1 cup raisins", order: 10 }
    ],
    instructions: [
      { text: "Preheat oven to 375°F (190°C)", step: 1 },
      { text: "Cream butter and sugars", step: 2 },
      { text: "Beat in eggs and vanilla", step: 3 },
      { text: "Mix in flour, baking soda, and cinnamon", step: 4 },
      { text: "Stir in oats and raisins", step: 5 },
      { text: "Drop rounded tablespoons onto baking sheet", step: 6 },
      { text: "Bake for 9-11 minutes", step: 7 }
    ]
  },
  {
    title: "Snickerdoodles",
    description: "Soft, cinnamon-sugar coated cookies",
    cookTime: 25,
    cuisine: "American",
    mealType: "dessert",
    calories: 150,
    protein: 2,
    carbs: 20,
    fat: 7,
    fiber: 1,
    sugar: 13,
    ingredients: [
      { text: "1/2 cup butter, softened", order: 1 },
      { text: "1/2 cup shortening", order: 2 },
      { text: "1 1/2 cups sugar", order: 3 },
      { text: "2 eggs", order: 4 },
      { text: "2 3/4 cups all-purpose flour", order: 5 },
      { text: "2 tsp cream of tartar", order: 6 },
      { text: "1 tsp baking soda", order: 7 },
      { text: "1/4 tsp salt", order: 8 },
      { text: "2 tbsp sugar", order: 9 },
      { text: "2 tsp cinnamon", order: 10 }
    ],
    instructions: [
      { text: "Preheat oven to 400°F (200°C)", step: 1 },
      { text: "Cream butter, shortening, and 1 1/2 cups sugar", step: 2 },
      { text: "Beat in eggs", step: 3 },
      { text: "Mix in flour, cream of tartar, baking soda, and salt", step: 4 },
      { text: "Mix 2 tbsp sugar and cinnamon", step: 5 },
      { text: "Roll dough balls in cinnamon sugar", step: 6 },
      { text: "Bake for 8-10 minutes", step: 7 }
    ]
  },
  {
    title: "Gingerbread Cookies",
    description: "Spiced gingerbread cookies, perfect for the holidays",
    cookTime: 30,
    cuisine: "American",
    mealType: "dessert",
    calories: 140,
    protein: 2,
    carbs: 22,
    fat: 5,
    fiber: 1,
    sugar: 12,
    ingredients: [
      { text: "3 cups all-purpose flour", order: 1 },
      { text: "1 tsp baking soda", order: 2 },
      { text: "1/4 tsp salt", order: 3 },
      { text: "1 tbsp ground ginger", order: 4 },
      { text: "1 tsp ground cinnamon", order: 5 },
      { text: "3/4 cup butter, softened", order: 6 },
      { text: "3/4 cup brown sugar", order: 7 },
      { text: "1 egg", order: 8 },
      { text: "1/2 cup molasses", order: 9 }
    ],
    instructions: [
      { text: "Preheat oven to 350°F (175°C)", step: 1 },
      { text: "Mix flour, baking soda, salt, and spices", step: 2 },
      { text: "Cream butter and brown sugar", step: 3 },
      { text: "Beat in egg and molasses", step: 4 },
      { text: "Gradually mix in flour mixture", step: 5 },
      { text: "Chill dough for 1 hour", step: 6 },
      { text: "Roll out and cut into shapes", step: 7 },
      { text: "Bake for 8-10 minutes", step: 8 }
    ]
  },
  {
    title: "Chocolate Pudding",
    description: "Rich, creamy chocolate pudding",
    cookTime: 15,
    cuisine: "American",
    mealType: "dessert",
    calories: 180,
    protein: 4,
    carbs: 28,
    fat: 7,
    fiber: 2,
    sugar: 22,
    ingredients: [
      { text: "1/3 cup sugar", order: 1 },
      { text: "2 tbsp cornstarch", order: 2 },
      { text: "2 tbsp cocoa powder", order: 3 },
      { text: "1/4 tsp salt", order: 4 },
      { text: "2 cups milk", order: 5 },
      { text: "2 oz dark chocolate, chopped", order: 6 },
      { text: "1 tsp vanilla extract", order: 7 }
    ],
    instructions: [
      { text: "Whisk sugar, cornstarch, cocoa, and salt", step: 1 },
      { text: "Gradually whisk in milk", step: 2 },
      { text: "Cook over medium heat, stirring constantly", step: 3 },
      { text: "Bring to a boil and cook 1 minute", step: 4 },
      { text: "Remove from heat and stir in chocolate", step: 5 },
      { text: "Stir in vanilla and pour into dishes", step: 6 },
      { text: "Chill for at least 2 hours", step: 7 }
    ]
  },
  {
    title: "Butterscotch Pudding",
    description: "Smooth, caramel-flavored butterscotch pudding",
    cookTime: 15,
    cuisine: "American",
    mealType: "dessert",
    calories: 200,
    protein: 4,
    carbs: 32,
    fat: 6,
    fiber: 0,
    sugar: 26,
    ingredients: [
      { text: "1/2 cup brown sugar", order: 1 },
      { text: "2 tbsp cornstarch", order: 2 },
      { text: "1/4 tsp salt", order: 3 },
      { text: "2 cups milk", order: 4 },
      { text: "2 tbsp butter", order: 5 },
      { text: "1 tsp vanilla extract", order: 6 }
    ],
    instructions: [
      { text: "Whisk brown sugar, cornstarch, and salt", step: 1 },
      { text: "Gradually whisk in milk", step: 2 },
      { text: "Cook over medium heat, stirring constantly", step: 3 },
      { text: "Bring to a boil and cook 1 minute", step: 4 },
      { text: "Remove from heat and stir in butter and vanilla", step: 5 },
      { text: "Pour into dishes and chill", step: 6 }
    ]
  },
  {
    title: "Tapioca Pudding",
    description: "Classic tapioca pudding with pearl tapioca",
    cookTime: 20,
    cuisine: "American",
    mealType: "dessert",
    calories: 190,
    protein: 4,
    carbs: 32,
    fat: 5,
    fiber: 0,
    sugar: 20,
    ingredients: [
      { text: "1/3 cup small pearl tapioca", order: 1 },
      { text: "2 1/2 cups milk", order: 2 },
      { text: "1/4 tsp salt", order: 3 },
      { text: "2 eggs, separated", order: 4 },
      { text: "1/3 cup sugar", order: 5 },
      { text: "1/2 tsp vanilla extract", order: 6 }
    ],
    instructions: [
      { text: "Soak tapioca in milk for 30 minutes", step: 1 },
      { text: "Cook over medium heat until tapioca is clear", step: 2 },
      { text: "Beat egg yolks with sugar", step: 3 },
      { text: "Temper with hot mixture, then add back", step: 4 },
      { text: "Cook 2 more minutes", step: 5 },
      { text: "Beat egg whites to soft peaks and fold in", step: 6 },
      { text: "Stir in vanilla and serve warm or chilled", step: 7 }
    ]
  },
  {
    title: "Fruit Tart",
    description: "Elegant fruit tart with pastry cream and fresh fruit",
    cookTime: 60,
    cuisine: "French",
    mealType: "dessert",
    calories: 220,
    protein: 4,
    carbs: 32,
    fat: 9,
    fiber: 2,
    sugar: 18,
    ingredients: [
      { text: "1 pie crust, pre-baked", order: 1 },
      { text: "1 cup pastry cream", order: 2 },
      { text: "2 cups mixed fresh fruit (berries, kiwi, peaches)", order: 3 },
      { text: "1/4 cup apricot jam, warmed", order: 4 }
    ],
    instructions: [
      { text: "Bake pie crust and let cool", step: 1 },
      { text: "Spread pastry cream in crust", step: 2 },
      { text: "Arrange fresh fruit on top", step: 3 },
      { text: "Brush with warmed apricot jam", step: 4 },
      { text: "Chill for at least 1 hour before serving", step: 5 }
    ]
  },
  {
    title: "Pecan Pie",
    description: "Rich, gooey pecan pie with a flaky crust",
    cookTime: 60,
    cuisine: "American",
    mealType: "dessert",
    calories: 420,
    protein: 6,
    carbs: 48,
    fat: 24,
    fiber: 3,
    sugar: 32,
    ingredients: [
      { text: "1 pie crust", order: 1 },
      { text: "3 eggs", order: 2 },
      { text: "1 cup corn syrup", order: 3 },
      { text: "1/2 cup sugar", order: 4 },
      { text: "2 tbsp butter, melted", order: 5 },
      { text: "1 tsp vanilla extract", order: 6 },
      { text: "1 1/2 cups pecan halves", order: 7 }
    ],
    instructions: [
      { text: "Preheat oven to 350°F (175°C)", step: 1 },
      { text: "Line pie dish with crust", step: 2 },
      { text: "Whisk eggs, corn syrup, sugar, butter, and vanilla", step: 3 },
      { text: "Stir in pecans", step: 4 },
      { text: "Pour into crust", step: 5 },
      { text: "Bake for 50-60 minutes until set", step: 6 },
      { text: "Cool completely before serving", step: 7 }
    ]
  },
  {
    title: "Pumpkin Pie",
    description: "Classic Thanksgiving pumpkin pie with spices",
    cookTime: 60,
    cuisine: "American",
    mealType: "dessert",
    calories: 280,
    protein: 5,
    carbs: 32,
    fat: 14,
    fiber: 2,
    sugar: 18,
    ingredients: [
      { text: "1 pie crust", order: 1 },
      { text: "15 oz pumpkin puree", order: 2 },
      { text: "14 oz sweetened condensed milk", order: 3 },
      { text: "2 eggs", order: 4 },
      { text: "1 tsp cinnamon", order: 5 },
      { text: "1/2 tsp ginger", order: 6 },
      { text: "1/2 tsp nutmeg", order: 7 },
      { text: "1/2 tsp salt", order: 8 }
    ],
    instructions: [
      { text: "Preheat oven to 425°F (220°C)", step: 1 },
      { text: "Line pie dish with crust", step: 2 },
      { text: "Whisk pumpkin, condensed milk, eggs, and spices", step: 3 },
      { text: "Pour into crust", step: 4 },
      { text: "Bake for 15 minutes, then reduce to 350°F", step: 5 },
      { text: "Bake 35-40 more minutes until set", step: 6 },
      { text: "Cool completely before serving", step: 7 }
    ]
  },
  {
    title: "Cherry Pie",
    description: "Sweet and tart cherry pie with lattice crust",
    cookTime: 60,
    cuisine: "American",
    mealType: "dessert",
    calories: 300,
    protein: 4,
    carbs: 42,
    fat: 13,
    fiber: 2,
    sugar: 24,
    ingredients: [
      { text: "2 pie crusts", order: 1 },
      { text: "6 cups pitted cherries", order: 2 },
      { text: "1 cup sugar", order: 3 },
      { text: "1/4 cup cornstarch", order: 4 },
      { text: "1/4 tsp almond extract", order: 5 },
      { text: "2 tbsp butter", order: 6 }
    ],
    instructions: [
      { text: "Preheat oven to 425°F (220°C)", step: 1 },
      { text: "Line pie dish with one crust", step: 2 },
      { text: "Mix cherries with sugar, cornstarch, and extract", step: 3 },
      { text: "Fill pie crust", step: 4 },
      { text: "Dot with butter and cover with lattice top", step: 5 },
      { text: "Bake for 45-50 minutes until golden", step: 6 }
    ]
  },
  {
    title: "Blueberry Pie",
    description: "Sweet blueberry pie with a flaky crust",
    cookTime: 60,
    cuisine: "American",
    mealType: "dessert",
    calories: 290,
    protein: 3,
    carbs: 40,
    fat: 13,
    fiber: 3,
    sugar: 22,
    ingredients: [
      { text: "2 pie crusts", order: 1 },
      { text: "6 cups fresh blueberries", order: 2 },
      { text: "3/4 cup sugar", order: 3 },
      { text: "1/4 cup cornstarch", order: 4 },
      { text: "1 tbsp lemon juice", order: 5 },
      { text: "1/4 tsp cinnamon", order: 6 },
      { text: "2 tbsp butter", order: 7 }
    ],
    instructions: [
      { text: "Preheat oven to 425°F (220°C)", step: 1 },
      { text: "Line pie dish with one crust", step: 2 },
      { text: "Mix blueberries with sugar, cornstarch, lemon, and cinnamon", step: 3 },
      { text: "Fill pie crust and dot with butter", step: 4 },
      { text: "Cover with top crust and seal edges", step: 5 },
      { text: "Cut vents and bake for 45-50 minutes", step: 6 }
    ]
  },
  {
    title: "Lemon Meringue Pie",
    description: "Tangy lemon filling with fluffy meringue topping",
    cookTime: 50,
    cuisine: "American",
    mealType: "dessert",
    calories: 280,
    protein: 6,
    carbs: 38,
    fat: 12,
    fiber: 1,
    sugar: 26,
    ingredients: [
      { text: "1 pie crust, pre-baked", order: 1 },
      { text: "1 cup sugar", order: 2 },
      { text: "1/4 cup cornstarch", order: 3 },
      { text: "1 1/2 cups water", order: 4 },
      { text: "4 egg yolks", order: 5 },
      { text: "1/2 cup lemon juice", order: 6 },
      { text: "2 tbsp butter", order: 7 },
      { text: "4 egg whites", order: 8 },
      { text: "6 tbsp sugar", order: 9 }
    ],
    instructions: [
      { text: "Preheat oven to 350°F (175°C)", step: 1 },
      { text: "Mix sugar and cornstarch, add water", step: 2 },
      { text: "Cook until thick, then temper in egg yolks", step: 3 },
      { text: "Stir in lemon juice and butter", step: 4 },
      { text: "Pour into crust", step: 5 },
      { text: "Beat egg whites with sugar to stiff peaks", step: 6 },
      { text: "Spread meringue on top and bake 15 minutes", step: 7 }
    ]
  },
  {
    title: "Chocolate Eclairs",
    description: "Classic French eclairs with chocolate glaze",
    cookTime: 50,
    cuisine: "French",
    mealType: "dessert",
    calories: 180,
    protein: 4,
    carbs: 22,
    fat: 9,
    fiber: 1,
    sugar: 14,
    ingredients: [
      { text: "1/2 cup water", order: 1 },
      { text: "1/4 cup butter", order: 2 },
      { text: "1/2 cup all-purpose flour", order: 3 },
      { text: "2 eggs", order: 4 },
      { text: "1 cup pastry cream", order: 5 },
      { text: "4 oz dark chocolate", order: 6 },
      { text: "2 tbsp butter", order: 7 }
    ],
    instructions: [
      { text: "Preheat oven to 400°F (200°C)", step: 1 },
      { text: "Bring water and butter to boil", step: 2 },
      { text: "Add flour and stir until smooth", step: 3 },
      { text: "Beat in eggs one at a time", step: 4 },
      { text: "Pipe onto baking sheet and bake 25 minutes", step: 5 },
      { text: "Cool, fill with pastry cream", step: 6 },
      { text: "Dip in melted chocolate glaze", step: 7 }
    ]
  },
  {
    title: "Cannoli",
    description: "Italian cannoli with ricotta filling and chocolate chips",
    cookTime: 30,
    cuisine: "Italian",
    mealType: "dessert",
    calories: 220,
    protein: 6,
    carbs: 24,
    fat: 11,
    fiber: 1,
    sugar: 14,
    ingredients: [
      { text: "1 cup all-purpose flour", order: 1 },
      { text: "1 tbsp sugar", order: 2 },
      { text: "1/4 tsp cinnamon", order: 3 },
      { text: "2 tbsp butter", order: 4 },
      { text: "1/4 cup white wine", order: 5 },
      { text: "1 cup ricotta cheese", order: 6 },
      { text: "1/4 cup powdered sugar", order: 7 },
      { text: "1/4 cup mini chocolate chips", order: 8 }
    ],
    instructions: [
      { text: "Mix flour, sugar, cinnamon, and butter", step: 1 },
      { text: "Add wine to form dough", step: 2 },
      { text: "Roll thin and cut into circles", step: 3 },
      { text: "Wrap around cannoli forms and fry until golden", step: 4 },
      { text: "Mix ricotta, powdered sugar, and chocolate chips", step: 5 },
      { text: "Fill cooled shells and serve", step: 6 }
    ]
  },
  {
    title: "Baklava",
    description: "Sweet, flaky baklava with honey and nuts",
    cookTime: 60,
    cuisine: "Greek",
    mealType: "dessert",
    calories: 280,
    protein: 5,
    carbs: 32,
    fat: 16,
    fiber: 2,
    sugar: 20,
    ingredients: [
      { text: "1 lb phyllo dough", order: 1 },
      { text: "1 cup butter, melted", order: 2 },
      { text: "2 cups chopped walnuts", order: 3 },
      { text: "1/2 cup sugar", order: 4 },
      { text: "1 tsp cinnamon", order: 5 },
      { text: "1 cup honey", order: 6 },
      { text: "1/2 cup water", order: 7 }
    ],
    instructions: [
      { text: "Preheat oven to 350°F (175°C)", step: 1 },
      { text: "Mix walnuts, sugar, and cinnamon", step: 2 },
      { text: "Layer phyllo sheets with butter and nut mixture", step: 3 },
      { text: "Cut into diamonds and bake 50 minutes", step: 4 },
      { text: "Heat honey and water for syrup", step: 5 },
      { text: "Pour over hot baklava", step: 6 },
      { text: "Cool completely before serving", step: 7 }
    ]
  },
  {
    title: "Flan",
    description: "Creamy caramel flan, a classic Latin dessert",
    cookTime: 60,
    cuisine: "Latin",
    mealType: "dessert",
    calories: 220,
    protein: 6,
    carbs: 28,
    fat: 9,
    fiber: 0,
    sugar: 26,
    ingredients: [
      { text: "1 cup sugar", order: 1 },
      { text: "4 eggs", order: 2 },
      { text: "14 oz sweetened condensed milk", order: 3 },
      { text: "12 oz evaporated milk", order: 4 },
      { text: "1 tsp vanilla extract", order: 5 }
    ],
    instructions: [
      { text: "Preheat oven to 350°F (175°C)", step: 1 },
      { text: "Melt sugar in pan until caramelized", step: 2 },
      { text: "Pour into ramekins", step: 3 },
      { text: "Whisk eggs, milks, and vanilla", step: 4 },
      { text: "Pour over caramel", step: 5 },
      { text: "Bake in water bath for 50 minutes", step: 6 },
      { text: "Chill and invert before serving", step: 7 }
    ]
  },
  {
    title: "Tres Leches Cake",
    description: "Moist sponge cake soaked in three milks",
    cookTime: 60,
    cuisine: "Latin",
    mealType: "dessert",
    calories: 320,
    protein: 7,
    carbs: 42,
    fat: 14,
    fiber: 1,
    sugar: 32,
    ingredients: [
      { text: "1 1/2 cups all-purpose flour", order: 1 },
      { text: "1 tsp baking powder", order: 2 },
      { text: "5 eggs, separated", order: 3 },
      { text: "1 cup sugar", order: 4 },
      { text: "1/3 cup milk", order: 5 },
      { text: "1 tsp vanilla", order: 6 },
      { text: "14 oz sweetened condensed milk", order: 7 },
      { text: "12 oz evaporated milk", order: 8 },
      { text: "1 cup heavy cream", order: 9 }
    ],
    instructions: [
      { text: "Preheat oven to 350°F (175°C)", step: 1 },
      { text: "Mix flour and baking powder", step: 2 },
      { text: "Beat egg whites to soft peaks, add sugar", step: 3 },
      { text: "Beat in yolks, milk, and vanilla", step: 4 },
      { text: "Fold in flour mixture", step: 5 },
      { text: "Bake for 30 minutes", step: 6 },
      { text: "Mix three milks and pour over cooled cake", step: 7 },
      { text: "Top with whipped cream", step: 8 }
    ]
  },
  {
    title: "Churros",
    description: "Crispy Spanish churros with chocolate dipping sauce",
    cookTime: 25,
    cuisine: "Spanish",
    mealType: "dessert",
    calories: 200,
    protein: 3,
    carbs: 28,
    fat: 9,
    fiber: 1,
    sugar: 12,
    ingredients: [
      { text: "1 cup water", order: 1 },
      { text: "1/2 cup butter", order: 2 },
      { text: "1/4 tsp salt", order: 3 },
      { text: "1 cup all-purpose flour", order: 4 },
      { text: "3 eggs", order: 5 },
      { text: "1/2 cup sugar", order: 6 },
      { text: "1 tsp cinnamon", order: 7 },
      { text: "4 oz dark chocolate", order: 8 },
      { text: "1/2 cup heavy cream", order: 9 }
    ],
    instructions: [
      { text: "Heat water, butter, and salt to boiling", step: 1 },
      { text: "Add flour and stir until smooth", step: 2 },
      { text: "Beat in eggs one at a time", step: 3 },
      { text: "Pipe into hot oil and fry until golden", step: 4 },
      { text: "Mix sugar and cinnamon, roll churros in mixture", step: 5 },
      { text: "Heat cream and pour over chocolate", step: 6 },
      { text: "Stir until smooth for dipping sauce", step: 7 }
    ]
  },
  {
    title: "Macarons",
    description: "Delicate French macarons with ganache filling",
    cookTime: 30,
    cuisine: "French",
    mealType: "dessert",
    calories: 90,
    protein: 2,
    carbs: 12,
    fat: 4,
    fiber: 0,
    sugar: 11,
    ingredients: [
      { text: "1 cup almond flour", order: 1 },
      { text: "1 3/4 cups powdered sugar", order: 2 },
      { text: "3 egg whites", order: 3 },
      { text: "1/4 cup granulated sugar", order: 4 },
      { text: "4 oz dark chocolate", order: 5 },
      { text: "1/2 cup heavy cream", order: 6 }
    ],
    instructions: [
      { text: "Sift almond flour and powdered sugar", step: 1 },
      { text: "Beat egg whites to soft peaks, add granulated sugar", step: 2 },
      { text: "Fold in almond mixture", step: 3 },
      { text: "Pipe onto baking sheet and rest 30 minutes", step: 4 },
      { text: "Bake at 300°F for 15 minutes", step: 5 },
      { text: "Heat cream and pour over chocolate for ganache", step: 6 },
      { text: "Sandwich macarons with ganache", step: 7 }
    ]
  },
  {
    title: "Creme Caramel",
    description: "Silky creme caramel with caramel sauce",
    cookTime: 60,
    cuisine: "French",
    mealType: "dessert",
    calories: 240,
    protein: 6,
    carbs: 32,
    fat: 10,
    fiber: 0,
    sugar: 30,
    ingredients: [
      { text: "1 cup sugar", order: 1 },
      { text: "1/4 cup water", order: 2 },
      { text: "2 cups milk", order: 3 },
      { text: "4 eggs", order: 4 },
      { text: "1/3 cup sugar", order: 5 },
      { text: "1 tsp vanilla extract", order: 6 }
    ],
    instructions: [
      { text: "Preheat oven to 325°F (165°C)", step: 1 },
      { text: "Caramelize 1 cup sugar with water", step: 2 },
      { text: "Pour into ramekins", step: 3 },
      { text: "Heat milk until just simmering", step: 4 },
      { text: "Whisk eggs with 1/3 cup sugar", step: 5 },
      { text: "Temper with hot milk, add vanilla", step: 6 },
      { text: "Pour into ramekins and bake in water bath 45 minutes", step: 7 },
      { text: "Chill and invert before serving", step: 8 }
    ]
  },
  {
    title: "Profiteroles",
    description: "Light choux pastry puffs filled with ice cream",
    cookTime: 35,
    cuisine: "French",
    mealType: "dessert",
    calories: 150,
    protein: 3,
    carbs: 18,
    fat: 8,
    fiber: 1,
    sugar: 10,
    ingredients: [
      { text: "1/2 cup water", order: 1 },
      { text: "1/4 cup butter", order: 2 },
      { text: "1/2 cup all-purpose flour", order: 3 },
      { text: "2 eggs", order: 4 },
      { text: "Vanilla ice cream", order: 5 },
      { text: "Chocolate sauce", order: 6 }
    ],
    instructions: [
      { text: "Preheat oven to 400°F (200°C)", step: 1 },
      { text: "Bring water and butter to boil", step: 2 },
      { text: "Add flour and stir until smooth", step: 3 },
      { text: "Beat in eggs one at a time", step: 4 },
      { text: "Pipe small mounds onto baking sheet", step: 5 },
      { text: "Bake 25 minutes until golden and puffed", step: 6 },
      { text: "Cool, split, and fill with ice cream", step: 7 },
      { text: "Drizzle with chocolate sauce", step: 8 }
    ]
  },
  {
    title: "Souffle",
    description: "Light and airy chocolate souffle",
    cookTime: 30,
    cuisine: "French",
    mealType: "dessert",
    calories: 220,
    protein: 6,
    carbs: 28,
    fat: 10,
    fiber: 2,
    sugar: 22,
    ingredients: [
      { text: "2 tbsp butter", order: 1 },
      { text: "2 tbsp all-purpose flour", order: 2 },
      { text: "1/2 cup milk", order: 3 },
      { text: "3 oz dark chocolate", order: 4 },
      { text: "3 egg yolks", order: 5 },
      { text: "4 egg whites", order: 6 },
      { text: "1/4 cup sugar", order: 7 }
    ],
    instructions: [
      { text: "Preheat oven to 375°F (190°C)", step: 1 },
      { text: "Make roux with butter and flour", step: 2 },
      { text: "Add milk and chocolate, stir until smooth", step: 3 },
      { text: "Beat in egg yolks", step: 4 },
      { text: "Beat egg whites with sugar to stiff peaks", step: 5 },
      { text: "Fold whites into chocolate mixture", step: 6 },
      { text: "Pour into ramekins and bake 18-20 minutes", step: 7 },
      { text: "Serve immediately", step: 8 }
    ]
  },
  {
    title: "Molten Lava Cake",
    description: "Warm chocolate cake with molten center",
    cookTime: 15,
    cuisine: "French",
    mealType: "dessert",
    calories: 380,
    protein: 6,
    carbs: 42,
    fat: 22,
    fiber: 3,
    sugar: 32,
    ingredients: [
      { text: "4 oz dark chocolate", order: 1 },
      { text: "1/2 cup butter", order: 2 },
      { text: "2 eggs", order: 3 },
      { text: "2 egg yolks", order: 4 },
      { text: "1/4 cup sugar", order: 5 },
      { text: "2 tbsp all-purpose flour", order: 6 }
    ],
    instructions: [
      { text: "Preheat oven to 425°F (220°C)", step: 1 },
      { text: "Melt chocolate and butter together", step: 2 },
      { text: "Beat eggs, yolks, and sugar until thick", step: 3 },
      { text: "Fold in chocolate mixture and flour", step: 4 },
      { text: "Pour into buttered ramekins", step: 5 },
      { text: "Bake 12-14 minutes until edges are set", step: 6 },
      { text: "Invert onto plate and serve immediately", step: 7 }
    ]
  },
  {
    title: "Chocolate Souffle",
    description: "Classic French chocolate souffle",
    cookTime: 30,
    cuisine: "French",
    mealType: "dessert",
    calories: 240,
    protein: 7,
    carbs: 30,
    fat: 11,
    fiber: 2,
    sugar: 24,
    ingredients: [
      { text: "3 oz dark chocolate", order: 1 },
      { text: "2 tbsp butter", order: 2 },
      { text: "2 tbsp all-purpose flour", order: 3 },
      { text: "1/2 cup milk", order: 4 },
      { text: "3 egg yolks", order: 5 },
      { text: "4 egg whites", order: 6 },
      { text: "1/4 cup sugar", order: 7 }
    ],
    instructions: [
      { text: "Preheat oven to 375°F (190°C)", step: 1 },
      { text: "Melt chocolate and butter", step: 2 },
      { text: "Make roux with flour and milk", step: 3 },
      { text: "Combine with chocolate and egg yolks", step: 4 },
      { text: "Beat egg whites with sugar to stiff peaks", step: 5 },
      { text: "Fold whites into chocolate mixture", step: 6 },
      { text: "Bake in ramekins for 18-20 minutes", step: 7 },
      { text: "Serve immediately", step: 8 }
    ]
  },
  {
    title: "Sticky Toffee Pudding",
    description: "Warm date cake with toffee sauce",
    cookTime: 60,
    cuisine: "British",
    mealType: "dessert",
    calories: 320,
    protein: 4,
    carbs: 52,
    fat: 12,
    fiber: 2,
    sugar: 38,
    ingredients: [
      { text: "1 cup dates, pitted and chopped", order: 1 },
      { text: "1 cup boiling water", order: 2 },
      { text: "1 tsp baking soda", order: 3 },
      { text: "1/4 cup butter", order: 4 },
      { text: "3/4 cup brown sugar", order: 5 },
      { text: "2 eggs", order: 6 },
      { text: "1 1/4 cups all-purpose flour", order: 7 },
      { text: "1 cup brown sugar", order: 8 },
      { text: "1/2 cup butter", order: 9 },
      { text: "1/2 cup heavy cream", order: 10 }
    ],
    instructions: [
      { text: "Preheat oven to 350°F (175°C)", step: 1 },
      { text: "Soak dates in boiling water with baking soda", step: 2 },
      { text: "Cream butter and sugar, beat in eggs", step: 3 },
      { text: "Mix in flour and date mixture", step: 4 },
      { text: "Bake for 35 minutes", step: 5 },
      { text: "Heat brown sugar, butter, and cream for sauce", step: 6 },
      { text: "Pour sauce over warm cake", step: 7 }
    ]
  },
  {
    title: "Bread and Butter Pudding",
    description: "Classic British bread pudding with raisins",
    cookTime: 50,
    cuisine: "British",
    mealType: "dessert",
    calories: 260,
    protein: 7,
    carbs: 36,
    fat: 10,
    fiber: 1,
    sugar: 20,
    ingredients: [
      { text: "6 slices day-old bread, buttered", order: 1 },
      { text: "1/2 cup raisins", order: 2 },
      { text: "2 cups milk", order: 3 },
      { text: "3 eggs", order: 4 },
      { text: "1/3 cup sugar", order: 5 },
      { text: "1 tsp vanilla extract", order: 6 },
      { text: "1/4 tsp nutmeg", order: 7 }
    ],
    instructions: [
      { text: "Preheat oven to 350°F (175°C)", step: 1 },
      { text: "Layer buttered bread and raisins in dish", step: 2 },
      { text: "Whisk milk, eggs, sugar, vanilla, and nutmeg", step: 3 },
      { text: "Pour over bread", step: 4 },
      { text: "Let soak 15 minutes", step: 5 },
      { text: "Bake 35-40 minutes until golden", step: 6 }
    ]
  },
  {
    title: "Eton Mess",
    description: "British dessert with meringue, berries, and cream",
    cookTime: 20,
    cuisine: "British",
    mealType: "dessert",
    calories: 280,
    protein: 3,
    carbs: 32,
    fat: 16,
    fiber: 2,
    sugar: 28,
    ingredients: [
      { text: "4 meringue nests, crushed", order: 1 },
      { text: "1 cup whipped cream", order: 2 },
      { text: "1 cup fresh strawberries, sliced", order: 3 },
      { text: "1 tbsp sugar", order: 4 }
    ],
    instructions: [
      { text: "Crush meringue nests", step: 1 },
      { text: "Whip cream until stiff peaks", step: 2 },
      { text: "Toss strawberries with sugar", step: 3 },
      { text: "Fold meringue and strawberries into cream", step: 4 },
      { text: "Serve immediately", step: 5 }
    ]
  },
  {
    title: "Trifle",
    description: "Layered British trifle with custard and fruit",
    cookTime: 30,
    cuisine: "British",
    mealType: "dessert",
    calories: 300,
    protein: 6,
    carbs: 38,
    fat: 14,
    fiber: 2,
    sugar: 26,
    ingredients: [
      { text: "1 package ladyfingers", order: 1 },
      { text: "1/4 cup sherry", order: 2 },
      { text: "2 cups custard", order: 3 },
      { text: "2 cups fresh berries", order: 4 },
      { text: "1 cup whipped cream", order: 5 }
    ],
    instructions: [
      { text: "Layer ladyfingers in trifle dish", step: 1 },
      { text: "Drizzle with sherry", step: 2 },
      { text: "Add layer of custard", step: 3 },
      { text: "Add layer of berries", step: 4 },
      { text: "Repeat layers", step: 5 },
      { text: "Top with whipped cream", step: 6 },
      { text: "Chill for at least 2 hours", step: 7 }
    ]
  },
  {
    title: "Apple Crumble",
    description: "Warm apple crumble with oat topping",
    cookTime: 45,
    cuisine: "British",
    mealType: "dessert",
    calories: 280,
    protein: 3,
    carbs: 42,
    fat: 12,
    fiber: 4,
    sugar: 28,
    ingredients: [
      { text: "6 apples, peeled and sliced", order: 1 },
      { text: "1/4 cup sugar", order: 2 },
      { text: "1 tsp cinnamon", order: 3 },
      { text: "1 cup all-purpose flour", order: 4 },
      { text: "1/2 cup brown sugar", order: 5 },
      { text: "1/2 cup butter, cold", order: 6 },
      { text: "1/2 cup rolled oats", order: 7 }
    ],
    instructions: [
      { text: "Preheat oven to 375°F (190°C)", step: 1 },
      { text: "Toss apples with sugar and cinnamon", step: 2 },
      { text: "Place in baking dish", step: 3 },
      { text: "Mix flour, brown sugar, butter, and oats for topping", step: 4 },
      { text: "Sprinkle over apples", step: 5 },
      { text: "Bake 35-40 minutes until golden", step: 6 }
    ]
  },
  {
    title: "Banoffee Pie",
    description: "British pie with bananas, toffee, and cream",
    cookTime: 30,
    cuisine: "British",
    mealType: "dessert",
    calories: 380,
    protein: 5,
    carbs: 48,
    fat: 19,
    fiber: 2,
    sugar: 36,
    ingredients: [
      { text: "1 pie crust, pre-baked", order: 1 },
      { text: "14 oz sweetened condensed milk, caramelized", order: 2 },
      { text: "3-4 bananas, sliced", order: 3 },
      { text: "1 cup whipped cream", order: 4 },
      { text: "Chocolate shavings", order: 5 }
    ],
    instructions: [
      { text: "Spread caramelized condensed milk in crust", step: 1 },
      { text: "Layer banana slices on top", step: 2 },
      { text: "Top with whipped cream", step: 3 },
      { text: "Garnish with chocolate shavings", step: 4 },
      { text: "Chill before serving", step: 5 }
    ]
  },
  {
    title: "Lemon Curd Tart",
    description: "Tangy lemon curd in a buttery tart shell",
    cookTime: 50,
    cuisine: "British",
    mealType: "dessert",
    calories: 260,
    protein: 5,
    carbs: 32,
    fat: 13,
    fiber: 1,
    sugar: 22,
    ingredients: [
      { text: "1 tart shell, pre-baked", order: 1 },
      { text: "3/4 cup lemon juice", order: 2 },
      { text: "1 cup sugar", order: 3 },
      { text: "4 eggs", order: 4 },
      { text: "1/2 cup butter", order: 5 },
      { text: "1 tbsp lemon zest", order: 6 }
    ],
    instructions: [
      { text: "Whisk lemon juice, sugar, and eggs", step: 1 },
      { text: "Cook over low heat, stirring constantly", step: 2 },
      { text: "Add butter and zest, stir until smooth", step: 3 },
      { text: "Strain and pour into tart shell", step: 4 },
      { text: "Chill until set", step: 5 }
    ]
  },
  {
    title: "Pavlova",
    description: "Crisp meringue base with fresh fruit and cream",
    cookTime: 90,
    cuisine: "Australian",
    mealType: "dessert",
    calories: 240,
    protein: 3,
    carbs: 32,
    fat: 12,
    fiber: 2,
    sugar: 30,
    ingredients: [
      { text: "4 egg whites", order: 1 },
      { text: "1 cup sugar", order: 2 },
      { text: "1 tsp cornstarch", order: 3 },
      { text: "1 tsp white vinegar", order: 4 },
      { text: "1 tsp vanilla extract", order: 5 },
      { text: "1 cup whipped cream", order: 6 },
      { text: "2 cups fresh fruit (berries, kiwi, passion fruit)", order: 7 }
    ],
    instructions: [
      { text: "Preheat oven to 250°F (120°C)", step: 1 },
      { text: "Beat egg whites to soft peaks", step: 2 },
      { text: "Gradually add sugar, beat to stiff peaks", step: 3 },
      { text: "Fold in cornstarch, vinegar, and vanilla", step: 4 },
      { text: "Shape into circle on parchment", step: 5 },
      { text: "Bake 90 minutes, then turn off oven and cool inside", step: 6 },
      { text: "Top with whipped cream and fresh fruit", step: 7 }
    ]
  },
  {
    title: "Lamingtons",
    description: "Australian sponge cake squares coated in chocolate and coconut",
    cookTime: 40,
    cuisine: "Australian",
    mealType: "dessert",
    calories: 180,
    protein: 3,
    carbs: 24,
    fat: 8,
    fiber: 1,
    sugar: 16,
    ingredients: [
      { text: "1 sponge cake, cut into squares", order: 1 },
      { text: "2 cups powdered sugar", order: 2 },
      { text: "1/3 cup cocoa powder", order: 3 },
      { text: "1/2 cup milk", order: 4 },
      { text: "2 tbsp butter", order: 5 },
      { text: "2 cups shredded coconut", order: 6 }
    ],
    instructions: [
      { text: "Cut sponge cake into squares", step: 1 },
      { text: "Make chocolate icing with sugar, cocoa, milk, and butter", step: 2 },
      { text: "Dip cake squares in icing", step: 3 },
      { text: "Roll in shredded coconut", step: 4 },
      { text: "Let set before serving", step: 5 }
    ]
  },
  {
    title: "Carrot Cake",
    description: "Moist carrot cake with cream cheese frosting",
    cookTime: 50,
    cuisine: "American",
    mealType: "dessert",
    calories: 320,
    protein: 5,
    carbs: 42,
    fat: 15,
    fiber: 2,
    sugar: 28,
    ingredients: [
      { text: "2 cups all-purpose flour", order: 1 },
      { text: "2 tsp baking soda", order: 2 },
      { text: "2 tsp cinnamon", order: 3 },
      { text: "1/2 tsp salt", order: 4 },
      { text: "1 1/2 cups vegetable oil", order: 5 },
      { text: "2 cups sugar", order: 6 },
      { text: "4 eggs", order: 7 },
      { text: "3 cups grated carrots", order: 8 },
      { text: "8 oz cream cheese, softened", order: 9 },
      { text: "1/2 cup butter, softened", order: 10 },
      { text: "4 cups powdered sugar", order: 11 },
      { text: "1 tsp vanilla extract", order: 12 }
    ],
    instructions: [
      { text: "Preheat oven to 350°F (175°C)", step: 1 },
      { text: "Mix flour, baking soda, cinnamon, and salt", step: 2 },
      { text: "Beat oil, sugar, and eggs", step: 3 },
      { text: "Stir in carrots and flour mixture", step: 4 },
      { text: "Bake in greased pans for 35-40 minutes", step: 5 },
      { text: "Beat cream cheese, butter, powdered sugar, and vanilla for frosting", step: 6 },
      { text: "Frost cooled cake", step: 7 }
    ]
  },
  {
    title: "Red Velvet Cake",
    description: "Classic red velvet cake with cream cheese frosting",
    cookTime: 50,
    cuisine: "American",
    mealType: "dessert",
    calories: 340,
    protein: 5,
    carbs: 44,
    fat: 16,
    fiber: 1,
    sugar: 30,
    ingredients: [
      { text: "2 1/2 cups all-purpose flour", order: 1 },
      { text: "1 1/2 cups sugar", order: 2 },
      { text: "1 tsp baking soda", order: 3 },
      { text: "1 tsp salt", order: 4 },
      { text: "1 tsp cocoa powder", order: 5 },
      { text: "1 1/2 cups vegetable oil", order: 6 },
      { text: "1 cup buttermilk", order: 7 },
      { text: "2 eggs", order: 8 },
      { text: "2 tbsp red food coloring", order: 9 },
      { text: "1 tsp vanilla extract", order: 10 },
      { text: "1 tsp white vinegar", order: 11 },
      { text: "8 oz cream cheese, softened", order: 12 },
      { text: "1/2 cup butter, softened", order: 13 },
      { text: "4 cups powdered sugar", order: 14 }
    ],
    instructions: [
      { text: "Preheat oven to 350°F (175°C)", step: 1 },
      { text: "Mix flour, sugar, baking soda, salt, and cocoa", step: 2 },
      { text: "Beat oil, buttermilk, eggs, food coloring, vanilla, and vinegar", step: 3 },
      { text: "Combine wet and dry ingredients", step: 4 },
      { text: "Bake in greased pans for 30-35 minutes", step: 5 },
      { text: "Beat cream cheese, butter, and powdered sugar for frosting", step: 6 },
      { text: "Frost cooled cake", step: 7 }
    ]
  },
  {
    title: "German Chocolate Cake",
    description: "Rich chocolate cake with coconut-pecan frosting",
    cookTime: 55,
    cuisine: "American",
    mealType: "dessert",
    calories: 380,
    protein: 6,
    carbs: 48,
    fat: 19,
    fiber: 3,
    sugar: 34,
    ingredients: [
      { text: "4 oz German sweet chocolate", order: 1 },
      { text: "1/2 cup water", order: 2 },
      { text: "2 cups all-purpose flour", order: 3 },
      { text: "1 tsp baking soda", order: 4 },
      { text: "1/4 tsp salt", order: 5 },
      { text: "1 cup butter, softened", order: 6 },
      { text: "2 cups sugar", order: 7 },
      { text: "4 egg yolks", order: 8 },
      { text: "1 tsp vanilla extract", order: 9 },
      { text: "1 cup buttermilk", order: 10 },
      { text: "4 egg whites", order: 11 },
      { text: "12 oz evaporated milk", order: 12 },
      { text: "1 1/2 cups sugar", order: 13 },
      { text: "3/4 cup butter", order: 14 },
      { text: "4 egg yolks", order: 15 },
      { text: "1 1/2 tsp vanilla extract", order: 16 },
      { text: "2 cups shredded coconut", order: 17 },
      { text: "1 1/2 cups chopped pecans", order: 18 }
    ],
    instructions: [
      { text: "Preheat oven to 350°F (175°C)", step: 1 },
      { text: "Melt chocolate in water, cool", step: 2 },
      { text: "Mix flour, baking soda, and salt", step: 3 },
      { text: "Cream butter and sugar, beat in yolks and vanilla", step: 4 },
      { text: "Add chocolate and flour mixture alternately with buttermilk", step: 5 },
      { text: "Beat egg whites to stiff peaks and fold in", step: 6 },
      { text: "Bake for 30-35 minutes", step: 7 },
      { text: "Cook milk, sugar, butter, yolks, and vanilla for frosting", step: 8 },
      { text: "Stir in coconut and pecans, cool", step: 9 },
      { text: "Frost cooled cake", step: 10 }
    ]
  },
  {
    title: "Angel Food Cake",
    description: "Light and airy angel food cake",
    cookTime: 40,
    cuisine: "American",
    mealType: "dessert",
    calories: 140,
    protein: 4,
    carbs: 32,
    fat: 0,
    fiber: 0,
    sugar: 24,
    ingredients: [
      { text: "1 1/2 cups egg whites (about 12)", order: 1 },
      { text: "1 1/2 cups powdered sugar", order: 2 },
      { text: "1 cup cake flour", order: 3 },
      { text: "1 1/2 tsp cream of tartar", order: 4 },
      { text: "1 cup granulated sugar", order: 5 },
      { text: "1 tsp vanilla extract", order: 6 },
      { text: "1/2 tsp almond extract", order: 7 }
    ],
    instructions: [
      { text: "Preheat oven to 375°F (190°C)", step: 1 },
      { text: "Sift powdered sugar and flour together", step: 2 },
      { text: "Beat egg whites and cream of tartar to soft peaks", step: 3 },
      { text: "Gradually add granulated sugar, beat to stiff peaks", step: 4 },
      { text: "Fold in vanilla and almond extracts", step: 5 },
      { text: "Gently fold in flour mixture", step: 6 },
      { text: "Pour into ungreased tube pan", step: 7 },
      { text: "Bake 35-40 minutes until golden", step: 8 },
      { text: "Invert pan to cool completely", step: 9 }
    ]
  },
  {
    title: "Pound Cake",
    description: "Classic buttery pound cake",
    cookTime: 70,
    cuisine: "American",
    mealType: "dessert",
    calories: 300,
    protein: 5,
    carbs: 38,
    fat: 14,
    fiber: 1,
    sugar: 24,
    ingredients: [
      { text: "1 cup butter, softened", order: 1 },
      { text: "1 cup sugar", order: 2 },
      { text: "4 eggs", order: 3 },
      { text: "2 cups all-purpose flour", order: 4 },
      { text: "1 tsp baking powder", order: 5 },
      { text: "1/2 tsp salt", order: 6 },
      { text: "1 tsp vanilla extract", order: 7 }
    ],
    instructions: [
      { text: "Preheat oven to 325°F (165°C)", step: 1 },
      { text: "Cream butter and sugar until light and fluffy", step: 2 },
      { text: "Beat in eggs one at a time", step: 3 },
      { text: "Mix flour, baking powder, and salt", step: 4 },
      { text: "Gradually mix in flour mixture", step: 5 },
      { text: "Stir in vanilla", step: 6 },
      { text: "Pour into greased and floured loaf pan", step: 7 },
      { text: "Bake 60-70 minutes until golden", step: 8 },
      { text: "Cool in pan 10 minutes, then remove to wire rack", step: 9 }
    ]
  },
  {
    title: "Lemon Bars",
    description: "Tangy lemon bars with a buttery shortbread crust",
    cookTime: 45,
    cuisine: "American",
    mealType: "dessert",
    calories: 200,
    protein: 2,
    carbs: 28,
    fat: 9,
    fiber: 1,
    sugar: 18,
    ingredients: [
      { text: "1 cup all-purpose flour", order: 1 },
      { text: "1/2 cup butter, softened", order: 2 },
      { text: "1/4 cup powdered sugar", order: 3 },
      { text: "2 eggs", order: 4 },
      { text: "1 cup granulated sugar", order: 5 },
      { text: "2 tbsp lemon juice", order: 6 },
      { text: "1 tbsp lemon zest", order: 7 },
      { text: "2 tbsp all-purpose flour", order: 8 }
    ],
    instructions: [
      { text: "Preheat oven to 350°F (175°C)", step: 1 },
      { text: "Mix flour, butter, and powdered sugar for crust", step: 2 },
      { text: "Press into 8x8 pan and bake 20 minutes", step: 3 },
      { text: "Whisk eggs, sugar, lemon juice, zest, and flour", step: 4 },
      { text: "Pour over crust and bake 25 minutes", step: 5 },
      { text: "Cool and dust with powdered sugar", step: 6 }
    ]
  },
  {
    title: "Peach Cobbler",
    description: "Warm peach cobbler with a golden biscuit topping",
    cookTime: 45,
    cuisine: "American",
    mealType: "dessert",
    calories: 280,
    protein: 3,
    carbs: 42,
    fat: 12,
    fiber: 2,
    sugar: 28,
    ingredients: [
      { text: "4 cups sliced peaches", order: 1 },
      { text: "1/2 cup sugar", order: 2 },
      { text: "1 tbsp cornstarch", order: 3 },
      { text: "1 cup all-purpose flour", order: 4 },
      { text: "1/2 cup sugar", order: 5 },
      { text: "1 tsp baking powder", order: 6 },
      { text: "1/2 cup milk", order: 7 },
      { text: "1/4 cup butter, melted", order: 8 }
    ],
    instructions: [
      { text: "Preheat oven to 375°F (190°C)", step: 1 },
      { text: "Mix peaches with sugar and cornstarch", step: 2 },
      { text: "Pour into baking dish", step: 3 },
      { text: "Mix flour, sugar, baking powder, milk, and butter", step: 4 },
      { text: "Drop spoonfuls over peaches", step: 5 },
      { text: "Bake 35-40 minutes until golden", step: 6 }
    ]
  },
  {
    title: "Rice Pudding",
    description: "Creamy rice pudding with cinnamon and vanilla",
    cookTime: 45,
    cuisine: "American",
    mealType: "dessert",
    calories: 220,
    protein: 5,
    carbs: 38,
    fat: 5,
    fiber: 0,
    sugar: 22,
    ingredients: [
      { text: "1/2 cup white rice", order: 1 },
      { text: "2 cups milk", order: 2 },
      { text: "1/3 cup sugar", order: 3 },
      { text: "1 tsp vanilla extract", order: 4 },
      { text: "1/2 tsp cinnamon", order: 5 },
      { text: "1/4 cup raisins (optional)", order: 6 }
    ],
    instructions: [
      { text: "Cook rice in milk until tender", step: 1 },
      { text: "Stir in sugar and vanilla", step: 2 },
      { text: "Add raisins if desired", step: 3 },
      { text: "Simmer until thick and creamy", step: 4 },
      { text: "Sprinkle with cinnamon and serve warm", step: 5 }
    ]
  },
  {
    title: "Bread Pudding",
    description: "Classic bread pudding with vanilla sauce",
    cookTime: 50,
    cuisine: "American",
    mealType: "dessert",
    calories: 250,
    protein: 6,
    carbs: 35,
    fat: 10,
    fiber: 1,
    sugar: 20,
    ingredients: [
      { text: "4 cups cubed bread", order: 1 },
      { text: "2 cups milk", order: 2 },
      { text: "3 eggs", order: 3 },
      { text: "1/2 cup sugar", order: 4 },
      { text: "1 tsp vanilla extract", order: 5 },
      { text: "1/2 tsp cinnamon", order: 6 },
      { text: "1/4 cup raisins", order: 7 }
    ],
    instructions: [
      { text: "Preheat oven to 350°F (175°C)", step: 1 },
      { text: "Place bread cubes in baking dish", step: 2 },
      { text: "Whisk milk, eggs, sugar, vanilla, and cinnamon", step: 3 },
      { text: "Pour over bread and add raisins", step: 4 },
      { text: "Bake 40-45 minutes until set", step: 5 }
    ]
  },
  {
    title: "Apple Crisp",
    description: "Warm apple crisp with a crunchy oat topping",
    cookTime: 40,
    cuisine: "American",
    mealType: "dessert",
    calories: 240,
    protein: 2,
    carbs: 38,
    fat: 10,
    fiber: 3,
    sugar: 25,
    ingredients: [
      { text: "4 cups sliced apples", order: 1 },
      { text: "1/4 cup sugar", order: 2 },
      { text: "1 tsp cinnamon", order: 3 },
      { text: "1/2 cup rolled oats", order: 4 },
      { text: "1/2 cup flour", order: 5 },
      { text: "1/3 cup brown sugar", order: 6 },
      { text: "1/4 cup butter, melted", order: 7 }
    ],
    instructions: [
      { text: "Preheat oven to 375°F (190°C)", step: 1 },
      { text: "Mix apples with sugar and cinnamon", step: 2 },
      { text: "Place in baking dish", step: 3 },
      { text: "Mix oats, flour, brown sugar, and butter", step: 4 },
      { text: "Sprinkle over apples", step: 5 },
      { text: "Bake 30-35 minutes until golden", step: 6 }
    ]
  },
  {
    title: "Chocolate Mousse",
    description: "Rich and creamy chocolate mousse",
    cookTime: 20,
    cuisine: "French",
    mealType: "dessert",
    calories: 280,
    protein: 4,
    carbs: 22,
    fat: 20,
    fiber: 2,
    sugar: 18,
    ingredients: [
      { text: "6 oz dark chocolate, chopped", order: 1 },
      { text: "3 eggs, separated", order: 2 },
      { text: "1/4 cup sugar", order: 3 },
      { text: "1 cup heavy cream", order: 4 },
      { text: "1 tsp vanilla extract", order: 5 }
    ],
    instructions: [
      { text: "Melt chocolate and let cool slightly", step: 1 },
      { text: "Beat egg yolks with sugar until pale", step: 2 },
      { text: "Fold in melted chocolate", step: 3 },
      { text: "Whip cream until stiff peaks", step: 4 },
      { text: "Beat egg whites until stiff", step: 5 },
      { text: "Fold cream and egg whites into chocolate mixture", step: 6 },
      { text: "Chill for 4 hours before serving", step: 7 }
    ]
  },
  {
    title: "Tiramisu",
    description: "Classic Italian tiramisu with coffee and mascarpone",
    cookTime: 30,
    cuisine: "Italian",
    mealType: "dessert",
    calories: 320,
    protein: 6,
    carbs: 28,
    fat: 20,
    fiber: 1,
    sugar: 20,
    ingredients: [
      { text: "6 egg yolks", order: 1 },
      { text: "3/4 cup sugar", order: 2 },
      { text: "1 cup mascarpone cheese", order: 3 },
      { text: "1 cup heavy cream", order: 4 },
      { text: "1 cup strong coffee, cooled", order: 5 },
      { text: "2 tbsp coffee liqueur", order: 6 },
      { text: "24 ladyfinger cookies", order: 7 },
      { text: "Cocoa powder for dusting", order: 8 }
    ],
    instructions: [
      { text: "Beat egg yolks and sugar until thick", step: 1 },
      { text: "Fold in mascarpone", step: 2 },
      { text: "Whip cream and fold into mixture", step: 3 },
      { text: "Mix coffee and liqueur", step: 4 },
      { text: "Dip ladyfingers in coffee mixture", step: 5 },
      { text: "Layer ladyfingers and cream mixture", step: 6 },
      { text: "Chill 4 hours and dust with cocoa", step: 7 }
    ]
  },
  {
    title: "Crème Brûlée",
    description: "Classic French crème brûlée with caramelized sugar top",
    cookTime: 60,
    cuisine: "French",
    mealType: "dessert",
    calories: 300,
    protein: 5,
    carbs: 22,
    fat: 20,
    fiber: 0,
    sugar: 20,
    ingredients: [
      { text: "2 cups heavy cream", order: 1 },
      { text: "5 egg yolks", order: 2 },
      { text: "1/2 cup sugar", order: 3 },
      { text: "1 tsp vanilla extract", order: 4 },
      { text: "1/4 cup sugar for caramelizing", order: 5 }
    ],
    instructions: [
      { text: "Preheat oven to 325°F (165°C)", step: 1 },
      { text: "Heat cream until hot but not boiling", step: 2 },
      { text: "Whisk egg yolks and sugar", step: 3 },
      { text: "Gradually whisk in hot cream", step: 4 },
      { text: "Stir in vanilla and strain", step: 5 },
      { text: "Pour into ramekins and bake in water bath 40-45 minutes", step: 6 },
      { text: "Chill 4 hours, then caramelize sugar on top", step: 7 }
    ]
  },
  {
    title: "Panna Cotta",
    description: "Silky Italian panna cotta with berry sauce",
    cookTime: 15,
    cuisine: "Italian",
    mealType: "dessert",
    calories: 220,
    protein: 4,
    carbs: 18,
    fat: 15,
    fiber: 1,
    sugar: 16,
    ingredients: [
      { text: "2 cups heavy cream", order: 1 },
      { text: "1/4 cup sugar", order: 2 },
      { text: "1 tsp vanilla extract", order: 3 },
      { text: "2 tsp gelatin", order: 4 },
      { text: "3 tbsp cold water", order: 5 },
      { text: "1 cup mixed berries", order: 6 },
      { text: "2 tbsp sugar", order: 7 }
    ],
    instructions: [
      { text: "Sprinkle gelatin over cold water and let bloom", step: 1 },
      { text: "Heat cream and sugar until sugar dissolves", step: 2 },
      { text: "Remove from heat and stir in vanilla and gelatin", step: 3 },
      { text: "Pour into ramekins and chill 4 hours", step: 4 },
      { text: "Mash berries with sugar for sauce", step: 5 },
      { text: "Serve panna cotta with berry sauce", step: 6 }
    ]
  },
  {
    title: "Banana Pudding",
    description: "Classic Southern banana pudding with vanilla wafers",
    cookTime: 30,
    cuisine: "American",
    mealType: "dessert",
    calories: 260,
    protein: 4,
    carbs: 38,
    fat: 10,
    fiber: 1,
    sugar: 28,
    ingredients: [
      { text: "1 box vanilla wafers", order: 1 },
      { text: "4 bananas, sliced", order: 2 },
      { text: "1 package instant vanilla pudding", order: 3 },
      { text: "2 cups milk", order: 4 },
      { text: "1 cup whipped cream", order: 5 }
    ],
    instructions: [
      { text: "Prepare pudding according to package directions", step: 1 },
      { text: "Layer vanilla wafers, bananas, and pudding", step: 2 },
      { text: "Repeat layers", step: 3 },
      { text: "Top with whipped cream", step: 4 },
      { text: "Chill 2 hours before serving", step: 5 }
    ]
  },
  {
    title: "Key Lime Pie",
    description: "Tart and creamy Key lime pie with graham cracker crust",
    cookTime: 30,
    cuisine: "American",
    mealType: "dessert",
    calories: 320,
    protein: 5,
    carbs: 35,
    fat: 18,
    fiber: 1,
    sugar: 28,
    ingredients: [
      { text: "1 1/2 cups graham cracker crumbs", order: 1 },
      { text: "1/3 cup butter, melted", order: 2 },
      { text: "1/4 cup sugar", order: 3 },
      { text: "4 egg yolks", order: 4 },
      { text: "1 can sweetened condensed milk", order: 5 },
      { text: "1/2 cup Key lime juice", order: 6 },
      { text: "1 tbsp lime zest", order: 7 }
    ],
    instructions: [
      { text: "Preheat oven to 350°F (175°C)", step: 1 },
      { text: "Mix graham crumbs, butter, and sugar", step: 2 },
      { text: "Press into pie pan and bake 10 minutes", step: 3 },
      { text: "Whisk egg yolks, condensed milk, lime juice, and zest", step: 4 },
      { text: "Pour into crust and bake 15 minutes", step: 5 },
      { text: "Chill 4 hours before serving", step: 6 }
    ]
  },
  {
    title: "Pecan Pie",
    description: "Classic Southern pecan pie with caramel filling",
    cookTime: 60,
    cuisine: "American",
    mealType: "dessert",
    calories: 420,
    protein: 5,
    carbs: 52,
    fat: 22,
    fiber: 2,
    sugar: 38,
    ingredients: [
      { text: "1 pie crust", order: 1 },
      { text: "3 eggs", order: 2 },
      { text: "1 cup corn syrup", order: 3 },
      { text: "1 cup sugar", order: 4 },
      { text: "2 tbsp butter, melted", order: 5 },
      { text: "1 tsp vanilla extract", order: 6 },
      { text: "1 1/2 cups pecan halves", order: 7 }
    ],
    instructions: [
      { text: "Preheat oven to 350°F (175°C)", step: 1 },
      { text: "Line pie pan with crust", step: 2 },
      { text: "Whisk eggs, corn syrup, sugar, butter, and vanilla", step: 3 },
      { text: "Stir in pecans", step: 4 },
      { text: "Pour into crust", step: 5 },
      { text: "Bake 50-60 minutes until set", step: 6 }
    ]
  },
  {
    title: "Cherry Pie",
    description: "Classic cherry pie with flaky crust",
    cookTime: 60,
    cuisine: "American",
    mealType: "dessert",
    calories: 280,
    protein: 3,
    carbs: 42,
    fat: 12,
    fiber: 2,
    sugar: 22,
    ingredients: [
      { text: "2 pie crusts", order: 1 },
      { text: "4 cups pitted cherries", order: 2 },
      { text: "1 cup sugar", order: 3 },
      { text: "1/4 cup cornstarch", order: 4 },
      { text: "1 tbsp lemon juice", order: 5 },
      { text: "1/4 tsp almond extract", order: 6 },
      { text: "2 tbsp butter", order: 7 }
    ],
    instructions: [
      { text: "Preheat oven to 425°F (220°C)", step: 1 },
      { text: "Mix cherries, sugar, cornstarch, lemon juice, and extract", step: 2 },
      { text: "Line pie pan with bottom crust", step: 3 },
      { text: "Fill with cherry mixture and dot with butter", step: 4 },
      { text: "Cover with top crust and seal edges", step: 5 },
      { text: "Bake 45-50 minutes until golden", step: 6 }
    ]
  },
  {
    title: "Strawberry Shortcake",
    description: "Classic strawberry shortcake with fresh berries and whipped cream",
    cookTime: 25,
    cuisine: "American",
    mealType: "dessert",
    calories: 320,
    protein: 5,
    carbs: 42,
    fat: 15,
    fiber: 2,
    sugar: 28,
    ingredients: [
      { text: "2 cups sliced strawberries", order: 1 },
      { text: "2 tbsp sugar", order: 2 },
      { text: "2 cups all-purpose flour", order: 3 },
      { text: "1/4 cup sugar", order: 4 },
      { text: "1 tbsp baking powder", order: 5 },
      { text: "1/2 cup butter, cold", order: 6 },
      { text: "2/3 cup milk", order: 7 },
      { text: "1 cup whipped cream", order: 8 }
    ],
    instructions: [
      { text: "Preheat oven to 425°F (220°C)", step: 1 },
      { text: "Mix strawberries with sugar and let macerate", step: 2 },
      { text: "Mix flour, sugar, and baking powder", step: 3 },
      { text: "Cut in butter until crumbly", step: 4 },
      { text: "Stir in milk and form into biscuits", step: 5 },
      { text: "Bake 12-15 minutes until golden", step: 6 },
      { text: "Split biscuits and layer with strawberries and cream", step: 7 }
    ]
  },
  {
    title: "Chocolate Fondue",
    description: "Rich chocolate fondue with assorted dippers",
    cookTime: 10,
    cuisine: "Swiss",
    mealType: "dessert",
    calories: 280,
    protein: 4,
    carbs: 32,
    fat: 16,
    fiber: 3,
    sugar: 26,
    ingredients: [
      { text: "8 oz dark chocolate, chopped", order: 1 },
      { text: "1 cup heavy cream", order: 2 },
      { text: "2 tbsp butter", order: 3 },
      { text: "1 tsp vanilla extract", order: 4 },
      { text: "Assorted dippers (strawberries, bananas, marshmallows)", order: 5 }
    ],
    instructions: [
      { text: "Heat cream until hot but not boiling", step: 1 },
      { text: "Add chocolate and stir until melted", step: 2 },
      { text: "Stir in butter and vanilla", step: 3 },
      { text: "Keep warm in fondue pot", step: 4 },
      { text: "Serve with assorted dippers", step: 5 }
    ]
  },
  {
    title: "S'mores",
    description: "Classic campfire s'mores with graham crackers, chocolate, and marshmallows",
    cookTime: 5,
    cuisine: "American",
    mealType: "dessert",
    calories: 180,
    protein: 2,
    carbs: 28,
    fat: 7,
    fiber: 1,
    sugar: 20,
    ingredients: [
      { text: "2 graham cracker squares", order: 1 },
      { text: "1 marshmallow", order: 2 },
      { text: "1 square chocolate bar", order: 3 }
    ],
    instructions: [
      { text: "Toast marshmallow over fire or in oven", step: 1 },
      { text: "Place chocolate on one graham cracker", step: 2 },
      { text: "Top with toasted marshmallow", step: 3 },
      { text: "Cover with second graham cracker and press", step: 4 }
    ]
  },
  {
    title: "Churros",
    description: "Crispy Spanish churros with cinnamon sugar",
    cookTime: 30,
    cuisine: "Spanish",
    mealType: "dessert",
    calories: 220,
    protein: 3,
    carbs: 32,
    fat: 10,
    fiber: 1,
    sugar: 18,
    ingredients: [
      { text: "1 cup water", order: 1 },
      { text: "2 tbsp butter", order: 2 },
      { text: "1 tbsp sugar", order: 3 },
      { text: "1/2 tsp salt", order: 4 },
      { text: "1 cup all-purpose flour", order: 5 },
      { text: "2 eggs", order: 6 },
      { text: "1/2 cup sugar", order: 7 },
      { text: "1 tbsp cinnamon", order: 8 },
      { text: "Oil for frying", order: 9 }
    ],
    instructions: [
      { text: "Heat water, butter, sugar, and salt to boil", step: 1 },
      { text: "Stir in flour until smooth", step: 2 },
      { text: "Cool slightly and beat in eggs", step: 3 },
      { text: "Pipe into hot oil and fry until golden", step: 4 },
      { text: "Mix sugar and cinnamon", step: 5 },
      { text: "Roll churros in cinnamon sugar", step: 6 }
    ]
  },
  {
    title: "Cannoli",
    description: "Crispy Italian cannoli shells filled with sweet ricotta",
    cookTime: 45,
    cuisine: "Italian",
    mealType: "dessert",
    calories: 200,
    protein: 5,
    carbs: 22,
    fat: 10,
    fiber: 1,
    sugar: 14,
    ingredients: [
      { text: "1 cup all-purpose flour", order: 1 },
      { text: "1 tbsp sugar", order: 2 },
      { text: "1/4 cup white wine", order: 3 },
      { text: "1 egg white", order: 4 },
      { text: "1 cup ricotta cheese", order: 5 },
      { text: "1/2 cup powdered sugar", order: 6 },
      { text: "1/2 tsp vanilla extract", order: 7 },
      { text: "1/4 cup mini chocolate chips", order: 8 },
      { text: "Oil for frying", order: 9 }
    ],
    instructions: [
      { text: "Mix flour, sugar, wine, and egg white for dough", step: 1 },
      { text: "Roll thin and cut into circles", step: 2 },
      { text: "Wrap around cannoli forms and fry until golden", step: 3 },
      { text: "Mix ricotta, powdered sugar, vanilla, and chocolate chips", step: 4 },
      { text: "Fill cannoli shells just before serving", step: 5 }
    ]
  },
  {
    title: "Baklava",
    description: "Sweet Greek baklava with honey and nuts",
    cookTime: 60,
    cuisine: "Greek",
    mealType: "dessert",
    calories: 280,
    protein: 5,
    carbs: 32,
    fat: 16,
    fiber: 2,
    sugar: 22,
    ingredients: [
      { text: "1 lb phyllo dough", order: 1 },
      { text: "1 cup butter, melted", order: 2 },
      { text: "2 cups chopped walnuts", order: 3 },
      { text: "1/2 cup sugar", order: 4 },
      { text: "1 tsp cinnamon", order: 5 },
      { text: "1 cup honey", order: 6 },
      { text: "1/2 cup water", order: 7 },
      { text: "1/2 cup sugar", order: 8 }
    ],
    instructions: [
      { text: "Preheat oven to 350°F (175°C)", step: 1 },
      { text: "Mix walnuts, sugar, and cinnamon", step: 2 },
      { text: "Layer phyllo sheets with butter and nut mixture", step: 3 },
      { text: "Cut into diamonds and bake 50 minutes", step: 4 },
      { text: "Heat honey, water, and sugar for syrup", step: 5 },
      { text: "Pour syrup over hot baklava", step: 6 }
    ]
  },
  {
    title: "Tres Leches Cake",
    description: "Moist Latin American cake soaked in three milks",
    cookTime: 60,
    cuisine: "Latin American",
    mealType: "dessert",
    calories: 320,
    protein: 7,
    carbs: 42,
    fat: 14,
    fiber: 1,
    sugar: 32,
    ingredients: [
      { text: "1 1/2 cups all-purpose flour", order: 1 },
      { text: "1 tsp baking powder", order: 2 },
      { text: "5 eggs, separated", order: 3 },
      { text: "1 cup sugar", order: 4 },
      { text: "1/3 cup milk", order: 5 },
      { text: "1 can evaporated milk", order: 6 },
      { text: "1 can sweetened condensed milk", order: 7 },
      { text: "1 cup heavy cream", order: 8 },
      { text: "1 cup whipped cream", order: 9 }
    ],
    instructions: [
      { text: "Preheat oven to 350°F (175°C)", step: 1 },
      { text: "Mix flour and baking powder", step: 2 },
      { text: "Beat egg whites until stiff, then beat yolks with sugar", step: 3 },
      { text: "Fold together and bake 25-30 minutes", step: 4 },
      { text: "Mix three milks and pour over cooled cake", step: 5 },
      { text: "Chill 4 hours and top with whipped cream", step: 6 }
    ]
  },
  {
    title: "Flan",
    description: "Creamy caramel flan, a classic Latin dessert",
    cookTime: 60,
    cuisine: "Latin American",
    mealType: "dessert",
    calories: 240,
    protein: 6,
    carbs: 32,
    fat: 10,
    fiber: 0,
    sugar: 30,
    ingredients: [
      { text: "1 cup sugar", order: 1 },
      { text: "1/4 cup water", order: 2 },
      { text: "4 eggs", order: 3 },
      { text: "1 can sweetened condensed milk", order: 4 },
      { text: "1 can evaporated milk", order: 5 },
      { text: "1 tsp vanilla extract", order: 6 }
    ],
    instructions: [
      { text: "Preheat oven to 350°F (175°C)", step: 1 },
      { text: "Melt sugar and water for caramel", step: 2 },
      { text: "Pour caramel into ramekins", step: 3 },
      { text: "Blend eggs, milks, and vanilla", step: 4 },
      { text: "Pour into ramekins and bake in water bath 50 minutes", step: 5 },
      { text: "Chill 4 hours and invert to serve", step: 6 }
    ]
  },
  {
    title: "Gulab Jamun",
    description: "Sweet Indian milk dumplings in rose syrup",
    cookTime: 45,
    cuisine: "Indian",
    mealType: "dessert",
    calories: 180,
    protein: 4,
    carbs: 28,
    fat: 6,
    fiber: 0,
    sugar: 24,
    ingredients: [
      { text: "1 cup milk powder", order: 1 },
      { text: "1/4 cup all-purpose flour", order: 2 },
      { text: "1/4 tsp baking soda", order: 3 },
      { text: "2 tbsp ghee", order: 4 },
      { text: "1/4 cup milk", order: 5 },
      { text: "1 cup sugar", order: 6 },
      { text: "1 cup water", order: 7 },
      { text: "1/2 tsp cardamom", order: 8 },
      { text: "Oil for frying", order: 9 }
    ],
    instructions: [
      { text: "Mix milk powder, flour, baking soda, and ghee", step: 1 },
      { text: "Add milk to form soft dough", step: 2 },
      { text: "Form into small balls", step: 3 },
      { text: "Fry until golden brown", step: 4 },
      { text: "Boil sugar, water, and cardamom for syrup", step: 5 },
      { text: "Soak dumplings in warm syrup", step: 6 }
    ]
  },
  {
    title: "Mochi Ice Cream",
    description: "Japanese mochi with ice cream filling",
    cookTime: 30,
    cuisine: "Japanese",
    mealType: "dessert",
    calories: 100,
    protein: 2,
    carbs: 18,
    fat: 3,
    fiber: 1,
    sugar: 12,
    ingredients: [
      { text: "1 cup glutinous rice flour", order: 1 },
      { text: "1/4 cup sugar", order: 2 },
      { text: "1 cup water", order: 3 },
      { text: "Cornstarch for dusting", order: 4 },
      { text: "Ice cream of choice", order: 5 }
    ],
    instructions: [
      { text: "Mix rice flour, sugar, and water", step: 1 },
      { text: "Steam for 20 minutes", step: 2 },
      { text: "Knead until smooth", step: 3 },
      { text: "Roll out and cut into circles", step: 4 },
      { text: "Wrap around ice cream scoops", step: 5 },
      { text: "Freeze until firm", step: 6 }
    ]
  },
  {
    title: "Macarons",
    description: "Delicate French macarons with ganache filling",
    cookTime: 90,
    cuisine: "French",
    mealType: "dessert",
    calories: 90,
    protein: 2,
    carbs: 12,
    fat: 4,
    fiber: 0,
    sugar: 11,
    ingredients: [
      { text: "1 cup almond flour", order: 1 },
      { text: "1 3/4 cups powdered sugar", order: 2 },
      { text: "3 egg whites", order: 3 },
      { text: "1/4 cup granulated sugar", order: 4 },
      { text: "4 oz dark chocolate", order: 5 },
      { text: "1/2 cup heavy cream", order: 6 }
    ],
    instructions: [
      { text: "Sift almond flour and powdered sugar", step: 1 },
      { text: "Beat egg whites until foamy, add sugar gradually", step: 2 },
      { text: "Fold in almond mixture", step: 3 },
      { text: "Pipe onto baking sheets and rest 30 minutes", step: 4 },
      { text: "Bake at 300°F for 12-15 minutes", step: 5 },
      { text: "Make ganache and fill macarons", step: 6 }
    ]
  },
  {
    title: "Éclairs",
    description: "Classic French éclairs with pastry cream and chocolate glaze",
    cookTime: 60,
    cuisine: "French",
    mealType: "dessert",
    calories: 220,
    protein: 5,
    carbs: 24,
    fat: 12,
    fiber: 1,
    sugar: 16,
    ingredients: [
      { text: "1/2 cup water", order: 1 },
      { text: "1/4 cup butter", order: 2 },
      { text: "1/2 cup all-purpose flour", order: 3 },
      { text: "2 eggs", order: 4 },
      { text: "1 cup milk", order: 5 },
      { text: "2 egg yolks", order: 6 },
      { text: "1/4 cup sugar", order: 7 },
      { text: "2 tbsp cornstarch", order: 8 },
      { text: "1 tsp vanilla", order: 9 },
      { text: "4 oz dark chocolate", order: 10 },
      { text: "1/4 cup heavy cream", order: 11 }
    ],
    instructions: [
      { text: "Make choux pastry and pipe into éclair shapes", step: 1 },
      { text: "Bake at 400°F for 25 minutes", step: 2 },
      { text: "Make pastry cream with milk, yolks, sugar, and cornstarch", step: 3 },
      { text: "Cool and fill éclairs", step: 4 },
      { text: "Melt chocolate and cream for glaze", step: 5 },
      { text: "Dip éclairs in chocolate glaze", step: 6 }
    ]
  },
  {
    title: "Profiteroles",
    description: "Light choux pastry puffs filled with ice cream and chocolate sauce",
    cookTime: 45,
    cuisine: "French",
    mealType: "dessert",
    calories: 180,
    protein: 4,
    carbs: 20,
    fat: 10,
    fiber: 1,
    sugar: 14,
    ingredients: [
      { text: "1/2 cup water", order: 1 },
      { text: "1/4 cup butter", order: 2 },
      { text: "1/2 cup all-purpose flour", order: 3 },
      { text: "2 eggs", order: 4 },
      { text: "Vanilla ice cream", order: 5 },
      { text: "4 oz dark chocolate", order: 6 },
      { text: "1/2 cup heavy cream", order: 7 }
    ],
    instructions: [
      { text: "Make choux pastry", step: 1 },
      { text: "Pipe small puffs and bake at 400°F for 20 minutes", step: 2 },
      { text: "Cool and split open", step: 3 },
      { text: "Fill with ice cream", step: 4 },
      { text: "Melt chocolate and cream for sauce", step: 5 },
      { text: "Drizzle with chocolate sauce", step: 6 }
    ]
  },
  {
    title: "Lava Cake",
    description: "Warm chocolate lava cake with molten center",
    cookTime: 15,
    cuisine: "French",
    mealType: "dessert",
    calories: 380,
    protein: 6,
    carbs: 42,
    fat: 22,
    fiber: 3,
    sugar: 32,
    ingredients: [
      { text: "4 oz dark chocolate", order: 1 },
      { text: "1/2 cup butter", order: 2 },
      { text: "2 eggs", order: 3 },
      { text: "2 egg yolks", order: 4 },
      { text: "1/4 cup sugar", order: 5 },
      { text: "2 tbsp all-purpose flour", order: 6 },
      { text: "Powdered sugar for dusting", order: 7 }
    ],
    instructions: [
      { text: "Preheat oven to 425°F (220°C)", step: 1 },
      { text: "Melt chocolate and butter", step: 2 },
      { text: "Beat eggs, yolks, and sugar until pale", step: 3 },
      { text: "Fold in chocolate and flour", step: 4 },
      { text: "Pour into ramekins and bake 12-14 minutes", step: 5 },
      { text: "Serve immediately, dusted with powdered sugar", step: 6 }
    ]
  },
  {
    title: "Chocolate Soufflé",
    description: "Light and airy chocolate soufflé",
    cookTime: 25,
    cuisine: "French",
    mealType: "dessert",
    calories: 220,
    protein: 6,
    carbs: 28,
    fat: 10,
    fiber: 2,
    sugar: 22,
    ingredients: [
      { text: "3 oz dark chocolate", order: 1 },
      { text: "2 tbsp butter", order: 2 },
      { text: "2 tbsp all-purpose flour", order: 3 },
      { text: "1/2 cup milk", order: 4 },
      { text: "3 egg yolks", order: 5 },
      { text: "4 egg whites", order: 6 },
      { text: "1/4 cup sugar", order: 7 }
    ],
    instructions: [
      { text: "Preheat oven to 375°F (190°C)", step: 1 },
      { text: "Melt chocolate and butter", step: 2 },
      { text: "Make roux with flour and milk", step: 3 },
      { text: "Stir in chocolate and egg yolks", step: 4 },
      { text: "Beat egg whites with sugar until stiff", step: 5 },
      { text: "Fold into chocolate mixture", step: 6 },
      { text: "Bake 15-18 minutes until risen", step: 7 }
    ]
  },
  {
    title: "Crêpes Suzette",
    description: "Elegant French crêpes with orange butter sauce",
    cookTime: 30,
    cuisine: "French",
    mealType: "dessert",
    calories: 240,
    protein: 5,
    carbs: 28,
    fat: 12,
    fiber: 1,
    sugar: 18,
    ingredients: [
      { text: "1 cup all-purpose flour", order: 1 },
      { text: "2 eggs", order: 2 },
      { text: "1 cup milk", order: 3 },
      { text: "2 tbsp butter, melted", order: 4 },
      { text: "1/4 cup butter", order: 5 },
      { text: "1/4 cup sugar", order: 6 },
      { text: "Juice and zest of 2 oranges", order: 7 },
      { text: "2 tbsp orange liqueur", order: 8 }
    ],
    instructions: [
      { text: "Make crêpe batter and cook thin crêpes", step: 1 },
      { text: "Melt butter and sugar in pan", step: 2 },
      { text: "Add orange juice, zest, and liqueur", step: 3 },
      { text: "Add crêpes and warm through", step: 4 },
      { text: "Flambé if desired", step: 5 },
      { text: "Serve immediately", step: 6 }
    ]
  },
  {
    title: "Pavlova",
    description: "Light meringue dessert with fresh fruit and cream",
    cookTime: 90,
    cuisine: "Australian",
    mealType: "dessert",
    calories: 200,
    protein: 3,
    carbs: 32,
    fat: 7,
    fiber: 1,
    sugar: 30,
    ingredients: [
      { text: "4 egg whites", order: 1 },
      { text: "1 cup sugar", order: 2 },
      { text: "1 tsp cornstarch", order: 3 },
      { text: "1 tsp white vinegar", order: 4 },
      { text: "1 cup heavy cream", order: 5 },
      { text: "2 cups mixed fresh fruit", order: 6 }
    ],
    instructions: [
      { text: "Preheat oven to 250°F (120°C)", step: 1 },
      { text: "Beat egg whites until stiff, gradually add sugar", step: 2 },
      { text: "Fold in cornstarch and vinegar", step: 3 },
      { text: "Shape into nest and bake 90 minutes", step: 4 },
      { text: "Cool completely", step: 5 },
      { text: "Top with whipped cream and fresh fruit", step: 6 }
    ]
  },
  {
    title: "Sticky Toffee Pudding",
    description: "Moist date cake with toffee sauce",
    cookTime: 60,
    cuisine: "British",
    mealType: "dessert",
    calories: 380,
    protein: 4,
    carbs: 58,
    fat: 16,
    fiber: 2,
    sugar: 45,
    ingredients: [
      { text: "1 cup chopped dates", order: 1 },
      { text: "1 cup boiling water", order: 2 },
      { text: "1 tsp baking soda", order: 3 },
      { text: "1/4 cup butter", order: 4 },
      { text: "3/4 cup brown sugar", order: 5 },
      { text: "2 eggs", order: 6 },
      { text: "1 1/3 cups all-purpose flour", order: 7 },
      { text: "1/2 cup butter", order: 8 },
      { text: "1/2 cup brown sugar", order: 9 },
      { text: "1/2 cup heavy cream", order: 10 }
    ],
    instructions: [
      { text: "Preheat oven to 350°F (175°C)", step: 1 },
      { text: "Soak dates in boiling water and baking soda", step: 2 },
      { text: "Cream butter and sugar, beat in eggs", step: 3 },
      { text: "Fold in flour and date mixture", step: 4 },
      { text: "Bake 35-40 minutes", step: 5 },
      { text: "Make toffee sauce and pour over warm pudding", step: 6 }
    ]
  },
  {
    title: "Trifle",
    description: "Layered British trifle with cake, custard, and fruit",
    cookTime: 30,
    cuisine: "British",
    mealType: "dessert",
    calories: 280,
    protein: 5,
    carbs: 38,
    fat: 12,
    fiber: 1,
    sugar: 28,
    ingredients: [
      { text: "1 pound cake, cubed", order: 1 },
      { text: "1/4 cup sherry", order: 2 },
      { text: "2 cups custard", order: 3 },
      { text: "2 cups fresh berries", order: 4 },
      { text: "2 cups whipped cream", order: 5 },
      { text: "Sliced almonds for garnish", order: 6 }
    ],
    instructions: [
      { text: "Layer cake cubes in trifle dish", step: 1 },
      { text: "Drizzle with sherry", step: 2 },
      { text: "Add layer of custard", step: 3 },
      { text: "Add layer of berries", step: 4 },
      { text: "Repeat layers", step: 5 },
      { text: "Top with whipped cream and almonds", step: 6 },
      { text: "Chill 2 hours before serving", step: 7 }
    ]
  },
  {
    title: "Banoffee Pie",
    description: "British banoffee pie with bananas, toffee, and cream",
    cookTime: 30,
    cuisine: "British",
    mealType: "dessert",
    calories: 420,
    protein: 5,
    carbs: 52,
    fat: 22,
    fiber: 2,
    sugar: 38,
    ingredients: [
      { text: "1 1/2 cups graham cracker crumbs", order: 1 },
      { text: "1/3 cup butter, melted", order: 2 },
      { text: "1 can dulce de leche", order: 3 },
      { text: "3 bananas, sliced", order: 4 },
      { text: "1 cup heavy cream", order: 5 },
      { text: "2 tbsp powdered sugar", order: 6 },
      { text: "Chocolate shavings", order: 7 }
    ],
    instructions: [
      { text: "Mix graham crumbs and butter for crust", step: 1 },
      { text: "Press into pie pan and chill", step: 2 },
      { text: "Spread dulce de leche over crust", step: 3 },
      { text: "Layer banana slices", step: 4 },
      { text: "Whip cream with sugar and spread over top", step: 5 },
      { text: "Garnish with chocolate shavings", step: 6 },
      { text: "Chill 2 hours before serving", step: 7 }
    ]
  },
  {
    title: "Eton Mess",
    description: "Classic British dessert with meringue, cream, and strawberries",
    cookTime: 60,
    cuisine: "British",
    mealType: "dessert",
    calories: 260,
    protein: 3,
    carbs: 32,
    fat: 14,
    fiber: 1,
    sugar: 28,
    ingredients: [
      { text: "4 egg whites", order: 1 },
      { text: "1 cup sugar", order: 2 },
      { text: "2 cups heavy cream", order: 3 },
      { text: "2 cups sliced strawberries", order: 4 },
      { text: "2 tbsp sugar", order: 5 }
    ],
    instructions: [
      { text: "Make meringue and bake until crisp", step: 1 },
      { text: "Break meringue into pieces", step: 2 },
      { text: "Whip cream until stiff", step: 3 },
      { text: "Mix strawberries with sugar", step: 4 },
      { text: "Layer meringue, cream, and strawberries", step: 5 },
      { text: "Serve immediately", step: 6 }
    ]
  },
  {
    title: "Sticky Rice with Mango",
    description: "Sweet Thai sticky rice with coconut and mango",
    cookTime: 60,
    cuisine: "Thai",
    mealType: "dessert",
    calories: 320,
    protein: 5,
    carbs: 58,
    fat: 10,
    fiber: 2,
    sugar: 32,
    ingredients: [
      { text: "1 cup sticky rice", order: 1 },
      { text: "1 1/2 cups coconut milk", order: 2 },
      { text: "1/2 cup sugar", order: 3 },
      { text: "1/2 tsp salt", order: 4 },
      { text: "2 ripe mangoes, sliced", order: 5 },
      { text: "Sesame seeds for garnish", order: 6 }
    ],
    instructions: [
      { text: "Soak rice overnight and steam until tender", step: 1 },
      { text: "Heat coconut milk, sugar, and salt", step: 2 },
      { text: "Pour over hot rice and let absorb", step: 3 },
      { text: "Serve warm with mango slices", step: 4 },
      { text: "Garnish with sesame seeds", step: 5 }
    ]
  },
  {
    title: "Mango Sticky Rice",
    description: "Creamy coconut sticky rice with fresh mango",
    cookTime: 60,
    cuisine: "Thai",
    mealType: "dessert",
    calories: 300,
    protein: 4,
    carbs: 55,
    fat: 9,
    fiber: 2,
    sugar: 30,
    ingredients: [
      { text: "1 cup glutinous rice", order: 1 },
      { text: "1 can coconut milk", order: 2 },
      { text: "1/3 cup sugar", order: 3 },
      { text: "1/4 tsp salt", order: 4 },
      { text: "2 ripe mangoes", order: 5 }
    ],
    instructions: [
      { text: "Soak rice 4 hours and steam 20 minutes", step: 1 },
      { text: "Heat half coconut milk with sugar and salt", step: 2 },
      { text: "Mix with hot rice and let stand 20 minutes", step: 3 },
      { text: "Slice mangoes", step: 4 },
      { text: "Serve rice with mango and remaining coconut milk", step: 5 }
    ]
  },
  {
    title: "Mochi Donuts",
    description: "Chewy Japanese mochi donuts with glaze",
    cookTime: 30,
    cuisine: "Japanese",
    mealType: "dessert",
    calories: 200,
    protein: 3,
    carbs: 35,
    fat: 6,
    fiber: 1,
    sugar: 18,
    ingredients: [
      { text: "2 cups glutinous rice flour", order: 1 },
      { text: "1/2 cup sugar", order: 2 },
      { text: "1 tsp baking powder", order: 3 },
      { text: "1 cup milk", order: 4 },
      { text: "2 eggs", order: 5 },
      { text: "2 tbsp butter, melted", order: 6 },
      { text: "1 cup powdered sugar", order: 7 },
      { text: "2 tbsp milk", order: 8 },
      { text: "Oil for frying", order: 9 }
    ],
    instructions: [
      { text: "Mix rice flour, sugar, and baking powder", step: 1 },
      { text: "Whisk in milk, eggs, and butter", step: 2 },
      { text: "Form into donut shapes", step: 3 },
      { text: "Fry until golden", step: 4 },
      { text: "Make glaze with powdered sugar and milk", step: 5 },
      { text: "Dip donuts in glaze", step: 6 }
    ]
  },
  {
    title: "Taiyaki",
    description: "Japanese fish-shaped waffle filled with sweet red bean paste",
    cookTime: 20,
    cuisine: "Japanese",
    mealType: "dessert",
    calories: 180,
    protein: 4,
    carbs: 32,
    fat: 5,
    fiber: 2,
    sugar: 14,
    ingredients: [
      { text: "1 cup all-purpose flour", order: 1 },
      { text: "1 tsp baking powder", order: 2 },
      { text: "1 egg", order: 3 },
      { text: "1/2 cup milk", order: 4 },
      { text: "2 tbsp sugar", order: 5 },
      { text: "1/2 cup sweet red bean paste", order: 6 }
    ],
    instructions: [
      { text: "Mix flour, baking powder, egg, milk, and sugar", step: 1 },
      { text: "Heat taiyaki pan", step: 2 },
      { text: "Pour batter into fish mold", step: 3 },
      { text: "Add red bean paste", step: 4 },
      { text: "Cover with more batter and cook until golden", step: 5 }
    ]
  },
  {
    title: "Dango",
    description: "Sweet Japanese rice dumplings on skewers",
    cookTime: 30,
    cuisine: "Japanese",
    mealType: "dessert",
    calories: 120,
    protein: 2,
    carbs: 26,
    fat: 0,
    fiber: 1,
    sugar: 8,
    ingredients: [
      { text: "1 cup glutinous rice flour", order: 1 },
      { text: "1/3 cup water", order: 2 },
      { text: "1/4 cup sugar", order: 3 },
      { text: "2 tbsp soy sauce", order: 4 },
      { text: "2 tbsp mirin", order: 5 },
      { text: "1 tbsp cornstarch", order: 6 }
    ],
    instructions: [
      { text: "Mix rice flour and water to form dough", step: 1 },
      { text: "Form into small balls", step: 2 },
      { text: "Boil until they float", step: 3 },
      { text: "Thread onto skewers", step: 4 },
      { text: "Make glaze with sugar, soy sauce, mirin, and cornstarch", step: 5 },
      { text: "Grill and brush with glaze", step: 6 }
    ]
  },
  {
    title: "Dorayaki",
    description: "Japanese pancake sandwich with sweet red bean filling",
    cookTime: 20,
    cuisine: "Japanese",
    mealType: "dessert",
    calories: 220,
    protein: 5,
    carbs: 42,
    fat: 4,
    fiber: 2,
    sugar: 20,
    ingredients: [
      { text: "2 eggs", order: 1 },
      { text: "1/3 cup sugar", order: 2 },
      { text: "1 tbsp honey", order: 3 },
      { text: "1 cup all-purpose flour", order: 4 },
      { text: "1 tsp baking powder", order: 5 },
      { text: "2 tbsp water", order: 6 },
      { text: "1/2 cup sweet red bean paste", order: 7 }
    ],
    instructions: [
      { text: "Beat eggs, sugar, and honey", step: 1 },
      { text: "Sift in flour and baking powder", step: 2 },
      { text: "Add water to thin batter", step: 3 },
      { text: "Cook small pancakes", step: 4 },
      { text: "Sandwich red bean paste between two pancakes", step: 5 }
    ]
  },
  {
    title: "Matcha Ice Cream",
    description: "Creamy Japanese matcha green tea ice cream",
    cookTime: 30,
    cuisine: "Japanese",
    mealType: "dessert",
    calories: 180,
    protein: 3,
    carbs: 22,
    fat: 9,
    fiber: 0,
    sugar: 20,
    ingredients: [
      { text: "2 cups heavy cream", order: 1 },
      { text: "1 cup whole milk", order: 2 },
      { text: "3/4 cup sugar", order: 3 },
      { text: "2 tbsp matcha powder", order: 4 },
      { text: "4 egg yolks", order: 5 }
    ],
    instructions: [
      { text: "Heat cream and milk until hot", step: 1 },
      { text: "Whisk egg yolks and sugar", step: 2 },
      { text: "Gradually whisk in hot cream", step: 3 },
      { text: "Whisk in matcha powder", step: 4 },
      { text: "Cook until thickened", step: 5 },
      { text: "Chill and churn in ice cream maker", step: 6 }
    ]
  },
  {
    title: "Black Sesame Ice Cream",
    description: "Rich black sesame ice cream",
    cookTime: 30,
    cuisine: "Japanese",
    mealType: "dessert",
    calories: 220,
    protein: 5,
    carbs: 20,
    fat: 14,
    fiber: 2,
    sugar: 16,
    ingredients: [
      { text: "2 cups heavy cream", order: 1 },
      { text: "1 cup whole milk", order: 2 },
      { text: "1/2 cup black sesame seeds, toasted", order: 3 },
      { text: "3/4 cup sugar", order: 4 },
      { text: "4 egg yolks", order: 5 }
    ],
    instructions: [
      { text: "Grind toasted sesame seeds", step: 1 },
      { text: "Heat cream and milk", step: 2 },
      { text: "Whisk egg yolks and sugar", step: 3 },
      { text: "Stir in sesame paste", step: 4 },
      { text: "Cook until thickened", step: 5 },
      { text: "Chill and churn", step: 6 }
    ]
  },
  {
    title: "Red Bean Ice Cream",
    description: "Sweet red bean ice cream",
    cookTime: 30,
    cuisine: "Japanese",
    mealType: "dessert",
    calories: 200,
    protein: 4,
    carbs: 28,
    fat: 8,
    fiber: 3,
    sugar: 22,
    ingredients: [
      { text: "2 cups heavy cream", order: 1 },
      { text: "1 cup whole milk", order: 2 },
      { text: "1/2 cup sweet red bean paste", order: 3 },
      { text: "3/4 cup sugar", order: 4 },
      { text: "4 egg yolks", order: 5 }
    ],
    instructions: [
      { text: "Heat cream and milk", step: 1 },
      { text: "Whisk egg yolks and sugar", step: 2 },
      { text: "Stir in red bean paste", step: 3 },
      { text: "Cook until thickened", step: 4 },
      { text: "Chill and churn", step: 5 }
    ]
  },
  {
    title: "Mango Sorbet",
    description: "Refreshing mango sorbet",
    cookTime: 20,
    cuisine: "American",
    mealType: "dessert",
    calories: 120,
    protein: 1,
    carbs: 30,
    fat: 0,
    fiber: 2,
    sugar: 28,
    ingredients: [
      { text: "3 cups frozen mango chunks", order: 1 },
      { text: "1/4 cup sugar", order: 2 },
      { text: "2 tbsp lime juice", order: 3 },
      { text: "1/4 cup water", order: 4 }
    ],
    instructions: [
      { text: "Blend frozen mango until smooth", step: 1 },
      { text: "Add sugar, lime juice, and water", step: 2 },
      { text: "Blend until creamy", step: 3 },
      { text: "Freeze until firm", step: 4 }
    ]
  },
  {
    title: "Lemon Sorbet",
    description: "Tart and refreshing lemon sorbet",
    cookTime: 20,
    cuisine: "Italian",
    mealType: "dessert",
    calories: 100,
    protein: 0,
    carbs: 26,
    fat: 0,
    fiber: 0,
    sugar: 24,
    ingredients: [
      { text: "1 cup water", order: 1 },
      { text: "1 cup sugar", order: 2 },
      { text: "1 cup fresh lemon juice", order: 3 },
      { text: "1 tbsp lemon zest", order: 4 }
    ],
    instructions: [
      { text: "Heat water and sugar until dissolved", step: 1 },
      { text: "Cool completely", step: 2 },
      { text: "Stir in lemon juice and zest", step: 3 },
      { text: "Churn in ice cream maker", step: 4 },
      { text: "Freeze until firm", step: 5 }
    ]
  },
  {
    title: "Raspberry Sorbet",
    description: "Bright and fruity raspberry sorbet",
    cookTime: 20,
    cuisine: "French",
    mealType: "dessert",
    calories: 110,
    protein: 1,
    carbs: 28,
    fat: 0,
    fiber: 4,
    sugar: 24,
    ingredients: [
      { text: "3 cups fresh raspberries", order: 1 },
      { text: "3/4 cup sugar", order: 2 },
      { text: "1/4 cup water", order: 3 },
      { text: "1 tbsp lemon juice", order: 4 }
    ],
    instructions: [
      { text: "Puree raspberries and strain", step: 1 },
      { text: "Heat sugar and water until dissolved", step: 2 },
      { text: "Cool and mix with raspberry puree and lemon juice", step: 3 },
      { text: "Churn in ice cream maker", step: 4 },
      { text: "Freeze until firm", step: 5 }
    ]
  },
  {
    title: "Strawberry Sorbet",
    description: "Fresh strawberry sorbet",
    cookTime: 20,
    cuisine: "French",
    mealType: "dessert",
    calories: 105,
    protein: 1,
    carbs: 27,
    fat: 0,
    fiber: 2,
    sugar: 25,
    ingredients: [
      { text: "3 cups fresh strawberries", order: 1 },
      { text: "3/4 cup sugar", order: 2 },
      { text: "1/4 cup water", order: 3 },
      { text: "1 tbsp lemon juice", order: 4 }
    ],
    instructions: [
      { text: "Puree strawberries", step: 1 },
      { text: "Heat sugar and water until dissolved", step: 2 },
      { text: "Cool and mix with strawberry puree and lemon juice", step: 3 },
      { text: "Churn in ice cream maker", step: 4 },
      { text: "Freeze until firm", step: 5 }
    ]
  },
  {
    title: "Watermelon Sorbet",
    description: "Light and refreshing watermelon sorbet",
    cookTime: 20,
    cuisine: "American",
    mealType: "dessert",
    calories: 95,
    protein: 1,
    carbs: 24,
    fat: 0,
    fiber: 1,
    sugar: 22,
    ingredients: [
      { text: "4 cups cubed watermelon", order: 1 },
      { text: "1/2 cup sugar", order: 2 },
      { text: "2 tbsp lime juice", order: 3 }
    ],
    instructions: [
      { text: "Puree watermelon", step: 1 },
      { text: "Strain to remove seeds", step: 2 },
      { text: "Stir in sugar and lime juice", step: 3 },
      { text: "Churn in ice cream maker", step: 4 },
      { text: "Freeze until firm", step: 5 }
    ]
  },
  {
    title: "Coconut Sorbet",
    description: "Creamy coconut sorbet",
    cookTime: 20,
    cuisine: "Tropical",
    mealType: "dessert",
    calories: 180,
    protein: 2,
    carbs: 22,
    fat: 10,
    fiber: 2,
    sugar: 18,
    ingredients: [
      { text: "2 cups coconut milk", order: 1 },
      { text: "1/2 cup sugar", order: 2 },
      { text: "1/4 cup shredded coconut", order: 3 },
      { text: "1 tsp vanilla extract", order: 4 }
    ],
    instructions: [
      { text: "Heat coconut milk and sugar until dissolved", step: 1 },
      { text: "Cool and stir in coconut and vanilla", step: 2 },
      { text: "Churn in ice cream maker", step: 3 },
      { text: "Freeze until firm", step: 4 }
    ]
  },
  {
    title: "Pistachio Ice Cream",
    description: "Rich pistachio ice cream",
    cookTime: 30,
    cuisine: "Italian",
    mealType: "dessert",
    calories: 240,
    protein: 5,
    carbs: 22,
    fat: 16,
    fiber: 2,
    sugar: 18,
    ingredients: [
      { text: "2 cups heavy cream", order: 1 },
      { text: "1 cup whole milk", order: 2 },
      { text: "1/2 cup shelled pistachios", order: 3 },
      { text: "3/4 cup sugar", order: 4 },
      { text: "4 egg yolks", order: 5 },
      { text: "1/2 tsp almond extract", order: 6 }
    ],
    instructions: [
      { text: "Grind pistachios", step: 1 },
      { text: "Heat cream and milk", step: 2 },
      { text: "Whisk egg yolks and sugar", step: 3 },
      { text: "Stir in pistachio paste", step: 4 },
      { text: "Cook until thickened", step: 5 },
      { text: "Chill and churn", step: 6 }
    ]
  },
  {
    title: "Rum Raisin Ice Cream",
    description: "Creamy rum raisin ice cream",
    cookTime: 30,
    cuisine: "American",
    mealType: "dessert",
    calories: 260,
    protein: 4,
    carbs: 28,
    fat: 14,
    fiber: 1,
    sugar: 24,
    ingredients: [
      { text: "1/2 cup raisins", order: 1 },
      { text: "1/4 cup dark rum", order: 2 },
      { text: "2 cups heavy cream", order: 3 },
      { text: "1 cup whole milk", order: 4 },
      { text: "3/4 cup sugar", order: 5 },
      { text: "4 egg yolks", order: 6 },
      { text: "1 tsp vanilla extract", order: 7 }
    ],
    instructions: [
      { text: "Soak raisins in rum", step: 1 },
      { text: "Heat cream and milk", step: 2 },
      { text: "Whisk egg yolks and sugar", step: 3 },
      { text: "Cook until thickened", step: 4 },
      { text: "Stir in raisins and vanilla", step: 5 },
      { text: "Chill and churn", step: 6 }
    ]
  },
  {
    title: "Cookies and Cream Ice Cream",
    description: "Vanilla ice cream with chocolate cookie pieces",
    cookTime: 30,
    cuisine: "American",
    mealType: "dessert",
    calories: 280,
    protein: 4,
    carbs: 32,
    fat: 16,
    fiber: 1,
    sugar: 26,
    ingredients: [
      { text: "2 cups heavy cream", order: 1 },
      { text: "1 cup whole milk", order: 2 },
      { text: "3/4 cup sugar", order: 3 },
      { text: "4 egg yolks", order: 4 },
      { text: "1 tsp vanilla extract", order: 5 },
      { text: "1 cup crushed chocolate cookies", order: 6 }
    ],
    instructions: [
      { text: "Heat cream and milk", step: 1 },
      { text: "Whisk egg yolks and sugar", step: 2 },
      { text: "Cook until thickened", step: 3 },
      { text: "Stir in vanilla and chill", step: 4 },
      { text: "Churn in ice cream maker", step: 5 },
      { text: "Fold in cookie pieces and freeze", step: 6 }
    ]
  },
  {
    title: "Rocky Road Ice Cream",
    description: "Chocolate ice cream with marshmallows and nuts",
    cookTime: 30,
    cuisine: "American",
    mealType: "dessert",
    calories: 300,
    protein: 5,
    carbs: 32,
    fat: 18,
    fiber: 2,
    sugar: 26,
    ingredients: [
      { text: "2 cups heavy cream", order: 1 },
      { text: "1 cup whole milk", order: 2 },
      { text: "4 oz dark chocolate", order: 3 },
      { text: "3/4 cup sugar", order: 4 },
      { text: "4 egg yolks", order: 5 },
      { text: "1/2 cup mini marshmallows", order: 6 },
      { text: "1/2 cup chopped almonds", order: 7 }
    ],
    instructions: [
      { text: "Melt chocolate", step: 1 },
      { text: "Heat cream and milk", step: 2 },
      { text: "Whisk egg yolks and sugar", step: 3 },
      { text: "Stir in chocolate", step: 4 },
      { text: "Cook until thickened", step: 5 },
      { text: "Chill and churn", step: 6 },
      { text: "Fold in marshmallows and nuts", step: 7 }
    ]
  },
  {
    title: "Mint Chocolate Chip Ice Cream",
    description: "Cool mint ice cream with chocolate chips",
    cookTime: 30,
    cuisine: "American",
    mealType: "dessert",
    calories: 260,
    protein: 4,
    carbs: 28,
    fat: 16,
    fiber: 1,
    sugar: 24,
    ingredients: [
      { text: "2 cups heavy cream", order: 1 },
      { text: "1 cup whole milk", order: 2 },
      { text: "3/4 cup sugar", order: 3 },
      { text: "4 egg yolks", order: 4 },
      { text: "1 tsp peppermint extract", order: 5 },
      { text: "Green food coloring (optional)", order: 6 },
      { text: "1/2 cup mini chocolate chips", order: 7 }
    ],
    instructions: [
      { text: "Heat cream and milk", step: 1 },
      { text: "Whisk egg yolks and sugar", step: 2 },
      { text: "Cook until thickened", step: 3 },
      { text: "Stir in peppermint and coloring", step: 4 },
      { text: "Chill and churn", step: 5 },
      { text: "Fold in chocolate chips", step: 6 }
    ]
  },
  {
    title: "Butter Pecan Ice Cream",
    description: "Rich butter pecan ice cream",
    cookTime: 30,
    cuisine: "American",
    mealType: "dessert",
    calories: 320,
    protein: 5,
    carbs: 24,
    fat: 24,
    fiber: 2,
    sugar: 20,
    ingredients: [
      { text: "1 cup pecans, chopped", order: 1 },
      { text: "2 tbsp butter", order: 2 },
      { text: "2 cups heavy cream", order: 3 },
      { text: "1 cup whole milk", order: 4 },
      { text: "3/4 cup sugar", order: 5 },
      { text: "4 egg yolks", order: 6 },
      { text: "1 tsp vanilla extract", order: 7 }
    ],
    instructions: [
      { text: "Toast pecans in butter", step: 1 },
      { text: "Heat cream and milk", step: 2 },
      { text: "Whisk egg yolks and sugar", step: 3 },
      { text: "Cook until thickened", step: 4 },
      { text: "Stir in vanilla and chill", step: 5 },
      { text: "Churn and fold in pecans", step: 6 }
    ]
  },
  {
    title: "Neapolitan Ice Cream",
    description: "Three-flavor ice cream: chocolate, vanilla, and strawberry",
    cookTime: 45,
    cuisine: "American",
    mealType: "dessert",
    calories: 240,
    protein: 4,
    carbs: 28,
    fat: 12,
    fiber: 1,
    sugar: 24,
    ingredients: [
      { text: "2 cups heavy cream", order: 1 },
      { text: "1 cup whole milk", order: 2 },
      { text: "3/4 cup sugar", order: 3 },
      { text: "4 egg yolks", order: 4 },
      { text: "2 oz dark chocolate", order: 5 },
      { text: "1 tsp vanilla extract", order: 6 },
      { text: "1/2 cup strawberry puree", order: 7 }
    ],
    instructions: [
      { text: "Make base ice cream mixture", step: 1 },
      { text: "Divide into three parts", step: 2 },
      { text: "Add chocolate to one part", step: 3 },
      { text: "Add vanilla to second part", step: 4 },
      { text: "Add strawberry to third part", step: 5 },
      { text: "Layer in container and freeze", step: 6 }
    ]
  },
  {
    title: "Salted Caramel Ice Cream",
    description: "Rich caramel ice cream with sea salt",
    cookTime: 30,
    cuisine: "American",
    mealType: "dessert",
    calories: 280,
    protein: 4,
    carbs: 32,
    fat: 16,
    fiber: 0,
    sugar: 30,
    ingredients: [
      { text: "1 cup sugar", order: 1 },
      { text: "2 cups heavy cream", order: 2 },
      { text: "1 cup whole milk", order: 3 },
      { text: "4 egg yolks", order: 4 },
      { text: "1 tsp vanilla extract", order: 5 },
      { text: "1 tsp sea salt", order: 6 }
    ],
    instructions: [
      { text: "Caramelize sugar", step: 1 },
      { text: "Carefully add cream and milk", step: 2 },
      { text: "Whisk egg yolks", step: 3 },
      { text: "Cook until thickened", step: 4 },
      { text: "Stir in vanilla and salt", step: 5 },
      { text: "Chill and churn", step: 6 }
    ]
  },
  {
    title: "Coffee Ice Cream",
    description: "Rich coffee ice cream",
    cookTime: 30,
    cuisine: "American",
    mealType: "dessert",
    calories: 240,
    protein: 4,
    carbs: 24,
    fat: 14,
    fiber: 0,
    sugar: 22,
    ingredients: [
      { text: "2 cups heavy cream", order: 1 },
      { text: "1 cup whole milk", order: 2 },
      { text: "1/4 cup instant coffee", order: 3 },
      { text: "3/4 cup sugar", order: 4 },
      { text: "4 egg yolks", order: 5 },
      { text: "1 tsp vanilla extract", order: 6 }
    ],
    instructions: [
      { text: "Heat cream and milk with coffee", step: 1 },
      { text: "Whisk egg yolks and sugar", step: 2 },
      { text: "Cook until thickened", step: 3 },
      { text: "Stir in vanilla", step: 4 },
      { text: "Chill and churn", step: 5 }
    ]
  },
  {
    title: "Vanilla Bean Ice Cream",
    description: "Classic vanilla bean ice cream",
    cookTime: 30,
    cuisine: "American",
    mealType: "dessert",
    calories: 260,
    protein: 4,
    carbs: 26,
    fat: 16,
    fiber: 0,
    sugar: 24,
    ingredients: [
      { text: "2 cups heavy cream", order: 1 },
      { text: "1 cup whole milk", order: 2 },
      { text: "1 vanilla bean, split", order: 3 },
      { text: "3/4 cup sugar", order: 4 },
      { text: "4 egg yolks", order: 5 }
    ],
    instructions: [
      { text: "Heat cream, milk, and vanilla bean", step: 1 },
      { text: "Scrape seeds from bean", step: 2 },
      { text: "Whisk egg yolks and sugar", step: 3 },
      { text: "Cook until thickened", step: 4 },
      { text: "Stir in vanilla seeds", step: 5 },
      { text: "Chill and churn", step: 6 }
    ]
  },
  {
    title: "Chocolate Fudge Ice Cream",
    description: "Rich and fudgy chocolate ice cream",
    cookTime: 30,
    cuisine: "American",
    mealType: "dessert",
    calories: 300,
    protein: 5,
    carbs: 32,
    fat: 18,
    fiber: 3,
    sugar: 26,
    ingredients: [
      { text: "2 cups heavy cream", order: 1 },
      { text: "1 cup whole milk", order: 2 },
      { text: "6 oz dark chocolate", order: 3 },
      { text: "1/4 cup cocoa powder", order: 4 },
      { text: "3/4 cup sugar", order: 5 },
      { text: "4 egg yolks", order: 6 },
      { text: "1 tsp vanilla extract", order: 7 }
    ],
    instructions: [
      { text: "Melt chocolate", step: 1 },
      { text: "Heat cream and milk", step: 2 },
      { text: "Whisk egg yolks, sugar, and cocoa", step: 3 },
      { text: "Stir in chocolate", step: 4 },
      { text: "Cook until thickened", step: 5 },
      { text: "Chill and churn", step: 6 }
    ]
  }
];

async function seedSnacksAndDesserts() {
  console.log('🌱 Starting snacks and desserts seeding...');
  
  try {
    // Don't clear existing recipes - just add snacks and desserts
    console.log('🍪 Creating snacks and desserts...');
    
    let snacksCreated = 0;
    let dessertsCreated = 0;
    
    // Create snacks
    for (const snackData of snacks) {
      const { ingredients, instructions, ...snack } = snackData;
      
      // Check if recipe already exists
      const existing = await prisma.recipe.findFirst({
        where: { title: snack.title }
      });
      
      if (!existing) {
        const createdSnack = await prisma.recipe.create({
          data: {
            ...snack,
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
        
        console.log(`✅ Snack created: ${createdSnack.title}`);
        snacksCreated++;
      } else {
        console.log(`⏭️  Snack already exists: ${snack.title}`);
      }
    }
    
    // Create desserts
    for (const dessertData of desserts) {
      const { ingredients, instructions, ...dessert } = dessertData;
      
      // Check if recipe already exists
      const existing = await prisma.recipe.findFirst({
        where: { title: dessert.title }
      });
      
      if (!existing) {
        const createdDessert = await prisma.recipe.create({
          data: {
            ...dessert,
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
        
        console.log(`✅ Dessert created: ${createdDessert.title}`);
        dessertsCreated++;
      } else {
        console.log(`⏭️  Dessert already exists: ${dessert.title}`);
      }
    }
    
    console.log(`🎉 Snacks and desserts seeding completed!`);
    console.log(`   Created ${snacksCreated} snacks`);
    console.log(`   Created ${dessertsCreated} desserts`);
  } catch (error) {
    console.error('❌ Error seeding snacks and desserts:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedSnacksAndDesserts();

