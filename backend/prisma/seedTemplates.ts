// backend/prisma/seedTemplates.ts
// Seed pre-built meal plan templates for common goals

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface TemplateMealData {
  dayIndex: number;
  mealType: string;
  customName: string;
  customDescription: string;
  customCalories: number;
  customProtein: number;
  customCarbs: number;
  customFat: number;
}

function buildWeek(
  dailyMeals: Array<{
    breakfast: { name: string; desc: string; cal: number; p: number; c: number; f: number };
    lunch: { name: string; desc: string; cal: number; p: number; c: number; f: number };
    dinner: { name: string; desc: string; cal: number; p: number; c: number; f: number };
    snack: { name: string; desc: string; cal: number; p: number; c: number; f: number };
  }>
): TemplateMealData[] {
  const meals: TemplateMealData[] = [];
  dailyMeals.forEach((day, dayIndex) => {
    for (const mealType of MEAL_TYPES) {
      const m = day[mealType];
      meals.push({
        dayIndex,
        mealType,
        customName: m.name,
        customDescription: m.desc,
        customCalories: m.cal,
        customProtein: m.p,
        customCarbs: m.c,
        customFat: m.f,
      });
    }
  });
  return meals;
}

// ─── Weight Loss Template (~1500 cal/day, high protein) ──────────────────

const weightLossWeek = buildWeek([
  // Monday
  {
    breakfast: { name: 'Greek Yogurt Parfait', desc: 'Greek yogurt with berries and a drizzle of honey', cal: 280, p: 20, c: 35, f: 8 },
    lunch: { name: 'Grilled Chicken Salad', desc: 'Mixed greens with grilled chicken, cherry tomatoes, and light vinaigrette', cal: 380, p: 35, c: 15, f: 18 },
    dinner: { name: 'Baked Salmon with Asparagus', desc: 'Lemon herb salmon with roasted asparagus', cal: 420, p: 38, c: 12, f: 24 },
    snack: { name: 'Apple with Almond Butter', desc: 'Sliced apple with 1 tbsp almond butter', cal: 180, p: 4, c: 25, f: 8 },
  },
  // Tuesday
  {
    breakfast: { name: 'Veggie Egg White Omelette', desc: 'Egg whites with spinach, mushrooms, and bell peppers', cal: 220, p: 24, c: 8, f: 10 },
    lunch: { name: 'Turkey Lettuce Wraps', desc: 'Ground turkey in lettuce cups with Asian slaw', cal: 350, p: 30, c: 18, f: 16 },
    dinner: { name: 'Shrimp Stir-Fry', desc: 'Shrimp with broccoli, snap peas, and cauliflower rice', cal: 380, p: 32, c: 20, f: 18 },
    snack: { name: 'Cottage Cheese & Cucumber', desc: 'Low-fat cottage cheese with cucumber slices', cal: 150, p: 18, c: 8, f: 4 },
  },
  // Wednesday
  {
    breakfast: { name: 'Protein Smoothie', desc: 'Protein powder, spinach, banana, and almond milk', cal: 300, p: 28, c: 32, f: 6 },
    lunch: { name: 'Tuna Salad Bowl', desc: 'Tuna over mixed greens with avocado and lemon dressing', cal: 370, p: 34, c: 12, f: 20 },
    dinner: { name: 'Chicken Breast with Sweet Potato', desc: 'Herb-seasoned chicken with roasted sweet potato', cal: 420, p: 36, c: 35, f: 10 },
    snack: { name: 'Mixed Berries', desc: 'Fresh mixed berries with a squeeze of lime', cal: 120, p: 2, c: 28, f: 1 },
  },
  // Thursday
  {
    breakfast: { name: 'Overnight Oats', desc: 'Oats with chia seeds, almond milk, and berries', cal: 290, p: 12, c: 42, f: 8 },
    lunch: { name: 'Grilled Fish Tacos', desc: 'White fish in corn tortillas with cabbage slaw', cal: 360, p: 28, c: 30, f: 14 },
    dinner: { name: 'Turkey Meatballs with Zoodles', desc: 'Lean turkey meatballs over zucchini noodles with marinara', cal: 400, p: 34, c: 22, f: 18 },
    snack: { name: 'Edamame', desc: 'Steamed edamame with sea salt', cal: 160, p: 14, c: 12, f: 6 },
  },
  // Friday
  {
    breakfast: { name: 'Avocado Toast with Egg', desc: 'Whole grain toast with avocado and poached egg', cal: 320, p: 14, c: 28, f: 18 },
    lunch: { name: 'Chicken Soup', desc: 'Homemade chicken soup with vegetables', cal: 300, p: 26, c: 24, f: 10 },
    dinner: { name: 'Grilled Steak with Veggies', desc: 'Lean sirloin with grilled peppers and onions', cal: 440, p: 38, c: 14, f: 26 },
    snack: { name: 'Greek Yogurt', desc: 'Plain Greek yogurt with cinnamon', cal: 130, p: 18, c: 8, f: 2 },
  },
  // Saturday
  {
    breakfast: { name: 'Spinach Frittata', desc: 'Baked egg frittata with spinach and feta', cal: 280, p: 22, c: 6, f: 18 },
    lunch: { name: 'Quinoa Buddha Bowl', desc: 'Quinoa with roasted vegetables, chickpeas, and tahini', cal: 400, p: 16, c: 48, f: 16 },
    dinner: { name: 'Lemon Herb Chicken Thighs', desc: 'Baked chicken thighs with steamed broccoli', cal: 420, p: 36, c: 10, f: 26 },
    snack: { name: 'Celery with Hummus', desc: 'Celery sticks with 2 tbsp hummus', cal: 100, p: 4, c: 10, f: 6 },
  },
  // Sunday
  {
    breakfast: { name: 'Protein Pancakes', desc: 'Banana protein pancakes with sugar-free syrup', cal: 310, p: 24, c: 38, f: 8 },
    lunch: { name: 'Mediterranean Wrap', desc: 'Whole wheat wrap with chicken, hummus, and vegetables', cal: 380, p: 28, c: 34, f: 14 },
    dinner: { name: 'Baked Cod with Roasted Vegetables', desc: 'Herb-crusted cod with roasted root vegetables', cal: 390, p: 34, c: 28, f: 14 },
    snack: { name: 'Dark Chocolate & Almonds', desc: '1 square dark chocolate with 10 almonds', cal: 160, p: 4, c: 12, f: 12 },
  },
]);

