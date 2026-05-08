// ROADMAP 4.0 G1.1 — diaspora onboarding service.
//
// "Do you cook food from a heritage cuisine?" — multi-select onboarding
// step. Selection seeds initial cuisine-affinity weights into
// UserCuisineAdjacencyWeight (direct + adjacent), and soft-sets
// User.locale when device locale is en-US AND the heritage suggests a
// non-English locale AND the user hasn't already persisted a non-en
// preference (don't overwrite a deliberate choice).

import { prisma } from '@/lib/prisma';
import { getAdjacentCuisines } from '@/utils/cuisineAdjacency';

// cuisineAdjacency keys are TitleCase ('Mexican', 'Thai'); HERITAGE_CUISINES
// + DB rows are lowercase. Normalize in both directions.
function titleCase(c: string): string {
  if (!c) return c;
  return c[0].toUpperCase() + c.slice(1).toLowerCase();
}

const DIRECT_WEIGHT = 1.0;
const ADJACENT_WEIGHT = 0.5;
const SIGNAL_COUNT_PER_HERITAGE = 3;

export interface HeritageOption {
  /** Lowercase cuisine key (matches cuisineAdjacency taxonomy). */
  cuisine: string;
  /** Display label shown in onboarding UI. */
  label: string;
  /** Suggested BCP 47 locale, or null when heritage doesn't imply a non-en locale. */
  suggestedLocale: string | null;
  emoji: string;
}

export const HERITAGE_CUISINES: HeritageOption[] = [
  { cuisine: 'mexican',      label: 'Mexican',          suggestedLocale: 'es-MX', emoji: '🇲🇽' },
  { cuisine: 'salvadoran',   label: 'Salvadoran',       suggestedLocale: 'es',    emoji: '🇸🇻' },
  { cuisine: 'guatemalan',   label: 'Guatemalan',       suggestedLocale: 'es',    emoji: '🇬🇹' },
  { cuisine: 'peruvian',     label: 'Peruvian',         suggestedLocale: 'es',    emoji: '🇵🇪' },
  { cuisine: 'colombian',    label: 'Colombian',        suggestedLocale: 'es-CO', emoji: '🇨🇴' },
  { cuisine: 'argentine',    label: 'Argentine',        suggestedLocale: 'es-AR', emoji: '🇦🇷' },
  { cuisine: 'brazilian',    label: 'Brazilian',        suggestedLocale: 'pt-BR', emoji: '🇧🇷' },
  { cuisine: 'cuban',        label: 'Cuban',            suggestedLocale: 'es',    emoji: '🇨🇺' },
  { cuisine: 'puerto rican', label: 'Puerto Rican',     suggestedLocale: 'es',    emoji: '🇵🇷' },
  { cuisine: 'dominican',    label: 'Dominican',        suggestedLocale: 'es',    emoji: '🇩🇴' },
  { cuisine: 'venezuelan',   label: 'Venezuelan',       suggestedLocale: 'es',    emoji: '🇻🇪' },
  { cuisine: 'haitian',      label: 'Haitian',          suggestedLocale: null,    emoji: '🇭🇹' },
  { cuisine: 'jamaican',     label: 'Jamaican',         suggestedLocale: null,    emoji: '🇯🇲' },
  { cuisine: 'filipino',     label: 'Filipino',         suggestedLocale: null,    emoji: '🇵🇭' },
  { cuisine: 'vietnamese',   label: 'Vietnamese',       suggestedLocale: null,    emoji: '🇻🇳' },
  { cuisine: 'korean',       label: 'Korean',           suggestedLocale: null,    emoji: '🇰🇷' },
  { cuisine: 'thai',         label: 'Thai',             suggestedLocale: null,    emoji: '🇹🇭' },
  { cuisine: 'chinese',      label: 'Chinese',          suggestedLocale: null,    emoji: '🇨🇳' },
  { cuisine: 'indian',       label: 'Indian',           suggestedLocale: null,    emoji: '🇮🇳' },
  { cuisine: 'lebanese',     label: 'Lebanese',         suggestedLocale: null,    emoji: '🇱🇧' },
  { cuisine: 'persian',      label: 'Persian',          suggestedLocale: null,    emoji: '🇮🇷' },
  { cuisine: 'ethiopian',    label: 'Ethiopian',        suggestedLocale: null,    emoji: '🇪🇹' },
  { cuisine: 'nigerian',     label: 'Nigerian',         suggestedLocale: null,    emoji: '🇳🇬' },
  { cuisine: 'senegalese',   label: 'Senegalese',       suggestedLocale: null,    emoji: '🇸🇳' },
];

