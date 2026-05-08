// ROADMAP 4.0 G2.4 — founder-trip curation task service.
//
// Internal-only admin tooling. When the founder/team travels, this
// service generates structured curation tasks per trip. Each task is
// later closed when the work is photographed/captured/recorded.

const mockTaskCreateMany = jest.fn();
const mockTaskFindMany = jest.fn();
const mockTaskFindUnique = jest.fn();
const mockTaskUpdate = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    localCurationTask: {
      createMany: jest.fn((arg) => mockTaskCreateMany(arg)),
      findMany: jest.fn((arg) => mockTaskFindMany(arg)),
      findUnique: jest.fn((arg) => mockTaskFindUnique(arg)),
      update: jest.fn((arg) => mockTaskUpdate(arg)),
    },
  },
}));

import {
  TASK_TYPES,
  TASK_STATUSES,
  generateTripTasks,
  getTasksForUser,
  updateTaskProgress,
  __forTest,
} from '../../src/services/founderTripService';

beforeEach(() => {
  jest.clearAllMocks();
  mockTaskCreateMany.mockResolvedValue({ count: 3 });
});

describe('TASK_TYPES + TASK_STATUSES', () => {
  it('exposes the canonical task types', () => {
    expect(TASK_TYPES).toEqual(
      expect.arrayContaining([
        'review_ingredients',
        'photograph_produce',
        'cultural_primer_voice_memo',
      ]),
    );
  });

  it('exposes the canonical statuses in pending → completed order', () => {
    expect(TASK_STATUSES).toEqual([
      'pending',
      'in_progress',
      'completed',
      'abandoned',
    ]);
  });
});

describe('generateTripTasks', () => {
  it('creates one task per task type by default with sensible target counts', async () => {
    const result = await generateTripTasks({
      userId: 'admin-1',
      locale: 'es-MX',
      citySlug: 'cdmx',
    });
    expect(result.tasksCreated).toBe(TASK_TYPES.length);
    const args = mockTaskCreateMany.mock.calls[0][0];
    expect(args.data).toHaveLength(TASK_TYPES.length);
    for (const row of args.data) {
      expect(row.userId).toBe('admin-1');
      expect(row.locale).toBe('es-MX');
      expect(row.citySlug).toBe('cdmx');
      expect(row.targetCount).toBeGreaterThan(0);
      expect(row.status).toBe('pending');
    }
  });

  it('honors task overrides — caller-supplied subset of types', async () => {
    await generateTripTasks({
      userId: 'admin-1',
      locale: 'pt-BR',
      taskTypes: ['photograph_produce'],
    });
    const args = mockTaskCreateMany.mock.calls[0][0];
    expect(args.data).toHaveLength(1);
    expect(args.data[0].taskType).toBe('photograph_produce');
  });

  it('rejects unknown task types', async () => {
    await expect(
      generateTripTasks({
        userId: 'admin-1',
        locale: 'es-MX',
        taskTypes: ['photograph_produce', 'collect-receipts'] as any,
      }),
    ).rejects.toThrow(/unknown task type/i);
    expect(mockTaskCreateMany).not.toHaveBeenCalled();
  });

  it('rejects empty userId', async () => {
    await expect(
      generateTripTasks({ userId: '', locale: 'es-MX' }),
    ).rejects.toThrow(/userId/i);
  });

  it('rejects empty locale', async () => {
    await expect(
      generateTripTasks({ userId: 'admin-1', locale: '' }),
    ).rejects.toThrow(/locale/i);
  });

  it('honors a custom targetCounts map', async () => {
    await generateTripTasks({
      userId: 'admin-1',
      locale: 'es-MX',
      targetCounts: { review_ingredients: 200 },
    });
    const args = mockTaskCreateMany.mock.calls[0][0];
    const reviewRow = args.data.find((d: any) => d.taskType === 'review_ingredients');
    expect(reviewRow.targetCount).toBe(200);
    // Other types still use defaults
    const photoRow = args.data.find((d: any) => d.taskType === 'photograph_produce');
    expect(photoRow.targetCount).toBe(__forTest.DEFAULT_TARGET_COUNTS.photograph_produce);
  });
});

