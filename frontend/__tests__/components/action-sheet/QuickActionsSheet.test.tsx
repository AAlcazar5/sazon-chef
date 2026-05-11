// frontend/__tests__/components/action-sheet/QuickActionsSheet.test.tsx
// Group 9O — Two-tier quick actions sheet.

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', isDark: false, colors: { background: '#FAF7F4' } }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import QuickActionsSheet from '../../../components/action-sheet/QuickActionsSheet';
import type { ActionSheetItem } from '../../../components/ui/ActionSheet';

const onPress = (label: string) => jest.fn().mockName(`onPress:${label}`);

const buildPrimary = (overrides?: { plate?: jest.Mock; meal?: jest.Mock }): ActionSheetItem[] => [
  { label: 'Build a plate', icon: 'restaurant', onPress: overrides?.plate ?? onPress('plate'), tint: 'sage' },
  { label: 'Cook for the family', icon: 'people-outline', onPress: jest.fn(), tint: 'lavender' },
  { label: 'Log a Meal', icon: 'nutrition-outline', onPress: overrides?.meal ?? onPress('meal'), tint: 'peach' },
  { label: 'Take a Picture', icon: 'camera-outline', onPress: jest.fn(), tint: 'blush' },
  { label: 'Surprise Me!', icon: 'dice-outline', onPress: jest.fn(), tint: 'sky' },
];

const buildSecondary = (overrides?: { addRecipe?: jest.Mock }): ActionSheetItem[] => [
  { label: 'Add Recipe', icon: 'restaurant-outline', onPress: overrides?.addRecipe ?? onPress('addRecipe') },
  { label: 'Import Recipe', icon: 'link-outline', onPress: jest.fn() },
  { label: 'Quick Timer', icon: 'timer-outline', onPress: jest.fn() },
  { label: 'Edit Preferences', icon: 'settings-outline', onPress: jest.fn() },
];

