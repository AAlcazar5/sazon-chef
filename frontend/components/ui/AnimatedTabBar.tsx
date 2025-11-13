import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, Animated, StyleSheet, Dimensions } from 'react-native';
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

export default function AnimatedTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { colors } = useTheme();
  const indicatorPosition = useRef(new Animated.Value(0)).current;
  const tabWidth = width / tabs.length;

  // Find current active tab index
  const getActiveTabIndex = () => {
    const index = tabs.findIndex(tab => pathname === tab.route || pathname.startsWith(tab.route));
    return index >= 0 ? index : 0;
  };

  const activeIndex = getActiveTabIndex();

  // Animate indicator to active tab
  useEffect(() => {
    Animated.spring(indicatorPosition, {
      toValue: activeIndex * tabWidth,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, tabWidth, indicatorPosition]);

  const handleTabPress = (route: string) => {
    router.push(route as any);
  };

  return (
    <View style={[styles.tabBar, { backgroundColor: colors.background, borderTopColor: colors.border.light }]}>
      {/* Animated Indicator */}
      <Animated.View
        style={[
          styles.indicator,
          {
            backgroundColor: '#F97316',
            transform: [{ translateX: indicatorPosition }],
          },
        ]}
      />
      
      {/* Tab Items */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab, index) => {
          const isActive = activeIndex === index;
          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => handleTabPress(tab.route)}
              style={styles.tab}
              activeOpacity={0.7}
            >
              <Ionicons
                name={tab.icon as any}
                size={24}
                color={isActive ? '#F97316' : colors.text.secondary}
              />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? '#F97316' : colors.text.secondary,
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
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
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
});

