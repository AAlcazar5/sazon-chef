// frontend/__tests__/components/coach/MessageBubble.test.tsx
// 10Y-B: Coach chat message bubble — pastel tints, markdown, "Read more" collapse.

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MessageBubble from '../../../components/coach/MessageBubble';
import { Pastel } from '../../../constants/Colors';

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

const flattenStyle = (style: any): Record<string, unknown> => {
  if (!style) return {};
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>((acc, s) => ({ ...acc, ...flattenStyle(s) }), {});
  }
  return style as Record<string, unknown>;
};

describe('MessageBubble', () => {
  it('assistant bubble has sage pastel bg and left alignment', () => {
    const { getByTestId } = render(
      <MessageBubble role="assistant" content="hi there" />
    );
    const bubble = getByTestId('coach-bubble-assistant');
    const wrapper = getByTestId('coach-bubble-wrapper');
    const bubbleStyle = flattenStyle(bubble.props.style);
    const wrapperStyle = flattenStyle(wrapper.props.style);
    expect(bubbleStyle.backgroundColor).toBe(Pastel.sage);
    expect(wrapperStyle.alignSelf).toBe('flex-start');
  });

  it('user bubble has blush pastel bg and right alignment', () => {
    const { getByTestId } = render(
      <MessageBubble role="user" content="What's for dinner?" />
    );
    const bubble = getByTestId('coach-bubble-user');
    const wrapper = getByTestId('coach-bubble-wrapper');
    const bubbleStyle = flattenStyle(bubble.props.style);
    const wrapperStyle = flattenStyle(wrapper.props.style);
    expect(bubbleStyle.backgroundColor).toBe(Pastel.blush);
    expect(wrapperStyle.alignSelf).toBe('flex-end');
  });

  it('renders markdown list bullets', () => {
    const content = 'Try these:\n* Chicken thighs\n* Brown rice\n* Broccoli';
    const { getByText } = render(
      <MessageBubble role="assistant" content={content} />
    );
    expect(getByText(/Chicken thighs/)).toBeTruthy();
    expect(getByText(/Brown rice/)).toBeTruthy();
    expect(getByText(/Broccoli/)).toBeTruthy();
  });

  it('renders markdown bold inline', () => {
    const { getByText } = render(
      <MessageBubble role="assistant" content="That is **important** advice." />
    );
    expect(getByText('important')).toBeTruthy();
  });

  it('shows "Read more" pill for long content (>480 chars)', () => {
    const longContent = 'a'.repeat(500);
    const { getByText } = render(
      <MessageBubble role="assistant" content={longContent} />
    );
    expect(getByText('Read more')).toBeTruthy();
  });

  it('does not show "Read more" for short content', () => {
    const { queryByText } = render(
      <MessageBubble role="assistant" content="short reply" />
    );
    expect(queryByText('Read more')).toBeNull();
  });

  it('expands when "Read more" pressed', () => {
    const longContent = 'a'.repeat(500);
    const { getByText, queryByText } = render(
      <MessageBubble role="assistant" content={longContent} />
    );
    fireEvent.press(getByText('Read more'));
    expect(queryByText('Read more')).toBeNull();
  });

  it('renders accessibilityLabel', () => {
    const { getByLabelText } = render(
      <MessageBubble role="user" content="hello" />
    );
    expect(getByLabelText(/Your message/i)).toBeTruthy();
  });
});
