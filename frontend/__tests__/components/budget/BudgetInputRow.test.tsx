import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import BudgetInputRow from '../../../components/budget/BudgetInputRow';

describe('BudgetInputRow', () => {
  const baseProps = {
    title: 'Max Recipe Cost (USD)',
    description: 'Maximum cost for a single recipe.',
    currencySymbol: '$',
    value: undefined,
    onChange: jest.fn(),
    isDark: false,
  };

  beforeEach(() => {
    baseProps.onChange = jest.fn();
  });

  it('renders title, description, and currency symbol', () => {
    const { getByText } = render(<BudgetInputRow {...baseProps} />);
    expect(getByText('Max Recipe Cost (USD)')).toBeTruthy();
    expect(getByText('Maximum cost for a single recipe.')).toBeTruthy();
    expect(getByText('$')).toBeTruthy();
  });

  it('shows current numeric value as a string', () => {
    const { getByDisplayValue } = render(<BudgetInputRow {...baseProps} value={25} />);
    expect(getByDisplayValue('25')).toBeTruthy();
  });

  it('calls onChange with parsed number on numeric text', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <BudgetInputRow {...baseProps} onChange={onChange} />,
    );
    fireEvent.changeText(getByLabelText('Max Recipe Cost (USD)'), '15.5');
    expect(onChange).toHaveBeenCalledWith(15.5);
  });

  it('calls onChange(undefined) when cleared', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <BudgetInputRow {...baseProps} value={20} onChange={onChange} />,
    );
    fireEvent.changeText(getByLabelText('Max Recipe Cost (USD)'), '');
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('calls onChange(undefined) when input is unparseable', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <BudgetInputRow {...baseProps} onChange={onChange} />,
    );
    fireEvent.changeText(getByLabelText('Max Recipe Cost (USD)'), 'abc');
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('renders correctly in dark mode', () => {
    const { getByText } = render(<BudgetInputRow {...baseProps} isDark />);
    expect(getByText('Max Recipe Cost (USD)')).toBeTruthy();
  });
});
