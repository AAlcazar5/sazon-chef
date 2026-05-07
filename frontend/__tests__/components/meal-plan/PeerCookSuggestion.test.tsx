// frontend/__tests__/components/meal-plan/PeerCookSuggestion.test.tsx
// ROADMAP 4.0 WK11.1 — PeerCookSuggestion test.

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/mock'),
  createAnimatedComponent: (component: any) => component,
  useReducedMotion: () => false,
}));

import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import PeerCookSuggestion from '../../../components/meal-plan/PeerCookSuggestion';

const baseSuggestion = {
  recipeId: 'r-fesenjan',
  recipeName: 'Walnut-pomegranate fesenjan',
  friendName: 'Marcus',
  cookedOn: 'Tuesday',
  friendOptedInToShare: true,
};

describe('PeerCookSuggestion (WK11.1)', () => {
  it('renders when suggestion is present + slot is empty', () => {
    const { getByTestId } = renderWithProviders(
      <PeerCookSuggestion suggestion={baseSuggestion} slotIsEmpty />,
    );
    expect(getByTestId('peer-cook-suggestion')).toBeTruthy();
  });

  it('does not render when suggestion is undefined', () => {
    const { queryByTestId } = renderWithProviders(
      <PeerCookSuggestion suggestion={undefined} slotIsEmpty />,
    );
    expect(queryByTestId('peer-cook-suggestion')).toBeNull();
  });

  it('does not render when slot is not empty', () => {
    const { queryByTestId } = renderWithProviders(
      <PeerCookSuggestion suggestion={baseSuggestion} slotIsEmpty={false} />,
    );
    expect(queryByTestId('peer-cook-suggestion')).toBeNull();
  });

  it('renders friend name + cooked-on day in lifestyle copy', () => {
    const { getByText } = renderWithProviders(
      <PeerCookSuggestion suggestion={baseSuggestion} slotIsEmpty />,
    );
    expect(getByText(/Marcus made this Tuesday — want to try it\?/)).toBeTruthy();
  });

  it('anonymizes the chip when friendOptedInToShare === false', () => {
    const { getByText, queryByText } = renderWithProviders(
      <PeerCookSuggestion
        suggestion={{ ...baseSuggestion, friendOptedInToShare: false }}
        slotIsEmpty
      />,
    );
    expect(getByText(/A friend made this Tuesday/)).toBeTruthy();
    expect(queryByText(/Marcus/)).toBeNull();
  });

  it('tap on Add fires onAdd with the recipeId', () => {
    const onAdd = jest.fn();
    const { getByTestId } = renderWithProviders(
      <PeerCookSuggestion
        suggestion={baseSuggestion}
        slotIsEmpty
        onAdd={onAdd}
      />,
    );
    fireEvent.press(getByTestId('peer-cook-add'));
    expect(onAdd).toHaveBeenCalledWith('r-fesenjan');
  });

  it('renders the recipe name', () => {
    const { getByText } = renderWithProviders(
      <PeerCookSuggestion suggestion={baseSuggestion} slotIsEmpty />,
    );
    expect(getByText('Walnut-pomegranate fesenjan')).toBeTruthy();
  });

  it('a11y — Add button has button role + descriptive label', () => {
    const { getByTestId } = renderWithProviders(
      <PeerCookSuggestion suggestion={baseSuggestion} slotIsEmpty />,
    );
    const btn = getByTestId('peer-cook-add');
    expect(btn.props.accessibilityRole).toBe('button');
    expect(btn.props.accessibilityLabel).toContain('Walnut-pomegranate fesenjan');
  });

  it('does not crash when onAdd is omitted (defensive — caller may not have a handler yet)', () => {
    const { getByTestId } = renderWithProviders(
      <PeerCookSuggestion suggestion={baseSuggestion} slotIsEmpty />,
    );
    expect(() => fireEvent.press(getByTestId('peer-cook-add'))).not.toThrow();
  });

  it('does not use banned vocabulary in the copy', () => {
    const { getByText } = renderWithProviders(
      <PeerCookSuggestion suggestion={baseSuggestion} slotIsEmpty />,
    );
    const text = getByText(/Marcus/).props.children as string;
    expect(/under your goal|hit your target|warning|error/i.test(text)).toBe(false);
  });
});
