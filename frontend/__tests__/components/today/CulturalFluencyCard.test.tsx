// frontend/__tests__/components/today/CulturalFluencyCard.test.tsx
// ROADMAP 4.0 Tier J17.1 — Stories/Journey weekly cultural-fluency beat (TDD).

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
import CulturalFluencyCard from '../../../components/today/CulturalFluencyCard';

// Walk a react-test-renderer JSON tree and collect only visible text-node
// strings — ignores style props like fontWeight: "normal" that would
// otherwise trigger false positives on the banned-vocab scan.
function collectText(node: unknown): string {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(collectText).join(' ');
  if (typeof node === 'object') {
    const obj = node as { type?: string; children?: unknown };
    return collectText(obj.children ?? '');
  }
  return '';
}

describe('<CulturalFluencyCard />', () => {
  it('renders cuisine + insight text when both are present', () => {
    const { getByText, getAllByText } = render(
      <CulturalFluencyCard
        cuisine="japanese"
        insight="Japanese home cooking averages 5–7 small dishes — your week trended that way too."
        onShare={jest.fn()}
      />,
    );
    expect(getAllByText(/japanese/i).length).toBeGreaterThan(0);
    expect(getByText(/5–7 small dishes/)).toBeTruthy();
  });

  it('renders nothing when insight is null', () => {
    const { queryByTestId } = render(
      <CulturalFluencyCard
        cuisine="japanese"
        insight={null}
        onShare={jest.fn()}
      />,
    );
    expect(queryByTestId('cultural-fluency-card')).toBeNull();
  });

  it('renders nothing when cuisine is empty', () => {
    const { queryByTestId } = render(
      <CulturalFluencyCard
        cuisine=""
        insight="some insight"
        onShare={jest.fn()}
      />,
    );
    expect(queryByTestId('cultural-fluency-card')).toBeNull();
  });

  it('exposes a share button that fires onShare on press', () => {
    const onShare = jest.fn();
    const { getByTestId } = render(
      <CulturalFluencyCard
        cuisine="japanese"
        insight="Japanese home cooking averages 5–7 small dishes."
        onShare={onShare}
      />,
    );
    fireEvent.press(getByTestId('cultural-fluency-card-share'));
    expect(onShare).toHaveBeenCalledTimes(1);
  });

  it('exposes an accessibility label that surfaces the insight text', () => {
    const { getByLabelText } = render(
      <CulturalFluencyCard
        cuisine="japanese"
        insight="Japanese home cooking averages 5–7 small dishes."
        onShare={jest.fn()}
      />,
    );
    expect(getByLabelText(/japanese.*small dishes/i)).toBeTruthy();
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
    ];

    it('does not transform the rendered insight to introduce banned vocab', () => {
      // Component is pure presentation — pass a clean insight, scan only the
      // visible text-node content (not React Native style props) for banned
      // terms in static chrome (eyebrow, share label, etc.).
      const { toJSON } = render(
        <CulturalFluencyCard
          cuisine="japanese"
          insight="A clean discovery line about flavor."
          onShare={jest.fn()}
        />,
      );
      const visibleText = collectText(toJSON()).toLowerCase();
      for (const term of BANNED) {
        expect(visibleText).not.toContain(term.toLowerCase());
      }
    });
  });
});
