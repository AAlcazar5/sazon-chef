import { deriveIdentity } from '../../lib/identityTags';
import type { CookingStats, SkillProgress } from '../../hooks/useCookingJourney';

const baseStats = (overrides: Partial<CookingStats> = {}): CookingStats => ({
  recipesCookedThisMonth: 0,
  recipesCookedAllTime: 0,
  cuisinesExplored: [],
  cuisinesExploredThisMonth: [],
  averageDifficulty: 1,
  averageDifficultyLabel: null,
  difficultyTrend: 'insufficient_data',
  longestStreakDays: 0,
  currentStreakDays: 0,
  firstCookedCuisines: [],
  seededCuisines: [],
  ...overrides,
});

const baseProgress = (overrides: Partial<SkillProgress> = {}): SkillProgress => ({
  currentLevel: 'home_cook',
  effectiveLevel: 'home_cook',
  readyToLevelUp: false,
  nextLevel: 'confident',
  reason: '',
  easyRecipesCookedWithGoodRating: 0,
  mediumRecipesCooked: 0,
  ...overrides,
});

describe('deriveIdentity', () => {
  it('returns empty when stats are missing', () => {
    const out = deriveIdentity({ stats: null, progress: null });
    expect(out.tags).toEqual([]);
    expect(out.caption).toBeNull();
  });

  it('emits a "{Cuisine}-curious" tag for the current month\'s first cuisine', () => {
    const out = deriveIdentity({
      stats: baseStats({ cuisinesExploredThisMonth: ['persian'] }),
      progress: null,
    });
    expect(out.tags).toContain('Persian-curious');
  });

  it('emits "Globetrotter" at 8+ unique cuisines', () => {
    const cuisines = ['italian', 'thai', 'mexican', 'persian', 'french', 'indian', 'japanese', 'lebanese'];
    const out = deriveIdentity({
      stats: baseStats({ cuisinesExplored: cuisines }),
      progress: null,
    });
    expect(out.tags).toContain('Globetrotter');
  });

  it('emits "Adventurous" between 4 and 7 cuisines', () => {
    const out = deriveIdentity({
      stats: baseStats({ cuisinesExplored: ['italian', 'thai', 'mexican', 'persian'] }),
      progress: null,
    });
    expect(out.tags).toContain('Adventurous');
  });

  it('emits "Loyalist" for 1–3 cuisines', () => {
    const out = deriveIdentity({
      stats: baseStats({ cuisinesExplored: ['italian'] }),
      progress: null,
    });
    expect(out.tags).toContain('Loyalist');
  });

  it('emits "Technique-curious" for hard avg difficulty', () => {
    const out = deriveIdentity({
      stats: baseStats({ averageDifficultyLabel: 'hard' }),
      progress: null,
    });
    expect(out.tags).toContain('Technique-curious');
  });

  it('emits the skill-tier descriptor', () => {
    const out = deriveIdentity({
      stats: baseStats({ cuisinesExplored: ['italian'] }),
      progress: baseProgress({ effectiveLevel: 'chef' }),
    });
    expect(out.tags).toContain('Chef-level');
  });

  it('caption is a period-joined version of the tag list', () => {
    const out = deriveIdentity({
      stats: baseStats({
        cuisinesExploredThisMonth: ['persian'],
        cuisinesExplored: ['persian', 'italian', 'thai', 'mexican'],
      }),
      progress: null,
    });
    expect(out.caption).toContain('Persian-curious');
    expect(out.caption).toContain('Adventurous');
  });

  it('does not emit banned voice vocabulary in any tag', () => {
    const out = deriveIdentity({
      stats: baseStats({
        cuisinesExploredThisMonth: ['persian'],
        cuisinesExplored: ['persian', 'italian', 'thai'],
        averageDifficultyLabel: 'easy',
        recipesCookedAllTime: 60,
      }),
      progress: baseProgress({ effectiveLevel: 'confident' }),
    });
    const flat = out.tags.join(' ').toLowerCase();
    expect(flat).not.toMatch(/streak|don't lose|goal\b|target|cut|bulk|maintain|optimize|crush/);
  });

  it('deduplicates tags so the chip row never repeats', () => {
    // Force a scenario where skill + diversity could collide
    const out = deriveIdentity({
      stats: baseStats({
        cuisinesExploredThisMonth: ['italian'],
        cuisinesExplored: ['italian'],
      }),
      progress: baseProgress({ effectiveLevel: 'home_cook' }),
    });
    const seen = new Set(out.tags);
    expect(seen.size).toBe(out.tags.length);
  });
});
