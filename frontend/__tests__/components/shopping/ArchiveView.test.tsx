// frontend/__tests__/components/shopping/ArchiveView.test.tsx
// TDD: ArchiveView component

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

// ── Global mocks ─────────────────────────────────────────────────────────────

jest.mock('nativewind', () => ({ useColorScheme: () => ({ colorScheme: 'light' }) }));

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/mock'),
  createAnimatedComponent: (c: any) => c,
  useReducedMotion: () => false,
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('../../../constants/Haptics', () => ({
  triggerHaptic: jest.fn(),
  HapticPatterns: { MEDIUM_IMPACT: 'medium', LIGHT_IMPACT: 'light' },
  ImpactStyle: { LIGHT: 'light', MEDIUM: 'medium', HEAVY: 'heavy' },
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: function MockIonicons({ name, testID }: any) {
    const { Text } = require('react-native');
    return <Text testID={testID || `icon-${name}`}>{name}</Text>;
  },
}));

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, ...props }: any) => <View {...props}>{children}</View>,
  };
});

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    colors: {
      background: '#FAF7F4',
      text: { primary: '#111827', secondary: '#6B7280' },
      card: '#FFFFFF',
    },
  }),
}));

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, onPress, onLongPress, accessibilityLabel, testID, style }: any) => (
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        style={style}
      >
        {children}
      </TouchableOpacity>
    ),
  };
});

jest.mock('../../../components/ui/BrandButton', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ label, onPress, testID, accessibilityLabel }: any) => (
      <TouchableOpacity onPress={onPress} testID={testID || `brand-btn-${label}`} accessibilityLabel={accessibilityLabel || label}>
        <Text>{label}</Text>
      </TouchableOpacity>
    ),
  };
});

jest.mock('../../../components/ui/AnimatedEmptyState', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ title, useMascot, mascotExpression, testID }: any) => (
      <View testID={testID || 'animated-empty-state'}>
        <Text testID="empty-title">{title}</Text>
        {useMascot && <Text testID="empty-mascot-expression">{mascotExpression}</Text>}
      </View>
    ),
  };
});

// ── API mocks ─────────────────────────────────────────────────────────────────

const mockRestoreList = jest.fn();

