// frontend/__tests__/hooks/useRecipeFeedback.test.ts

jest.mock('../../lib/api', () => ({
  recipeApi: {
    likeRecipe: jest.fn(),
    dislikeRecipe: jest.fn(),
    saveRecipe: jest.fn(),
    unsaveRecipe: jest.fn(),
  },
}));

jest.mock('../../constants/Haptics', () => ({
  HapticPatterns: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../utils/analytics', () => ({
  analytics: {
    trackRecipeInteraction: jest.fn(),
  },
}));

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
}));

import { renderHook, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useRecipeFeedback } from '../../hooks/useRecipeFeedback';
import { recipeApi } from '../../lib/api';

const mockLike = recipeApi.likeRecipe as jest.Mock;
const mockDislike = recipeApi.dislikeRecipe as jest.Mock;
const mockSave = recipeApi.saveRecipe as jest.Mock;
const mockUnsave = recipeApi.unsaveRecipe as jest.Mock;
const mockAlert = Alert.alert as jest.Mock;

const setup = (overrides: Partial<Parameters<typeof useRecipeFeedback>[0]> = {}) => {
  const setFeedbackLoading = jest.fn();
  const updateRecipeFeedback = jest.fn();
  const onRecipesUpdate = jest.fn();
  const { result } = renderHook(() =>
    useRecipeFeedback({
      userId: 'user-1',
      source: 'home_screen',
      setFeedbackLoading,
      updateRecipeFeedback,
      onRecipesUpdate,
      ...overrides,
    }),
  );
  return { result, setFeedbackLoading, updateRecipeFeedback, onRecipesUpdate };
};

describe('useRecipeFeedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  describe('handleLike', () => {
    it('calls both likeRecipe and saveRecipe so liked recipes appear in cookbook', async () => {
      mockLike.mockResolvedValue({});
      mockSave.mockResolvedValue({});

      const { result } = setup();

      await act(async () => {
        await result.current.handleLike('recipe-1');
      });

      expect(mockLike).toHaveBeenCalledWith('recipe-1');
      expect(mockSave).toHaveBeenCalledWith('recipe-1');
    });

    it('treats 409 "already saved" as success (does not error)', async () => {
      mockLike.mockResolvedValue({});
      mockSave.mockRejectedValue({ response: { status: 409, data: { error: 'Recipe already saved' } } });

      const { result, updateRecipeFeedback } = setup();

      await act(async () => {
        await result.current.handleLike('recipe-1');
      });

      expect(updateRecipeFeedback).toHaveBeenLastCalledWith('recipe-1', { liked: true, disliked: false });
      expect(mockAlert).not.toHaveBeenCalledWith('Error', expect.any(String));
    });

    it('reverts UI and shows error when likeRecipe fails', async () => {
      mockLike.mockRejectedValue(new Error('network'));
      mockSave.mockResolvedValue({});

      const { result, updateRecipeFeedback } = setup();

      await act(async () => {
        await result.current.handleLike('recipe-1');
      });

      expect(updateRecipeFeedback).toHaveBeenLastCalledWith('recipe-1', { liked: false, disliked: false });
      expect(mockAlert).toHaveBeenCalledWith('Error', expect.stringMatching(/like/i));
    });

    it('reverts UI when saveRecipe fails with non-409 error', async () => {
      mockLike.mockResolvedValue({});
      mockSave.mockRejectedValue({ response: { status: 500 } });

      const { result, updateRecipeFeedback } = setup();

      await act(async () => {
        await result.current.handleLike('recipe-1');
      });

      expect(updateRecipeFeedback).toHaveBeenLastCalledWith('recipe-1', { liked: false, disliked: false });
      expect(mockAlert).toHaveBeenCalledWith('Error', expect.any(String));
    });
  });

  describe('handleDislike', () => {
    it('calls both dislikeRecipe and unsaveRecipe so disliking removes from cookbook', async () => {
      mockDislike.mockResolvedValue({});
      mockUnsave.mockResolvedValue({});

      const { result } = setup();

      await act(async () => {
        await result.current.handleDislike('recipe-1', 'too_spicy');
      });

      expect(mockDislike).toHaveBeenCalledWith('recipe-1', 'too_spicy');
      expect(mockUnsave).toHaveBeenCalledWith('recipe-1');
    });

    it('does not error when unsaveRecipe fails (recipe was never saved)', async () => {
      mockDislike.mockResolvedValue({});
      // Backend uses deleteMany so this is unlikely, but defend anyway
      mockUnsave.mockRejectedValue({ response: { status: 404 } });

      const { result, updateRecipeFeedback } = setup();

      await act(async () => {
        await result.current.handleDislike('recipe-1');
      });

      expect(updateRecipeFeedback).toHaveBeenLastCalledWith('recipe-1', { liked: false, disliked: true });
      expect(mockAlert).not.toHaveBeenCalledWith('Error', expect.any(String));
    });

    it('reverts UI when dislikeRecipe fails', async () => {
      mockDislike.mockRejectedValue(new Error('network'));
      mockUnsave.mockResolvedValue({});

      const { result, updateRecipeFeedback } = setup();

      await act(async () => {
        await result.current.handleDislike('recipe-1');
      });

      expect(updateRecipeFeedback).toHaveBeenLastCalledWith('recipe-1', { liked: false, disliked: false });
      expect(mockAlert).toHaveBeenCalledWith('Error', expect.stringMatching(/dislike/i));
    });
  });
});
