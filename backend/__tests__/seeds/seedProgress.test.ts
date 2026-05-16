// Tests for the seed run's terminal progress bar — percentage + visual bar
// + success/dup/fail breakdown + ETA (the run takes hours, so ETA matters).

import { formatProgressBar } from '../../scripts/seedProgress';

const HOUR = 3_600_000;

describe('formatProgressBar', () => {
  it('shows 0% and an empty bar with no ETA before anything is attempted', () => {
    const s = formatProgressBar({
      done: 0, total: 500, saved: 0, dup: 0, fail: 0, elapsedMs: 0, label: '',
    });
    expect(s).toContain('0%');
    expect(s).toContain('0/500');
    expect(s).toContain('░'.repeat(20));
    expect(s).not.toContain('█');
    expect(s).toMatch(/ETA\s+—/);
  });

  it('renders the proportional bar and rounded percentage mid-run', () => {
    const s = formatProgressBar({
      done: 250, total: 500, saved: 170, dup: 55, fail: 25, elapsedMs: HOUR, label: 'Pakistani dinner',
    });
    expect(s).toContain('50%');
    expect(s).toContain('250/500');
    expect(s).toContain('█'.repeat(10) + '░'.repeat(10));
  });

  it('includes the success / duplicate / failure breakdown', () => {
    const s = formatProgressBar({
      done: 250, total: 500, saved: 170, dup: 55, fail: 25, elapsedMs: HOUR, label: '',
    });
    expect(s).toContain('✓170');
    expect(s).toContain('⊘55');
    expect(s).toContain('✗25');
  });

  it('projects ETA from elapsed/done (250 done in 1h → ~1h0m left)', () => {
    const s = formatProgressBar({
      done: 250, total: 500, saved: 200, dup: 30, fail: 20, elapsedMs: HOUR, label: '',
    });
    expect(s).toContain('ETA 1h 0m');
  });

  it('uses minute-only ETA when under an hour remains', () => {
    // 100/500 in 10 min → 2.4 min/item → 400 left ≈ 960 min? no:
    // rate = 600000/100 = 6000ms; remaining 400*6000 = 2_400_000ms = 40m
    const s = formatProgressBar({
      done: 100, total: 500, saved: 90, dup: 5, fail: 5, elapsedMs: 600_000, label: '',
    });
    expect(s).toMatch(/ETA\s+40m/);
    expect(s).not.toMatch(/ETA\s+\dh/);
  });

  it('caps at 100% with a full bar and "done" when complete', () => {
    const s = formatProgressBar({
      done: 500, total: 500, saved: 380, dup: 90, fail: 30, elapsedMs: 2 * HOUR, label: 'x',
    });
    expect(s).toContain('100%');
    expect(s).toContain('█'.repeat(20));
    expect(s).not.toContain('░');
    expect(s).toMatch(/ETA\s+done/);
  });

  it('appends the label only when present', () => {
    const withLabel = formatProgressBar({
      done: 1, total: 10, saved: 1, dup: 0, fail: 0, elapsedMs: 1000, label: 'Thai lunch',
    });
    const without = formatProgressBar({
      done: 1, total: 10, saved: 1, dup: 0, fail: 0, elapsedMs: 1000, label: '',
    });
    expect(withLabel).toContain('· Thai lunch');
    expect(without).not.toContain('·');
  });

  it('keeps the bar exactly `width` cells regardless of fill', () => {
    for (const done of [0, 1, 333, 999, 1000]) {
      const s = formatProgressBar({
        done, total: 1000, saved: done, dup: 0, fail: 0, elapsedMs: done * 10, label: '', width: 30,
      });
      const bar = s.match(/[█░]+/)?.[0] ?? '';
      expect(bar.length).toBe(30);
    }
  });

  it('guards total=0 (no division by zero)', () => {
    const s = formatProgressBar({
      done: 0, total: 0, saved: 0, dup: 0, fail: 0, elapsedMs: 0, label: '',
    });
    expect(s).toContain('0%');
    expect(s).toContain('0/0');
  });
});
