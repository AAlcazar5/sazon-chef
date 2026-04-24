import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { UnitSegmentedControl } from '../../../components/ui/UnitSegmentedControl';

describe('UnitSegmentedControl', () => {
  it('renders Metric and US options', () => {
    const { getByText } = render(
      <UnitSegmentedControl value="Metric" onChange={jest.fn()} />
    );
    expect(getByText('Metric')).toBeTruthy();
    expect(getByText('US')).toBeTruthy();
  });

  it('active option has black background', () => {
    const { getByTestId } = render(
      <UnitSegmentedControl value="Metric" onChange={jest.fn()} />
    );
    const active = getByTestId('segment-Metric');
    const flatStyle = Array.isArray(active.props.style)
      ? Object.assign({}, ...active.props.style.filter(Boolean))
      : active.props.style;
    expect(flatStyle.backgroundColor).toBe('#111827');
  });

  it('inactive option has transparent background', () => {
    const { getByTestId } = render(
      <UnitSegmentedControl value="Metric" onChange={jest.fn()} />
    );
    const inactive = getByTestId('segment-US');
    const flatStyle = Array.isArray(inactive.props.style)
      ? Object.assign({}, ...inactive.props.style.filter(Boolean))
      : inactive.props.style;
    expect(flatStyle.backgroundColor).toBe('transparent');
  });

  it('tap switches value', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <UnitSegmentedControl value="Metric" onChange={onChange} />
    );
    fireEvent.press(getByText('US'));
    expect(onChange).toHaveBeenCalledWith('US');
  });
});
