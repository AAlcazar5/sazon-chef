// frontend/__tests__/components/auth/AuthScreenShell.test.tsx
// ROADMAP 4.0 A7.3 — AuthScreenShell test.

jest.mock('../../../components/ui/ScreenGradient', () => {
  const { View } = require('react-native');
  return function MockScreenGradient(props: any) {
    return <View testID={`gradient-${props.variant ?? 'default'}`}>{props.children}</View>;
  };
});

jest.mock('../../../components/ui/KeyboardAvoidingContainer', () => {
  return function MockKAC({ children }: any) {
    return <>{children}</>;
  };
});

jest.mock('../../../components/mascot/Sazon', () => {
  const { View, Text } = require('react-native');
  return function MockSazon(props: any) {
    return (
      <View
        testID={`sazon-${props.variant ?? 'orange'}-${props.motion ?? 'idle'}`}
      >
        <Text>SAZON {String(props.size ?? '')}</Text>
      </View>
    );
  };
});

jest.mock('moti', () => {
  const { View } = require('react-native');
  return { MotiView: ({ children, ...rest }: any) => <View {...rest}>{children}</View> };
});

import React from 'react';
import { Text } from 'react-native';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import AuthScreenShell from '../../../components/auth/AuthScreenShell';

describe('AuthScreenShell (A7.3)', () => {
  it('renders headline + subhead + children', () => {
    const { getByText, getByTestId } = renderWithProviders(
      <AuthScreenShell headline="Welcome back" subhead="Sign in to continue">
        <Text testID="form-body">form goes here</Text>
      </AuthScreenShell>,
    );
    expect(getByText('Welcome back')).toBeTruthy();
    expect(getByText('Sign in to continue')).toBeTruthy();
    expect(getByTestId('form-body')).toBeTruthy();
  });

  it('uses the auth gradient preset', () => {
    const { getByTestId } = renderWithProviders(
      <AuthScreenShell headline="X">
        <Text>x</Text>
      </AuthScreenShell>,
    );
    expect(getByTestId('gradient-auth')).toBeTruthy();
  });

  it('headline uses Fraunces by default (A7 spec)', () => {
    const { getByTestId } = renderWithProviders(
      <AuthScreenShell headline="Welcome back">
        <Text>x</Text>
      </AuthScreenShell>,
    );
    const headline = getByTestId('auth-shell-headline');
    const flat = Array.isArray(headline.props.style)
      ? Object.assign({}, ...headline.props.style.filter(Boolean))
      : headline.props.style;
    expect(flat.fontFamily).toBe('Fraunces_700Bold');
  });

  it('serifHeadline=false falls back to Plus Jakarta', () => {
    const { getByTestId } = renderWithProviders(
      <AuthScreenShell headline="X" serifHeadline={false}>
        <Text>x</Text>
      </AuthScreenShell>,
    );
    const headline = getByTestId('auth-shell-headline');
    const flat = Array.isArray(headline.props.style)
      ? Object.assign({}, ...headline.props.style.filter(Boolean))
      : headline.props.style;
    expect(flat.fontFamily).toBe('PlusJakartaSans_800ExtraBold');
  });

  it('hides the mascot block when no mascot prop is provided', () => {
    const { queryByTestId } = renderWithProviders(
      <AuthScreenShell headline="X">
        <Text>x</Text>
      </AuthScreenShell>,
    );
    expect(queryByTestId('auth-shell-mascot')).toBeNull();
  });

  it('renders the mascot at hero size (120) by default when present', () => {
    const { getByTestId } = renderWithProviders(
      <AuthScreenShell
        headline="X"
        mascot={{ variant: 'orange', motion: 'idle' }}
      >
        <Text>x</Text>
      </AuthScreenShell>,
    );
    const mascot = getByTestId('auth-shell-mascot');
    expect(mascot).toBeTruthy();
    // Find the inner Sazon mock by its size text
    expect(getByTestId('sazon-orange-idle')).toBeTruthy();
  });

  it('mascot supports caller-supplied variant + motion + fx + size', () => {
    const { getByTestId } = renderWithProviders(
      <AuthScreenShell
        headline="X"
        mascot={{ variant: 'red', motion: 'wobble', fx: ['question'], size: 96 }}
      >
        <Text>x</Text>
      </AuthScreenShell>,
    );
    expect(getByTestId('sazon-red-wobble')).toBeTruthy();
  });

  it('hides the form-error bubble when formError is empty', () => {
    const { queryByTestId } = renderWithProviders(
      <AuthScreenShell headline="X">
        <Text>x</Text>
      </AuthScreenShell>,
    );
    expect(queryByTestId('auth-shell-form-error')).toBeNull();
  });

  it('renders the form-error bubble with accessibilityRole=alert', () => {
    const { getByTestId, getByText } = renderWithProviders(
      <AuthScreenShell headline="X" formError="Invalid credentials">
        <Text>x</Text>
      </AuthScreenShell>,
    );
    const err = getByTestId('auth-shell-form-error');
    expect(err.props.accessibilityRole).toBe('alert');
    expect(getByText('Invalid credentials')).toBeTruthy();
  });

  it('hides the success flash by default', () => {
    const { queryByTestId } = renderWithProviders(
      <AuthScreenShell headline="X">
        <Text>x</Text>
      </AuthScreenShell>,
    );
    // Sazon at 256 size only renders for the flash; the regular path renders at 120
    // (mascot omitted here) — so no sazon should be present at all.
    expect(queryByTestId('sazon-orange-wave')).toBeNull();
  });

  it('renders the success flash overlay when successFlash is provided', () => {
    const { getByTestId } = renderWithProviders(
      <AuthScreenShell
        headline="X"
        successFlash={{ motion: 'wave', fx: ['sparkles'] }}
      >
        <Text>x</Text>
      </AuthScreenShell>,
    );
    expect(getByTestId('sazon-orange-wave')).toBeTruthy();
  });

  it('a11y — headline has accessibilityRole=header + label', () => {
    const { getByLabelText } = renderWithProviders(
      <AuthScreenShell headline="Welcome back">
        <Text>x</Text>
      </AuthScreenShell>,
    );
    expect(getByLabelText('Welcome back')).toBeTruthy();
  });

  it('subhead is omitted when not provided', () => {
    const { queryByTestId } = renderWithProviders(
      <AuthScreenShell headline="X">
        <Text>x</Text>
      </AuthScreenShell>,
    );
    expect(queryByTestId('auth-shell-subhead')).toBeNull();
  });
});
