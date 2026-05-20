// Tier Y-Live-2 — minimal kitchen-mode step player screen. Loads a
// recipe by id, renders CookStepCard for the current step, prev/next
// navigation, X close → router.back. RED-first: screen does not exist.

const mockHaptic = jest.fn();
jest.mock('expo-haptics', () => ({
  impactAsync: (...a: unknown[]) => mockHaptic(...a),
  notificationAsync: (...a: unknown[]) => mockHaptic(...a),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: {
    Success: 'Success',
    Warning: 'Warning',
    Error: 'Error',
  },
}));
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    colors: {
      background: '#FAF7F4',
      text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    },
  }),
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));

jest.mock('../../lib/api/recipe', () => ({
  recipeApi: { getRecipe: jest.fn() },
}));

// Y-Live-5 — keep tests off the real expo-speech / native SpeechModule.
// Hook integration is exercised by handleVoiceCookCommand's unit tests
// + manual verification; the screen test just needs stable stubs.
jest.mock('../../hooks/useVoiceInput', () => ({
  useVoiceInput: () => ({
    isListening: false,
    transcript: '',
    interimTranscript: '',
    error: null,
    hasPermission: true,
    isAvailable: true,
    startListening: jest.fn(),
    stopListening: jest.fn(),
    clearTranscript: jest.fn(),
  }),
}));
jest.mock('../../hooks/useVoicePlayback', () => ({
  useVoicePlayback: () => ({
    isPlaying: false,
    speak: jest.fn(),
    pause: jest.fn(),
    stop: jest.fn(),
  }),
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CookStepScreen from '../../app/cook-step';
import { recipeApi } from '../../lib/api/recipe';
import { router, useLocalSearchParams } from 'expo-router';

const mockGetRecipe = recipeApi.getRecipe as jest.Mock;
const mockBack = router.back as jest.Mock;
const mockUseLocalSearchParams = useLocalSearchParams as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseLocalSearchParams.mockReturnValue({ recipeId: 'rcp_test' });
});

describe('<CookStepScreen />', () => {
  it('loads the recipe + renders step 1; Next advances; Close calls router.back', async () => {
    mockGetRecipe.mockResolvedValue({
      data: {
        title: 'Pizza Margherita',
        imageUrl: 'https://example.com/p.jpg',
        instructions: [
          { text: 'Mix dough.', step: 1 },
          { text: 'Top + bake.', step: 2 },
        ],
      },
    });
    const { findByText, getByLabelText } = render(<CookStepScreen />);
    // Step 1 visible after fetch
    expect(await findByText('Mix dough.')).toBeTruthy();
    // Footer "Step N of M" handled by CookStepCard internally via its
    // step counter; here we assert by stepping forward.
    fireEvent.press(getByLabelText('Next step'));
    expect(await findByText('Top + bake.')).toBeTruthy();
    // Close → router.back
    fireEvent.press(getByLabelText('Close'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('accepts string instructions and treats final step as completion target', async () => {
    mockGetRecipe.mockResolvedValue({
      data: {
        title: 'Single-step',
        instructions: ['Just one thing.'],
      },
    });
    const { findByText, getByLabelText } = render(<CookStepScreen />);
    expect(await findByText('Just one thing.')).toBeTruthy();
    // Last step → Next becomes Finish (CookStepCard contract: isLast).
    expect(getByLabelText('Finish cooking')).toBeTruthy();
  });

  it('shows a graceful error when fetch fails', async () => {
    mockGetRecipe.mockRejectedValue(new Error('network'));
    const { findByText } = render(<CookStepScreen />);
    expect(await findByText(/couldn.?t load/i)).toBeTruthy();
  });

  it('shows a graceful message when recipeId AND adhocId are both missing', () => {
    mockUseLocalSearchParams.mockReturnValue({});
    const { getByText } = render(<CookStepScreen />);
    expect(getByText(/no recipe/i)).toBeTruthy();
  });

  // Founder bug 2026-05-20: AI-gen recipes have no catalog id, so the
  // launch modal's "Start cooking" now stashes the full payload and
  // navigates with ?adhocId. /cook-step hydrates from the stash —
  // NO network call. Previously this path was inert ("Start cooking
  // does nothing").
  it('adhocId path: hydrates from the in-process stash with no network call', async () => {
    const { setAdhocRecipe } = require('../../lib/coach/adhocRecipeStash');
    setAdhocRecipe('adhoc_test_1', {
      title: 'Grilled Chicken (adhoc)',
      description: 'AI gen.',
      baseServings: 2,
      ingredients: [{ name: 'chicken', amount: 1, unit: 'lb' }],
      steps: ['Pat chicken dry.', 'Grill for 8 minutes per side.'],
    });
    mockUseLocalSearchParams.mockReturnValue({ adhocId: 'adhoc_test_1' });

    const { findByText } = render(<CookStepScreen />);
    expect(await findByText('Pat chicken dry.')).toBeTruthy();
    // No backend call should have fired.
    expect(mockGetRecipe).not.toHaveBeenCalled();
  });

  it('adhocId path: gracefully errors when the stash has no entry for the id', async () => {
    mockUseLocalSearchParams.mockReturnValue({ adhocId: 'adhoc_missing' });
    const { findByText } = render(<CookStepScreen />);
    expect(await findByText(/couldn.?t load/i)).toBeTruthy();
    expect(mockGetRecipe).not.toHaveBeenCalled();
  });

  // Y-Live-3 — durations in step prose become tappable inline timer
  // chips (StepWithTimers, PR #25). Temps / sizes (°F, "1-inch") stay
  // plain by construction.
  it('renders an inline timer chip when the step prose contains a duration', async () => {
    mockGetRecipe.mockResolvedValue({
      data: {
        title: 'Roast',
        instructions: ['Roast at 400°F for 30 minutes.'],
      },
    });
    const { findByLabelText, queryByText } = render(<CookStepScreen />);
    // Chip label from StepWithTimers — "<minutes> minute <action> timer".
    expect(await findByLabelText(/30 minute .*timer/i)).toBeTruthy();
    // "400°F" is not a duration → no second chip
    expect(queryByText(/400 minute/i)).toBeNull();
  });
});
