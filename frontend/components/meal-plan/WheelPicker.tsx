// frontend/components/meal-plan/WheelPicker.tsx
// Reusable wheel picker component for time selection

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Colors, DarkColors } from '../../constants/Colors';
import { FontSize } from '../../constants/Typography';

interface WheelPickerProps {
  /** Array of numeric values to display */
  data: number[];
  /** Currently selected value */
  selectedValue: number;
  /** Callback when value changes */
  onValueChange: (value: number) => void;
  /** Width of the picker */
  width?: number;
  /** Whether dark mode is active */
  isDark: boolean;
}

export default function WheelPicker({
  data,
  selectedValue,
  onValueChange,
  width: pickerWidth = 80,
  isDark,
}: WheelPickerProps) {
  const itemHeight = 45;
  const visibleItems = 3;
  const totalHeight = itemHeight * visibleItems;
  const scrollViewRef = useRef<ScrollView>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  // Set initial scroll position when component mounts
  useEffect(() => {
    if (scrollViewRef.current) {
      const newIndex = data.indexOf(selectedValue);
      const newScrollY = newIndex * itemHeight;
      scrollViewRef.current.scrollTo({ y: newScrollY, animated: false });
    }
  }, []);

  // Update scroll position when selectedValue changes externally
  useEffect(() => {
    if (!isScrolling && scrollViewRef.current) {
      const newIndex = data.indexOf(selectedValue);
      const newScrollY = newIndex * itemHeight;
      scrollViewRef.current.scrollTo({ y: newScrollY, animated: false });
    }
  }, [selectedValue, data, itemHeight, isScrolling]);

  return (
    <View style={{
      height: totalHeight,
      width: pickerWidth,
      overflow: 'hidden',
      borderRadius: 8,
      backgroundColor: '#F9FAFB',
      borderWidth: 1,
      borderColor: '#E5E7EB'
    }}>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        nestedScrollEnabled={true}
        onScrollBeginDrag={() => setIsScrolling(true)}
        onMomentumScrollEnd={(event) => {
          setIsScrolling(false);
          const index = Math.round(event.nativeEvent.contentOffset.y / itemHeight);
          if (data[index] !== undefined && data[index] !== selectedValue) {
            onValueChange(data[index]);
          }
        }}
        contentContainerStyle={{
          paddingTop: itemHeight,
          paddingBottom: itemHeight,
        }}
      >
        {data.map((value, index) => (
          <HapticTouchableOpacity
            key={index}
            onPress={() => {
              onValueChange(value);
              if (scrollViewRef.current) {
                scrollViewRef.current.scrollTo({ y: index * itemHeight, animated: true });
              }
            }}
            style={{
              height: itemHeight,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: selectedValue === value ? (isDark ? DarkColors.primary : Colors.primary) : 'transparent',
              borderRadius: 6,
              marginHorizontal: 2,
              marginVertical: 1,
            }}
          >
            <Text
              style={{
                fontSize: FontSize.xl,
                fontWeight: selectedValue === value ? 'bold' : '600',
                color: selectedValue === value ? 'white' : '#374151',
              }}
            >
              {value.toString().padStart(2, '0')}
            </Text>
          </HapticTouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
