// ROADMAP 4.0 RD6.2 — DiscoveryInsightLine tests.

import React from 'react';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import DiscoveryInsightLine from '../../../components/recipe/DiscoveryInsightLine';

describe('DiscoveryInsightLine (RD6.2)', () => {
  it('renders nothing when insight is null', () => {
    const { queryByTestId } = renderWithProviders(<DiscoveryInsightLine insight={null} />);
    expect(queryByTestId('discovery-insight-line')).toBeNull();
  });

  it('renders nothing when insight.line is empty', () => {
    const { queryByTestId } = renderWithProviders(
      <DiscoveryInsightLine insight={{ line: '' }} />,
    );
    expect(queryByTestId('discovery-insight-line')).toBeNull();
  });

  it('renders the line as a single italic text', () => {
    const { getByTestId, getByText } = renderWithProviders(
      <DiscoveryInsightLine
        insight={{ line: "First time you'd cook with sumac.", rule: 'first_with_ingredient' }}
      />,
    );
    const node = getByTestId('discovery-insight-line');
    expect(node).toBeTruthy();
    expect(getByText("First time you'd cook with sumac.")).toBeTruthy();
    expect(node.props.numberOfLines).toBe(1);
  });

  it('emitted prose contains no banned vocabulary', () => {
    const { queryByText } = renderWithProviders(
      <DiscoveryInsightLine
        insight={{ line: 'High in iron compared to your usual Italian.' }}
      />,
    );
    expect(queryByText(/should/i)).toBeNull();
    expect(queryByText(/deficient/i)).toBeNull();
    expect(queryByText(/low in/i)).toBeNull();
  });
});
