// Build-a-Plate Phase 10 — CustomItemSheet tests.
// See plans/product.md#build-a-plate Phase 10 spec.

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

const mockEstimate = jest.fn();
jest.mock('../../../lib/api', () => ({
  mealComponentApi: {
    estimateMacros: (...a: unknown[]) => mockEstimate(...a),
  },
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ isDark: false }),
}));

// BottomSheet is gorhom-backed and not usable in jest — stub it to a plain View
// so the inner content renders.
jest.mock('../../../components/ui/BottomSheet', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: function MockBottomSheet({ visible, children }: any) {
      if (!visible) return null;
      return <View testID="mock-bottom-sheet">{children}</View>;
    },
  };
});

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

jest.mock('../../../components/ui/LoadingState', () => {
  const { View } = require('react-native');
  return function MockLoadingState() {
    return <View testID="loading-state" />;
  };
});

import CustomItemSheet from '../../../components/build-a-plate/CustomItemSheet';

const usdaResult = {
  caloriesPerPortion: 320,
  proteinG: 4,
  carbsG: 17,
  fatG: 29,
  fiberG: 13,
  source: 'usda' as const,
  confidence: 'high' as const,
};

const aiResult = {
  caloriesPerPortion: 180,
  proteinG: 22,
  carbsG: 2,
  fatG: 9,
  fiberG: 0,
  source: 'ai' as const,
  confidence: 'estimated' as const,
};

const fallbackResult = {
  caloriesPerPortion: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  fiberG: 0,
  source: 'fallback' as const,
  confidence: 'unknown' as const,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockEstimate.mockResolvedValue({ data: usdaResult });
});

const baseProps = {
  visible: true,
  slot: 'vegetable' as const,
  initialName: 'Hass avocado',
  onAdd: jest.fn(),
  onClose: jest.fn(),
};

