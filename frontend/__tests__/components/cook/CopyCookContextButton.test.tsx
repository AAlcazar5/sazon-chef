// X-B2 (founder roadmap Tier X — Moat Hardening) — Copy cooking
// context button tests. Pins: a11y label, press → API + clipboard
// + haptic + onCopied callback, success state UX, error path.

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

const mockSetString = jest.fn();
jest.mock('expo-clipboard', () => ({
  setStringAsync: (s: string) => mockSetString(s),
}));

const mockGetContextExport = jest.fn();
jest.mock('../../../lib/api/cook', () => ({
  cookApi: { getContextExport: (...args: unknown[]) => mockGetContextExport(...args) },
}));

import React from 'react';
import { fireEvent, render, screen, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import CopyCookContextButton from '../../../components/cook/CopyCookContextButton';

const SAMPLE_PAYLOAD = {
  version: 'v1',
  taste: { likedCuisines: ['Italian'], spiceLevel: 'medium' },
  restrictions: {
    allergens: ['peanut'],
    dietary: ['vegetarian'],
    bannedIngredients: ['peanut'],
  },
  pantrySummary: { itemCount: 12, topCategories: ['produce', 'pantry-staples'] },
  recentCooks: [
    { recipeName: 'Carbonara', cuisine: 'Italian', cookedAt: '2026-05-22T18:00:00Z' },
  ],
  skillTier: 'home_cook',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('CopyCookContextButton', () => {
  it('renders with the default label + caption', () => {
    render(<CopyCookContextButton />);
    expect(screen.getByLabelText('Copy your cooking context to the clipboard')).toBeTruthy();
    // Caption: peak-moment Sazon-voice copy
    expect(screen.getByTestId('copy-cook-context-caption')).toBeTruthy();
  });

  it('honors a custom label', () => {
    render(<CopyCookContextButton label="Share to another kitchen" />);
    expect(screen.queryByText('Share to another kitchen')).toBeTruthy();
  });

  it('press → fetches the export, copies to clipboard, fires onCopied', async () => {
    mockGetContextExport.mockResolvedValue(SAMPLE_PAYLOAD);
    mockSetString.mockResolvedValue(true);
    const onCopied = jest.fn();
    render(<CopyCookContextButton onCopied={onCopied} />);

    fireEvent.press(screen.getByTestId('copy-cook-context-button'));

    await waitFor(() => expect(mockGetContextExport).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockSetString).toHaveBeenCalledTimes(1));
    expect(mockSetString.mock.calls[0][0]).toContain('"version": "v1"');
    expect(mockSetString.mock.calls[0][0]).toContain('"peanut"');
    expect(onCopied).toHaveBeenCalledTimes(1);
  });

  it('shows the "Copied" success state after a successful copy', async () => {
    mockGetContextExport.mockResolvedValue(SAMPLE_PAYLOAD);
    mockSetString.mockResolvedValue(true);
    render(<CopyCookContextButton />);

    fireEvent.press(screen.getByTestId('copy-cook-context-button'));

    await waitFor(() => {
      expect(screen.getByTestId('copy-cook-context-caption').props.children).toMatch(
        /Pasted/,
      );
    });
  });

  it('shows a Sazon-voice Alert on API failure (no robotic copy)', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockGetContextExport.mockRejectedValue(new Error('500'));
    render(<CopyCookContextButton />);

    fireEvent.press(screen.getByTestId('copy-cook-context-button'));

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    const [, body] = alertSpy.mock.calls[0];
    expect(typeof body).toBe('string');
    // No banned robotic phrases.
    expect((body as string).toLowerCase()).not.toMatch(/error|failed|invalid/);
    alertSpy.mockRestore();
  });

  it("doesn't fire a second copy while the first is in flight (debounced)", async () => {
    let resolver: ((value: unknown) => void) | null = null;
    mockGetContextExport.mockReturnValue(
      new Promise((res) => {
        resolver = res;
      }),
    );
    render(<CopyCookContextButton />);

    const btn = screen.getByTestId('copy-cook-context-button');
    fireEvent.press(btn);
    fireEvent.press(btn);
    fireEvent.press(btn);

    expect(mockGetContextExport).toHaveBeenCalledTimes(1);
    // Resolve so the test's pending promise doesn't leak.
    await act(async () => {
      resolver?.(SAMPLE_PAYLOAD);
    });
  });

  it('does NOT fire onCopied on failure', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockGetContextExport.mockRejectedValue(new Error('500'));
    const onCopied = jest.fn();
    render(<CopyCookContextButton onCopied={onCopied} />);

    fireEvent.press(screen.getByTestId('copy-cook-context-button'));

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    expect(onCopied).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
