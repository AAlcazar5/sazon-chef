// frontend/__tests__/components/DislikeReasonSheet.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

import DislikeReasonSheet from '../../components/home/DislikeReasonSheet';

describe('DislikeReasonSheet', () => {
  const defaultProps = {
    visible: true,
    recipeName: 'Spicy Thai Curry',
    onSelectReason: jest.fn(),
    onSkip: jest.fn(),
    onDismiss: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all 4 reason options when visible', () => {
    render(<DislikeReasonSheet {...defaultProps} />);
    expect(screen.getByText('Not my style')).toBeTruthy();
    expect(screen.getByText('Too complex')).toBeTruthy();
    expect(screen.getByText('Missing ingredients')).toBeTruthy();
    expect(screen.getByText('Already tried it')).toBeTruthy();
  });

  it('shows the recipe name in the header', () => {
    render(<DislikeReasonSheet {...defaultProps} />);
    expect(screen.getByText(/Why hide "Spicy Thai Curry"\?/)).toBeTruthy();
  });

  it('shows generic header when no recipe name provided', () => {
    render(<DislikeReasonSheet {...defaultProps} recipeName={undefined} />);
    expect(screen.getByText(/Why hide this recipe\?/)).toBeTruthy();
  });

  it('calls onSelectReason with correct reason on tap', () => {
    render(<DislikeReasonSheet {...defaultProps} />);
    fireEvent.press(screen.getByText('Too complex'));
    expect(defaultProps.onSelectReason).toHaveBeenCalledWith('too_complex');
  });

  it('calls onSelectReason for each reason type', () => {
    render(<DislikeReasonSheet {...defaultProps} />);

    fireEvent.press(screen.getByText('Not my style'));
    expect(defaultProps.onSelectReason).toHaveBeenCalledWith('not_my_style');

    fireEvent.press(screen.getByText('Missing ingredients'));
    expect(defaultProps.onSelectReason).toHaveBeenCalledWith('missing_ingredients');

    fireEvent.press(screen.getByText('Already tried it'));
    expect(defaultProps.onSelectReason).toHaveBeenCalledWith('already_tried');
  });

  it('calls onSkip when skip button is pressed', () => {
    render(<DislikeReasonSheet {...defaultProps} />);
    fireEvent.press(screen.getByText(/Skip/));
    expect(defaultProps.onSkip).toHaveBeenCalled();
  });

  it('shows description text for each option', () => {
    render(<DislikeReasonSheet {...defaultProps} />);
    expect(screen.getByText("Cuisine or flavors don't match my taste")).toBeTruthy();
    expect(screen.getByText('Too many steps or advanced techniques')).toBeTruthy();
    expect(screen.getByText("I don't have the key ingredients")).toBeTruthy();
    expect(screen.getByText("I've made this before")).toBeTruthy();
  });

  it('shows feedback description text', () => {
    render(<DislikeReasonSheet {...defaultProps} />);
    expect(screen.getByText('Your feedback helps us find better matches.')).toBeTruthy();
  });
});
