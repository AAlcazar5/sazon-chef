import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { useEditorialText } from '../../hooks/useEditorialText';
import { EditorialFontFamily } from '../../constants/Typography';

function TestHarness() {
  const { DisplayText, SectionText, EyebrowText } = useEditorialText();
  return (
    <>
      <DisplayText testID="display">Tonight's picks.</DisplayText>
      <DisplayText testID="display-accent" accentWord="picks">Tonight's picks.</DisplayText>
      <SectionText testID="section">Quick picks</SectionText>
      <SectionText testID="section-accent" accentWord="picks">Quick picks</SectionText>
      <EyebrowText testID="eyebrow">most cooked</EyebrowText>
    </>
  );
}

function flattenStyle(style: unknown): Record<string, unknown> {
  return StyleSheet.flatten(style as never) ?? {};
}

describe('useEditorialText', () => {
  it('DisplayText renders with Fraunces font family', () => {
    const { getByTestId } = render(<TestHarness />);
    const flat = flattenStyle(getByTestId('display').props.style);
    expect(flat.fontFamily).toBe(EditorialFontFamily.display.regular);
  });

  it('DisplayText applies italic Fraunces to accent word', () => {
    const { getByTestId } = render(<TestHarness />);
    const el = getByTestId('display-accent');
    const children = React.Children.toArray(el.props.children);
    expect(children.length).toBeGreaterThanOrEqual(2);
  });

  it('SectionText renders with Fraunces font family', () => {
    const { getByTestId } = render(<TestHarness />);
    const flat = flattenStyle(getByTestId('section').props.style);
    expect(flat.fontFamily).toBe(EditorialFontFamily.display.regular);
  });

  it('SectionText handles italic accent word via accentWord prop', () => {
    const { getByTestId } = render(<TestHarness />);
    const el = getByTestId('section-accent');
    const children = React.Children.toArray(el.props.children);
    expect(children.length).toBeGreaterThanOrEqual(2);
  });

  it('EyebrowText renders with uppercase text transform', () => {
    const { getByTestId } = render(<TestHarness />);
    const flat = flattenStyle(getByTestId('eyebrow').props.style);
    expect(flat.textTransform).toBe('uppercase');
  });

  it('EyebrowText uses Plus Jakarta Sans extrabold', () => {
    const { getByTestId } = render(<TestHarness />);
    const flat = flattenStyle(getByTestId('eyebrow').props.style);
    expect(flat.fontFamily).toBe(EditorialFontFamily.body.extrabold);
  });
});
