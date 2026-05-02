// backend/src/services/cookTimelineService.ts
// Group 10X Phase 3 — Pure parallel cook timeline solver.

import type { ComponentSlot } from './mealComponentService';

export interface ComponentTask {
  componentId: string;
  name: string;
  slot: ComponentSlot;
  cookTimeMinutes: number;
  cookMethodHint: string;
  equipmentNeeded: string[];
}

export interface TimelineEvent {
  componentId: string;
  name: string;
  action: 'start' | 'finish' | 'plate';
  atMinuteFromStart: number;
  equipmentUsed: string[];
}

export interface EquipmentConflict {
  equipment: string;
  overlappingComponentIds: [string, string];
}

export interface ParallelTimeline {
  totalMinutes: number;
  events: TimelineEvent[];
  equipmentConflicts: EquipmentConflict[];
}

export interface SolveOptions {
  equipmentSlots?: Record<string, number>;
  slipMinutes?: number;
}

const DEFAULT_EQUIPMENT_SLOTS: Record<string, number> = {
  oven: 1,
  stovetop_burner: 2,
};

const detectConflicts = (
  windowsByComponent: Map<string, { start: number; end: number }>,
  tasks: ComponentTask[],
  equipmentSlots: Record<string, number>
): EquipmentConflict[] => {
  // Cooking model: all active tasks finish at totalMinutes (so they're plated together).
  // A conflict exists when more tasks need a shared piece of equipment than there are slots
  // AND their cook windows actually overlap. Under the "all finish together" model this is
  // equivalent to checking pair-window overlap directly — instant tasks (cookTime 0) have no
  // window so they're naturally excluded.
  const conflicts: EquipmentConflict[] = [];

  const tasksByEquipment = new Map<string, ComponentTask[]>();
  for (const task of tasks) {
    if (!windowsByComponent.has(task.componentId)) continue;
    for (const eq of task.equipmentNeeded) {
      if (eq === 'none' || eq === 'mixing_bowl') continue;
      const users = tasksByEquipment.get(eq) ?? [];
      users.push(task);
      tasksByEquipment.set(eq, users);
    }
  }

  for (const [equipment, eqTasks] of tasksByEquipment.entries()) {
    const slots = equipmentSlots[equipment] ?? 1;
    if (eqTasks.length <= slots) continue;

    for (let i = 0; i < eqTasks.length; i++) {
      for (let j = i + 1; j < eqTasks.length; j++) {
        const a = windowsByComponent.get(eqTasks[i].componentId)!;
        const b = windowsByComponent.get(eqTasks[j].componentId)!;
        if (a.start < b.end && b.start < a.end) {
          conflicts.push({
            equipment,
            overlappingComponentIds: [eqTasks[i].componentId, eqTasks[j].componentId],
          });
        }
      }
    }
  }

  return conflicts;
};

export const solveCookTimeline = (
  tasks: ComponentTask[],
  opts: SolveOptions = {}
): ParallelTimeline => {
  if (tasks.length === 0) {
    return { totalMinutes: 0, events: [], equipmentConflicts: [] };
  }

  const slip = opts.slipMinutes ?? 0;
  const equipmentSlots = { ...DEFAULT_EQUIPMENT_SLOTS, ...(opts.equipmentSlots ?? {}) };

  const activeTasks = tasks.filter((t) => t.cookTimeMinutes > 0);
  const instantTasks = tasks.filter((t) => t.cookTimeMinutes === 0);

  const totalMinutes = activeTasks.length > 0
    ? Math.max(...activeTasks.map((t) => t.cookTimeMinutes))
    : 0;

  const rawEvents: TimelineEvent[] = [];
  const windowsByComponent = new Map<string, { start: number; end: number }>();

  for (const task of activeTasks) {
    const startAt = totalMinutes - task.cookTimeMinutes;
    const finishAt = totalMinutes;
    windowsByComponent.set(task.componentId, { start: startAt, end: finishAt });

    rawEvents.push({
      componentId: task.componentId,
      name: task.name,
      action: 'start',
      atMinuteFromStart: startAt + slip,
      equipmentUsed: task.equipmentNeeded.filter((e) => e !== 'none'),
    });

    rawEvents.push({
      componentId: task.componentId,
      name: task.name,
      action: 'finish',
      atMinuteFromStart: finishAt + slip,
      equipmentUsed: task.equipmentNeeded.filter((e) => e !== 'none'),
    });

    rawEvents.push({
      componentId: task.componentId,
      name: task.name,
      action: 'plate',
      atMinuteFromStart: finishAt + slip,
      equipmentUsed: [],
    });
  }

  for (const task of instantTasks) {
    rawEvents.push({
      componentId: task.componentId,
      name: task.name,
      action: 'plate',
      atMinuteFromStart: totalMinutes + slip,
      equipmentUsed: [],
    });
  }

  const events = rawEvents.slice().sort((a, b) => a.atMinuteFromStart - b.atMinuteFromStart);

  const conflicts = detectConflicts(windowsByComponent, tasks, equipmentSlots);

  return {
    totalMinutes: totalMinutes + slip,
    events,
    equipmentConflicts: conflicts,
  };
};
