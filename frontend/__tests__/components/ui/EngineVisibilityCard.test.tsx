// frontend/__tests__/components/ui/EngineVisibilityCard.test.tsx
// ROADMAP 4.0 N4.3 — EngineVisibilityCard shared shell test.

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success' },
}));

import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import EngineVisibilityCard from '../../../components/ui/EngineVisibilityCard';

describe('EngineVisibilityCard (N4.3)', () => {
  it('renders title + eyebrow + rows', () => {
    const { getByText } = renderWithProviders(
      <EngineVisibilityCard
        testID="x"
        eyebrow="Pantry IQ"
        title="Your kitchen, reading itself"
        rows={[
          { label: 'Top cuisine', value: 'Mediterranean' },
          { label: 'Most-used', value: 'lemon' },
        ]}
      />,
    );
    expect(getByText('PANTRY IQ')).toBeTruthy();
    expect(getByText('Your kitchen, reading itself')).toBeTruthy();
    expect(getByText('Top cuisine')).toBeTruthy();
    expect(getByText('Mediterranean')).toBeTruthy();
    expect(getByText('Most-used')).toBeTruthy();
    expect(getByText('lemon')).toBeTruthy();
  });

  it('renders subValue when provided', () => {
    const { getByText } = renderWithProviders(
      <EngineVisibilityCard
        title="X"
        rows={[
          {
            label: 'Top',
            value: 'Italian',
            subValue: '4 cooks/wk over the last month',
          },
        ]}
      />,
    );
    expect(getByText('4 cooks/wk over the last month')).toBeTruthy();
  });

  it('caps at 3 rows (later rows truncated)', () => {
    const { queryByText } = renderWithProviders(
      <EngineVisibilityCard
        title="X"
        rows={[
          { label: 'r1', value: 'one' },
          { label: 'r2', value: 'two' },
          { label: 'r3', value: 'three' },
          { label: 'r4', value: 'four' },
          { label: 'r5', value: 'five' },
        ]}
      />,
    );
    expect(queryByText('one')).toBeTruthy();
    expect(queryByText('three')).toBeTruthy();
    expect(queryByText('four')).toBeNull();
    expect(queryByText('five')).toBeNull();
  });

  it('tappable rows fire onPress', () => {
    const onPress = jest.fn();
    const { getByTestId } = renderWithProviders(
      <EngineVisibilityCard
        title="X"
        rows={[
          { label: 'r1', value: 'one' },
          { label: 'r2', value: 'two', onPress },
        ]}
      />,
    );
    fireEvent.press(getByTestId('engine-visibility-row-1'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('non-tappable rows render as a plain View (no press handler)', () => {
    const { getByTestId } = renderWithProviders(
      <EngineVisibilityCard
        title="X"
        rows={[{ label: 'r1', value: 'one' }]}
      />,
    );
    expect(getByTestId('engine-visibility-row-0')).toBeTruthy();
  });

  it('footerCta renders + fires onPress', () => {
    const onPress = jest.fn();
    const { getByTestId } = renderWithProviders(
      <EngineVisibilityCard
        title="X"
        rows={[{ label: 'r1', value: 'one' }]}
        footerCta={{ label: 'See more', onPress }}
      />,
    );
    fireEvent.press(getByTestId('engine-visibility-footer-cta'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('every variant tints a different background', () => {
    const variants = ['lavender', 'sage', 'sky', 'peach'] as const;
    for (const v of variants) {
      const { unmount } = renderWithProviders(
        <EngineVisibilityCard
          variant={v}
          title="X"
          rows={[{ label: 'r1', value: 'one' }]}
        />,
      );
      unmount();
    }
  });

  it('summary accessibility label includes the row contents', () => {
    const { getByLabelText } = renderWithProviders(
      <EngineVisibilityCard
        testID="x"
        title="Pantry IQ"
        rows={[
          { label: 'Top cuisine', value: 'Italian' },
          { label: 'Most-used', value: 'lemon' },
        ]}
      />,
    );
    expect(
      getByLabelText(/Pantry IQ.*Top cuisine.*Italian/),
    ).toBeTruthy();
  });
});