// ─── Muscle Gain Template (~2500 cal/day, high protein high carb) ────────

const muscleGainWeek = buildWeek([
  // Monday
  {
    breakfast: { name: 'Steak & Eggs Breakfast', desc: '6oz sirloin with 3 eggs and whole wheat toast', cal: 620, p: 52, c: 28, f: 32 },
    lunch: { name: 'Chicken Rice Bowl', desc: 'Grilled chicken breast with brown rice, black beans, and salsa', cal: 650, p: 48, c: 72, f: 12 },
    dinner: { name: 'Salmon with Pasta', desc: 'Grilled salmon with whole wheat pasta and pesto', cal: 680, p: 42, c: 64, f: 26 },
    snack: { name: 'Protein Shake & Banana', desc: 'Whey protein shake with banana and peanut butter', cal: 450, p: 36, c: 48, f: 14 },
  },
  // Tuesday
  {
    breakfast: { name: 'Oatmeal Power Bowl', desc: 'Oatmeal with protein powder, banana, and walnuts', cal: 550, p: 32, c: 68, f: 18 },
    lunch: { name: 'Double Chicken Burrito Bowl', desc: 'Rice, double chicken, beans, corn, and guacamole', cal: 720, p: 52, c: 76, f: 20 },
    dinner: { name: 'Beef Stir-Fry with Noodles', desc: 'Lean beef strips with vegetables and udon noodles', cal: 640, p: 44, c: 62, f: 22 },
    snack: { name: 'Trail Mix & Yogurt', desc: 'Greek yogurt with trail mix and honey', cal: 480, p: 24, c: 52, f: 20 },
  },
  // Wednesday
  {
    breakfast: { name: 'Breakfast Burrito', desc: 'Eggs, turkey sausage, cheese, and avocado in a tortilla', cal: 580, p: 38, c: 42, f: 28 },
    lunch: { name: 'Turkey Club Sandwich', desc: 'Triple-decker turkey club with sweet potato fries', cal: 680, p: 42, c: 68, f: 24 },
    dinner: { name: 'Chicken Parmesan with Spaghetti', desc: 'Breaded chicken with marinara and whole wheat spaghetti', cal: 720, p: 48, c: 72, f: 24 },
    snack: { name: 'Cottage Cheese & Granola', desc: 'Cottage cheese with granola and mixed berries', cal: 420, p: 28, c: 48, f: 12 },
  },
  // Thursday
  {
    breakfast: { name: 'French Toast with Sausage', desc: 'Whole grain French toast with turkey sausage', cal: 560, p: 32, c: 58, f: 22 },
    lunch: { name: 'Tuna Melt with Soup', desc: 'Tuna melt on sourdough with tomato soup', cal: 640, p: 38, c: 56, f: 28 },
    dinner: { name: 'Grilled Pork Chops with Rice', desc: 'Thick-cut pork chops with rice pilaf and green beans', cal: 680, p: 46, c: 60, f: 26 },
    snack: { name: 'Smoothie Bowl', desc: 'Protein smoothie bowl with granola and nut butter', cal: 520, p: 30, c: 60, f: 18 },
  },
  // Friday
  {
    breakfast: { name: 'Egg & Cheese Bagel', desc: '3 eggs with cheese on a whole wheat bagel', cal: 580, p: 34, c: 52, f: 24 },
    lunch: { name: 'Chicken Caesar Wrap', desc: 'Large chicken Caesar wrap with a side of fruit', cal: 620, p: 40, c: 58, f: 22 },
    dinner: { name: 'Ribeye with Baked Potato', desc: '8oz ribeye with loaded baked potato', cal: 780, p: 52, c: 54, f: 38 },
    snack: { name: 'Peanut Butter Toast', desc: 'Whole wheat toast with peanut butter and banana', cal: 420, p: 14, c: 52, f: 18 },
  },
  // Saturday
  {
    breakfast: { name: 'Pancake Stack with Eggs', desc: 'Protein pancakes stacked with eggs and maple syrup', cal: 620, p: 40, c: 68, f: 20 },
    lunch: { name: 'BBQ Chicken Pizza', desc: 'Homemade BBQ chicken pizza with vegetables', cal: 680, p: 42, c: 72, f: 22 },
    dinner: { name: 'Lamb Chops with Couscous', desc: 'Grilled lamb chops with herbed couscous and roasted vegetables', cal: 700, p: 46, c: 58, f: 30 },
    snack: { name: 'Protein Bar & Milk', desc: 'Protein bar with a glass of whole milk', cal: 440, p: 32, c: 42, f: 16 },
  },
  // Sunday
  {
    breakfast: { name: 'Full English Breakfast', desc: 'Eggs, bacon, toast, beans, and grilled tomatoes', cal: 640, p: 36, c: 52, f: 32 },
    lunch: { name: 'Chicken Teriyaki Bowl', desc: 'Teriyaki chicken with white rice and edamame', cal: 680, p: 44, c: 78, f: 16 },
    dinner: { name: 'Spaghetti Bolognese', desc: 'Hearty beef bolognese with whole wheat spaghetti', cal: 700, p: 42, c: 74, f: 24 },
    snack: { name: 'Rice Cakes & Almond Butter', desc: 'Rice cakes with almond butter and sliced banana', cal: 380, p: 10, c: 52, f: 16 },
  },
]);

