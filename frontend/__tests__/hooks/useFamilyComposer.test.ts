// frontend/__tests__/hooks/useFamilyComposer.test.ts

const mockFamily = jest.fn();
jest.mock('../../lib/api', () => ({
  composedPlateApi: {
    family: (...args: any[]) => mockFamily(...args),
  },
}));

import { act, renderHook } from '@testing-library/react-native';
import { useFamilyComposer } from '../../hooks/useFamilyComposer';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useFamilyComposer', () => {
  it('starts with the requested initial plate count', () => {
    const { result } = renderHook(() => useFamilyComposer(3));
    expect(result.current.plates).toHaveLength(3);
    expect(result.current.activeIndex).toBe(0);
  });

  it('setSlot only updates the targeted plate', () => {
    const { result } = renderHook(() => useFamilyComposer(2));
    act(() => result.current.setSlot(0, 'protein', 'p_salmon'));
    act(() => result.current.setSlot(1, 'protein', 'p_chicken'));
    expect(result.current.plates[0].slots.protein).toBe('p_salmon');
    expect(result.current.plates[1].slots.protein).toBe('p_chicken');
  });

  it('clearSlot removes the slot from the targeted plate only', () => {
    const { result } = renderHook(() => useFamilyComposer(2));
    act(() => result.current.setSlot(0, 'protein', 'p_salmon'));
    act(() => result.current.setSlot(1, 'protein', 'p_chicken'));
    act(() => result.current.clearSlot(0, 'protein'));
    expect(result.current.plates[0].slots.protein).toBeUndefined();
    expect(result.current.plates[1].slots.protein).toBe('p_chicken');
  });

  it('addPlate appends up to MAX_PLATES (6)', () => {
    const { result } = renderHook(() => useFamilyComposer(2));
    act(() => {
      for (let i = 0; i < 10; i++) result.current.addPlate();
    });
    expect(result.current.plates).toHaveLength(6);
  });

  it('removePlate keeps at least 1 plate', () => {
    const { result } = renderHook(() => useFamilyComposer(2));
    act(() => result.current.removePlate(1));
    act(() => result.current.removePlate(0));
    expect(result.current.plates).toHaveLength(1);
  });

  it('divergeFromShared copies active plate shared slots to all others, clears divergent', () => {
    const { result } = renderHook(() => useFamilyComposer(2));
    act(() => {
      result.current.setSlot(0, 'protein', 'p_chicken');
      result.current.setSlot(0, 'base', 'b_rice');
      result.current.setSlot(0, 'vegetable', 'v_roasted');
      result.current.setSlot(1, 'protein', 'p_salmon');
      result.current.setSlot(1, 'vegetable', 'v_plain');
    });
    act(() => result.current.divergeFromShared(['protein', 'base']));
    // plate 0 (active) untouched
    expect(result.current.plates[0].slots.protein).toBe('p_chicken');
    expect(result.current.plates[0].slots.vegetable).toBe('v_roasted');
    // plate 1 took shared protein+base, lost its vegetable
    expect(result.current.plates[1].slots.protein).toBe('p_chicken');
    expect(result.current.plates[1].slots.base).toBe('b_rice');
    expect(result.current.plates[1].slots.vegetable).toBeUndefined();
  });

  it('buildPayload produces FamilyPlatePayload with portionMultiplier=1 and skips empty plates', () => {
    const { result } = renderHook(() => useFamilyComposer(3));
    act(() => result.current.setSlot(0, 'protein', 'p_chicken'));
    act(() => result.current.setSlot(2, 'base', 'b_farro'));
    const payload = result.current.buildPayload();
    expect(payload).toHaveLength(2);
    expect(payload[0].components[0]).toEqual({
      slot: 'protein',
      componentId: 'p_chicken',
      portionMultiplier: 1,
    });
  });

  it('persist throws + sets error when no plates have selections', async () => {
    const { result } = renderHook(() => useFamilyComposer(2));
    await act(async () => {
      await expect(result.current.persist()).rejects.toThrow(/at least one plate/i);
    });
    expect(result.current.error).toMatch(/at least one plate/i);
    expect(mockFamily).not.toHaveBeenCalled();
  });

  it('persist calls composedPlateApi.family with persist=true', async () => {
    mockFamily.mockResolvedValueOnce({
      data: {
        familyMeal: { userId: 'u1', plates: [], cookSteps: [] },
        persisted: { id: 'fm1', userId: 'u1', name: 'Sunday', cookSteps: [], plateIds: [] },
      },
    });
    const { result } = renderHook(() => useFamilyComposer(2));
    act(() => result.current.setSlot(0, 'protein', 'p_chicken'));
    act(() => result.current.assignMember(0, 'mem-kid'));
    await act(async () => {
      await result.current.persist('Sunday');
    });
    const arg = mockFamily.mock.calls[0][0];
    expect(arg.persist).toBe(true);
    expect(arg.name).toBe('Sunday');
    expect(arg.plates[0].householdMemberId).toBe('mem-kid');
  });

  it('persist surfaces server error in `error`', async () => {
    mockFamily.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useFamilyComposer(2));
    act(() => result.current.setSlot(0, 'protein', 'p_chicken'));
    await act(async () => {
      await expect(result.current.persist()).rejects.toThrow();
    });
    expect(result.current.error).toMatch(/boom/i);
    expect(result.current.isPersisting).toBe(false);
  });

  it('reset returns to a clean 2-plate empty state', () => {
    const { result } = renderHook(() => useFamilyComposer(4));
    act(() => result.current.setSlot(0, 'protein', 'p_chicken'));
    act(() => result.current.reset());
    expect(result.current.plates).toHaveLength(2);
    expect(result.current.plates[0].slots).toEqual({});
    expect(result.current.error).toBeNull();
  });
});
