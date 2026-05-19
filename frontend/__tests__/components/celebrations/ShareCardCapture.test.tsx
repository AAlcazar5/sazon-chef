// frontend/__tests__/components/celebrations/ShareCardCapture.test.tsx
// ROADMAP 4.0 DS10.3 — share-card watermark verification.
// Confirms the brand watermark is rendered in capture mode (the only render
// path the component supports today — capture is its sole purpose).

import React from 'react';
import { render } from '@testing-library/react-native';
import ShareCardCapture from '../../../components/celebrations/ShareCardCapture';

jest.mock('react-native-view-shot', () => {
  const RN = require('react-native');
  const ReactInner = require('react');
  return ReactInner.forwardRef((props: any, _ref: any) =>
    ReactInner.createElement(RN.View, {}, props.children),
  );
});

jest.mock('expo-image', () => {
  const RN = require('react-native');
  const ReactInner = require('react');
  return {
    Image: (props: any) => ReactInner.createElement(RN.View, { style: props.style, testID: props.testID }),
  };
});

jest.mock('expo-linear-gradient', () => {
  const RN = require('react-native');
  const ReactInner = require('react');
  return {
    LinearGradient: (props: any) =>
      ReactInner.createElement(RN.View, { style: props.style }, props.children),
  };
});

describe('DS10.3 — Share-card brand watermark', () => {
  it('renders a brand watermark with "Sazon" wordmark', () => {
    const { getByText } = render(
      <ShareCardCapture title="Glazed Bites" cookTime={20} calories={420} protein={32} />,
    );
    expect(getByText(/Sazon/)).toBeTruthy();
  });

  it('renders the recipe title', () => {
    const { getByText } = render(<ShareCardCapture title="Persian Fesenjan" />);
    expect(getByText('Persian Fesenjan')).toBeTruthy();
  });

  it('renders without crashing when imageUrl is omitted (placeholder path)', () => {
    expect(() => render(<ShareCardCapture title="Plain card" />)).not.toThrow();
  });

  it('watermark is brand-positive — never says "Failed", "Error", or punitive copy', () => {
    const { queryByText } = render(<ShareCardCapture title="Card" />);
    expect(queryByText(/Failed|Error|Invalid/i)).toBeNull();
  });
});