describe('getTasksForUser', () => {
  it('lists tasks ordered most-recent-first', async () => {
    mockTaskFindMany.mockResolvedValue([
      { id: 't2', createdAt: new Date('2026-05-08T12:00:00Z') },
      { id: 't1', createdAt: new Date('2026-05-01T12:00:00Z') },
    ]);
    const result = await getTasksForUser({ userId: 'admin-1' });
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('t2');
    const args = mockTaskFindMany.mock.calls[0][0];
    expect(args.where.userId).toBe('admin-1');
  });

  it('filters by status', async () => {
    mockTaskFindMany.mockResolvedValue([]);
    await getTasksForUser({ userId: 'admin-1', status: 'pending' });
    const args = mockTaskFindMany.mock.calls[0][0];
    expect(args.where.status).toBe('pending');
  });

  it('rejects empty userId', async () => {
    await expect(getTasksForUser({ userId: '' })).rejects.toThrow(/userId/i);
  });
});

describe('updateTaskProgress', () => {
  it('increments completedCount + flips to in_progress on first progress', async () => {
    mockTaskFindUnique.mockResolvedValue({
      id: 't1',
      userId: 'admin-1',
      status: 'pending',
      completedCount: 0,
      targetCount: 100,
    });
    mockTaskUpdate.mockResolvedValue({
      id: 't1',
      status: 'in_progress',
      completedCount: 5,
    });

    const result = await updateTaskProgress({
      userId: 'admin-1',
      taskId: 't1',
      completedCount: 5,
    });
    expect(result.status).toBe('in_progress');
    const args = mockTaskUpdate.mock.calls[0][0];
    expect(args.data.completedCount).toBe(5);
    expect(args.data.status).toBe('in_progress');
    // startedAt stamped
    expect(args.data.startedAt).toBeInstanceOf(Date);
  });

  it('flips to completed when completedCount >= targetCount', async () => {
    mockTaskFindUnique.mockResolvedValue({
      id: 't1',
      userId: 'admin-1',
      status: 'in_progress',
      completedCount: 80,
      targetCount: 100,
      startedAt: new Date('2026-05-01T00:00:00Z'),
    });
    mockTaskUpdate.mockResolvedValue({
      id: 't1',
      status: 'completed',
      completedCount: 100,
    });
    const result = await updateTaskProgress({
      userId: 'admin-1',
      taskId: 't1',
      completedCount: 100,
    });
    expect(result.status).toBe('completed');
    const args = mockTaskUpdate.mock.calls[0][0];
    expect(args.data.status).toBe('completed');
    expect(args.data.completedAt).toBeInstanceOf(Date);
  });

  it('honors explicit status override (e.g. abandoned)', async () => {
    mockTaskFindUnique.mockResolvedValue({
      id: 't1',
      userId: 'admin-1',
      status: 'in_progress',
      completedCount: 5,
      targetCount: 100,
    });
    mockTaskUpdate.mockResolvedValue({ id: 't1', status: 'abandoned' });
    await updateTaskProgress({
      userId: 'admin-1',
      taskId: 't1',
      status: 'abandoned',
    });
    const args = mockTaskUpdate.mock.calls[0][0];
    expect(args.data.status).toBe('abandoned');
  });

  it('rejects unknown status', async () => {
    mockTaskFindUnique.mockResolvedValue({
      id: 't1',
      userId: 'admin-1',
      status: 'pending',
      completedCount: 0,
      targetCount: 100,
    });
    await expect(
      updateTaskProgress({
        userId: 'admin-1',
        taskId: 't1',
        status: 'wat-status' as any,
      }),
    ).rejects.toThrow(/status/i);
  });

  it('rejects when task belongs to another user', async () => {
    mockTaskFindUnique.mockResolvedValue({
      id: 't1',
      userId: 'other-admin',
      status: 'pending',
      completedCount: 0,
      targetCount: 100,
    });
    await expect(
      updateTaskProgress({
        userId: 'admin-1',
        taskId: 't1',
        completedCount: 5,
      }),
    ).rejects.toThrow(/not found/i);
    expect(mockTaskUpdate).not.toHaveBeenCalled();
  });

  it('rejects when task does not exist', async () => {
    mockTaskFindUnique.mockResolvedValue(null);
    await expect(
      updateTaskProgress({
        userId: 'admin-1',
        taskId: 'missing',
        completedCount: 5,
      }),
    ).rejects.toThrow(/not found/i);
  });
});