describe('CustomItemSheet', () => {
  it('renders with the prefilled name', () => {
    const { getByTestId } = render(<CustomItemSheet {...baseProps} />);
    expect(getByTestId('custom-item-sheet-name-input').props.value).toBe('Hass avocado');
  });

  it('calls /api/macros/estimate with name + portion + slot when Estimate is tapped', async () => {
    const { getByTestId } = render(<CustomItemSheet {...baseProps} />);
    fireEvent.press(getByTestId('custom-item-sheet-estimate-btn'));
    await waitFor(() => {
      expect(mockEstimate).toHaveBeenCalledWith({
        name: 'Hass avocado',
        portionGrams: 100,
        slot: 'vegetable',
      });
    });
  });

  it('renders the USDA badge for source "usda"', async () => {
    const { getByTestId } = render(<CustomItemSheet {...baseProps} />);
    fireEvent.press(getByTestId('custom-item-sheet-estimate-btn'));
    await waitFor(() => {
      expect(getByTestId('custom-item-sheet-source-usda')).toBeTruthy();
    });
  });

  it('renders the "Estimated by Sazon" badge for source "ai"', async () => {
    mockEstimate.mockResolvedValueOnce({ data: aiResult });
    const { getByTestId } = render(<CustomItemSheet {...baseProps} />);
    fireEvent.press(getByTestId('custom-item-sheet-estimate-btn'));
    await waitFor(() => {
      expect(getByTestId('custom-item-sheet-source-ai')).toBeTruthy();
    });
  });

  it('renders the fallback badge for source "fallback"', async () => {
    mockEstimate.mockResolvedValueOnce({ data: fallbackResult });
    const { getByTestId } = render(<CustomItemSheet {...baseProps} />);
    fireEvent.press(getByTestId('custom-item-sheet-estimate-btn'));
    await waitFor(() => {
      expect(getByTestId('custom-item-sheet-source-fallback')).toBeTruthy();
    });
  });

  it('Add-to-plate fires onAdd with the estimated MealComponent', async () => {
    const onAdd = jest.fn();
    const { getByTestId } = render(<CustomItemSheet {...baseProps} onAdd={onAdd} />);
    fireEvent.press(getByTestId('custom-item-sheet-estimate-btn'));
    await waitFor(() => getByTestId('custom-item-sheet-add-btn'));
    fireEvent.press(getByTestId('custom-item-sheet-add-btn'));
    expect(onAdd).toHaveBeenCalledTimes(1);
    const passed = onAdd.mock.calls[0][0];
    expect(passed.slot).toBe('vegetable');
    expect(passed.name).toBe('Hass avocado');
    expect(passed.defaultPortionGrams).toBe(100);
    expect(passed.caloriesPerPortion).toBe(320);
    expect(passed.proteinG).toBe(4);
    expect(passed.fatG).toBe(29);
    expect(passed.fiberG).toBe(13);
  });

  it('disables Estimate when portion is zero or negative', () => {
    const { getByTestId } = render(<CustomItemSheet {...baseProps} />);
    fireEvent.changeText(getByTestId('custom-item-sheet-portion-input'), '0');
    fireEvent.press(getByTestId('custom-item-sheet-estimate-btn'));
    expect(mockEstimate).not.toHaveBeenCalled();
  });

  it('disables Estimate when name is empty', () => {
    const { getByTestId } = render(<CustomItemSheet {...baseProps} initialName="" />);
    fireEvent.press(getByTestId('custom-item-sheet-estimate-btn'));
    expect(mockEstimate).not.toHaveBeenCalled();
  });

  it('surfaces an error message when the estimate request rejects', async () => {
    mockEstimate.mockRejectedValueOnce(new Error('Network down'));
    const { getByTestId } = render(<CustomItemSheet {...baseProps} />);
    fireEvent.press(getByTestId('custom-item-sheet-estimate-btn'));
    await waitFor(() => {
      expect(getByTestId('custom-item-sheet-error')).toBeTruthy();
    });
  });

  it('uses the user-entered portion when re-estimating', async () => {
    const { getByTestId } = render(<CustomItemSheet {...baseProps} />);
    fireEvent.changeText(getByTestId('custom-item-sheet-portion-input'), '250');
    fireEvent.press(getByTestId('custom-item-sheet-estimate-btn'));
    await waitFor(() => {
      expect(mockEstimate).toHaveBeenCalledWith({
        name: 'Hass avocado',
        portionGrams: 250,
        slot: 'vegetable',
      });
    });
  });

  // Phase 10 v2 — unit picker
  describe('unit picker', () => {
    it('switches to "1 medium" → sends ~150g to the API', async () => {
      const { getByTestId } = render(<CustomItemSheet {...baseProps} />);
      fireEvent.press(getByTestId('custom-item-sheet-unit-medium'));
      fireEvent.press(getByTestId('custom-item-sheet-estimate-btn'));
      await waitFor(() => {
        expect(mockEstimate).toHaveBeenCalledWith({
          name: 'Hass avocado',
          portionGrams: 150,
          slot: 'vegetable',
        });
      });
    });

    it('switches to "1 cup" → sends 240g to the API', async () => {
      const { getByTestId } = render(<CustomItemSheet {...baseProps} />);
      fireEvent.press(getByTestId('custom-item-sheet-unit-cup'));
      fireEvent.press(getByTestId('custom-item-sheet-estimate-btn'));
      await waitFor(() => {
        expect(mockEstimate).toHaveBeenCalledWith({
          name: 'Hass avocado',
          portionGrams: 240,
          slot: 'vegetable',
        });
      });
    });

    it('switches to "1 tbsp" → sends 15g to the API', async () => {
      const { getByTestId } = render(<CustomItemSheet {...baseProps} />);
      fireEvent.press(getByTestId('custom-item-sheet-unit-tbsp'));
      fireEvent.press(getByTestId('custom-item-sheet-estimate-btn'));
      await waitFor(() => {
        expect(mockEstimate).toHaveBeenCalledWith({
          name: 'Hass avocado',
          portionGrams: 15,
          slot: 'vegetable',
        });
      });
    });

    it('switches to "oz" → multiplies by 28.35 grams per oz', async () => {
      const { getByTestId } = render(<CustomItemSheet {...baseProps} />);
      fireEvent.press(getByTestId('custom-item-sheet-unit-oz'));
      // The unit switch resets the count to a sensible default (3 oz ≈ 85g);
      // we let the default ride to verify the multiplication math.
      fireEvent.press(getByTestId('custom-item-sheet-estimate-btn'));
      await waitFor(() => {
        const call = mockEstimate.mock.calls[0][0];
        expect(call.slot).toBe('vegetable');
        // 3 × 28.35 = 85.05; rounding is fine.
        expect(call.portionGrams).toBeCloseTo(85.05, 1);
      });
    });
  });

  // Phase 10 v2 — manual edit toggle
  describe('manual edit toggle', () => {
    it('reveals editable macro inputs seeded with estimate values', async () => {
      const { getByTestId } = render(<CustomItemSheet {...baseProps} />);
      fireEvent.press(getByTestId('custom-item-sheet-estimate-btn'));
      await waitFor(() => getByTestId('custom-item-sheet-add-btn'));
      fireEvent.press(getByTestId('custom-item-sheet-edit-toggle'));
      expect(getByTestId('custom-item-sheet-edit-grid')).toBeTruthy();
      // Seeded from usdaResult (320 cal, 4g protein, etc.)
      expect(getByTestId('custom-item-sheet-edit-caloriesPerPortion').props.value).toBe('320');
      expect(getByTestId('custom-item-sheet-edit-proteinG').props.value).toBe('4');
    });

    it('Add-to-plate honors manually edited macros (overrides win)', async () => {
      const onAdd = jest.fn();
      const { getByTestId } = render(<CustomItemSheet {...baseProps} onAdd={onAdd} />);
      fireEvent.press(getByTestId('custom-item-sheet-estimate-btn'));
      await waitFor(() => getByTestId('custom-item-sheet-add-btn'));
      fireEvent.press(getByTestId('custom-item-sheet-edit-toggle'));
      fireEvent.changeText(getByTestId('custom-item-sheet-edit-caloriesPerPortion'), '500');
      fireEvent.changeText(getByTestId('custom-item-sheet-edit-proteinG'), '40');
      fireEvent.press(getByTestId('custom-item-sheet-add-btn'));
      const passed = onAdd.mock.calls[0][0];
      expect(passed.caloriesPerPortion).toBe(500);
      expect(passed.proteinG).toBe(40);
      // Untouched fields keep the estimate.
      expect(passed.fatG).toBe(29);
      expect(passed.fiberG).toBe(13);
    });

    it('toggling back to "Use estimate" reverts to API values on add', async () => {
      const onAdd = jest.fn();
      const { getByTestId } = render(<CustomItemSheet {...baseProps} onAdd={onAdd} />);
      fireEvent.press(getByTestId('custom-item-sheet-estimate-btn'));
      await waitFor(() => getByTestId('custom-item-sheet-add-btn'));
      fireEvent.press(getByTestId('custom-item-sheet-edit-toggle'));
      fireEvent.changeText(getByTestId('custom-item-sheet-edit-caloriesPerPortion'), '999');
      fireEvent.press(getByTestId('custom-item-sheet-edit-toggle')); // toggle off
      fireEvent.press(getByTestId('custom-item-sheet-add-btn'));
      const passed = onAdd.mock.calls[0][0];
      expect(passed.caloriesPerPortion).toBe(320);
    });
  });
});
