import React from 'react';
import { render } from '@testing-library/react-native';
import { StatStrip } from '../../../components/ui/StatStrip';

const mockStats = [
  { value: '420', label: 'kcal' },
  { value: '22g', label: 'protein' },
  { value: '20', label: 'min' },
  { value: '4', label: 'serve' },
];

describe('StatStrip', () => {
  it('renders 4 stat values', () => {
    const { getByText } = render(<StatStrip stats={mockStats} />);
    expect(getByText('420')).toBeTruthy();
    expect(getByText('22g')).toBeTruthy();
    expect(getByText('20')).toBeTruthy();
    expect(getByText('4')).toBeTruthy();
  });

  it('renders uppercase labels', () => {
    const { getByText } = render(<StatStrip stats={mockStats} />);
    expect(getByText('KCAL')).toBeTruthy();
    expect(getByText('PROTEIN')).toBeTruthy();
    expect(getByText('MIN')).toBeTruthy();
    expect(getByText('SERVE')).toBeTruthy();
  });

  it('renders dividers between stats (3 dividers for 4 stats)', () => {
    const { getAllByTestId } = render(<StatStrip stats={mockStats} />);
    expect(getAllByTestId('stat-divider')).toHaveLength(3);
  });

  it('applies negative margin for hero overlap', () => {
    const { getByTestId } = render(<StatStrip stats={mockStats} testID="strip" />);
    const strip = getByTestId('strip');
    const flatStyle = Array.isArray(strip.props.style)
      ? Object.assign({}, ...strip.props.style.filter(Boolean))
      : strip.props.style;
    expect(flatStyle.marginTop).toBe(-28);
  });
});
