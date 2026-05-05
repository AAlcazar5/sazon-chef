// frontend/utils/discoveryMilestoneKeys.ts
// ROADMAP 4.0 Tier J5 — Discovery milestone key helpers (frontend mirror of
// the backend `discoveryMilestoneService` slug logic).

const APPLIANCE_KEYS = [
  'ninja-creami',
  'air-fryer',
  'instant-pot',
  'sous-vide',
  'dutch-oven',
  'cast-iron',
  'grill',
  'smoker',
] as const;

const KNOWN_APPLIANCE_SLUGS: Set<string> = new Set(APPLIANCE_KEYS);

export const buildAppliancesMilestoneKey = (applianceName: string): string | null => {
  const trimmed = (applianceName ?? '').trim();
  if (!trimmed) return null;
  const slug = trimmed.toLowerCase().replace(/\s+/g, '-');
  if (!KNOWN_APPLIANCE_SLUGS.has(slug)) return null;
  return `first-appliance:${slug}`;
};

export const matchAppliancesMilestoneFromList = (
  appliances: readonly string[] | null | undefined,
): string | null => {
  if (!appliances) return null;
  for (const a of appliances) {
    const key = buildAppliancesMilestoneKey(a);
    if (key) return key;
  }
  return null;
};
