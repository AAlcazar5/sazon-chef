// backend/__tests__/services/cookTimelineService.test.ts
// Group 10X Phase 3 — Parallel Cook Timeline Solver tests.

import { solveCookTimeline, ComponentTask, TimelineEvent, EquipmentConflict } from '../../src/services/cookTimelineService';

const makeTask = (
  id: string,
  name: string,
  slot: ComponentTask['slot'],
  cookTimeMinutes: number,
  cookMethodHint: string,
  equipment: string[]
): ComponentTask => ({
  componentId: id,
  name,
  slot,
  cookTimeMinutes,
  cookMethodHint,
  equipmentNeeded: equipment,
});

describe('solveCookTimeline', () => {
  describe('empty input', () => {
    it('returns zero-state for empty task list', () => {
      const result = solveCookTimeline([]);
      expect(result.totalMinutes).toBe(0);
      expect(result.events).toEqual([]);
      expect(result.equipmentConflicts).toEqual([]);
    });
  });

  describe('basic scheduling', () => {
    const tasks: ComponentTask[] = [
      makeTask('p_salmon', 'Salmon Fillet', 'protein', 8, 'pan_sear', ['stovetop_burner']),
      makeTask('b_farro', 'Farro', 'base', 30, 'simmer', ['stovetop_burner']),
      makeTask('v_roasted_carrots', 'Roasted Carrots', 'vegetable', 25, 'roast', ['oven']),
      makeTask('s_yogurt_lemon', 'Yogurt Sauce', 'sauce', 5, 'mix', ['none']),
    ];

    it('schedules farro first (longest task)', () => {
      const result = solveCookTimeline(tasks);
      const farroStart = result.events.find(
        (e: TimelineEvent) => e.componentId === 'b_farro' && e.action === 'start'
      );
      expect(farroStart).toBeDefined();
      expect(farroStart!.atMinuteFromStart).toBe(0);
    });

    it('all components finish within ±2 min of each other at T-0', () => {
      const result = solveCookTimeline(tasks);
      const finishEvents = result.events.filter((e: TimelineEvent) => e.action === 'finish' || e.action === 'plate');
      const finishTimes = finishEvents.map((e: TimelineEvent) => e.atMinuteFromStart);
      const max = Math.max(...finishTimes);
      const min = Math.min(...finishTimes);
      expect(max - min).toBeLessThanOrEqual(2);
    });

    it('totalMinutes equals the longest cook time (farro = 30)', () => {
      const result = solveCookTimeline(tasks);
      expect(result.totalMinutes).toBe(30);
    });

    it('events are sorted ascending by atMinuteFromStart', () => {
      const result = solveCookTimeline(tasks);
      const times = result.events.map((e: TimelineEvent) => e.atMinuteFromStart);
      for (let i = 1; i < times.length; i++) {
        expect(times[i]).toBeGreaterThanOrEqual(times[i - 1]);
      }
    });
  });

  describe('zero-time components', () => {
    it('raw garnish with cookTimeMinutes=0 gets only a plate event', () => {
      const tasks: ComponentTask[] = [
        makeTask('g_herbs', 'Fresh Herbs', 'garnish', 0, 'raw', ['none']),
      ];
      const result = solveCookTimeline(tasks);
      const events = result.events.filter((e: TimelineEvent) => e.componentId === 'g_herbs');
      expect(events).toHaveLength(1);
      expect(events[0].action).toBe('plate');
    });

    it('zero-time component does not get start or finish events', () => {
      const tasks: ComponentTask[] = [
        makeTask('p_salmon', 'Salmon Fillet', 'protein', 8, 'pan_sear', ['stovetop_burner']),
        makeTask('g_herbs', 'Fresh Herbs', 'garnish', 0, 'raw', ['none']),
      ];
      const result = solveCookTimeline(tasks);
      const herbEvents = result.events.filter((e: TimelineEvent) => e.componentId === 'g_herbs');
      expect(herbEvents.every((e: TimelineEvent) => e.action !== 'start')).toBe(true);
      expect(herbEvents.every((e: TimelineEvent) => e.action !== 'finish')).toBe(true);
    });
  });

  describe('equipment conflicts', () => {
    it('flags conflict when two oven tasks overlap and only 1 oven slot available', () => {
      const tasks: ComponentTask[] = [
        makeTask('v_roasted_carrots', 'Roasted Carrots', 'vegetable', 25, 'roast', ['oven']),
        makeTask('p_pork', 'Pork Tenderloin', 'protein', 30, 'roast', ['oven']),
      ];
      const result = solveCookTimeline(tasks, { equipmentSlots: { oven: 1, stovetop_burner: 2 } });
      expect(result.equipmentConflicts.length).toBeGreaterThan(0);
      const conflict = result.equipmentConflicts.find((c: EquipmentConflict) => c.equipment === 'oven');
      expect(conflict).toBeDefined();
      expect(conflict!.overlappingComponentIds).toEqual(
        expect.arrayContaining(['v_roasted_carrots', 'p_pork'])
      );
    });

    it('no conflict when oven has 2 slots', () => {
      const tasks: ComponentTask[] = [
        makeTask('v_roasted_carrots', 'Roasted Carrots', 'vegetable', 25, 'roast', ['oven']),
        makeTask('p_pork', 'Pork Tenderloin', 'protein', 30, 'roast', ['oven']),
      ];
      const result = solveCookTimeline(tasks, { equipmentSlots: { oven: 2, stovetop_burner: 2 } });
      expect(result.equipmentConflicts).toHaveLength(0);
    });

    it('flags conflict when oven tasks overlap and only one slot is available', () => {
      const tasks: ComponentTask[] = [
        makeTask('v_quick_roast', 'Quick Roast', 'vegetable', 5, 'roast', ['oven']),
        makeTask('p_long_roast', 'Long Roast', 'protein', 30, 'roast', ['oven']),
      ];
      const result = solveCookTimeline(tasks, { equipmentSlots: { oven: 1 } });
      // Quick roast runs 25..30, long roast runs 0..30 — they overlap → 1 conflict.
      expect(result.equipmentConflicts).toHaveLength(1);
      expect(result.equipmentConflicts[0].equipment).toBe('oven');
    });

    it('no conflict when an instant task shares listed equipment with a cooked task', () => {
      const tasks: ComponentTask[] = [
        makeTask('p_long_roast', 'Long Roast', 'protein', 30, 'roast', ['oven']),
        // garnish has 0 cookTime so it has no window — must not flag a conflict
        makeTask('g_seeds', 'Toasted Seeds', 'garnish', 0, 'raw', ['oven']),
      ];
      const result = solveCookTimeline(tasks, { equipmentSlots: { oven: 1 } });
      expect(result.equipmentConflicts).toHaveLength(0);
    });
  });

  describe('slip minutes', () => {
    it('slipMinutes shifts all event times forward', () => {
      const tasks: ComponentTask[] = [
        makeTask('p_salmon', 'Salmon Fillet', 'protein', 8, 'pan_sear', ['stovetop_burner']),
        makeTask('b_farro', 'Farro', 'base', 30, 'simmer', ['stovetop_burner']),
      ];
      const base = solveCookTimeline(tasks);
      const slipped = solveCookTimeline(tasks, { slipMinutes: 5 });

      expect(slipped.totalMinutes).toBe(base.totalMinutes + 5);
      for (const baseEvent of base.events) {
        const slippedEvent = slipped.events.find(
          (e: TimelineEvent) => e.componentId === baseEvent.componentId && e.action === baseEvent.action
        );
        expect(slippedEvent).toBeDefined();
        expect(slippedEvent!.atMinuteFromStart).toBe(baseEvent.atMinuteFromStart + 5);
      }
    });

    it('slip 0 is a no-op', () => {
      const tasks: ComponentTask[] = [
        makeTask('b_farro', 'Farro', 'base', 30, 'simmer', ['stovetop_burner']),
      ];
      const base = solveCookTimeline(tasks);
      const slipped = solveCookTimeline(tasks, { slipMinutes: 0 });
      expect(slipped.totalMinutes).toBe(base.totalMinutes);
      expect(slipped.events.map((e: TimelineEvent) => e.atMinuteFromStart)).toEqual(
        base.events.map((e: TimelineEvent) => e.atMinuteFromStart)
      );
    });
  });

  describe('single task', () => {
    it('single non-zero task produces start + finish + plate events', () => {
      const tasks: ComponentTask[] = [
        makeTask('p_salmon', 'Salmon Fillet', 'protein', 8, 'pan_sear', ['stovetop_burner']),
      ];
      const result = solveCookTimeline(tasks);
      const types = result.events.map((e: TimelineEvent) => e.action);
      expect(types).toContain('start');
      expect(types).toContain('finish');
      expect(types).toContain('plate');
      expect(result.totalMinutes).toBe(8);
    });
  });
});
