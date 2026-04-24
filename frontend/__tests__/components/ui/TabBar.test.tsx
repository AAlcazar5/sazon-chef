import React from 'react';
import { render } from '@testing-library/react-native';
import { EditorialTabBar } from '../../../components/ui/EditorialTabBar';

jest.mock('expo-blur', () => ({
  BlurView: function MockBlurView(props: any) {
    const { View } = require('react-native');
    return <View testID="blur-view" {...props}>{props.children}</View>;
  },
}));

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: function MockIonicons({ name, color }: { name: string; color: string }) {
      return <Text testID={`icon-${name}`} style={{ color }}>{name}</Text>;
    },
  };
});

const tabs = [
  { key: 'home', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { key: 'cookbook', label: 'Cookbook', icon: 'book-outline', activeIcon: 'book' },
  { key: 'mealplan', label: 'Meal Plan', icon: 'calendar-outline', activeIcon: 'calendar' },
  { key: 'shopping', label: 'Shopping', icon: 'cart-outline', activeIcon: 'cart' },
  { key: 'profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person' },
];

describe('EditorialTabBar', () => {
  it('renders 5 tabs', () => {
    const { getByText } = render(
      <EditorialTabBar tabs={tabs} activeKey="home" onTabPress={jest.fn()} />
    );
    expect(getByText('Home')).toBeTruthy();
    expect(getByText('Cookbook')).toBeTruthy();
    expect(getByText('Meal Plan')).toBeTruthy();
    expect(getByText('Shopping')).toBeTruthy();
    expect(getByText('Profile')).toBeTruthy();
  });

  it('active tab uses filled icon', () => {
    const { getByTestId } = render(
      <EditorialTabBar tabs={tabs} activeKey="home" onTabPress={jest.fn()} />
    );
    expect(getByTestId('icon-home')).toBeTruthy();
  });

  it('inactive tab uses outline icon', () => {
    const { getByTestId } = render(
      <EditorialTabBar tabs={tabs} activeKey="home" onTabPress={jest.fn()} />
    );
    expect(getByTestId('icon-book-outline')).toBeTruthy();
  });

  it('has floating pill positioning', () => {
    const { getByTestId } = render(
      <EditorialTabBar tabs={tabs} activeKey="home" onTabPress={jest.fn()} testID="tabbar" />
    );
    const bar = getByTestId('tabbar');
    const flatStyle = Array.isArray(bar.props.style)
      ? Object.assign({}, ...bar.props.style.filter(Boolean))
      : bar.props.style;
    expect(flatStyle.position).toBe('absolute');
    expect(flatStyle.bottom).toBe(22);
    expect(flatStyle.borderRadius).toBe(28);
  });
});
