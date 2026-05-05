// frontend/__tests__/components/celebrations/DiscoveryMilestoneInline.test.tsx
// ROADMAP 4.0 Tier J5 — Discovery milestone inline celebration (TDD).

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    colors: {
      background: '#FAF7F4',
      text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    },
  }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import DiscoveryMilestoneInline from '../../../components/celebrations/DiscoveryMilestoneInline';

describe('<DiscoveryMilestoneInline />', () => {
  it('renders nothing when key is null', () => {
    const { queryByTestId } = render(<DiscoveryMilestoneInline milestoneKey={null} />);
    expect(queryByTestId('discovery-milestone-inline')).toBeNull();
  });

  it('renders sparkle + first-photo title + body', () => {
    const { getByTestId, getByText } = render(
      <DiscoveryMilestoneInline milestoneKey="first-photo" />
    );
    expect(getByTestId('discovery-milestone-inline')).toBeTruthy();
    expect(getByText(/first plate/i)).toBeTruthy();
    expect(getByText(/the kitchen has memory/i)).toBeTruthy();
  });

  it('renders the appliance label inline (Ninja Creami)', () => {
    const { getAllByText } = render(
      <DiscoveryMilestoneInline milestoneKey="first-appliance:ninja-creami" />
    );
    expect(getAllByText(/ninja creami/i).length).toBeGreaterThan(0);
  });

  it('renders the appliance label inline (Air Fryer)', () => {
    const { getAllByText } = render(
      <DiscoveryMilestoneInline milestoneKey="first-appliance:air-fryer" />
    );
    expect(getAllByText(/air fryer/i).length).toBeGreaterThan(0);
  });

  it('renders nothing for an unknown milestone key', () => {
    const { queryByTestId } = render(
      <DiscoveryMilestoneInline milestoneKey="first-streak" />
    );
    expect(queryByTestId('discovery-milestone-inline')).toBeNull();
  });

  it('exposes accessibilityRole="summary" + label that includes the title', () => {
    const { getByTestId } = render(
      <DiscoveryMilestoneInline milestoneKey="first-leftover" />
    );
    const card = getByTestId('discovery-milestone-inline');
    expect(card.props.accessibilityRole).toBe('summary');
    expect(card.props.accessibilityLabel).toMatch(/leftover/i);
  });
});
