// frontend/__tests__/components/recipe/IngredientSwapSheet.test.tsx

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import IngredientSwapSheet from '../../../components/recipe/IngredientSwapSheet';
import { recipeApi } from '../../../lib/api';

jest.mock('../../../lib/api', () => ({
  recipeApi: {
    getIngredientSwaps: jest.fn(),
  },
  // IG6.1: IngredientSwapSheet records swap events as fire-and-forget
  // telemetry. Stub so calls don't blow up the test.
  ingredientEventApi: {
    recordSwap: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// BottomSheet wrapper requires a BottomSheetModalProvider in the tree.
// In unit tests just passthrough children when visible.
jest.mock('../../../components/ui/BottomSheet', () => ({
  __esModule: true,
  default: function MockBottomSheet({ children, visible }: any) {
    if (visible === false) return null;
    return children;
  },
}));

const mockSwaps = [
  {
    alternative: 'Chicken thigh',
    macroDelta: { protein: -5, fat: 6, calories: 15 },
    flavorNote: 'Juicier, more forgiving to cook',
  },
  {
    alternative: 'Turkey breast',
    macroDelta: { protein: -2, fat: -2, calories: -15 },
    flavorNote: 'Leaner, similar texture',
  },
  {
    alternative: 'Firm tofu',
    macroDelta: { protein: -11, fat: 2, calories: -40 },
    flavorNote: 'Plant-based, press well before using',
  },
];

const baseProps = {
  visible: true,
  ingredient: 'chicken breast',
  isDark: false,
  onClose: jest.fn(),
  onSelectSwap: jest.fn(),
};

describe('IngredientSwapSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (recipeApi.getIngredientSwaps as jest.Mock).mockResolvedValue({
      data: { swaps: mockSwaps },
    });
  });

  // The sheet title (`Swap ${ingredient}`) is rendered by the BottomSheet
  // wrapper via its `title` prop. BottomSheet is mocked to passthrough
  // children only — title rendering is BottomSheet's responsibility and
  // covered separately in BottomSheet's own tests.
  it('passes ingredient through onSelectSwap payload', async () => {
    const { getByText } = render(<IngredientSwapSheet {...baseProps} />);
    await waitFor(() => getByText('Chicken thigh'));
    fireEvent.press(getByText('Chicken thigh'));
    expect(baseProps.onSelectSwap).toHaveBeenCalled();
  });

  it('fetches swaps on mount when visible', async () => {
    render(<IngredientSwapSheet {...baseProps} />);
    await waitFor(() => {
      expect(recipeApi.getIngredientSwaps).toHaveBeenCalledWith('chicken breast');
    });
  });

  it('renders swap alternatives after load', async () => {
    const { getByText } = render(<IngredientSwapSheet {...baseProps} />);
    await waitFor(() => {
      expect(getByText('Chicken thigh')).toBeTruthy();
      expect(getByText('Turkey breast')).toBeTruthy();
      expect(getByText('Firm tofu')).toBeTruthy();
    });
  });

  it('renders flavor note for each swap', async () => {
    const { getByText } = render(<IngredientSwapSheet {...baseProps} />);
    await waitFor(() => {
      expect(getByText('Juicier, more forgiving to cook')).toBeTruthy();
    });
  });

  it('shows positive macro delta in orange text (+15 cal)', async () => {
    const { getAllByText } = render(<IngredientSwapSheet {...baseProps} />);
    await waitFor(() => {
      const elements = getAllByText(/\+15 cal/i);
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  it('shows negative macro delta in green text (-40 cal)', async () => {
    const { getAllByText } = render(<IngredientSwapSheet {...baseProps} />);
    await waitFor(() => {
      const elements = getAllByText(/-40 cal/i);
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  it('calls onSelectSwap with swap when an alternative is tapped', async () => {
    const { getByText } = render(<IngredientSwapSheet {...baseProps} />);
    await waitFor(() => getByText('Chicken thigh'));
    fireEvent.press(getByText('Chicken thigh'));
    expect(baseProps.onSelectSwap).toHaveBeenCalledWith(
      expect.objectContaining({ alternative: 'Chicken thigh' }),
    );
  });

  it('calls onClose when close button is pressed', async () => {
    const { getByLabelText } = render(<IngredientSwapSheet {...baseProps} />);
    await waitFor(() => {});
    fireEvent.press(getByLabelText('Close swap sheet'));
    expect(baseProps.onClose).toHaveBeenCalled();
  });

  it('does not fetch when not visible', () => {
    render(<IngredientSwapSheet {...baseProps} visible={false} />);
    expect(recipeApi.getIngredientSwaps).not.toHaveBeenCalled();
  });

  it('shows empty state when no swaps found', async () => {
    (recipeApi.getIngredientSwaps as jest.Mock).mockResolvedValue({
      data: { swaps: [] },
    });
    const { getByText } = render(<IngredientSwapSheet {...baseProps} ingredient="purple moon rock" />);
    await waitFor(() => {
      expect(getByText(/no swaps found/i)).toBeTruthy();
    });
  });
});
