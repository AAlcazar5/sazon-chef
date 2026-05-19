// Tier Y-4 — cook launch/preview modal (Surface 2, screenshot #5):
// collage + title + desc + "N steps" + Start cooking + close. RED-first.

const mockHaptic = jest.fn();
jest.mock('expo-haptics', () => ({
  impactAsync: (...a: unknown[]) => mockHaptic(...a),
  notificationAsync: (...a: unknown[]) => mockHaptic(...a),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', colors: { text: { primary: '#111' } } }),
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CookLaunchModal from '../../../components/cooking/CookLaunchModal';

const PROPS = {
  visible: true,
  title: 'Roasted Edamame & Chickpeas',
  description: 'Crispy, protein-packed snack.',
  imageUrls: ['a.jpg', 'b.jpg'],
  stepCount: 7,
  onStartCooking: jest.fn(),
  onClose: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

describe('<CookLaunchModal />', () => {
  it('renders title, description, step count and the actions', () => {
    const { getByText, getByLabelText } = render(<CookLaunchModal {...PROPS} />);
    expect(getByText('Roasted Edamame & Chickpeas')).toBeTruthy();
    expect(getByText('Crispy, protein-packed snack.')).toBeTruthy();
    expect(getByText('7 steps')).toBeTruthy();
    expect(getByLabelText(/start cooking/i)).toBeTruthy();
    expect(getByLabelText(/close/i)).toBeTruthy();
  });

  it('not visible → renders nothing', () => {
    const { queryByText } = render(
      <CookLaunchModal {...PROPS} visible={false} />,
    );
    expect(queryByText('Roasted Edamame & Chickpeas')).toBeNull();
  });

  it('Start cooking fires its handler (caller navigates to the player)', () => {
    const onStartCooking = jest.fn();
    const { getByLabelText } = render(
      <CookLaunchModal {...PROPS} onStartCooking={onStartCooking} />,
    );
    const btn = getByLabelText(/start cooking/i);
    expect(btn.props.accessibilityRole).toBe('button');
    fireEvent.press(btn);
    expect(onStartCooking).toHaveBeenCalledTimes(1);
  });

  it('Close fires onClose', () => {
    const onClose = jest.fn();
    const { getByLabelText } = render(
      <CookLaunchModal {...PROPS} onClose={onClose} />,
    );
    const close = getByLabelText(/close/i);
    expect(close.props.accessibilityRole).toBe('button');
    fireEvent.press(close);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('singular "1 step" when stepCount is 1', () => {
    const { getByText } = render(
      <CookLaunchModal {...PROPS} stepCount={1} />,
    );
    expect(getByText('1 step')).toBeTruthy();
  });
});
