import React, { useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';

const { width } = Dimensions.get('window');

interface TabItem {
  name: string;
  route: string;
  icon: string;
  label: string;
}

const tabs: TabItem[] = [
  { name: 'index', route: '/(tabs)/', icon: 'home-outline', label: 'Home' },
  { name: 'cookbook', route: '/(tabs)/cookbook', icon: 'book-outline', label: 'Cookbook' },
  { name: 'meal-plan', route: '/(tabs)/meal-plan', icon: 'calendar-outline', label: 'Meal Plan' },
  { name: 'shopping-list', route: '/(tabs)/shopping-list', icon: 'cart-outline', label: 'Shopping' },
  { name: 'profile', route: '/(tabs)/profile', icon: 'person-outline', label: 'Profile' },
];

function TabIcon({ tab, isActive, onPress }: { tab: TabItem; isActive: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(isActive ? 1 : 0.65);

  useEffect(() => {
    if (isActive) {
      scale.value = withSpring(1.15, { damping: 10, stiffness: 200 });
      opacity.value = withSpring(1);
    } else {
      scale.value = withSpring(1, { damping: 14, stiffness: 200 });
      opacity.value = withSpring(0.65);
    }
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.tab}
      activeOpacity={1}
    >
      <Animated.View style={[styles.iconContainer, animatedStyle]}>
        <Ionicons
          name={tab.icon as any}
          size={24}
          color={isActive ? '#F97316' : colors.text.secondary}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: isActive ? '#F97316' : colors.text.secondary },
          ]}
        >
          {tab.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function AnimatedTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { colors } = useTheme();

  const indicatorX = useSharedValue(0);
  const tabWidth = width / tabs.length;

  const getActiveTabIndex = () => {
    const index = tabs.findIndex(tab => pathname === tab.route || pathname.startsWith(tab.route));
    return index >= 0 ? index : 0;
  };

  const activeIndex = getActiveTabIndex();

  useEffect(() => {
    indicatorX.value = withSpring(activeIndex * tabWidth, {
      damping: 16,
      stiffness: 150,
    });
  }, [activeIndex, tabWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  return (
    <View style={[styles.tabBar, { backgroundColor: colors.background, borderTopColor: colors.border.light }]}>
      <Animated.View
        style={[
          styles.indicator,
          { backgroundColor: '#F97316' },
          indicatorStyle,
        ]}
      />
      <View style={styles.tabsContainer}>
        {tabs.map((tab, index) => (
          <TabIcon
            key={tab.name}
            tab={tab}
            isActive={activeIndex === index}
            onPress={() => router.push(tab.route as any)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    height: 60,
    borderTopWidth: 1,
    paddingBottom: 8,
    paddingTop: 8,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    width: width / tabs.length,
    height: 3,
    borderRadius: 1.5,
  },
  tabsContainer: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
});
