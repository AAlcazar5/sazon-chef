// Phase 5 (10Y-E): AttachmentBar — pending photo thumbs above the composer.

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AttachmentBar from '../../../components/coach/AttachmentBar';
import type { PendingCoachAttachment } from '../../../hooks/useCoachAttachments';

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

function makeAttachment(id: string): PendingCoachAttachment {
  return {
    id,
    uri: `file://photo-${id}.jpg`,
    base64: 'AAAA',
    mediaType: 'image/jpeg',
  };
}

describe('AttachmentBar', () => {
  it('renders nothing when there are no attachments', () => {
    const { toJSON } = render(<AttachmentBar attachments={[]} onRemove={() => {}} />);
    expect(toJSON()).toBeNull();
  });

  it('renders one thumbnail per attachment', () => {
    const { getAllByLabelText } = render(
      <AttachmentBar
        attachments={[makeAttachment('a'), makeAttachment('b')]}
        onRemove={() => {}}
      />,
    );
    expect(getAllByLabelText('Pending photo attachment')).toHaveLength(2);
  });

  it('shows "n/4" capacity indicator', () => {
    const { getByText } = render(
      <AttachmentBar
        attachments={[makeAttachment('a'), makeAttachment('b'), makeAttachment('c')]}
        onRemove={() => {}}
      />,
    );
    expect(getByText('3/4')).toBeTruthy();
  });

  it('invokes onRemove with the attachment id when × is tapped', () => {
    const onRemove = jest.fn();
    const { getAllByLabelText } = render(
      <AttachmentBar
        attachments={[makeAttachment('first'), makeAttachment('second')]}
        onRemove={onRemove}
      />,
    );
    const removeBtns = getAllByLabelText('Remove photo attachment');
    fireEvent.press(removeBtns[1]);
    expect(onRemove).toHaveBeenCalledWith('second');
  });

  it('renders 4 thumbs at the cap', () => {
    const { getAllByLabelText, getByText } = render(
      <AttachmentBar
        attachments={[
          makeAttachment('a'),
          makeAttachment('b'),
          makeAttachment('c'),
          makeAttachment('d'),
        ]}
        onRemove={() => {}}
      />,
    );
    expect(getAllByLabelText('Pending photo attachment')).toHaveLength(4);
    expect(getByText('4/4')).toBeTruthy();
  });
});
