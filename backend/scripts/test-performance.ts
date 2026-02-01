// backend/scripts/test-performance.ts
// Performance comparison: Old vs Optimized recipe fetching

import { PrismaClient } from '@prisma/client';
import {
  getUserPreferencesOptimized,
  getBehavioralDataOptimized,
  fetchRecipesOptimized,
} from '../src/utils/recipeOptimizationHelpers';

const prisma = new PrismaClient();

interface PerformanceResult {
  endpoint: string;
  responseTime: number;
  recipesFetched: number;
  memoryUsed: number;
}

async function testOldApproach(userId: string): Promise<PerformanceResult> {
  const startTime = Date.now();
  const startMem = process.memoryUsage().heapUsed;

  // Simulate old approach: Fetch ALL recipes + all ingredients
  const recipes = await prisma.recipe.findMany({
    where: { isUserCreated: false },
    include: {
      ingredients: { orderBy: { order: 'asc' } },
      instructions: { orderBy: { step: 'asc' } },
    },
  });

  // Simulate scoring all recipes (just count for demo)
  const scored = recipes.map((r, i) => ({
    ...r,
    score: Math.random() * 100,
  }));

  // Sort and take top 10
  const sorted = scored.sort((a, b) => b.score - a.score);
  const top10 = sorted.slice(0, 10);

  const endTime = Date.now();
  const endMem = process.memoryUsage().heapUsed;

  return {
    endpoint: 'OLD: /api/recipes (fetch all → score all)',
    responseTime: endTime - startTime,
    recipesFetched: top10.length,
    memoryUsed: Math.round((endMem - startMem) / 1024 / 1024), // MB
  };
}

async function testNewApproach(userId: string): Promise<PerformanceResult> {
  const startTime = Date.now();
  const startMem = process.memoryUsage().heapUsed;

  // Get user preferences
  const prefs = await getUserPreferencesOptimized(userId);

  if (!prefs) {
    throw new Error('User preferences not found');
  }

  // Use optimized tiered approach
  const result = await fetchRecipesOptimized(prefs, {
    limit: 10,
    page: 0,
  });

  const endTime = Date.now();
  const endMem = process.memoryUsage().heapUsed;

  return {
    endpoint: 'NEW: /api/recipes/optimized (filter → quick score → fetch top)',
    responseTime: endTime - startTime,
    recipesFetched: result.recipes.length,
    memoryUsed: Math.round((endMem - startMem) / 1024 / 1024), // MB
  };
}

function printResults(results: PerformanceResult[]) {
  console.log('\n' + '═'.repeat(80));
  console.log('PERFORMANCE COMPARISON RESULTS');
  console.log('═'.repeat(80));

  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.endpoint}`);
    console.log(`   Response Time: ${result.responseTime}ms`);
    console.log(`   Recipes Returned: ${result.recipesFetched}`);
    console.log(`   Memory Used: ${result.memoryUsed} MB`);
  });

  if (results.length === 2) {
    const improvement = Math.round(
      ((results[0].responseTime - results[1].responseTime) / results[0].responseTime) * 100
    );
    const memoryReduction = Math.round(
      ((results[0].memoryUsed - results[1].memoryUsed) / results[0].memoryUsed) * 100
    );

    console.log('\n' + '─'.repeat(80));
    console.log('IMPROVEMENT SUMMARY');
    console.log('─'.repeat(80));
    console.log(`⚡ Speed Improvement: ${improvement}% faster`);
    console.log(`💾 Memory Reduction: ${memoryReduction}% less memory`);
    console.log(
      `📊 From ${results[0].responseTime}ms → ${results[1].responseTime}ms`
    );
  }

  console.log('\n' + '═'.repeat(80) + '\n');
}

async function runPerformanceTest() {
  console.log('🚀 Starting Performance Test...\n');

  // Get a test user
  const testUser = await prisma.user.findFirst({
    where: {
      preferences: { isNot: null },
    },
  });

  if (!testUser) {
    console.error('❌ No user with preferences found. Please complete onboarding first.');
    process.exit(1);
  }

  console.log(`👤 Testing with user: ${testUser.id}\n`);

  // Get database stats
  const totalRecipes = await prisma.recipe.count({ where: { isUserCreated: false } });
  console.log(`📊 Total recipes in database: ${totalRecipes}\n`);

  const results: PerformanceResult[] = [];

  // Test OLD approach
  console.log('Testing OLD approach...');
  try {
    const oldResult = await testOldApproach(testUser.id);
    results.push(oldResult);
    console.log(`✅ Old approach completed in ${oldResult.responseTime}ms\n`);
  } catch (error: any) {
    console.error('❌ Old approach failed:', error.message);
  }

  // Test NEW approach
  console.log('Testing NEW optimized approach...');
  try {
    const newResult = await testNewApproach(testUser.id);
    results.push(newResult);
    console.log(`✅ New approach completed in ${newResult.responseTime}ms\n`);
  } catch (error: any) {
    console.error('❌ New approach failed:', error.message);
  }

  // Print comparison
  printResults(results);

  // Test with different dataset sizes
  console.log('\n📈 SCALABILITY PROJECTION');
  console.log('─'.repeat(80));

  if (results.length === 2) {
    const [oldResult, newResult] = results;

    const scalingFactors = [
      { recipes: totalRecipes, label: 'Current' },
      { recipes: 5000, label: '5K recipes' },
      { recipes: 10000, label: '10K recipes' },
      { recipes: 20000, label: '20K recipes' },
    ];

    console.log('\nProjected response times:');
    scalingFactors.forEach(({ recipes, label }) => {
      const oldTime = Math.round((oldResult.responseTime * recipes) / totalRecipes);
      const newTime = Math.round((newResult.responseTime * recipes) / totalRecipes);

      console.log(
        `  ${label.padEnd(15)} | Old: ${oldTime.toString().padStart(6)}ms  | New: ${newTime
          .toString()
          .padStart(4)}ms  | ${oldTime > newTime ? '✅' : '❌'}`
      );
    });
  }

  console.log('\n' + '═'.repeat(80) + '\n');
}

runPerformanceTest()
  .then(async () => {
    await prisma.$disconnect();
    console.log('🎉 Performance test complete!\n');
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('❌ Test error:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
