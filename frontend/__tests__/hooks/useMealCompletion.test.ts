// frontend/__tests__/hooks/useMealCompletion.test.ts

jest.mock('../../lib/api', () => ({
  mealPlanApi: {
    updateMealCompletion: jest.fn(),
    updateMealNotes: jest.fn(),
  },
}));

jest.mock('../../constants/Haptics', () => ({
  HapticPatterns: { success: jest.fn(), error: jest.fn() },
}));

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useMealCompletion } from '../../hooks/useMealCompletion';
import { mealPlanApi } from '../../lib/api';
import { Alert } from 'react-native';

const mockUpdateMealCompletion = mealPlanApi.updateMealCompletion as jest.Mock;
const mockUpdateMealNotes = mealPlanApi.updateMealNotes as jest.Mock;
let mockAlert: jest.SpyInstance;

const MEAL_ID = 'meal-123';
const makeProps = (overrides: Partial<Parameters<typeof useMealCompletion>[0]> = {}) => {
  const setMealCompletionStatus = jest.fn();
  const setMealNotes = jest.fn();
  return {
    hourlyMeals: {
      7: [{ mealPlanMealId: MEAL_ID, name: 'Oatmeal', title: 'Oatmeal Bowl' }],
    },
    weeklyPlan: null,
    mealCompletionStatus: { [MEAL_ID]: false },
    mealNotes: { [MEAL_ID]: 'Existing note' },
    setMealCompletionStatus,
    setMealNotes,
    ...overrides,
  };
};

