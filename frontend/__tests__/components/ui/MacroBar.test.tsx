import React from 'react';
import { render } from '@testing-library/react-native';
import { MacroBar } from '../../../components/ui/MacroBar';

describe('MacroBar', () => {
  it('renders uppercase label', () => {
    const { getByText } = render(
      <MacroBar label="Protein" value={98} goal={120} color="#81C784" />
    );
    expect(getByText('PROTEIN')).toBeTruthy();
  });

  it('renders value/goal text with units', () => {
    const { getByText } = render(
      <MacroBar label="Protein" value={98} goal={120} color="#81C784" />
    );
    expect(getByText('98')).toBeTruthy();
    expect(getByText('/120g')).toBeTruthy();
  });

  it('uses custom unit', () => {
    const { getByText } = render(
      <MacroBar label="Fiber" value={20} goal={28} color="#059669" unit="g" />
    );
    expect(getByText('/28g')).toBeTruthy();
  });

  it('bar width reflects value/goal percentage', () => {
    const { getByTestId } = render(
      <MacroBar label="Protein" value={60} goal={120} color="#81C784" testID="bar" />
    );
    const fill = getByTestId('bar-fill');
    const flatStyle = Array.isArray(fill.props.style)
      ? Object.assign({}, ...fill.props.style.filter(Boolean))
      : fill.props.style;
    expect(flatStyle.width).toBe('50%');
  });

  it('caps bar at 100%', () => {
    const { getByTestId } = render(
      <MacroBar label="Carbs" value={250} goal={220} color="#FFD54F" testID="bar" />
    );
    const fill = getByTestId('bar-fill');
    const flatStyle = Array.isArray(fill.props.style)
      ? Object.assign({}, ...fill.props.style.filter(Boolean))
      : fill.props.style;
    expect(flatStyle.width).toBe('100%');
  });
});