// ─── Balanced Family Template (~2000 cal/day, moderate macros) ───────────

const balancedFamilyWeek = buildWeek([
  // Monday
  {
    breakfast: { name: 'Scrambled Eggs & Toast', desc: 'Fluffy scrambled eggs with whole wheat toast and fruit', cal: 380, p: 20, c: 38, f: 16 },
    lunch: { name: 'Chicken Quesadilla', desc: 'Grilled chicken quesadilla with salsa and sour cream', cal: 480, p: 32, c: 40, f: 20 },
    dinner: { name: 'Spaghetti & Meatballs', desc: 'Classic spaghetti and meatballs with garlic bread', cal: 620, p: 32, c: 72, f: 22 },
    snack: { name: 'Fruit & Cheese Plate', desc: 'Sliced apples, grapes, and cheese cubes', cal: 220, p: 8, c: 28, f: 10 },
  },
  // Tuesday
  {
    breakfast: { name: 'Banana Oatmeal', desc: 'Warm oatmeal with sliced banana and brown sugar', cal: 340, p: 10, c: 58, f: 8 },
    lunch: { name: 'BLT Sandwich', desc: 'Classic BLT on toasted sourdough with chips', cal: 520, p: 18, c: 48, f: 28 },
    dinner: { name: 'Chicken Fajitas', desc: 'Sizzling chicken fajitas with peppers, onions, and tortillas', cal: 580, p: 36, c: 52, f: 22 },
    snack: { name: 'Yogurt Tube & Crackers', desc: 'Yogurt with whole grain crackers', cal: 200, p: 8, c: 32, f: 6 },
  },
  // Wednesday
  {
    breakfast: { name: 'Peanut Butter & Jelly Toast', desc: 'PB&J on whole wheat toast with a glass of milk', cal: 400, p: 14, c: 48, f: 18 },
    lunch: { name: 'Tomato Soup & Grilled Cheese', desc: 'Creamy tomato soup with grilled cheese sandwich', cal: 520, p: 18, c: 52, f: 26 },
    dinner: { name: 'Baked Chicken Drumsticks', desc: 'Crispy baked drumsticks with mashed potatoes and corn', cal: 600, p: 38, c: 52, f: 24 },
    snack: { name: 'Veggies & Ranch', desc: 'Baby carrots, celery, and ranch dip', cal: 160, p: 4, c: 16, f: 10 },
  },
  // Thursday
  {
    breakfast: { name: 'Cereal with Milk', desc: 'Whole grain cereal with milk and sliced strawberries', cal: 320, p: 12, c: 52, f: 8 },
    lunch: { name: 'Ham & Cheese Wrap', desc: 'Ham and cheese wrap with lettuce and mustard', cal: 460, p: 24, c: 42, f: 20 },
    dinner: { name: 'Beef Tacos', desc: 'Ground beef tacos with lettuce, cheese, and salsa', cal: 580, p: 30, c: 48, f: 28 },
    snack: { name: 'Banana & Peanut Butter', desc: 'Banana with a tablespoon of peanut butter', cal: 220, p: 6, c: 30, f: 10 },
  },
  // Friday
  {
    breakfast: { name: 'Waffles with Fruit', desc: 'Whole grain waffles with fresh berries and syrup', cal: 380, p: 10, c: 58, f: 14 },
    lunch: { name: 'Mac & Cheese with Broccoli', desc: 'Homemade mac and cheese with steamed broccoli', cal: 520, p: 20, c: 56, f: 24 },
    dinner: { name: 'Pizza Night', desc: 'Homemade pizza with vegetables and mozzarella', cal: 620, p: 26, c: 68, f: 26 },
    snack: { name: 'Popcorn', desc: 'Air-popped popcorn with a light butter drizzle', cal: 160, p: 4, c: 28, f: 6 },
  },
  // Saturday
  {
    breakfast: { name: 'French Toast', desc: 'French toast with powdered sugar and fresh berries', cal: 420, p: 14, c: 56, f: 16 },
    lunch: { name: 'Chicken Nuggets & Fries', desc: 'Baked chicken nuggets with sweet potato fries and ketchup', cal: 500, p: 28, c: 52, f: 18 },
    dinner: { name: 'BBQ Pulled Pork Sandwiches', desc: 'Slow cooker pulled pork on buns with coleslaw', cal: 620, p: 34, c: 58, f: 26 },
    snack: { name: 'Trail Mix', desc: 'Kid-friendly trail mix with pretzels and raisins', cal: 200, p: 4, c: 32, f: 8 },
  },
  // Sunday
  {
    breakfast: { name: 'Breakfast Burritos', desc: 'Eggs, cheese, and beans in a flour tortilla', cal: 440, p: 22, c: 42, f: 20 },
    lunch: { name: 'Grilled Cheese & Soup', desc: 'Grilled cheese with chicken noodle soup', cal: 480, p: 20, c: 52, f: 20 },
    dinner: { name: 'Roasted Chicken Dinner', desc: 'Whole roasted chicken with roasted potatoes and green beans', cal: 580, p: 40, c: 42, f: 24 },
    snack: { name: 'Smoothie', desc: 'Mixed fruit smoothie with yogurt', cal: 200, p: 8, c: 36, f: 4 },
  },
]);