describe('useMealCompletion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.spyOn(console, 'error').mockImplementation();
    mockAlert = jest.spyOn(Alert, 'alert').mockImplementation();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  // ── Initial state ──────────────────────────────────────────────────

  describe('initial state', () => {
    it('should initialize with modal hidden', () => {
      const { result } = renderHook(() => useMealCompletion(makeProps()));
      expect(result.current.showNotesModal).toBe(false);
      expect(result.current.editingMealId).toBeNull();
      expect(result.current.showCelebrationToast).toBe(false);
    });

    it('should expose quickTemplates with 4 entries', () => {
      const { result } = renderHook(() => useMealCompletion(makeProps()));
      expect(result.current.quickTemplates).toHaveLength(4);
      expect(result.current.quickTemplates.map(t => t.label)).toEqual([
        'Taste Notes', 'Modifications', 'Prep Tips', 'Rating',
      ]);
    });
  });

  // ── handleToggleMealCompletion ─────────────────────────────────────

  describe('handleToggleMealCompletion', () => {
    it('should call setMealCompletionStatus optimistically', async () => {
      mockUpdateMealCompletion.mockResolvedValueOnce({});
      const props = makeProps();
      const { result } = renderHook(() => useMealCompletion(props));

      await act(async () => {
        await result.current.handleToggleMealCompletion(MEAL_ID, true);
      });

      expect(props.setMealCompletionStatus).toHaveBeenCalledWith(expect.any(Function));
      // Verify the optimistic update function sets the correct value
      const updater = (props.setMealCompletionStatus as jest.Mock).mock.calls[0][0];
      const newState = updater({ [MEAL_ID]: false });
      expect(newState[MEAL_ID]).toBe(true);
    });

    it('should show celebration toast when marking complete', async () => {
      mockUpdateMealCompletion.mockResolvedValueOnce({});
      const { result } = renderHook(() => useMealCompletion(makeProps()));

      await act(async () => {
        await result.current.handleToggleMealCompletion(MEAL_ID, true);
      });

      expect(result.current.showCelebrationToast).toBe(true);
    });

    it('should hide celebration toast after 2 seconds', async () => {
      mockUpdateMealCompletion.mockResolvedValueOnce({});
      const { result } = renderHook(() => useMealCompletion(makeProps()));

      await act(async () => {
        await result.current.handleToggleMealCompletion(MEAL_ID, true);
      });

      expect(result.current.showCelebrationToast).toBe(true);

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(result.current.showCelebrationToast).toBe(false);
    });

    it('should not show toast when marking incomplete', async () => {
      mockUpdateMealCompletion.mockResolvedValueOnce({});
      const { result } = renderHook(() => useMealCompletion(makeProps()));

      await act(async () => {
        await result.current.handleToggleMealCompletion(MEAL_ID, false);
      });

      expect(result.current.showCelebrationToast).toBe(false);
    });

    it('should revert optimistic update on API failure', async () => {
      mockUpdateMealCompletion.mockRejectedValueOnce(new Error('API Error'));
      const props = makeProps();
      const { result } = renderHook(() => useMealCompletion(props));

      await act(async () => {
        await result.current.handleToggleMealCompletion(MEAL_ID, true);
      });

      // Should have called setMealCompletionStatus twice: once to optimistically set, once to revert
      expect(props.setMealCompletionStatus).toHaveBeenCalledTimes(2);
      const revertUpdater = (props.setMealCompletionStatus as jest.Mock).mock.calls[1][0];
      const revertedState = revertUpdater({ [MEAL_ID]: true });
      expect(revertedState[MEAL_ID]).toBe(false); // reverted to !isCompleted
    });

    it('should include meal name in celebration message', async () => {
      mockUpdateMealCompletion.mockResolvedValueOnce({});
      const { result } = renderHook(() => useMealCompletion(makeProps()));

      await act(async () => {
        await result.current.handleToggleMealCompletion(MEAL_ID, true);
      });

      expect(result.current.celebrationMessage).toContain('Oatmeal');
    });
  });

  // ── handleOpenNotes ────────────────────────────────────────────────

  describe('handleOpenNotes', () => {
    it('should set editingMealId and show modal', () => {
      const { result } = renderHook(() => useMealCompletion(makeProps()));

      act(() => {
        result.current.handleOpenNotes(MEAL_ID);
      });

      expect(result.current.editingMealId).toBe(MEAL_ID);
      expect(result.current.showNotesModal).toBe(true);
    });

    it('should pre-populate editingNotes with existing note', () => {
      const { result } = renderHook(() => useMealCompletion(makeProps()));

      act(() => {
        result.current.handleOpenNotes(MEAL_ID);
      });

      expect(result.current.editingNotes).toBe('Existing note');
    });

    it('should set editingMealName from hourlyMeals', () => {
      const { result } = renderHook(() => useMealCompletion(makeProps()));

      act(() => {
        result.current.handleOpenNotes(MEAL_ID);
      });

      expect(result.current.editingMealName).toBe('Oatmeal');
    });
  });

  // ── handleSaveNotes ────────────────────────────────────────────────

  describe('handleSaveNotes', () => {
    it('should call API with editingNotes and close modal on success', async () => {
      mockUpdateMealNotes.mockResolvedValueOnce({});
      const props = makeProps();
      const { result } = renderHook(() => useMealCompletion(props));

      act(() => {
        result.current.handleOpenNotes(MEAL_ID);
        result.current.setEditingNotes('New note text');
      });

      await act(async () => {
        await result.current.handleSaveNotes();
      });

      expect(mockUpdateMealNotes).toHaveBeenCalledWith(MEAL_ID, 'New note text');
      expect(result.current.showNotesModal).toBe(false);
      expect(result.current.editingMealId).toBeNull();
    });

    it('should update mealNotes state on success', async () => {
      mockUpdateMealNotes.mockResolvedValueOnce({});
      const props = makeProps();
      const { result } = renderHook(() => useMealCompletion(props));

      act(() => {
        result.current.handleOpenNotes(MEAL_ID);
        result.current.setEditingNotes('Updated note');
      });

      await act(async () => {
        await result.current.handleSaveNotes();
      });

      expect(props.setMealNotes).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle API error gracefully without crashing', async () => {
      mockUpdateMealNotes.mockRejectedValueOnce(new Error('Save failed'));
      const { result } = renderHook(() => useMealCompletion(makeProps()));

      act(() => {
        result.current.handleOpenNotes(MEAL_ID);
      });

      await act(async () => {
        await result.current.handleSaveNotes();
      });

      // Should not crash and should show Alert
      expect(mockAlert).toHaveBeenCalled();
      // Modal should remain open (not cleared on error)
    });

    it('should not call API when editingMealId is null', async () => {
      const { result } = renderHook(() => useMealCompletion(makeProps()));

      await act(async () => {
        await result.current.handleSaveNotes();
      });

      expect(mockUpdateMealNotes).not.toHaveBeenCalled();
    });
  });

  // ── handleCloseNotesModal ──────────────────────────────────────────

  describe('handleCloseNotesModal', () => {
    it('should hide modal and reset editing state', () => {
      const { result } = renderHook(() => useMealCompletion(makeProps()));

      act(() => {
        result.current.handleOpenNotes(MEAL_ID);
      });
      expect(result.current.showNotesModal).toBe(true);

      act(() => {
        result.current.handleCloseNotesModal();
      });

      expect(result.current.showNotesModal).toBe(false);
      expect(result.current.editingMealId).toBeNull();
      expect(result.current.editingNotes).toBe('');
    });
  });

  // ── insertBulletPoint ──────────────────────────────────────────────

  describe('insertBulletPoint', () => {
    it('should append a bullet point to editingNotes', () => {
      const { result } = renderHook(() => useMealCompletion(makeProps()));

      act(() => {
        result.current.setEditingNotes('My notes');
        result.current.insertBulletPoint();
      });

      expect(result.current.editingNotes).toBe('My notes\n• ');
    });

    it('should work on empty notes', () => {
      const { result } = renderHook(() => useMealCompletion(makeProps()));

      act(() => {
        result.current.insertBulletPoint();
      });

      expect(result.current.editingNotes).toBe('\n• ');
    });
  });

  // ── insertTemplate ─────────────────────────────────────────────────

  describe('insertTemplate', () => {
    it('should append template text to empty notes without separator', () => {
      const { result } = renderHook(() => useMealCompletion(makeProps()));
      const template = result.current.quickTemplates[0].text; // Taste Notes

      act(() => {
        result.current.insertTemplate(template);
      });

      expect(result.current.editingNotes).toBe(template);
    });

    it('should append template with double newline separator when notes exist', () => {
      const { result } = renderHook(() => useMealCompletion(makeProps()));
      const template = result.current.quickTemplates[1].text; // Modifications

      act(() => {
        result.current.setEditingNotes('Some notes');
        result.current.insertTemplate(template);
      });

      expect(result.current.editingNotes).toBe(`Some notes\n\n${template}`);
    });

    it('should work for all 4 quick templates', () => {
      const { result } = renderHook(() => useMealCompletion(makeProps()));

      result.current.quickTemplates.forEach(tmpl => {
        act(() => {
          result.current.setEditingNotes('');
          result.current.insertTemplate(tmpl.text);
        });
        expect(result.current.editingNotes.length).toBeGreaterThan(0);
      });
    });
  });
});
