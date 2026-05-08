// IA2 follow-up — AskSazonAboutRecipePill rewires the recipe-detail
// "ask Sazon" entry from a route push (jump-out UX) to a SazonSheet
// open (stay-in-place UX).

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

const mockOpen = jest.fn();

jest.mock('../../../contexts/SazonSheetContext', () => ({
  useSazonSheet: () => ({ open: mockOpen, close: () => {}, isOpen: false }),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

import AskSazonAboutRecipePill from '../../../components/coach/AskSazonAboutRecipePill';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AskSazonAboutRecipePill', () => {
  it('renders with the brand-correct label', () => {
    const { getByText } = render(
      <AskSazonAboutRecipePill recipeTitle="Pesto Pasta" />,
    );
    expect(getByText('Ask Sazon about this recipe')).toBeTruthy();
  });

  it('a11y label uses Sazon (not Coach) and includes the recipe title', () => {
    const { getByLabelText } = render(
      <AskSazonAboutRecipePill recipeTitle="Pesto Pasta" />,
    );
    expect(getByLabelText('Ask Sazon about Pesto Pasta')).toBeTruthy();
  });

  it('tap opens SazonSheet with source=recipe_detail_pill + a recipe-context seed', () => {
    const { getByLabelText } = render(
      <AskSazonAboutRecipePill recipeTitle="Pesto Pasta" />,
    );
    fireEvent.press(getByLabelText('Ask Sazon about Pesto Pasta'));
    expect(mockOpen).toHaveBeenCalledTimes(1);
    const arg = mockOpen.mock.calls[0][0];
    expect(arg.source).toBe('recipe_detail_pill');
    expect(arg.contextSeed).toContain('Pesto Pasta');
  });

  it('seed includes pantry coverage when provided', () => {
    const { getByLabelText } = render(
      <AskSazonAboutRecipePill recipeTitle="Pesto Pasta" pantryCoverage={67} />,
    );
    fireEvent.press(getByLabelText('Ask Sazon about Pesto Pasta'));
    const arg = mockOpen.mock.calls[0][0];
    expect(arg.contextSeed).toMatch(/pantry coverage 67%/);
  });

  it('seed includes macroFit when provided', () => {
    const { getByLabelText } = render(
      <AskSazonAboutRecipePill
        recipeTitle="Pesto Pasta"
        macroFit="your fiber gap"
      />,
    );
    fireEvent.press(getByLabelText('Ask Sazon about Pesto Pasta'));
    const arg = mockOpen.mock.calls[0][0];
    expect(arg.contextSeed).toMatch(/fits your fiber gap/);
  });

  it('seed gracefully handles bare title (no clauses)', () => {
    const { getByLabelText } = render(
      <AskSazonAboutRecipePill recipeTitle="Pesto Pasta" />,
    );
    fireEvent.press(getByLabelText('Ask Sazon about Pesto Pasta'));
    const arg = mockOpen.mock.calls[0][0];
    expect(arg.contextSeed).toContain('About **Pesto Pasta**');
    expect(arg.contextSeed).toMatch(/ask anything/i);
  });

  it('does not contain the banned "Coach" vocabulary in user-visible copy', () => {
    const { getByText, queryByText } = render(
      <AskSazonAboutRecipePill recipeTitle="Pesto Pasta" />,
    );
    expect(getByText('Ask Sazon about this recipe')).toBeTruthy();
    // Should NOT render any Coach-vocabulary label
    expect(queryByText(/Ask the Coach/i)).toBeNull();
    expect(queryByText(/^Coach$/)).toBeNull();
  });
});
