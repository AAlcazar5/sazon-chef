import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import RecurringModalShell from '../../../components/meal-plan/RecurringModalShell';

describe('RecurringModalShell', () => {
  it('renders title and children when visible', () => {
    const { getByText } = render(
      <RecurringModalShell visible onClose={() => undefined} title="Set as Recurring">
        <Text>body content</Text>
      </RecurringModalShell>,
    );
    expect(getByText('Set as Recurring')).toBeTruthy();
    expect(getByText('body content')).toBeTruthy();
  });

  it('renders subtitle when provided', () => {
    const { getByText } = render(
      <RecurringModalShell
        visible
        onClose={() => undefined}
        title="Recurring Meals"
        subtitle="2 active rules"
      >
        <Text>body</Text>
      </RecurringModalShell>,
    );
    expect(getByText('2 active rules')).toBeTruthy();
  });

  it('omits subtitle when undefined', () => {
    const { queryByText } = render(
      <RecurringModalShell visible onClose={() => undefined} title="No Subtitle">
        <Text>body</Text>
      </RecurringModalShell>,
    );
    expect(queryByText('2 active rules')).toBeNull();
  });

  it('calls onClose when close button is pressed', () => {
    const onClose = jest.fn();
    const { getAllByLabelText } = render(
      <RecurringModalShell visible onClose={onClose} title="x">
        <Text>body</Text>
      </RecurringModalShell>,
    );
    // Both the backdrop touchable and the close button have label "Close".
    fireEvent.press(getAllByLabelText('Close')[0]);
    expect(onClose).toHaveBeenCalled();
  });
});
