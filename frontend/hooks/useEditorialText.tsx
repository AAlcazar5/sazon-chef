import React, { useMemo } from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { EditorialFontFamily, EditorialTypography } from '../constants/Typography';

interface EditorialTextProps extends TextProps {
  accentWord?: string;
}

function splitByAccentWord(text: string, accentWord: string): { before: string; accent: string; after: string } | null {
  const idx = text.toLowerCase().indexOf(accentWord.toLowerCase());
  if (idx === -1) return null;
  return {
    before: text.slice(0, idx),
    accent: text.slice(idx, idx + accentWord.length),
    after: text.slice(idx + accentWord.length),
  };
}

export function useEditorialText() {
  return useMemo(() => {
    function DisplayText({ children, accentWord, style, ...props }: EditorialTextProps) {
      const baseStyle: TextStyle = {
        fontFamily: EditorialFontFamily.display.regular,
        fontSize: EditorialTypography.display.fontSize,
        letterSpacing: EditorialTypography.display.letterSpacing,
        lineHeight: EditorialTypography.display.lineHeight,
      };

      if (accentWord && typeof children === 'string') {
        const parts = splitByAccentWord(children, accentWord);
        if (parts) {
          return (
            <Text style={[baseStyle, style]} {...props}>
              {parts.before}
              <Text style={{ fontFamily: EditorialFontFamily.displayItalic.bold }}>
                {parts.accent}
              </Text>
              {parts.after}
            </Text>
          );
        }
      }

      return <Text style={[baseStyle, style]} {...props}>{children}</Text>;
    }

    function SectionText({ children, accentWord, style, ...props }: EditorialTextProps) {
      const baseStyle: TextStyle = {
        fontFamily: EditorialFontFamily.display.regular,
        fontSize: EditorialTypography.sectionTitle.fontSize,
        letterSpacing: EditorialTypography.sectionTitle.letterSpacing,
        lineHeight: EditorialTypography.sectionTitle.lineHeight,
      };

      if (accentWord && typeof children === 'string') {
        const parts = splitByAccentWord(children, accentWord);
        if (parts) {
          return (
            <Text style={[baseStyle, style]} {...props}>
              {parts.before}
              <Text style={{ fontFamily: EditorialFontFamily.displayItalic.semibold }}>
                {parts.accent}
              </Text>
              {parts.after}
            </Text>
          );
        }
      }

      return <Text style={[baseStyle, style]} {...props}>{children}</Text>;
    }

    function EyebrowText({ children, style, ...props }: Omit<EditorialTextProps, 'accentWord'>) {
      const baseStyle: TextStyle = {
        fontFamily: EditorialFontFamily.body.extrabold,
        fontSize: EditorialTypography.eyebrow.fontSize,
        letterSpacing: EditorialTypography.eyebrow.letterSpacing,
        lineHeight: EditorialTypography.eyebrow.lineHeight,
        textTransform: 'uppercase',
      };

      return <Text style={[baseStyle, style]} {...props}>{children}</Text>;
    }

    return { DisplayText, SectionText, EyebrowText };
  }, []);
}
