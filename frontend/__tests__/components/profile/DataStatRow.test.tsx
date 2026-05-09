import React from 'react';
import { render } from '@testing-library/react-native';
import DataStatRow from '../../../components/profile/DataStatRow';

describe('DataStatRow', () => {
  it('renders label + value', () => {
    const { getByText } = render(
      <DataStatRow label="Saved Recipes" value={42} isDark={false} />
    );
    expect(getByText('Saved Recipes')).toBeTruthy();
    expect(getByText('42')).toBeTruthy();
  });

  it('renders zero values', () => {
    const { getByText } = render(
      <DataStatRow label="Collections" value={0} isDark={false} />
    );
    expect(getByText('0')).toBeTruthy();
  });

  it('renders in emphasized mode (Total Items style)', () => {
    const { getByText } = render(
      <DataStatRow label="Total Items" value={100} isDark={false} emphasized />
    );
    expect(getByText('Total Items')).toBeTruthy();
    expect(getByText('100')).toBeTruthy();
  });

  it('renders correctly in dark mode', () => {
    const { getByText } = render(
      <DataStatRow label="Meals" value={7} isDark />
    );
    expect(getByText('Meals')).toBeTruthy();
    expect(getByText('7')).toBeTruthy();
  });
});