jest.mock('../../../lib/api', () => ({
  shoppingListApi: {
    restoreList: (...args: any[]) => mockRestoreList(...args),
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeArchivedList(overrides: Record<string, unknown> = {}) {
  const base = {
    id: 'list-1',
    name: 'Produce run',
    archivedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3d ago
    tier: 'archived',
    items: [
      { id: 'i1', name: 'Apple', purchased: false },
      { id: 'i2', name: 'Banana', purchased: true },
    ],
    summaryStats: null,
    ...overrides,
  };
  return base;
}

function makeOlderList(overrides: Record<string, unknown> = {}) {
  return makeArchivedList({
    id: 'list-old',
    name: 'Old pantry run',
    archivedAt: new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString(), // 95d ago
    tier: 'older',
    summaryStats: JSON.stringify({ totalSpentCents: 4200, itemCount: 7 }),
    ...overrides,
  });
}

// ── Import component under test AFTER mocks ───────────────────────────────────

import ArchiveView from '../../../components/shopping/ArchiveView';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ArchiveView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRestoreList.mockResolvedValue({ previousActiveId: null, newActiveId: 'list-1' });
  });

  test('renders one row per archived list with name and item count', () => {
    const lists = [
      makeArchivedList({ id: 'list-1', name: 'Produce run' }),
      makeArchivedList({ id: 'list-2', name: 'Meat & Seafood run' }),
    ];

    const { getByText, getAllByTestId } = render(
      <ArchiveView lists={lists} onRestore={jest.fn()} />,
    );

    expect(getByText('Produce run')).toBeTruthy();
    expect(getByText('Meat & Seafood run')).toBeTruthy();
    const rows = getAllByTestId(/archive-row-/);
    expect(rows).toHaveLength(2);
  });

  test('shows relative date label (e.g. "3d ago")', () => {
    const list = makeArchivedList({ id: 'list-1', name: 'Test list' });
    const { getByText } = render(<ArchiveView lists={[list]} onRestore={jest.fn()} />);
    expect(getByText(/\d+d ago/)).toBeTruthy();
  });

  test('shows item count on each row', () => {
    const list = makeArchivedList({
      id: 'list-1',
      name: 'Groceries',
      items: [
        { id: 'i1', name: 'a', purchased: false },
        { id: 'i2', name: 'b', purchased: false },
        { id: 'i3', name: 'c', purchased: false },
      ],
    });
    const { getByText } = render(<ArchiveView lists={[list]} onRestore={jest.fn()} />);
    expect(getByText(/3 items/)).toBeTruthy();
  });

  test('shows empty state with AnimatedEmptyState (mascot sleepy) when no archives', () => {
    const { getByTestId, getByText } = render(<ArchiveView lists={[]} onRestore={jest.fn()} />);
    expect(getByTestId('animated-empty-state')).toBeTruthy();
    expect(getByText('No archives yet.')).toBeTruthy();
    expect(getByTestId('empty-mascot-expression').props.children).toBe('sleepy');
  });

  test('search bar filters by list name (case-insensitive)', () => {
    const lists = [
      makeArchivedList({ id: 'list-1', name: 'Produce run' }),
      makeArchivedList({ id: 'list-2', name: 'Bakery run' }),
    ];

    const { getByTestId, getByText, queryByText } = render(
      <ArchiveView lists={lists} onRestore={jest.fn()} />,
    );

    const searchBar = getByTestId('archive-search');
    fireEvent.changeText(searchBar, 'produce');

    expect(getByText('Produce run')).toBeTruthy();
    expect(queryByText('Bakery run')).toBeNull();
  });

  test('search bar filters by date substring (YYYY-MM-DD)', () => {
    const dateStr = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const lists = [
      makeArchivedList({ id: 'list-1', name: 'Produce run' }),
      makeArchivedList({ id: 'list-2', name: 'Bakery run' }),
    ];

    const { getByTestId, queryAllByTestId } = render(
      <ArchiveView lists={lists} onRestore={jest.fn()} />,
    );

    const searchBar = getByTestId('archive-search');
    fireEvent.changeText(searchBar, dateStr);

    // Both lists share the same archivedAt date so both should appear
    expect(queryAllByTestId(/archive-row-/).length).toBe(2);
  });

  test('search that matches nothing shows empty message', () => {
    const lists = [makeArchivedList({ id: 'list-1', name: 'Produce run' })];
    const { getByTestId, queryAllByTestId } = render(
      <ArchiveView lists={lists} onRestore={jest.fn()} />,
    );

    fireEvent.changeText(getByTestId('archive-search'), 'xyzzy_no_match');
    expect(queryAllByTestId(/archive-row-/).length).toBe(0);
  });

  test('lists older than 90 days appear in "Older" accordion bucket', () => {
    const lists = [
      makeArchivedList({ id: 'list-recent' }),
      makeOlderList({ id: 'list-old' }),
    ];

    const { getByTestId, getByText } = render(
      <ArchiveView lists={lists} onRestore={jest.fn()} />,
    );

    expect(getByTestId('older-bucket')).toBeTruthy();
    expect(getByText('Older')).toBeTruthy();
  });

  test('long-press on a row calls shoppingListApi.restoreList and onRestore callback', async () => {
    const onRestore = jest.fn();
    const list = makeArchivedList({ id: 'list-1', name: 'Produce run' });

    const { getByTestId } = render(<ArchiveView lists={[list]} onRestore={onRestore} />);

    const row = getByTestId('archive-row-list-1');
    fireEvent(row, 'longPress');

    await waitFor(() => {
      expect(mockRestoreList).toHaveBeenCalledWith('list-1');
    });
    await waitFor(() => {
      expect(onRestore).toHaveBeenCalledWith('list-1');
    });
  });

  test('long-press fires haptic feedback', async () => {
    const { triggerHaptic } = require('../../../constants/Haptics');
    const list = makeArchivedList({ id: 'list-1' });

    const { getByTestId } = render(<ArchiveView lists={[list]} onRestore={jest.fn()} />);
    fireEvent(getByTestId('archive-row-list-1'), 'longPress');

    await waitFor(() => {
      expect(triggerHaptic).toHaveBeenCalled();
    });
  });

  test('each row has an accessibilityLabel', () => {
    const list = makeArchivedList({ id: 'list-1', name: 'Produce run' });
    const { getByTestId } = render(<ArchiveView lists={[list]} onRestore={jest.fn()} />);
    const row = getByTestId('archive-row-list-1');
    expect(row.props.accessibilityLabel).toBeTruthy();
  });
});