const HERITAGE_INDEX: Map<string, HeritageOption> = new Map(
  HERITAGE_CUISINES.map((h) => [h.cuisine, h]),
);

export interface ApplyOnboardingInput {
  userId: string;
  heritages: string[];
  /** BCP 47 device locale. Used to decide whether to soft-set User.locale. */
  deviceLocale: string;
}

export interface ApplyOnboardingResult {
  heritagesApplied: string[];
  seededWeights: number;
  /** Locale that was soft-set on the user, or null if no change. */
  localeApplied: string | null;
}

function isEnglishDevice(locale: string): boolean {
  if (!locale) return false;
  return locale.toLowerCase().split('-')[0] === 'en';
}

export async function applyDiasporaOnboarding(
  input: ApplyOnboardingInput,
): Promise<ApplyOnboardingResult> {
  if (!input.userId) {
    throw new Error('userId is required');
  }
  const heritagesApplied: string[] = [];
  let seededWeights = 0;
  let localeApplied: string | null = null;

  if (input.heritages.length === 0) {
    return { heritagesApplied, seededWeights, localeApplied };
  }

  // Filter to known heritages only (silently drop unknowns — onboarding
  // should never error out on a stale enum value from a cached client).
  const validHeritages: HeritageOption[] = [];
  for (const raw of input.heritages) {
    const opt = HERITAGE_INDEX.get(raw.toLowerCase().trim());
    if (opt) validHeritages.push(opt);
  }

  if (validHeritages.length === 0) {
    return { heritagesApplied, seededWeights, localeApplied };
  }

  // Seed cuisine-affinity weights. For each heritage we write:
  //   - direct (heritage → heritage) at DIRECT_WEIGHT
  //   - adjacent edges from the cuisineAdjacency map at ADJACENT_WEIGHT
  for (const h of validHeritages) {
    heritagesApplied.push(h.cuisine);
    // Direct
    await (prisma as any).userCuisineAdjacencyWeight.upsert({
      where: {
        userId_sourceCuisine_targetCuisine: {
          userId: input.userId,
          sourceCuisine: h.cuisine,
          targetCuisine: h.cuisine,
        },
      },
      create: {
        userId: input.userId,
        sourceCuisine: h.cuisine,
        targetCuisine: h.cuisine,
        weight: DIRECT_WEIGHT,
        signalCount: SIGNAL_COUNT_PER_HERITAGE,
      },
      update: {
        weight: { increment: DIRECT_WEIGHT },
        signalCount: { increment: SIGNAL_COUNT_PER_HERITAGE },
      },
    });
    seededWeights += 1;

    // Adjacents — adjacency map keys are TitleCase; DB rows lowercase.
    for (const adj of getAdjacentCuisines(titleCase(h.cuisine))) {
      const targetLower = adj.cuisine.toLowerCase();
      await (prisma as any).userCuisineAdjacencyWeight.upsert({
        where: {
          userId_sourceCuisine_targetCuisine: {
            userId: input.userId,
            sourceCuisine: h.cuisine,
            targetCuisine: targetLower,
          },
        },
        create: {
          userId: input.userId,
          sourceCuisine: h.cuisine,
          targetCuisine: targetLower,
          weight: ADJACENT_WEIGHT * adj.weight,
          signalCount: 1,
        },
        update: {
          weight: { increment: ADJACENT_WEIGHT * adj.weight },
          signalCount: { increment: 1 },
        },
      });
      seededWeights += 1;
    }
  }

  // Soft-set locale when:
  //   - device is en/en-US AND
  //   - user has no persisted non-en locale already AND
  //   - first valid heritage suggests a locale
  if (isEnglishDevice(input.deviceLocale)) {
    const existing = (await prisma.user.findUnique({
      where: { id: input.userId },
      select: { locale: true },
    })) as { locale: string | null } | null;
    const persisted = existing?.locale ?? null;
    const persistedIsEn = !persisted || isEnglishDevice(persisted);
    if (persistedIsEn) {
      const firstWithLocale = validHeritages.find((h) => h.suggestedLocale != null);
      if (firstWithLocale && firstWithLocale.suggestedLocale) {
        await prisma.user.update({
          where: { id: input.userId },
          data: { locale: firstWithLocale.suggestedLocale },
        });
        localeApplied = firstWithLocale.suggestedLocale;
      }
    }
  }

  return { heritagesApplied, seededWeights, localeApplied };
}

export const __forTest = {
  DIRECT_WEIGHT,
  ADJACENT_WEIGHT,
  SIGNAL_COUNT_PER_HERITAGE,
  HERITAGE_INDEX,
};
