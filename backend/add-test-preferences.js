// Add preferences to the first user for testing
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addTestPreferences() {
  try {
    // Find the first user
    const user = await prisma.user.findFirst();

    if (!user) {
      console.log('❌ No users found. Create a user first.');
      process.exit(1);
    }

    console.log(`Found user: ${user.id}`);

    // Check if preferences already exist
    const existingPrefs = await prisma.userPreferences.findFirst({
      where: { userId: user.id }
    });

    if (existingPrefs) {
      console.log('✅ User already has preferences!');
      process.exit(0);
    }

    // Create preferences
    const prefs = await prisma.userPreferences.create({
      data: {
        userId: user.id,
        cookTimePreference: 30,
        spiceLevel: 'medium',
      }
    });

    // Add some liked cuisines
    await prisma.likedCuisine.createMany({
      data: [
        { preferenceId: prefs.id, name: 'Mediterranean' },
        { preferenceId: prefs.id, name: 'Mexican' },
        { preferenceId: prefs.id, name: 'Italian' },
      ]
    });

    // Create macro goals
    await prisma.macroGoals.create({
      data: {
        userId: user.id,
        calories: 2000,
        protein: 150,
        carbs: 200,
        fat: 60,
      }
    });

    // Create physical profile
    await prisma.userPhysicalProfile.create({
      data: {
        userId: user.id,
        fitnessGoal: 'maintain',
      }
    });

    console.log('✅ Test preferences added successfully!');
    console.log('  - Cook time: 30 min');
    console.log('  - Cuisines: Mediterranean, Mexican, Italian');
    console.log('  - Macros: 2000 cal, 150g protein');
    console.log('  - Fitness goal: maintain');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addTestPreferences();
