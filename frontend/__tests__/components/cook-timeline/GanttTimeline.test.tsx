// frontend/__tests__/components/cook-timeline/GanttTimeline.test.tsx
// Group 10X Phase 3 — Gantt timeline component tests.

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', isDark: false, colors: {} }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import GanttTimeline from '../../../components/cook-timeline/GanttTimeline';
import type { ParallelTimeline } from '../../../lib/api';

const TIMELINE_TWO_COMPONENTS: ParallelTimeline = {
  totalMinutes: 30,
  events: [
    { componentId: 'comp-1', name: 'Farro', action: 'start', atMinuteFromStart: 0, equipmentUsed: ['stovetop_burner'] },
    { componentId: 'comp-2', name: 'Salmon', action: 'start', atMinuteFromStart: 10, equipmentUsed: ['pan_sear'] },
    { componentId: 'comp-1', name: 'Farro', action: 'finish', atMinuteFromStart: 25, equipmentUsed: ['stovetop_burner'] },
    { componentId: 'comp-2', name: 'Salmon', action: 'plate', atMinuteFromStart: 30, equipmentUsed: ['pan_sear'] },
  ],
  equipmentConflicts: [],
};

const TIMELINE_WITH_CONFLICT: ParallelTimeline = {
  totalMinutes: 20,
  events: [
    { componentId: 'comp-a', name: 'Chicken', action: 'start', atMinuteFromStart: 0, equipmentUsed: ['oven'] },
    { componentId: 'comp-b', name: 'Vegetables', action: 'start', atMinuteFromStart: 5, equipmentUsed: ['oven'] },
    { componentId: 'comp-a', name: 'Chicken', action: 'plate', atMinuteFromStart: 20, equipmentUsed: ['oven'] },
    { componentId: 'comp-b', name: 'Vegetables', action: 'plate', atMinuteFromStart: 20, equipmentUsed: ['oven'] },
  ],
  equipmentConflicts: [
    { equipment: 'oven', overlappingComponentIds: ['comp-a', 'comp-b'] },
  ],
};

describe('GanttTimeline', () => {
  it('renders one row per unique componentId', () => {
    const { getByTestId } = render(
      <GanttTimeline
        timeline={TIMELINE_TWO_COMPONENTS}
        activeMinute={0}
        testID="gantt"
      />,
    );
    expect(getByTestId('gantt-row-comp-1')).toBeTruthy();
    expect(getByTestId('gantt-row-comp-2')).toBeTruthy();
  });

  it('renders the component name labels', () => {
    const { getByText } = render(
      <GanttTimeline
        timeline={TIMELINE_TWO_COMPONENTS}
        activeMinute={0}
        testID="gantt"
      />,
    );
    expect(getByText('Farro')).toBeTruthy();
    expect(getByText('Salmon')).toBeTruthy();
  });

  it('renders the active marker at the correct position', () => {
    const { getByTestId } = render(
      <GanttTimeline
        timeline={TIMELINE_TWO_COMPONENTS}
        activeMinute={15}
        testID="gantt"
      />,
    );
    expect(getByTestId('gantt-active-marker')).toBeTruthy();
  });

  it('does NOT render equipment conflict badge when no conflicts', () => {
    const { queryByTestId } = render(
      <GanttTimeline
        timeline={TIMELINE_TWO_COMPONENTS}
        activeMinute={0}
        testID="gantt"
      />,
    );
    expect(queryByTestId('gantt-conflict-badge')).toBeNull();
  });

  it('renders equipment conflict badge when equipmentConflicts is non-empty', () => {
    const { getByTestId } = render(
      <GanttTimeline
        timeline={TIMELINE_WITH_CONFLICT}
        activeMinute={0}
        testID="gantt"
      />,
    );
    expect(getByTestId('gantt-conflict-badge')).toBeTruthy();
  });

  it('renders an active bar segment for a component within its window', () => {
    const { getByTestId } = render(
      <GanttTimeline
        timeline={TIMELINE_TWO_COMPONENTS}
        activeMinute={12}
        testID="gantt"
      />,
    );
    expect(getByTestId('gantt-bar-comp-2-active')).toBeTruthy();
  });

  it('renders an inactive bar segment for a component outside its window', () => {
    const { queryByTestId } = render(
      <GanttTimeline
        timeline={TIMELINE_TWO_COMPONENTS}
        activeMinute={5}
        testID="gantt"
      />,
    );
    expect(queryByTestId('gantt-bar-comp-2-active')).toBeNull();
  });

  it('calls onActiveBoundary when activeMinute hits an event', () => {
    const onBoundary = jest.fn();
    const { rerender } = render(
      <GanttTimeline
        timeline={TIMELINE_TWO_COMPONENTS}
        activeMinute={9}
        onActiveBoundary={onBoundary}
        testID="gantt"
      />,
    );

    rerender(
      <GanttTimeline
        timeline={TIMELINE_TWO_COMPONENTS}
        activeMinute={10}
        onActiveBoundary={onBoundary}
        testID="gantt"
      />,
    );

    expect(onBoundary).toHaveBeenCalledWith(
      expect.objectContaining({ componentId: 'comp-2', atMinuteFromStart: 10 }),
    );
  });
});
