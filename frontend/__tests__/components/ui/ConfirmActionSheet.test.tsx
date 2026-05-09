import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ConfirmActionSheet from '../../../components/ui/ConfirmActionSheet';

describe('ConfirmActionSheet', () => {
  const baseProps = {
    visible: true,
    title: 'Wrap up shopping?',
    body: 'Any unfinished items will move to a new list.',
    confirmLabel: 'Yes, wrap up',
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    baseProps.onConfirm = jest.fn();
    baseProps.onCancel = jest.fn();
  });

  it('renders title and body when visible', () => {
    const { getByText } = render(<ConfirmActionSheet {...baseProps} />);
    expect(getByText('Wrap up shopping?')).toBeTruthy();
    expect(getByText('Any unfinished items will move to a new list.')).toBeTruthy();
  });

  it('renders confirm and cancel buttons with correct labels', () => {
    const { getByText } = render(<ConfirmActionSheet {...baseProps} />);
    expect(getByText('Yes, wrap up')).toBeTruthy();
    expect(getByText('Cancel')).toBeTruthy();
  });

  it('hides confirm label while loading (BrandButton swaps in spinner)', () => {
    const { queryByText } = render(
      <ConfirmActionSheet {...baseProps} loading loadingLabel="Wrapping up..." />,
    );
    // BrandButton swaps the label for a spinner when loading; both the
    // working-state and idle-state copy disappear from the visual tree.
    expect(queryByText('Yes, wrap up')).toBeNull();
    expect(queryByText('Wrapping up...')).toBeNull();
  });

  it('calls onConfirm when confirm is pressed', () => {
    const onConfirm = jest.fn();
    const { getByLabelText } = render(
      <ConfirmActionSheet {...baseProps} onConfirm={onConfirm} />,
    );
    fireEvent.press(getByLabelText('Yes, wrap up'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onCancel when cancel is pressed', () => {
    const onCancel = jest.fn();
    const { getByLabelText } = render(
      <ConfirmActionSheet {...baseProps} onCancel={onCancel} />,
    );
    fireEvent.press(getByLabelText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('honors a custom cancel label', () => {
    const { getByText } = render(
      <ConfirmActionSheet {...baseProps} cancelLabel="Never mind" />,
    );
    expect(getByText('Never mind')).toBeTruthy();
  });
});
