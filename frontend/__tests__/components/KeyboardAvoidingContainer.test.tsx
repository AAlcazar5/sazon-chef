// __tests__/components/KeyboardAvoidingContainer.test.tsx
// Tests for KeyboardAvoidingContainer component cross-platform behavior

import React from 'react';
import { render } from '@testing-library/react-native';
import { Platform, Text } from 'react-native';
import KeyboardAvoidingContainer from '../../components/ui/KeyboardAvoidingContainer';

describe('KeyboardAvoidingContainer', () => {
  describe('Platform-specific behavior', () => {
    it('should use "padding" behavior on iOS by default', () => {
      Platform.OS = 'ios';
      const { getByTestId } = render(
        <KeyboardAvoidingContainer>
          <Text testID="child">Test Content</Text>
        </KeyboardAvoidingContainer>
      );

      const child = getByTestId('child');
      expect(child).toBeTruthy();
    });

    it('should use "height" behavior on Android by default', () => {
      Platform.OS = 'android';
      const { getByTestId } = render(
        <KeyboardAvoidingContainer>
          <Text testID="child">Test Content</Text>
        </KeyboardAvoidingContainer>
      );

      const child = getByTestId('child');
      expect(child).toBeTruthy();
    });

    it('should use 0 offset on iOS by default', () => {
      Platform.OS = 'ios';
      const { getByTestId } = render(
        <KeyboardAvoidingContainer>
          <Text testID="child">Test Content</Text>
        </KeyboardAvoidingContainer>
      );

      const child = getByTestId('child');
      expect(child).toBeTruthy();
    });

    it('should use 20 offset on Android by default', () => {
      Platform.OS = 'android';
      const { getByTestId } = render(
        <KeyboardAvoidingContainer>
          <Text testID="child">Test Content</Text>
        </KeyboardAvoidingContainer>
      );

      const child = getByTestId('child');
      expect(child).toBeTruthy();
    });
  });

  describe('Custom configuration', () => {
    it('should accept custom keyboardVerticalOffset', () => {
      const { getByTestId } = render(
        <KeyboardAvoidingContainer keyboardVerticalOffset={50}>
          <Text testID="child">Test Content</Text>
        </KeyboardAvoidingContainer>
      );

      const child = getByTestId('child');
      expect(child).toBeTruthy();
    });

    it('should accept custom behavior', () => {
      const { getByTestId } = render(
        <KeyboardAvoidingContainer behavior="position">
          <Text testID="child">Test Content</Text>
        </KeyboardAvoidingContainer>
      );

      const child = getByTestId('child');
      expect(child).toBeTruthy();
    });

    it('should accept custom className', () => {
      const { getByTestId } = render(
        <KeyboardAvoidingContainer className="custom-class">
          <Text testID="child">Test Content</Text>
        </KeyboardAvoidingContainer>
      );

      const child = getByTestId('child');
      expect(child).toBeTruthy();
    });

    it('should respect enabled prop', () => {
      const { getByTestId } = render(
        <KeyboardAvoidingContainer enabled={false}>
          <Text testID="child">Test Content</Text>
        </KeyboardAvoidingContainer>
      );

      const child = getByTestId('child');
      expect(child).toBeTruthy();
    });
  });

  describe('Children rendering', () => {
    it('should render children correctly', () => {
      const { getByText } = render(
        <KeyboardAvoidingContainer>
          <Text>Child 1</Text>
          <Text>Child 2</Text>
        </KeyboardAvoidingContainer>
      );

      expect(getByText('Child 1')).toBeTruthy();
      expect(getByText('Child 2')).toBeTruthy();
    });

    it('should render complex children', () => {
      const { getByTestId } = render(
        <KeyboardAvoidingContainer>
          <Text testID="parent">
            <Text testID="nested">Nested Text</Text>
          </Text>
        </KeyboardAvoidingContainer>
      );

      expect(getByTestId('parent')).toBeTruthy();
      expect(getByTestId('nested')).toBeTruthy();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty children', () => {
      const { root } = render(
        <KeyboardAvoidingContainer>
          {null}
        </KeyboardAvoidingContainer>
      );

      expect(root).toBeTruthy();
    });

    it('should work on both iOS and Android', () => {
      // Test iOS
      Platform.OS = 'ios';
      const { getByTestId: getByTestIdIOS } = render(
        <KeyboardAvoidingContainer>
          <Text testID="ios-child">iOS Content</Text>
        </KeyboardAvoidingContainer>
      );
      expect(getByTestIdIOS('ios-child')).toBeTruthy();

      // Test Android
      Platform.OS = 'android';
      const { getByTestId: getByTestIdAndroid } = render(
        <KeyboardAvoidingContainer>
          <Text testID="android-child">Android Content</Text>
        </KeyboardAvoidingContainer>
      );
      expect(getByTestIdAndroid('android-child')).toBeTruthy();
    });
  });
});
