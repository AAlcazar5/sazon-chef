// ROADMAP 4.0 G2.4 — founder-trip curation task service.
//
// Internal-only admin tooling. When founder/team travels, this service
// generates structured curation tasks per trip:
//   - review_ingredients: walk the I2.1 catalog for {locale}, validate
//     entries, fix mistranslations, add missing rows
//   - photograph_produce: capture market produce photos + tags for the
//     locale-aware rendering
//   - cultural_primer_voice_memo: record an audio memo for the
//     culturalPrimerService library
//
// Funds the I2 catalog with first-hand provenance, not LLM hallucination.

import { prisma } from '@/lib/prisma';

export const TASK_TYPES = [
  'review_ingredients',
  'photograph_produce',
  'cultural_primer_voice_memo',
] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const TASK_STATUSES = [
  'pending',
  'in_progress',
  'completed',
  'abandoned',
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

const DEFAULT_TARGET_COUNTS: Record<TaskType, number> = {
  review_ingredients: 100,
  photograph_produce: 20,
  cultural_primer_voice_memo: 1,
};

export interface CurationTask {
  id: string;
  userId: string;
  locale: string;
  citySlug: string | null;
  taskType: TaskType;
  targetCount: number;
  completedCount: number;
  status: TaskStatus;
  notes: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GenerateTripTasksInput {
  userId: string;
  locale: string;
  citySlug?: string;
  /** Subset of TASK_TYPES to generate. Defaults to all three. */
  taskTypes?: TaskType[];
  /** Per-type target overrides; missing types use DEFAULT_TARGET_COUNTS. */
  targetCounts?: Partial<Record<TaskType, number>>;
}

export interface GenerateTripTasksResult {
  tasksCreated: number;
}

const TASK_TYPE_SET: Set<string> = new Set(TASK_TYPES);
const TASK_STATUS_SET: Set<string> = new Set(TASK_STATUSES);

export async function generateTripTasks(
  input: GenerateTripTasksInput,
): Promise<GenerateTripTasksResult> {
  if (!input.userId) {
    throw new Error('userId is required');
  }
  if (!input.locale || !input.locale.trim()) {
    throw new Error('locale is required');
  }
  const types = input.taskTypes ?? [...TASK_TYPES];
  for (const t of types) {
    if (!TASK_TYPE_SET.has(t)) {
      throw new Error(`unknown task type: ${t}`);
    }
  }

  const data = types.map((taskType) => ({
    userId: input.userId,
    locale: input.locale,
    citySlug: input.citySlug?.toLowerCase() ?? null,
    taskType,
    targetCount:
      input.targetCounts?.[taskType] ?? DEFAULT_TARGET_COUNTS[taskType],
    completedCount: 0,
    status: 'pending' as TaskStatus,
  }));

  const result = (await (prisma as any).localCurationTask.createMany({ data })) as {
    count: number;
  };

  return { tasksCreated: result.count };
}

export interface GetTasksInput {
  userId: string;
  status?: TaskStatus;
}

export async function getTasksForUser(input: GetTasksInput): Promise<CurationTask[]> {
  if (!input.userId) {
    throw new Error('userId is required');
  }
  const where: any = { userId: input.userId };
  if (input.status) {
    if (!TASK_STATUS_SET.has(input.status)) {
      throw new Error(`unknown status: ${input.status}`);
    }
    where.status = input.status;
  }
  return (await (prisma as any).localCurationTask.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })) as CurationTask[];
}

export interface UpdateTaskProgressInput {
  userId: string;
  taskId: string;
  completedCount?: number;
  status?: TaskStatus;
  notes?: string;
}

export async function updateTaskProgress(
  input: UpdateTaskProgressInput,
): Promise<CurationTask> {
  if (input.status && !TASK_STATUS_SET.has(input.status)) {
    throw new Error(`unknown status: ${input.status}`);
  }
  const existing = (await (prisma as any).localCurationTask.findUnique({
    where: { id: input.taskId },
  })) as CurationTask | null;
  if (!existing) {
    throw new Error('Task not found');
  }
  if (existing.userId !== input.userId) {
    throw new Error('Task not found'); // never leak ownership
  }

  const data: any = {};
  if (input.notes !== undefined) data.notes = input.notes;

  let nextStatus: TaskStatus | undefined = input.status;
  let nextCompletedCount = existing.completedCount;
  if (input.completedCount !== undefined) {
    data.completedCount = input.completedCount;
    nextCompletedCount = input.completedCount;
    // Auto-flip pending → in_progress on first progress.
    if (existing.status === 'pending' && input.completedCount > 0 && !input.status) {
      nextStatus = 'in_progress';
    }
    // Auto-flip to completed when count meets/exceeds target.
    if (
      existing.targetCount > 0 &&
      input.completedCount >= existing.targetCount &&
      !input.status
    ) {
      nextStatus = 'completed';
    }
  }

  if (nextStatus && nextStatus !== existing.status) {
    data.status = nextStatus;
    if (nextStatus === 'in_progress' && !existing.startedAt) {
      data.startedAt = new Date();
    }
    if (nextStatus === 'completed') {
      data.completedAt = new Date();
    }
  }

  return (await (prisma as any).localCurationTask.update({
    where: { id: input.taskId },
    data,
  })) as CurationTask;
}

export const __forTest = {
  DEFAULT_TARGET_COUNTS,
};
