// frontend/components/ui/TypeText.tsx
//
// ROADMAP 4.0 DS4.6 — opinionated <Text> wrapper that resolves a Type token
// kind into the matching style + sensible numberOfLines defaults.
//
// Usage:
//   <TypeText kind="display">Eat the world.</TypeText>
//   <TypeText kind="body" numberOfLines={3}>Long copy…</TypeText>

import React from 'react';
import { Text, TextProps, TextStyle, StyleProp } from 'react-native';
import { Type } from '../../constants/tokens';

export type TypeKind = keyof typeof Type;

const NUMBER_OF_LINES_DEFAULT: Partial<Record<TypeKind, number | undefined>> = {
  display: 1,
  displayLg: 1,
  displayMd: 2,
  headingLg: 2,
  heading: 2,
  headingSm: 2,
  // body / caption / label / etc. → unlimited (undefined)
};

export interface TypeTextProps extends TextProps {
  kind: TypeKind;
  style?: StyleProp<TextStyle>;
}

export const TypeText: React.FC<TypeTextProps> = ({
  kind,
  style,
  numberOfLines,
  children,
  ...rest
}) => {
  const base = Type[kind] as TextStyle;
  const defaultLines = NUMBER_OF_LINES_DEFAULT[kind];
  return (
    <Text
      {...rest}
      numberOfLines={numberOfLines ?? defaultLines}
      style={[base, style]}
    >
      {children}
    </Text>
  );
};

export default TypeText;
