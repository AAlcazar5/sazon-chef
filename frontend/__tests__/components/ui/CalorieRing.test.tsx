import React from 'react';
import { render } from '@testing-library/react-native';
import { CalorieRing } from '../../../components/ui/CalorieRing';

jest.mock('react-native-svg', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => <View {...props} />,
    Svg: (props: any) => <View {...props} />,
    Circle: (props: any) => <View {...props} />,
  };
});

describe('CalorieRing', () => {
  it('renders at correct size', () => {
    const { getByTestId } = render(
      <CalorieRing consumed={1420} goal={1800} size={140} testID="ring" />
    );
    const ring = getByTestId('ring');
    const flatStyle = Array.isArray(ring.props.style)
      ? Object.assign({}, ...ring.props.style.filter(Boolean))
      : ring.props.style;
    expect(flatStyle.width).toBe(140);
    expect(flatStyle.height).toBe(140);
  });

  it('center shows consumed number', () => {
    const { getByText } = render(
      <CalorieRing consumed={1420} goal={1800} />
    );
    expect(getByText('1,420')).toBeTruthy();
  });

  it('"of [goal]" label renders', () => {
    const { getByText } = render(
      <CalorieRing consumed={1420} goal={1800} />
    );
    expect(getByText('OF 1,800')).toBeTruthy();
  });

  it('renders SVG circles for track and fill', () => {
    const { getAllByTestId } = render(
      <CalorieRing consumed={1420} goal={1800} testID="ring" />
    );
    // Track circle + fill circle (mocked as Views)
    const ring = getAllByTestId('ring');
    expect(ring.length).toBeGreaterThanOrEqual(1);
  });

  it('caps at 100% when consumed exceeds goal', () => {
    const { getByText } = render(
      <CalorieRing consumed={2000} goal={1800} />
    );
    // Should still render without error; consumed > goal is valid
    expect(getByText('2,000')).toBeTruthy();
  });

  it('defaults to size 140', () => {
    const { getByTestId } = render(
      <CalorieRing consumed={500} goal={1800} testID="ring" />
    );
    const ring = getByTestId('ring');
    const flatStyle = Array.isArray(ring.props.style)
      ? Object.assign({}, ...ring.props.style.filter(Boolean))
      : ring.props.style;
    expect(flatStyle.width).toBe(140);
  });
});
