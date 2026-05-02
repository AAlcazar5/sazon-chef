// backend/prisma/seedMealComponents.ts
// Group 10X Phase 1 — seed the curated MealComponent catalog (125 rows).
// Idempotent: re-running upserts on stable id slugs.

import { PrismaClient } from '@prisma/client';
import { MEAL_COMPONENT_SEED } from '../src/services/mealComponentSeedData';

const prisma = new PrismaClient();

const seed = async () => {
  let created = 0;
  let updated = 0;

  for (const c of MEAL_COMPONENT_SEED) {
    const existing = await prisma.mealComponent.findUnique({ where: { id: c.id } });
    await prisma.mealComponent.upsert({
      where: { id: c.id },
      create: { ...c },
      update: { ...c },
    });
    if (existing) updated += 1;
    else created += 1;
  }

  console.log(`Seeded MealComponents: ${created} created, ${updated} updated, ${MEAL_COMPONENT_SEED.length} total.`);
};

seed()
  .catch((err) => {
    console.error('seedMealComponents failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
