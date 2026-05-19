// W-B2 — Cook-time UX + peak. Glanceable large step card for the in-chat
// cook flow: big step text, a voice control, and the chef-kiss peak on
// completion. RED-first: the component does not exist yet.
//
// Acceptance (roadmap W-B2 **Test:**): accessibilityLabel on step card +
// voice control; completion peak renders; (banned-pattern lint runs
// separately via scripts/banned-patterns.ts).

const mockHaptic = jest.fn();
jest.mock('expo-haptics', () => ({
  impactAsync: (...args: unknown[]) => mockHaptic(...args),
  notificationAsync: (...args: unknown[]) => mockHaptic(...args),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: {
    Success: 'Success',
    Warning: 'Warning',
    Error: 'Error',
  },
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    colors: {
      background: '#FAF7F4',
      text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    },
  }),
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CookStepCard from '../../../components/cooking/CookStepCard';

const baseProps = {
  stepNumber: 2,
  totalSteps: 4,
  text: 'Sear the salmon skin-side down for 4 minutes.',
  recipeTitle: 'Crispy Salmon Bites',
  isListening: false,
  onVoicePress: jest.fn(),
  onNext: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('<CookStepCard />', () => {
  it('renders the step text and labels the card for screen readers', () => {
    const { getByText, getByLabelText } = render(
      <CookStepCard {...baseProps} />,
    );
    expect(getByText(baseProps.text)).toBeTruthy();
    expect(
      getByLabelText(`Cooking step 2: ${baseProps.text}`),
    ).toBeTruthy();
  });

  it('exposes a labelled voice control that fires onVoicePress', () => {
    const onVoicePress = jest.fn();
    const { getByLabelText } = render(
      <CookStepCard {...baseProps} onVoicePress={onVoicePress} />,
    );
    const mic = getByLabelText('Talk to Sazon while you cook');
    expect(mic.props.accessibilityRole).toBe('button');
    fireEvent.press(mic);
    expect(onVoicePress).toHaveBeenCalledTimes(1);
  });

  it('voice control announces the listening state', () => {
    const { getByLabelText } = render(
      <CookStepCard {...baseProps} isListening />,
    );
    expect(getByLabelText('Listening — tap to stop')).toBeTruthy();
  });

  it('advances on Next; the last step offers a Finish affordance', () => {
    const onNext = jest.fn();
    const { getByLabelText, rerender, queryByLabelText } = render(
      <CookStepCard {...baseProps} onNext={onNext} />,
    );
    fireEvent.press(getByLabelText('Next step'));
    expect(onNext).toHaveBeenCalledTimes(1);

    rerender(
      <CookStepCard
        {...baseProps}
        stepNumber={4}
        totalSteps={4}
        onNext={onNext}
      />,
    );
    expect(queryByLabelText('Next step')).toBeNull();
    expect(getByLabelText('Finish cooking')).toBeTruthy();
  });

  it('completion renders the chef-kiss peak instead of the step card', () => {
    const { getByText, queryByText } = render(
      <CookStepCard {...baseProps} complete />,
    );
    expect(getByText('Chef’s kiss.')).toBeTruthy();
    expect(queryByText(baseProps.text)).toBeNull();
  });
});
