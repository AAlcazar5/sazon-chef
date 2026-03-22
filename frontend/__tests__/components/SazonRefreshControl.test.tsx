// frontend/__tests__/components/SazonRefreshControl.test.tsx
// Tests for the SazonRefreshControl custom pull-to-refresh component

import React from 'react';
import { render, act } from '@testing-library/react-native';
import { RefreshControl } from 'react-native';
import SazonRefreshControl from '../../components/ui/SazonRefreshControl';
import { Colors } from '../../constants/Colors';

// Helper to find RefreshControl instance in the tree
function getRefreshControlProps(root: any) {
  try {
    const rc = root.findByType(RefreshControl);
    return rc.props;
  } catch {
    return root.props;
  }
}

describe('SazonRefreshControl', () => {
  const mockOnRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { toJSON } = render(
      <SazonRefreshControl
        refreshing={false}
        onRefresh={mockOnRefresh}
        testID="refresh-control"
      />
    );
    expect(toJSON()).not.toBeNull();
  });

  it('passes refreshing prop to underlying RefreshControl', () => {
    const { UNSAFE_root } = render(
      <SazonRefreshControl
        refreshing={true}
        onRefresh={mockOnRefresh}
      />
    );
    const props = getRefreshControlProps(UNSAFE_root);
    expect(props.refreshing).toBe(true);
  });

  it('uses brand color tint', () => {
    const { UNSAFE_root } = render(
      <SazonRefreshControl
        refreshing={false}
        onRefresh={mockOnRefresh}
      />
    );
    const props = getRefreshControlProps(UNSAFE_root);
    expect(props.tintColor).toBe(Colors.primary);
    expect(props.colors).toEqual([Colors.primary, '#E85D04']);
  });

  it('calls onRefresh callback when triggered', async () => {
    const { UNSAFE_root } = render(
      <SazonRefreshControl
        refreshing={false}
        onRefresh={mockOnRefresh}
      />
    );
    const props = getRefreshControlProps(UNSAFE_root);
    await act(async () => {
      props.onRefresh();
    });
    expect(mockOnRefresh).toHaveBeenCalledTimes(1);
  });

  it('passes extra props through to RefreshControl', () => {
    const { UNSAFE_root } = render(
      <SazonRefreshControl
        refreshing={false}
        onRefresh={mockOnRefresh}
        progressViewOffset={50}
      />
    );
    const props = getRefreshControlProps(UNSAFE_root);
    expect(props.progressViewOffset).toBe(50);
  });

  it('passes testID to the RefreshControl', () => {
    const { UNSAFE_root } = render(
      <SazonRefreshControl
        refreshing={false}
        onRefresh={mockOnRefresh}
        testID="my-refresh"
      />
    );
    const props = getRefreshControlProps(UNSAFE_root);
    expect(props.testID).toBe('my-refresh');
  });

  it('renders correctly when refreshing is false', () => {
    const { UNSAFE_root } = render(
      <SazonRefreshControl
        refreshing={false}
        onRefresh={mockOnRefresh}
      />
    );
    const props = getRefreshControlProps(UNSAFE_root);
    expect(props.refreshing).toBe(false);
  });
});
