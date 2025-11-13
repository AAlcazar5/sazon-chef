// frontend/components/ui/ActionSheet.tsx
// Action sheet modal for quick actions

import { View, Text, TouchableOpacity, Modal, TouchableWithoutFeedback, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';

export interface ActionSheetItem {
  label: string;
  icon: string;
  onPress: () => void;
  color?: string;
  destructive?: boolean;
}

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  items: ActionSheetItem[];
  title?: string;
}

export default function ActionSheet({ visible, onClose, items, title }: ActionSheetProps) {
  // Animation for slide from bottom
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    if (visible) {
      // Reset and animate in from bottom
      opacity.setValue(0);
      translateY.setValue(100);
      
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out to bottom
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 100,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleItemPress = (item: ActionSheetItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    item.onPress();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View 
          className="flex-1 bg-black/50"
          style={{ opacity }}
        >
          <TouchableWithoutFeedback>
            <Animated.View 
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl overflow-hidden"
              style={{
                transform: [{ translateY }],
              }}
            >
              {/* Handle */}
              <View className="items-center py-2">
                <View className="w-12 h-1 bg-gray-300 rounded-full" />
              </View>

              {/* Title */}
              {title && (
                <View className="px-6 py-4 border-b border-gray-200">
                  <Text className="text-lg font-semibold text-gray-900">{title}</Text>
                </View>
              )}

              {/* Action Items */}
              <View className="px-4 py-2">
                {items.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleItemPress(item)}
                    className={`flex-row items-center py-4 px-4 rounded-lg mb-1 ${
                      item.destructive ? 'bg-red-50' : 'bg-gray-50'
                    }`}
                  >
                    <View
                      className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                        item.destructive ? 'bg-red-100' : item.color ? `bg-${item.color}-100` : 'bg-orange-100'
                      }`}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={22}
                        color={item.destructive ? '#EF4444' : item.color ? `#${item.color}` : '#F97316'}
                      />
                    </View>
                    <Text
                      className={`flex-1 text-base font-medium ${
                        item.destructive ? 'text-red-700' : 'text-gray-900'
                      }`}
                    >
                      {item.label}
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Cancel Button */}
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onClose();
                }}
                className="mx-4 mb-4 py-4 bg-gray-100 rounded-lg items-center"
              >
                <Text className="text-gray-700 font-semibold text-base">Cancel</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