async function main() {
  console.log('🍽️  Seeding meal plan templates...');

  // Check if system templates already exist
  const existing = await prisma.mealPlanTemplate.count({ where: { isSystem: true } });
  if (existing > 0) {
    console.log(`ℹ️  ${existing} system templates already exist. Skipping seed.`);
    return;
  }

  const templates = [
    {
      name: 'Weight Loss Week',
      description: 'A high-protein, calorie-controlled week averaging ~1500 cal/day. Focuses on lean proteins, vegetables, and whole grains.',
      goal: 'weight_loss',
      meals: weightLossWeek,
    },
    {
      name: 'Muscle Gain Week',
      description: 'A high-calorie, high-protein week averaging ~2500 cal/day. Designed to fuel muscle growth with balanced carbs and healthy fats.',
      goal: 'muscle_gain',
      meals: muscleGainWeek,
    },
    {
      name: 'Balanced Family Week',
      description: 'A family-friendly week averaging ~2000 cal/day. Includes kid-approved meals with balanced nutrition and variety.',
      goal: 'balanced',
      meals: balancedFamilyWeek,
    },
  ];

  for (const t of templates) {
    const template = await prisma.mealPlanTemplate.create({
      data: {
        userId: null,
        name: t.name,
        description: t.description,
        goal: t.goal,
        isSystem: true,
      },
    });

    await prisma.templateMeal.createMany({
      data: t.meals.map((m) => ({
        templateId: template.id,
        ...m,
      })),
    });

    console.log(`  ✅ Created "${t.name}" (${t.meals.length} meals)`);
  }

  console.log('🎉 Template seeding complete!');
}

main()
  .catch((e) => {
    console.error('Error seeding templates:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
