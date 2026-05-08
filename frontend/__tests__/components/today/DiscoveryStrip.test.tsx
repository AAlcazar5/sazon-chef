// HX3.2 — DiscoveryStrip shell tests.

import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import {
  DiscoveryStrip,
  filterAndSort,
  type DiscoverySurface,
} from '../../../components/today/DiscoveryStrip';

const surface = (
  id: DiscoverySurface['id'],
  hasData: boolean,
  priority?: number
): DiscoverySurface => ({
  id,
  node: <Text testID={`body-${id}`}>{id}-body</Text>,
  hasData,
  priority,
});

describe('filterAndSort (pure)', () => {
  it('drops surfaces with hasData=false', () => {
    const out = filterAndSort([
      surface('firstOfDay', true),
      surface('nutrition', false),
      surface('seasonalProduce', true),
    ]);
    expect(out.map((s) => s.id)).toEqual(['firstOfDay', 'seasonalProduce']);
  });

  it('orders by priority asc, then by input order on ties', () => {
    const out = filterAndSort([
      surface('firstOfDay', true, 30),
      surface('nutrition', true, 10),
      surface('seasonalProduce', true, 20),
      surface('cohortSocialProof', true, 10), // tie with nutrition
    ]);
    expect(out.map((s) => s.id)).toEqual([
      'nutrition',
      'cohortSocialProof', // tie broken by input order
      'seasonalProduce',
      'firstOfDay',
    ]);
  });

  it('preserves input order when no priorities are set', () => {
    const out = filterAndSort([
      surface('seasonalProduce', true),
      surface('todayDiscovery', true),
      surface('firstOfDay', true),
    ]);
    expect(out.map((s) => s.id)).toEqual([
      'seasonalProduce',
      'todayDiscovery',
      'firstOfDay',
    ]);
  });

  it('returns empty array on all-empty input', () => {
    expect(
      filterAndSort([
        surface('firstOfDay', false),
        surface('nutrition', false),
      ])
    ).toEqual([]);
  });
});

describe('DiscoveryStrip component', () => {
  it('renders one slot per visible surface', () => {
    const { queryByTestId } = render(
      <DiscoveryStrip
        surfaces={[
          surface('firstOfDay', true),
          surface('nutrition', false),
          surface('seasonalProduce', true),
          surface('todayDiscovery', true),
        ]}
      />
    );
    expect(queryByTestId('discovery-card-firstOfDay')).toBeTruthy();
    expect(queryByTestId('discovery-card-nutrition')).toBeNull();
    expect(queryByTestId('discovery-card-seasonalProduce')).toBeTruthy();
    expect(queryByTestId('discovery-card-todayDiscovery')).toBeTruthy();
  });

  it('renders the strip container only when something is visible', () => {
    const { queryByTestId } = render(
      <DiscoveryStrip
        surfaces={[
          surface('firstOfDay', false),
          surface('nutrition', false),
        ]}
      />
    );
    expect(queryByTestId('discovery-strip')).toBeNull();
  });

  it('returns null on completely empty surfaces array', () => {
    const { queryByTestId } = render(<DiscoveryStrip surfaces={[]} />);
    expect(queryByTestId('discovery-strip')).toBeNull();
  });

  it('embeds the provided node body inside the slot', () => {
    const { queryByTestId } = render(
      <DiscoveryStrip
        surfaces={[surface('firstOfDay', true), surface('nutrition', true)]}
      />
    );
    expect(queryByTestId('body-firstOfDay')).toBeTruthy();
    expect(queryByTestId('body-nutrition')).toBeTruthy();
  });

  it('respects priority order in render', () => {
    const { UNSAFE_getAllByType } = render(
      <DiscoveryStrip
        surfaces={[
          surface('firstOfDay', true, 30),
          surface('nutrition', true, 10),
          surface('seasonalProduce', true, 20),
        ]}
      />
    );
    // Find the slot views in render order — should match priority sort
    // We'll inspect the rendered tree via testIDs in DOM order
    const tree = UNSAFE_getAllByType(require('react-native').View);
    const slotIds = tree
      .map((node) => node.props.testID as string | undefined)
      .filter((id): id is string => !!id && id.startsWith('discovery-card-'));
    expect(slotIds).toEqual([
      'discovery-card-nutrition',
      'discovery-card-seasonalProduce',
      'discovery-card-firstOfDay',
    ]);
  });
});
