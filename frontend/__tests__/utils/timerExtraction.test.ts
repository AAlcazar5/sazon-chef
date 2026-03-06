// frontend/__tests__/utils/timerExtraction.test.ts
import { extractTimers, formatDuration, formatCountdown } from '../../utils/timerExtraction';

describe('extractTimers', () => {
  // ── Duration parsing ─────────────────────────────────────────────────────

  it('parses "X minutes" with action word', () => {
    const timers = extractTimers('Bake for 25 minutes until golden.');
    expect(timers).toHaveLength(1);
    expect(timers[0]).toEqual({ label: 'Bake', minutes: 25 });
  });

  it('parses "X min" abbreviation', () => {
    const timers = extractTimers('Simmer for 15 min over low heat.');
    expect(timers).toHaveLength(1);
    expect(timers[0].minutes).toBe(15);
    expect(timers[0].label).toBe('Simmer');
  });

  it('parses "X hours" duration', () => {
    const timers = extractTimers('Marinate in the fridge for 2 hours.');
    expect(timers).toHaveLength(1);
    expect(timers[0].minutes).toBe(120);
    expect(timers[0].label).toBe('Marinate');
  });

  it('parses "1.5 hrs" fractional hours', () => {
    const timers = extractTimers('Cook for 1.5 hrs over medium heat.');
    expect(timers).toHaveLength(1);
    expect(timers[0].minutes).toBe(90);
  });

  it('parses "X hour Y minutes" compound duration', () => {
    const timers = extractTimers('Roast for 1 hour 30 minutes.');
    // compound match gives 90, plain "30 minutes" also matches → both present
    const minutes = timers.map(t => t.minutes);
    expect(minutes).toContain(90);
    expect(timers.some(t => t.label === 'Roast')).toBe(true);
  });

  it('parses "X-Y minutes" range (takes midpoint)', () => {
    const timers = extractTimers('Grill for 25-30 minutes, turning once.');
    // range match gives 28, plain "30 minutes" also matches → both present
    const minutes = timers.map(t => t.minutes);
    expect(minutes).toContain(28);
    expect(timers.some(t => t.label === 'Grill')).toBe(true);
  });

  it('rounds seconds up to 1 minute minimum', () => {
    const timers = extractTimers('Boil for 30 seconds.');
    expect(timers).toHaveLength(1);
    expect(timers[0].minutes).toBe(1);
  });

  it('falls back to "Timer" label when no action word is found', () => {
    const timers = extractTimers('After 20 minutes, check doneness.');
    expect(timers).toHaveLength(1);
    expect(timers[0].label).toBe('Timer');
    expect(timers[0].minutes).toBe(20);
  });

  // ── Action word recognition ──────────────────────────────────────────────

  it.each([
    ['bake', 'Bake'],
    ['roast', 'Roast'],
    ['simmer', 'Simmer'],
    ['boil', 'Boil'],
    ['fry', 'Fry'],
    ['steam', 'Steam'],
    ['chill', 'Chill'],
    ['rest', 'Rest'],
    ['cook', 'Cook'],
    ['grill', 'Grill'],
  ])('recognizes "%s" action word', (action, expectedLabel) => {
    const timers = extractTimers(`${action} for 10 minutes.`);
    expect(timers.length).toBeGreaterThan(0);
    expect(timers[0].label).toBe(expectedLabel);
  });

  // ── Deduplication & sanity caps ──────────────────────────────────────────

  it('deduplicates identical durations within one step', () => {
    const timers = extractTimers('Bake for 25 minutes, then rest for 25 minutes.');
    const count25 = timers.filter(t => t.minutes === 25).length;
    expect(count25).toBe(1);
  });

  it('caps timers above 480 minutes', () => {
    const timers = extractTimers('Slow cook for 600 minutes.');
    expect(timers).toHaveLength(0);
  });

  it('ignores zero-minute durations', () => {
    const timers = extractTimers('Mix for 0 minutes.');
    expect(timers).toHaveLength(0);
  });

  // ── Multiple timers in one step ──────────────────────────────────────────

  it('extracts multiple distinct timers from one instruction', () => {
    const timers = extractTimers('Cook for 10 minutes then let it cool for 20 minutes.');
    expect(timers.length).toBeGreaterThanOrEqual(2);
    const durations = timers.map(t => t.minutes);
    expect(durations).toContain(10);
    expect(durations).toContain(20);
  });

  // ── Edge cases ───────────────────────────────────────────────────────────

  it('returns empty array when instruction has no time', () => {
    expect(extractTimers('Add salt and stir to combine.')).toHaveLength(0);
  });

  it('returns empty array for empty string', () => {
    expect(extractTimers('')).toHaveLength(0);
  });
});

describe('formatDuration', () => {
  it('formats sub-hour durations as "X min"', () => {
    expect(formatDuration(1)).toBe('1 min');
    expect(formatDuration(25)).toBe('25 min');
    expect(formatDuration(59)).toBe('59 min');
  });

  it('formats exact hours as "X hr" (singular)', () => {
    expect(formatDuration(60)).toBe('1 hr');
  });

  it('formats exact hours as "X hrs" (plural)', () => {
    expect(formatDuration(120)).toBe('2 hrs');
  });

  it('formats compound hour+minute durations', () => {
    expect(formatDuration(90)).toBe('1 hr 30 min');
    expect(formatDuration(75)).toBe('1 hr 15 min');
    expect(formatDuration(150)).toBe('2 hr 30 min');
  });
});

describe('formatCountdown', () => {
  it('formats 0 seconds as "00:00"', () => {
    expect(formatCountdown(0)).toBe('00:00');
  });

  it('pads sub-minute seconds', () => {
    expect(formatCountdown(5)).toBe('00:05');
    expect(formatCountdown(30)).toBe('00:30');
  });

  it('formats exact minutes', () => {
    expect(formatCountdown(60)).toBe('01:00');
    expect(formatCountdown(120)).toBe('02:00');
  });

  it('formats minutes and seconds', () => {
    expect(formatCountdown(90)).toBe('01:30');
    expect(formatCountdown(605)).toBe('10:05');
  });

  it('pads single-digit seconds when minutes are present', () => {
    expect(formatCountdown(61)).toBe('01:01');
  });
});
