// frontend/__tests__/components/recipe/PlateMenuExportButton.test.tsx
// Group 10X Phase 9 — PDF "build-your-own" menu export from a saved plate.

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

jest.mock('../../../components/ui/BrandButton', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ label, onPress, testID, accessibilityLabel, loading, disabled }: any) => (
      <TouchableOpacity
        testID={testID}
        onPress={onPress}
        disabled={disabled || loading}
        accessibilityLabel={accessibilityLabel ?? label}
      >
        <Text>{loading ? 'Working…' : label}</Text>
      </TouchableOpacity>
    ),
  };
});

jest.mock('../../../components/mascot/Sazon', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ motion, fx }: any) => (
      <View
        testID="sazon-mascot-toast"
        // @ts-ignore — test-only props
        data-motion={motion}
        data-fx={(fx ?? []).join(',')}
      />
    ),
  };
});

jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import PlateMenuExportButton, { PlateMenuPlate } from '../../../components/recipe/PlateMenuExportButton';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const mockPrintToFile = Print.printToFileAsync as jest.Mock;
const mockShareAsync = Sharing.shareAsync as jest.Mock;
const mockIsAvailable = Sharing.isAvailableAsync as jest.Mock;

const samplePlate: PlateMenuPlate = {
  id: 'plate-1',
  title: 'Mediterranean Bowl',
  components: [
    {
      slot: 'protein',
      label: 'Protein',
      variants: [
        { id: 'salmon', name: 'Salmon', portionGrams: 150 },
        { id: 'tofu', name: 'Tofu', portionGrams: 200 },
      ],
    },
    {
      slot: 'base',
      label: 'Base',
      variants: [{ id: 'farro', name: 'Farro', portionGrams: 100 }],
    },
    {
      slot: 'vegetable',
      label: 'Vegetable',
      variants: [{ id: 'carrots', name: 'Roasted carrots', portionGrams: 120 }],
    },
  ],
  totalCalories: 580,
  totalProtein: 38,
  totalCarbs: 47,
  totalFat: 22,
};

describe('PlateMenuExportButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAvailable.mockResolvedValue(true);
    mockShareAsync.mockResolvedValue(undefined);
    mockPrintToFile.mockResolvedValue({ uri: 'file:///mock/menu.pdf' });
  });

  it('renders the "Export as menu" button with an a11y label', () => {
    const { getByTestId, getByText } = render(<PlateMenuExportButton plate={samplePlate} />);
    expect(getByTestId('plate-menu-export-button')).toBeTruthy();
    expect(getByText(/export as menu/i)).toBeTruthy();
  });

  it('tapping the button calls Print.printToFileAsync with HTML containing each slot column', async () => {
    const { getByTestId } = render(<PlateMenuExportButton plate={samplePlate} />);
    fireEvent.press(getByTestId('plate-menu-export-button'));

    await waitFor(() => expect(mockPrintToFile).toHaveBeenCalledTimes(1));

    const arg = mockPrintToFile.mock.calls[0][0];
    expect(arg).toHaveProperty('html');
    const html: string = arg.html;
    expect(html).toContain('Pick a Protein');
    expect(html).toContain('Pick a Base');
    expect(html).toContain('Pick a Vegetable');
    expect(html).toContain('Salmon');
    expect(html).toContain('Tofu');
    expect(html).toContain('Farro');
    // Sazon-branded header eyebrow + macros footer
    expect(html.toLowerCase()).toContain('menu');
    expect(html).toContain('580'); // calorie total in footer
  });

  it('after PDF generates, calls Sharing.shareAsync with the returned uri', async () => {
    const { getByTestId } = render(<PlateMenuExportButton plate={samplePlate} />);
    fireEvent.press(getByTestId('plate-menu-export-button'));

    await waitFor(() => expect(mockShareAsync).toHaveBeenCalledTimes(1));
    expect(mockShareAsync).toHaveBeenCalledWith(
      'file:///mock/menu.pdf',
      expect.objectContaining({ mimeType: 'application/pdf' }),
    );
  });

  it('renders a chef-kiss Sazon success toast after the share sheet returns', async () => {
    const { getByTestId, queryByTestId, findByText } = render(<PlateMenuExportButton plate={samplePlate} />);

    expect(queryByTestId('plate-menu-export-toast')).toBeNull();

    await act(async () => {
      fireEvent.press(getByTestId('plate-menu-export-button'));
    });

    await waitFor(() => expect(mockShareAsync).toHaveBeenCalled());

    const toast = await findByText(/your menu is ready to share/i);
    expect(toast).toBeTruthy();

    const mascot = getByTestId('sazon-mascot-toast');
    // chef-kiss config = motion 'kiss' + 'hearts' fx
    expect(mascot.props['data-motion']).toBe('kiss');
    expect(mascot.props['data-fx']).toContain('hearts');
  });

  it('does not call Sharing.shareAsync when sharing is unavailable on this device', async () => {
    mockIsAvailable.mockResolvedValue(false);
    const { getByTestId } = render(<PlateMenuExportButton plate={samplePlate} />);

    fireEvent.press(getByTestId('plate-menu-export-button'));

    await waitFor(() => expect(mockPrintToFile).toHaveBeenCalled());
    expect(mockShareAsync).not.toHaveBeenCalled();
  });

  it('does not call expo-print twice when tapped while a previous export is in flight', async () => {
    let resolver: (v: any) => void = () => {};
    mockPrintToFile.mockReturnValueOnce(new Promise((r) => { resolver = r; }));

    const { getByTestId } = render(<PlateMenuExportButton plate={samplePlate} />);

    fireEvent.press(getByTestId('plate-menu-export-button'));
    fireEvent.press(getByTestId('plate-menu-export-button'));

    expect(mockPrintToFile).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolver({ uri: 'file:///mock/menu.pdf' });
    });
    await waitFor(() => expect(mockShareAsync).toHaveBeenCalled());
  });
});