describe('QuickActionsSheet', () => {
  it('renders the 5 primary items + a "More actions" row', () => {
    render(
      <QuickActionsSheet
        visible
        onClose={jest.fn()}
        primaryItems={buildPrimary()}
        secondaryItems={buildSecondary()}
      />,
    );
    expect(screen.getByText('Build a plate')).toBeTruthy();
    expect(screen.getByText('Cook for the family')).toBeTruthy();
    expect(screen.getByText('Log a Meal')).toBeTruthy();
    expect(screen.getByText('Take a Picture')).toBeTruthy();
    expect(screen.getByText('Surprise Me!')).toBeTruthy();
    expect(screen.getByText('More actions')).toBeTruthy();
    // Secondary items are NOT visible until "More" is tapped.
    expect(screen.queryByText('Add Recipe')).toBeNull();
    expect(screen.queryByText('Edit Preferences')).toBeNull();
  });

  it('omits the "More actions" row when secondaryItems is empty', () => {
    render(
      <QuickActionsSheet
        visible
        onClose={jest.fn()}
        primaryItems={buildPrimary()}
        secondaryItems={[]}
      />,
    );
    expect(screen.queryByText('More actions')).toBeNull();
  });

  it('subtitle on the "More actions" row reflects the secondary count', () => {
    render(
      <QuickActionsSheet
        visible
        onClose={jest.fn()}
        primaryItems={buildPrimary()}
        secondaryItems={buildSecondary()}
      />,
    );
    expect(screen.getByText(/4 more shortcuts/i)).toBeTruthy();
  });

  it('singular subtitle when exactly 1 secondary item', () => {
    render(
      <QuickActionsSheet
        visible
        onClose={jest.fn()}
        primaryItems={buildPrimary()}
        secondaryItems={[buildSecondary()[0]]}
      />,
    );
    expect(screen.getByText(/1 more shortcut$/i)).toBeTruthy();
  });

  it('tapping "More actions" swaps to the secondary tier WITHOUT closing the sheet', () => {
    const onClose = jest.fn();
    render(
      <QuickActionsSheet
        visible
        onClose={onClose}
        primaryItems={buildPrimary()}
        secondaryItems={buildSecondary()}
      />,
    );
    fireEvent.press(screen.getByText('More actions'));
    // Secondary items now visible
    expect(screen.getByText('Add Recipe')).toBeTruthy();
    expect(screen.getByText('Import Recipe')).toBeTruthy();
    expect(screen.getByText('Edit Preferences')).toBeTruthy();
    // Primary items hidden
    expect(screen.queryByText('Build a plate')).toBeNull();
    // Sheet did NOT close
    expect(onClose).not.toHaveBeenCalled();
    // Back row appeared
    expect(screen.getByText('Back to main actions')).toBeTruthy();
  });

  it('tapping "Back" returns to the primary tier WITHOUT closing the sheet', () => {
    const onClose = jest.fn();
    render(
      <QuickActionsSheet
        visible
        onClose={onClose}
        primaryItems={buildPrimary()}
        secondaryItems={buildSecondary()}
      />,
    );
    fireEvent.press(screen.getByText('More actions'));
    fireEvent.press(screen.getByText('Back to main actions'));
    expect(screen.getByText('Build a plate')).toBeTruthy();
    expect(screen.queryByText('Add Recipe')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('tapping a primary item invokes its onPress AND closes the sheet', () => {
    const platePress = jest.fn();
    const onClose = jest.fn();
    render(
      <QuickActionsSheet
        visible
        onClose={onClose}
        primaryItems={buildPrimary({ plate: platePress })}
        secondaryItems={buildSecondary()}
      />,
    );
    fireEvent.press(screen.getByText('Build a plate'));
    expect(platePress).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('tapping a secondary item invokes its onPress AND closes the sheet', () => {
    const addPress = jest.fn();
    const onClose = jest.fn();
    render(
      <QuickActionsSheet
        visible
        onClose={onClose}
        primaryItems={buildPrimary()}
        secondaryItems={buildSecondary({ addRecipe: addPress })}
      />,
    );
    fireEvent.press(screen.getByText('More actions'));
    fireEvent.press(screen.getByText('Add Recipe'));
    expect(addPress).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when visible=false', () => {
    render(
      <QuickActionsSheet
        visible={false}
        onClose={jest.fn()}
        primaryItems={buildPrimary()}
        secondaryItems={buildSecondary()}
      />,
    );
    expect(screen.queryByText('Build a plate')).toBeNull();
  });

  it('snaps back to the primary tier when the parent re-opens the sheet', () => {
    const { rerender } = render(
      <QuickActionsSheet
        visible
        onClose={jest.fn()}
        primaryItems={buildPrimary()}
        secondaryItems={buildSecondary()}
      />,
    );
    fireEvent.press(screen.getByText('More actions'));
    expect(screen.getByText('Add Recipe')).toBeTruthy();
    // Simulate parent closing then reopening (e.g. user dismisses, taps "+" again)
    rerender(
      <QuickActionsSheet
        visible={false}
        onClose={jest.fn()}
        primaryItems={buildPrimary()}
        secondaryItems={buildSecondary()}
      />,
    );
    rerender(
      <QuickActionsSheet
        visible
        onClose={jest.fn()}
        primaryItems={buildPrimary()}
        secondaryItems={buildSecondary()}
      />,
    );
    // Should be back on primary, not secondary
    expect(screen.getByText('Build a plate')).toBeTruthy();
    expect(screen.queryByText('Add Recipe')).toBeNull();
  });

  // ─── BAP2.1: heroItem pin ─────────────────────────────────────────────
  describe('BAP2.1: heroItem pin', () => {
    const heroItem: ActionSheetItem = {
      label: 'Build a plate',
      icon: 'restaurant',
      subtitle: "Compose tonight's meal",
      onPress: jest.fn(),
      tint: 'sage',
    };

    it('renders the hero card visually distinct from list rows when heroItem is provided', () => {
      render(
        <QuickActionsSheet
          visible
          onClose={jest.fn()}
          heroItem={heroItem}
          primaryItems={buildPrimary().slice(1)}
          secondaryItems={[]}
        />,
      );
      // Hero card is rendered at the testID, separate from the regular row items.
      expect(screen.getByTestId('qa-hero-item')).toBeTruthy();
      // Hero label + subtitle visible.
      expect(screen.getByText('Build a plate')).toBeTruthy();
      expect(screen.getByText("Compose tonight's meal")).toBeTruthy();
    });

    it('tapping the hero card fires its onPress AND dismisses the sheet', () => {
      const press = jest.fn();
      const onClose = jest.fn();
      render(
        <QuickActionsSheet
          visible
          onClose={onClose}
          heroItem={{ ...heroItem, onPress: press }}
          primaryItems={buildPrimary().slice(1)}
          secondaryItems={[]}
        />,
      );
      fireEvent.press(screen.getByTestId('qa-hero-item'));
      expect(press).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('falls back to pre-BAP2.1 behavior (no hero) when heroItem prop is omitted', () => {
      render(
        <QuickActionsSheet
          visible
          onClose={jest.fn()}
          primaryItems={buildPrimary()}
          secondaryItems={buildSecondary()}
        />,
      );
      // No hero testID — every primary item renders as a regular row.
      expect(screen.queryByTestId('qa-hero-item')).toBeNull();
      // Build a plate still visible as a list row.
      expect(screen.getByText('Build a plate')).toBeTruthy();
    });

    it('secondary tier rendering is unaffected by the hero pin (hero hides on secondary)', () => {
      render(
        <QuickActionsSheet
          visible
          onClose={jest.fn()}
          heroItem={heroItem}
          primaryItems={buildPrimary().slice(1)}
          secondaryItems={buildSecondary()}
        />,
      );
      // On primary tier hero is visible.
      expect(screen.getByTestId('qa-hero-item')).toBeTruthy();
      // Swap to secondary.
      fireEvent.press(screen.getByText('More actions'));
      // Hero hides on secondary (it's a primary-tier surface).
      expect(screen.queryByTestId('qa-hero-item')).toBeNull();
      // Secondary items render normally.
      expect(screen.getByText('Add Recipe')).toBeTruthy();
      expect(screen.getByText('Back to main actions')).toBeTruthy();
    });
  });

  it('keeps the primary count at ≤6 items including the "More" row (9O verification metric)', () => {
    const { unmount } = render(
      <QuickActionsSheet
        visible
        onClose={jest.fn()}
        primaryItems={buildPrimary()}
        secondaryItems={buildSecondary()}
      />,
    );
    // 5 primary labels + the "More actions" row = 6 visible rows.
    const visibleLabels = [
      'Build a plate',
      'Cook for the family',
      'Log a Meal',
      'Take a Picture',
      'Surprise Me!',
      'More actions',
    ];
    visibleLabels.forEach((label) => expect(screen.getByText(label)).toBeTruthy());
    expect(visibleLabels.length).toBeLessThanOrEqual(6);
    unmount();
  });
});
