// P2 retention — mid-cook delight beat smoke + copy rotation.

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import MidCookBeat, { pickBeatLine } from '../../../components/cooking/MidCookBeat';

describe('pickBeatLine', () => {
  it('returns a non-empty string from the rotation', () => {
    const line = pickBeatLine(0);
    expect(typeof line).toBe('string');
    expect(line.length).toBeGreaterThan(0);
  });

  it('rotates deterministically given the same seed', () => {
    const a = pickBeatLine(7);
    const b = pickBeatLine(7);
    expect(a).toBe(b);
  });

  it('does not contain banned voice vocabulary', () => {
    for (let i = 0; i < 20; i++) {
      const line = pickBeatLine(i).toLowerCase();
      expect(line).not.toMatch(/streak|goal|target|cut|bulk|maintain|optimize|crush/);
    }
  });
});

describe('<MidCookBeat />', () => {
  it('renders the pill when visible', () => {
    const { getByTestId } = render(<MidCookBeat visible line="Halfway home." />);
    const beat = getByTestId('mid-cook-beat');
    expect(beat.props.accessibilityLabel).toBe('Halfway home.');
  });

  it('honors the overridden line when provided', () => {
    const { getByText } = render(<MidCookBeat visible line="That's a chef move." />);
    expect(getByText("That's a chef move.")).toBeTruthy();
  });
});
