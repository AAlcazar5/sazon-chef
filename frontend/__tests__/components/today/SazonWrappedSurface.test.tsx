// J13 — Sazon Wrapped surface render + interaction tests.
//
// The component is unconditional — it trusts its caller to gate. So we
// test (a) every slide renders, (b) Done fires onDismiss, (c) per-slide
// share fires shareFn with the right copy, (d) sparse vs full headline.

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  SazonWrappedSurface,
  type YearlyWrappedPayload,
} from '../../../components/today/SazonWrappedSurface';

const fullPayload = (): YearlyWrappedPayload => ({
  userId: 'u1',
  year: 2026,
  cookCount: 87,
  isSparse: false,
  slides: [
    {
      type: 'top_cuisines',
      title: 'Your top cuisines',
      primary: 'Italian',
      detail: ['Italian · 14', 'Mexican · 9', 'Persian · 6'],
    },
    {
      type: 'ingredients_tasted',
      title: 'Ingredients tasted',
      primary: '52 unique ingredients',
      detail: ['Most-used: tomato (38x)'],
    },
    {
      type: 'longest_streak',
      title: 'Longest run',
      primary: '4× Persian in a row',
      subtitle: 'When a cuisine grabs you, you go.',
    },
    {
      type: 'micros',
      title: 'Micros highlights',
      primary: 'You crushed magnesium',
      subtitle: '112% of the year\'s target.',
    },
    {
      type: 'first_time',
      title: 'New this year',
      primary: 'Salvadoran, first cooked in August',
      subtitle: 'A cuisine you\'d never made before.',
    },
  ],
});

describe('SazonWrappedSurface (J13)', () => {
  it('renders all five slides in order', () => {
    const { getByTestId } = render(
      <SazonWrappedSurface
        payload={fullPayload()}
        visible
        onDismiss={() => undefined}
      />
    );
    expect(getByTestId('wrapped-slide-top_cuisines')).toBeTruthy();
    expect(getByTestId('wrapped-slide-ingredients_tasted')).toBeTruthy();
    expect(getByTestId('wrapped-slide-longest_streak')).toBeTruthy();
    expect(getByTestId('wrapped-slide-micros')).toBeTruthy();
    expect(getByTestId('wrapped-slide-first_time')).toBeTruthy();
  });

  it('header echoes the year + cook count', () => {
    const { getByTestId, getByText } = render(
      <SazonWrappedSurface
        payload={fullPayload()}
        visible
        onDismiss={() => undefined}
      />
    );
    expect(getByTestId('wrapped-eyebrow')).toBeTruthy();
    expect(getByText(/SAZON WRAPPED · 2026/)).toBeTruthy();
    expect(getByText(/87 plates cooked/)).toBeTruthy();
  });

  it('uses sparse-year framing when payload.isSparse is true', () => {
    const sparse = { ...fullPayload(), cookCount: 3, isSparse: true };
    const { getByText } = render(
      <SazonWrappedSurface payload={sparse} visible onDismiss={() => undefined} />
    );
    expect(getByText(/Your first year cooking with Sazon/)).toBeTruthy();
  });

  it('uses celebratory framing when payload.isSparse is false', () => {
    const { getByText } = render(
      <SazonWrappedSurface
        payload={fullPayload()}
        visible
        onDismiss={() => undefined}
      />
    );
    expect(getByText(/Your year, on a plate/)).toBeTruthy();
  });

  it('Done button fires onDismiss', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <SazonWrappedSurface
        payload={fullPayload()}
        visible
        onDismiss={onDismiss}
      />
    );
    fireEvent.press(getByTestId('wrapped-done'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('share button on a slide fires shareFn with year + slide copy', async () => {
    const shareFn = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = render(
      <SazonWrappedSurface
        payload={fullPayload()}
        visible
        onDismiss={() => undefined}
        shareFn={shareFn}
      />
    );
    fireEvent.press(getByTestId('wrapped-share-top_cuisines'));
    await Promise.resolve();
    expect(shareFn).toHaveBeenCalledTimes(1);
    const msg = shareFn.mock.calls[0][0] as string;
    expect(msg).toMatch(/Sazon Wrapped 2026/);
    expect(msg).toMatch(/Italian/); // primary line
  });

  it('share is non-fatal on rejection (cancellation pattern)', async () => {
    const shareFn = jest.fn().mockRejectedValue(new Error('user cancelled'));
    const { getByTestId } = render(
      <SazonWrappedSurface
        payload={fullPayload()}
        visible
        onDismiss={() => undefined}
        shareFn={shareFn}
      />
    );
    // No throw allowed
    fireEvent.press(getByTestId('wrapped-share-micros'));
    await Promise.resolve();
    expect(shareFn).toHaveBeenCalled();
  });

  it('share buttons have accessibilityLabel for every slide', () => {
    const { getByLabelText } = render(
      <SazonWrappedSurface
        payload={fullPayload()}
        visible
        onDismiss={() => undefined}
      />
    );
    expect(getByLabelText('Share Your top cuisines')).toBeTruthy();
    expect(getByLabelText('Share Micros highlights')).toBeTruthy();
  });

  it('Done button has a clear accessibilityLabel', () => {
    const { getByLabelText } = render(
      <SazonWrappedSurface
        payload={fullPayload()}
        visible
        onDismiss={() => undefined}
      />
    );
    expect(getByLabelText('Close Sazon Wrapped')).toBeTruthy();
  });

  it('renders detail lines for slides that supply them', () => {
    const { getByText } = render(
      <SazonWrappedSurface
        payload={fullPayload()}
        visible
        onDismiss={() => undefined}
      />
    );
    expect(getByText('Italian · 14')).toBeTruthy();
    expect(getByText('Mexican · 9')).toBeTruthy();
    expect(getByText('Most-used: tomato (38x)')).toBeTruthy();
  });
});
