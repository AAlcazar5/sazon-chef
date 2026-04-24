import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ServingStepper } from '../../../components/ui/ServingStepper';

jest.mock('../../../constants/Haptics', () => ({
  triggerHaptic: jest.fn(),
  ImpactStyle: { LIGHT: 'light', MEDIUM: 'medium', HEAVY: 'heavy' },
}));

describe('ServingStepper', () => {
  it('shows serving count', () => {
    const { getByText } = render(
      <ServingStepper servings={4} onChangeServings={jest.fn()} />
    );
    expect(getByText('4')).toBeTruthy();
  });

  it('increments on plus press', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <ServingStepper servings={4} onChangeServings={onChange} />
    );
    fireEvent.press(getByTestId('stepper-plus'));
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('decrements on minus press', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <ServingStepper servings={4} onChangeServings={onChange} />
    );
    fireEvent.press(getByTestId('stepper-minus'));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('does not go below 1', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <ServingStepper servings={1} onChangeServings={onChange} />
    );
    fireEvent.press(getByTestId('stepper-minus'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows serving label', () => {
    const { getByText } = render(
      <ServingStepper servings={1} onChangeServings={jest.fn()} />
    );
    expect(getByText(/serving/i)).toBeTruthy();
  });
});
