import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Mocks
jest.mock('../../constants/Haptics', () => ({
  triggerHaptic: jest.fn(),
  ImpactStyle: { LIGHT: 'light', MEDIUM: 'medium', HEAVY: 'heavy' },
  HapticPatterns: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: function MockIonicons({ name, testID }: { name: string; testID?: string }) {
      return <Text testID={testID || `icon-${name}`}>{name}</Text>;
    },
  };
});

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
}));

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: function MockLinearGradient({ children, ...props }: any) {
      return <View {...props}>{children}</View>;
    },
  };
});

// Import after mocks
import { ShoppingHeader } from '../../components/shopping/ShoppingHeader';
import { ProgressStrip } from '../../components/shopping/ProgressStrip';
import { CategorySection } from '../../components/shopping/CategorySection';
import { ShoppingItemRow } from '../../components/shopping/ShoppingItemRow';

// ─── ShoppingHeader ─────────────────────────────────────────

describe('ShoppingHeader (10V-H: Screen header)', () => {
  it('renders title', () => {
    const { getByText } = render(<ShoppingHeader itemsLeft={8} inPantry={3} />);
    expect(getByText('Shopping list')).toBeTruthy();
  });

  it('renders items-left and pantry counts', () => {
    const { getByText } = render(<ShoppingHeader itemsLeft={8} inPantry={3} />);
    expect(getByText(/8 items left · 3 already in pantry/)).toBeTruthy();
  });
});

// ─── ProgressStrip ───────────────────────────────────────────

describe('ProgressStrip (10V-H: Progress strip)', () => {
  it('renders done/total fraction', () => {
    const { getByText } = render(<ProgressStrip done={5} total={12} />);
    expect(getByText('5/12')).toBeTruthy();
  });

  it('renders progress label', () => {
    const { getByText } = render(<ProgressStrip done={5} total={12} />);
    expect(getByText('Progress')).toBeTruthy();
  });

  it('renders progress fill', () => {
    const { getByTestId } = render(<ProgressStrip done={6} total={12} />);
    const fill = getByTestId('progress-fill');
    const flatStyle = Array.isArray(fill.props.style)
      ? Object.assign({}, ...fill.props.style.filter(Boolean))
      : fill.props.style;
    expect(flatStyle.width).toBe('50%');
  });
});

// ─── CategorySection ─────────────────────────────────────────

describe('CategorySection (10V-H: Category sections)', () => {
  const items = [
    { id: '1', name: 'Spinach', quantity: '200g', checked: false, inPantry: false },
    { id: '2', name: 'Tomatoes', quantity: '3', checked: true, inPantry: false },
  ];

  it('renders category name uppercase', () => {
    const { getByText } = render(
      <CategorySection name="Produce" icon="leaf-outline" iconColor="#4CAF50" iconBg="#C8E6C9" items={items} onToggle={jest.fn()} />
    );
    expect(getByText('PRODUCE')).toBeTruthy();
  });

  it('renders item count', () => {
    const { getByText } = render(
      <CategorySection name="Produce" icon="leaf-outline" iconColor="#4CAF50" iconBg="#C8E6C9" items={items} onToggle={jest.fn()} />
    );
    expect(getByText('2')).toBeTruthy();
  });

  it('renders all items', () => {
    const { getByText } = render(
      <CategorySection name="Produce" icon="leaf-outline" iconColor="#4CAF50" iconBg="#C8E6C9" items={items} onToggle={jest.fn()} />
    );
    expect(getByText('Spinach')).toBeTruthy();
    expect(getByText('Tomatoes')).toBeTruthy();
  });
});

// ─── ShoppingItemRow ─────────────────────────────────────────

describe('ShoppingItemRow (10V-H: Item rows)', () => {
  it('unchecked item has gray border checkbox', () => {
    const item = { id: '1', name: 'Rice', quantity: '1 kg', checked: false, inPantry: false };
    const { getByTestId } = render(
      <ShoppingItemRow item={item} onToggle={jest.fn()} showDivider={false} />
    );
    const checkbox = getByTestId('checkbox-1');
    const flatStyle = Array.isArray(checkbox.props.style)
      ? Object.assign({}, ...checkbox.props.style.filter(Boolean))
      : checkbox.props.style;
    expect(flatStyle.borderColor).toBe('#D1D5DB');
  });

  it('checked item has orange checkbox', () => {
    const item = { id: '1', name: 'Rice', quantity: '1 kg', checked: true, inPantry: false };
    const { getByTestId } = render(
      <ShoppingItemRow item={item} onToggle={jest.fn()} showDivider={false} />
    );
    const checkbox = getByTestId('checkbox-1');
    const flatStyle = Array.isArray(checkbox.props.style)
      ? Object.assign({}, ...checkbox.props.style.filter(Boolean))
      : checkbox.props.style;
    expect(flatStyle.backgroundColor).toBe('#fa7e12');
  });

  it('shows "In pantry" badge for pantry items', () => {
    const item = { id: '1', name: 'Olive oil', quantity: '1 bottle', checked: false, inPantry: true };
    const { getByTestId } = render(
      <ShoppingItemRow item={item} onToggle={jest.fn()} showDivider={false} />
    );
    expect(getByTestId('pantry-badge-1')).toBeTruthy();
  });

  it('no pantry badge when not in pantry', () => {
    const item = { id: '1', name: 'Rice', quantity: '1 kg', checked: false, inPantry: false };
    const { queryByTestId } = render(
      <ShoppingItemRow item={item} onToggle={jest.fn()} showDivider={false} />
    );
    expect(queryByTestId('pantry-badge-1')).toBeNull();
  });

  it('tap fires onToggle', () => {
    const onToggle = jest.fn();
    const item = { id: '1', name: 'Rice', quantity: '1 kg', checked: false, inPantry: false };
    const { getByTestId } = render(
      <ShoppingItemRow item={item} onToggle={onToggle} showDivider={false} />
    );
    fireEvent.press(getByTestId('shopping-item-1'));
    expect(onToggle).toHaveBeenCalled();
  });

  it('renders divider when showDivider is true', () => {
    const item = { id: '1', name: 'Rice', quantity: '1 kg', checked: false, inPantry: false };
    const { toJSON } = render(
      <ShoppingItemRow item={item} onToggle={jest.fn()} showDivider={true} />
    );
    const json = toJSON() as any;
    // Should render 2 root elements (Pressable + divider View)
    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBe(2);
  });

  it('no divider when showDivider is false', () => {
    const item = { id: '1', name: 'Rice', quantity: '1 kg', checked: false, inPantry: false };
    const { toJSON } = render(
      <ShoppingItemRow item={item} onToggle={jest.fn()} showDivider={false} />
    );
    const json = toJSON() as any;
    // Should render only the Pressable (no divider)
    expect(Array.isArray(json)).toBe(false);
  });
});
