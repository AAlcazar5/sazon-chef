import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewProps, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EditorialFontFamily } from '../../constants/Typography';

interface TabItem {
  key: string;
  label: string;
  icon: string;
  activeIcon: string;
}

interface EditorialTabBarProps extends ViewProps {
  tabs: TabItem[];
  activeKey: string;
  onTabPress: (key: string) => void;
}

export function EditorialTabBar({ tabs, activeKey, onTabPress, testID, style, ...props }: EditorialTabBarProps) {
  const insets = useSafeAreaInsets();

  const content = (
    <View style={styles.row}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onTabPress(tab.key)}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: isActive }}
          >
            <Ionicons
              name={(isActive ? tab.activeIcon : tab.icon) as any}
              size={22}
              color={isActive ? '#fa7e12' : '#9CA3AF'}
            />
            <Text
              style={[
                styles.label,
                {
                  color: isActive ? '#fa7e12' : '#9CA3AF',
                  fontFamily: isActive
                    ? EditorialFontFamily.body.extrabold
                    : EditorialFontFamily.body.semibold,
                },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const containerStyle = [
    styles.container,
    { paddingBottom: Math.max(insets.bottom - 12, 4) },
    style,
  ];

  if (Platform.OS === 'ios') {
    return (
      <BlurView
        testID={testID}
        intensity={80}
        tint="light"
        style={containerStyle}
        {...props}
      >
        {content}
      </BlurView>
    );
  }

  return (
    <View testID={testID} style={[containerStyle, styles.androidBg]} {...props}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 22,
    left: 12,
    right: 12,
    borderRadius: 28,
    overflow: 'hidden',
  },
  androidBg: {
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  label: {
    fontSize: 10,
  },
});
