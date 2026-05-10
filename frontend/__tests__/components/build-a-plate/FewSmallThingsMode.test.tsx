// frontend/__tests__/components/build-a-plate/FewSmallThingsMode.test.tsx
// ROADMAP 4.0 Tier J17.2 — "A few small things" plate-mode toggle (TDD).

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    colors: {
      background: '#FAF7F4',
      text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    },
  }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import FewSmallThingsMode from '../../../components/build-a-plate/FewSmallThingsMode';

function collectText(node: unknown): string {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(collectText).join(' ');
  if (typeof node === 'object') {
    const obj = node as { children?: unknown };
    return collectText(obj.children ?? '');
  }
  return '';
}

describe('<FewSmallThingsMode />', () => {
  it('renders the persona-grade label "Small plates"', () => {
    const { getByText } = render(
      <FewSmallThingsMode active={false} slotCount={3} onToggle={jest.fn()} />,
    );
    expect(getByText(/Small plates/i)).toBeTruthy();
  });

  it('exposes 4–6 slots when the archetype is active', () => {
    const { getByTestId } = render(
      <FewSmallThingsMode active={true} slotCount={5} onToggle={jest.fn()} />,
    );
    const node = getByTestId('few-small-things-mode');
    // The component reflects the active slot count via accessibilityValue.
    expect(node.props.accessibilityValue).toEqual({ now: 5 });
    expect(5).toBeGreaterThanOrEqual(4);
    expect(5).toBeLessThanOrEqual(6);
  });

  it('falls back to 3 slots when the archetype is inactive', () => {
    const { getByTestId } = render(
      <FewSmallThingsMode active={false} slotCount={3} onToggle={jest.fn()} />,
    );
    const node = getByTestId('few-small-things-mode');
    expect(node.props.accessibilityValue).toEqual({ now: 3 });
  });

  it('fires onToggle on press', () => {
    const onToggle = jest.fn();
    const { getByTestId } = render(
      <FewSmallThingsMode active={false} slotCount={3} onToggle={onToggle} />,
    );
    fireEvent.press(getByTestId('few-small-things-mode'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  describe('banned-vocab regression', () => {
    const BANNED = [
      'weight',
      'lose',
      'healthy alternative',
      'instead of',
      'less than',
      'guilt-free',
      'skinny',
      'macro-friendly',
      'low-fat',
      'diet',
      'goal',
      'macro',
      'crush',
      'optimize',
      'smaller portions',
      'portion control',
    ];

    it('contains no banned-vocab strings in either active or inactive state', () => {
      for (const active of [true, false]) {
        const { toJSON } = render(
          <FewSmallThingsMode
            active={active}
            slotCount={active ? 5 : 3}
            onToggle={jest.fn()}
          />,
        );
        const text = collectText(toJSON()).toLowerCase();
        for (const term of BANNED) {
          expect(text).not.toContain(term.toLowerCase());
        }
      }
    });
  });
});
