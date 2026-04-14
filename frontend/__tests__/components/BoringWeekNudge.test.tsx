import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import BoringWeekNudge from '../../components/meal-plan/BoringWeekNudge';

describe('BoringWeekNudge', () => {
  it('renders the nudge message and variety score', () => {
    const onMixItUp = jest.fn();
    const { getByText, getByLabelText } = render(
      <BoringWeekNudge
        message="Your week is looking a bit samey — want Sazon to mix it up?"
        varietyScore={32}
        isDark={false}
        onMixItUp={onMixItUp}
      />,
    );

    expect(getByText(/looking a bit samey/i)).toBeTruthy();
    expect(getByText(/Variety score: 32\/100/i)).toBeTruthy();
    expect(getByLabelText(/Mix up repetitive meals/i)).toBeTruthy();
  });

  it('fires onMixItUp when the CTA is pressed', () => {
    const onMixItUp = jest.fn();
    const { getByLabelText } = render(
      <BoringWeekNudge
        message="nudge"
        varietyScore={20}
        isDark={false}
        onMixItUp={onMixItUp}
      />,
    );

    fireEvent.press(getByLabelText(/Mix up repetitive meals/i));
    expect(onMixItUp).toHaveBeenCalledTimes(1);
  });

  it('fires onDismiss when dismiss tapped', () => {
    const onMixItUp = jest.fn();
    const onDismiss = jest.fn();
    const { getByLabelText } = render(
      <BoringWeekNudge
        message="nudge"
        varietyScore={20}
        isDark={false}
        onMixItUp={onMixItUp}
        onDismiss={onDismiss}
      />,
    );

    fireEvent.press(getByLabelText(/Dismiss variety nudge/i));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
