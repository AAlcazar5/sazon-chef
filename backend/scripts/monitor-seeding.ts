// backend/scripts/monitor-seeding.ts
// Real-time monitoring of recipe seeding progress with progress bar

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TARGET = 1000;
const REFRESH_INTERVAL = 5000; // 5 seconds

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

function createProgressBar(current: number, target: number, width: number = 50): string {
  const percentage = Math.min(100, (current / target) * 100);
  const filled = Math.floor((percentage / 100) * width);
  const empty = width - filled;

  const bar = '█'.repeat(filled) + '░'.repeat(empty);

  return `${colors.cyan}[${bar}]${colors.reset} ${colors.bright}${percentage.toFixed(1)}%${colors.reset}`;
}

function formatNumber(num: number): string {
  return num.toString().padStart(4, ' ');
}

function clearScreen(): void {
  console.clear();
}

async function getDetailedStats() {
  const total = await prisma.recipe.count({ where: { isUserCreated: false } });

  const byCuisine = await prisma.recipe.groupBy({
    by: ['cuisine'],
    where: { isUserCreated: false },
    _count: true,
  });

  const byMealType = await prisma.recipe.groupBy({
    by: ['mealType'],
    where: { isUserCreated: false },
    _count: true,
  });

  return { total, byCuisine, byMealType };
}

async function displayProgress() {
  const stats = await getDetailedStats();
  const { total, byCuisine, byMealType } = stats;

  const remaining = Math.max(0, TARGET - total);
  const percentage = (total / TARGET) * 100;

  clearScreen();

  console.log(`${colors.bright}${colors.cyan}╔═══════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║${colors.reset}     ${colors.bright}SAZON CHEF - RECIPE SEEDING PROGRESS${colors.reset}           ${colors.cyan}║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚═══════════════════════════════════════════════════════════╝${colors.reset}\n`);

  // Overall progress
  console.log(`${colors.bright}📊 OVERALL PROGRESS${colors.reset}`);
  console.log(createProgressBar(total, TARGET, 50));
  console.log(`${colors.green}   Current:${colors.reset} ${formatNumber(total)} recipes`);
  console.log(`${colors.yellow}   Remaining:${colors.reset} ${formatNumber(remaining)} recipes`);
  console.log(`${colors.cyan}   Target:${colors.reset} ${formatNumber(TARGET)} recipes\n`);

  // Status message
  if (total >= TARGET) {
    console.log(`${colors.green}${colors.bright}🎉 TARGET REACHED! Database now has ${total} recipes!${colors.reset}\n`);
  } else {
    const rate = 2.5; // Rough estimate: ~2.5 recipes per minute
    const estimatedMinutes = Math.ceil(remaining / rate);
    const hours = Math.floor(estimatedMinutes / 60);
    const minutes = estimatedMinutes % 60;

    console.log(`${colors.dim}⏱️  Estimated time remaining: ~${hours}h ${minutes}m${colors.reset}\n`);
  }

  // Cuisine breakdown (top 10)
  console.log(`${colors.bright}📦 RECIPES BY CUISINE${colors.reset} (Top 10)`);
  console.log(`${colors.dim}${'─'.repeat(60)}${colors.reset}`);

  const sortedCuisines = byCuisine
    .sort((a, b) => b._count - a._count)
    .slice(0, 10);

  sortedCuisines.forEach((item, index) => {
    const miniBar = '▪'.repeat(Math.floor(item._count / 5));
    const number = `${index + 1}.`.padStart(3, ' ');
    const cuisine = item.cuisine.padEnd(20, ' ');
    const count = item._count.toString().padStart(3, ' ');

    console.log(`   ${colors.dim}${number}${colors.reset} ${cuisine} ${colors.cyan}${count}${colors.reset} ${colors.dim}${miniBar}${colors.reset}`);
  });

  console.log();

  // Meal type breakdown
  console.log(`${colors.bright}🍽️  RECIPES BY MEAL TYPE${colors.reset}`);
  console.log(`${colors.dim}${'─'.repeat(60)}${colors.reset}`);

  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'];
  const mealTypeCounts: Record<string, number> = {};

  byMealType.forEach(item => {
    const key = item.mealType || 'unspecified';
    mealTypeCounts[key] = item._count;
  });

  mealTypes.forEach(mealType => {
    const count = mealTypeCounts[mealType] || 0;
    const miniBar = '▪'.repeat(Math.floor(count / 5));
    const label = mealType.charAt(0).toUpperCase() + mealType.slice(1);

    console.log(`   ${label.padEnd(15, ' ')} ${colors.cyan}${count.toString().padStart(3, ' ')}${colors.reset} ${colors.dim}${miniBar}${colors.reset}`);
  });

  if (mealTypeCounts['unspecified']) {
    console.log(`   ${colors.dim}Unspecified${' '.repeat(4)} ${mealTypeCounts['unspecified'].toString().padStart(3, ' ')}${colors.reset}`);
  }

  console.log();
  console.log(`${colors.dim}Last updated: ${new Date().toLocaleTimeString()}${colors.reset}`);
  console.log(`${colors.dim}Press Ctrl+C to exit${colors.reset}`);
}

async function monitor() {
  console.log(`${colors.cyan}Starting recipe seeding monitor...${colors.reset}\n`);

  // Display immediately
  await displayProgress();

  // Then update every 5 seconds
  setInterval(async () => {
    try {
      await displayProgress();
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, REFRESH_INTERVAL);
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log(`\n\n${colors.yellow}Monitoring stopped.${colors.reset}`);
  await prisma.$disconnect();
  process.exit(0);
});

// Run monitor
monitor().catch(async (error) => {
  console.error('Monitor error:', error);
  await prisma.$disconnect();
  process.exit(1);
});
