import React from 'react';
import { View, Text, StyleSheet, ViewProps } from 'react-native';
import { EditorialFontFamily } from '../../constants/Typography';

interface ScreenHeaderProps extends ViewProps {
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
}

export function ScreenHeader({ title, subtitle, rightElement, testID, style, ...props }: ScreenHeaderProps) {
  return (
    <View testID={testID} style={[styles.container, style]} {...props}>
      <View style={styles.textBlock}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && (
          <Text testID={testID ? `${testID}-subtitle` : 'header-subtitle'} style={styles.subtitle}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightElement && <View style={styles.right}>{rightElement}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontFamily: EditorialFontFamily.body.extrabold,
    fontSize: 30,
    color: '#111827',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 14,
    color: '#6B6B6B',
    marginTop: 2,
  },
  right: {
    marginLeft: 12,
  },
});
