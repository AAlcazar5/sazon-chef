// frontend/__tests__/app/plate/[slug].test.tsx
// Group 10X Phase 8 — Deep link routing for shared plates.

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', isDark: false, colors: {} }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

jest.mock('../../../components/ui/ScreenGradient', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, testID, style }: any) => (
      <View testID={testID} style={style}>{children}</View>
    ),
  };
});

jest.mock('../../../components/ui/BrandButton', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ label, onPress, testID, accessibilityLabel }: any) => (
      <TouchableOpacity testID={testID} onPress={onPress} accessibilityLabel={accessibilityLabel ?? label}>
        <Text>{label}</Text>
      </TouchableOpacity>
    ),
  };
});

jest.mock('../../../components/mascot/Sazon', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ motion, fx, variant, size }: any) => (
      <View
        testID={`sazon-mascot-${motion ?? 'idle'}`}
        accessibilityLabel={`sazon-${motion ?? 'idle'}`}
        // expose props for assertions
        // @ts-ignore — test-only props
        data-motion={motion}
        data-fx={(fx ?? []).join(',')}
        data-variant={variant}
        data-size={size}
      />
    ),
  };
});

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockPush = jest.fn();
const mockUseLocalSearchParams = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: mockBack, push: mockPush }),
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

jest.mock('../../../lib/api', () => ({
  sharedPlatesApi: {
    fetchBySlug: jest.fn(),
    fetchSubCount: jest.fn(),
  },
}));

import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import SharedPlateDeepLinkScreen from '../../../app/plate/[slug]';
import { sharedPlatesApi } from '../../../lib/api';

const mockFetchBySlug = sharedPlatesApi.fetchBySlug as jest.Mock;
const mockFetchSubCount = sharedPlatesApi.fetchSubCount as jest.Mock;

describe('SharedPlateDeepLinkScreen (/plate/[slug])', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({ slug: 'cozy-salmon-1234' });
    mockFetchSubCount.mockResolvedValue({ data: { subsCount: 0 } });
  });

  it('shows the thinking Sazon mascot while the slug fetch is in-flight', async () => {
    let resolver: (v: any) => void = () => {};
    mockFetchBySlug.mockReturnValue(new Promise((resolve) => { resolver = resolve; }));

    const { getByTestId } = render(<SharedPlateDeepLinkScreen />);

    // wobble + question = the "thinking" mascot config (Sazon's `expressionToSazon('thinking')`)
    const mascot = getByTestId('sazon-mascot-wobble');
    expect(mascot.props['data-fx']).toContain('question');

    // Resolve so the test cleans up
    resolver({
      data: {
        share: { id: 'share-1', slug: 'cozy-salmon-1234', plate: { id: 'plate-99' } },
      },
    });
    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
  });

  it('calls sharedPlatesApi.fetchBySlug with the slug from the URL on mount', async () => {
    mockFetchBySlug.mockResolvedValue({
      data: {
        share: { id: 'share-1', slug: 'cozy-salmon-1234', plate: { id: 'plate-99' } },
      },
    });

    render(<SharedPlateDeepLinkScreen />);

    await waitFor(() => {
      expect(mockFetchBySlug).toHaveBeenCalledWith('cozy-salmon-1234');
    });
  });

  it('replaces to /build-a-plate with the plateId and from=shared on success', async () => {
    mockFetchBySlug.mockResolvedValue({
      data: {
        share: { id: 'share-1', slug: 'cozy-salmon-1234', plate: { id: 'plate-99' } },
      },
    });

    render(<SharedPlateDeepLinkScreen />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledTimes(1);
    });
    const arg = mockReplace.mock.calls[0][0] as string;
    expect(arg).toContain('/build-a-plate');
    expect(arg).toContain('plateId=plate-99');
    expect(arg).toContain('from=shared');
  });

  it('renders the confused Sazon + "Build your own" CTA when the slug 404s', async () => {
    const err: any = new Error('Not found');
    err.response = { status: 404 };
    mockFetchBySlug.mockImplementation(() => Promise.reject(err));

    const { getByTestId, queryByText } = render(<SharedPlateDeepLinkScreen />);

    // Wait for the rejection to propagate to state and re-render the not-found view
    await waitFor(() => {
      expect(queryByText(/can't find that plate/i)).not.toBeNull();
    });

    // confused = jiggle + question (Sazon's `expressionToSazon('confused')` ≈ surprised/jiggle pattern)
    const mascot = getByTestId('sazon-mascot-jiggle');
    expect(mascot.props['data-fx']).toContain('question');

    const cta = getByTestId('build-own-plate-cta');
    await act(async () => {
      fireEvent.press(cta);
    });
    expect(mockReplace).toHaveBeenCalledWith('/build-a-plate');
  });

  it('treats a missing slug param as a 404-style empty state', async () => {
    mockUseLocalSearchParams.mockReturnValue({});

    const { findByText } = render(<SharedPlateDeepLinkScreen />);

    await findByText(/can't find that plate/i);
    expect(mockFetchBySlug).not.toHaveBeenCalled();
  });

  it('appends subsCount to the redirect when sub-count returns > 0', async () => {
    mockFetchBySlug.mockResolvedValue({
      data: {
        share: { id: 'share-1', slug: 'cozy-salmon-1234', plate: { id: 'plate-99' } },
      },
    });
    mockFetchSubCount.mockResolvedValueOnce({ data: { subsCount: 2 } });

    render(<SharedPlateDeepLinkScreen />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));
    expect(mockReplace.mock.calls[0][0]).toContain('subsCount=2');
  });

  it('omits subsCount when sub-count fetch fails (still redirects)', async () => {
    mockFetchBySlug.mockResolvedValue({
      data: {
        share: { id: 'share-1', slug: 'cozy-salmon-1234', plate: { id: 'plate-99' } },
      },
    });
    mockFetchSubCount.mockRejectedValueOnce(new Error('unauth'));

    render(<SharedPlateDeepLinkScreen />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));
    expect(mockReplace.mock.calls[0][0]).not.toContain('subsCount');
  });
});
