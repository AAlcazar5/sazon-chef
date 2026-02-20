// frontend/components/profile/NotificationsCard.tsx
// Notifications settings card with meal reminder schedule modal and time wheel picker

import { View, Text, ScrollView, Switch, Modal, TextInput, ActivityIndicator } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useState, useRef, useEffect } from 'react';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { FontSize } from '../../constants/Typography';
import { useTheme } from '../../contexts/ThemeContext';
import type { UserNotifications } from '../../types';

interface NotificationsCardProps {
  notifications: UserNotifications;
  updatingNotification: keyof UserNotifications | null;
  onToggleNotification: (key: keyof UserNotifications) => void;
  onSaveMealReminderTime: (selectedHour: number, selectedMinute: number, editingTimeIndex: number | null) => void;
  onRemoveMealReminderTime: (index: number) => void;
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function WheelPicker({
  data,
  selectedValue,
  onValueChange,
  width: pickerWidth = 80,
  isDark: isDarkMode = false,
}: {
  data: number[];
  selectedValue: number;
  onValueChange: (value: number) => void;
  width?: number;
  isDark?: boolean;
}) {
  const itemHeight = 45;
  const visibleItems = 3;
  const totalHeight = itemHeight * visibleItems;
  const scrollViewRef = useRef<ScrollView>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  useEffect(() => {
    if (scrollViewRef.current) {
      const newIndex = data.indexOf(selectedValue);
      const newScrollY = newIndex * itemHeight;
      scrollViewRef.current.scrollTo({ y: newScrollY, animated: false });
    }
  }, []);

  useEffect(() => {
    if (!isScrolling && scrollViewRef.current) {
      const newIndex = data.indexOf(selectedValue);
      if (newIndex >= 0) {
        const newScrollY = newIndex * itemHeight;
        scrollViewRef.current.scrollTo({ y: newScrollY, animated: false });
      }
    }
  }, [selectedValue]);

  return (
    <View style={{
      height: totalHeight,
      width: pickerWidth,
      overflow: 'hidden',
      borderRadius: 8,
      backgroundColor: isDarkMode ? DarkColors.surface : Colors.surface,
      borderWidth: 1,
      borderColor: isDarkMode ? DarkColors.border.medium : Colors.border.medium,
    }}>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        onScrollBeginDrag={() => setIsScrolling(true)}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.y / itemHeight);
          if (data[index] !== undefined && data[index] !== selectedValue) {
            onValueChange(data[index]);
          }
          setTimeout(() => { setIsScrolling(false); }, 100);
        }}
        onScrollEndDrag={(event) => {
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
              backgroundColor: selectedValue === value ? (isDarkMode ? DarkColors.primary : Colors.primary) : 'transparent',
              borderRadius: 6,
              marginHorizontal: 2,
              marginVertical: 1,
            }}
          >
            <Text
              style={{
                fontSize: FontSize.xl,
                fontWeight: selectedValue === value ? 'bold' : '600',
                color: selectedValue === value ? 'white' : (isDarkMode ? DarkColors.text.primary : Colors.text.primary),
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

export default function NotificationsCard({
  notifications,
  updatingNotification,
  onToggleNotification,
  onSaveMealReminderTime,
  onRemoveMealReminderTime,
}: NotificationsCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [showMealReminderSchedule, setShowMealReminderSchedule] = useState(false);
  const [editingTimeIndex, setEditingTimeIndex] = useState<number | null>(null);
  const [selectedHour, setSelectedHour] = useState(8);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [manualTimeInput, setManualTimeInput] = useState('');

  useEffect(() => {
    const hour12 = selectedHour % 12 || 12;
    const ampm = selectedHour >= 12 ? 'PM' : 'AM';
    setManualTimeInput(`${hour12}:${selectedMinute.toString().padStart(2, '0')} ${ampm}`);
  }, [selectedHour, selectedMinute]);

  const handleManualTimeInput = (text: string) => {
    setManualTimeInput(text);
    const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/i;
    const match = text.match(timeRegex);

    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const period = match[3]?.toUpperCase();

      if (period === 'PM' && hours !== 12) hours += 12;
      else if (period === 'AM' && hours === 12) hours = 0;

      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        setSelectedHour(hours);
        setSelectedMinute(minutes);
      }
    } else {
      const simpleMatch = text.match(/^(\d{1,2}):(\d{2})$/);
      if (simpleMatch) {
        const hours = parseInt(simpleMatch[1], 10);
        const minutes = parseInt(simpleMatch[2], 10);
        if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
          setSelectedHour(hours);
          setSelectedMinute(minutes);
        }
      }
    }
  };

  const handleSave = () => {
    onSaveMealReminderTime(selectedHour, selectedMinute, editingTimeIndex);
    setEditingTimeIndex(null);
    setSelectedHour(8);
    setSelectedMinute(0);
  };

  const resetModal = () => {
    setShowMealReminderSchedule(false);
    setEditingTimeIndex(null);
    setSelectedHour(8);
    setSelectedMinute(0);
    setManualTimeInput('8:00 AM');
  };

  return (
    <>
      <View className="bg-white dark:bg-gray-800 rounded-xl p-4 m-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <View className="flex-row items-center mb-3">
          <View className="rounded-full p-2 mr-3" style={{ backgroundColor: isDark ? `${Colors.tertiaryGreenLight}33` : Colors.tertiaryGreenDark }}>
            <Icon name={Icons.NOTIFICATIONS_OUTLINE} size={IconSizes.MD} color={isDark ? DarkColors.tertiaryGreen : '#FFFFFF'} accessibilityLabel="Notifications" />
          </View>
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Notifications</Text>
        </View>

        <View className="space-y-4">
          {/* Meal Reminders */}
          <View>
            <View className="flex-row justify-between items-center mb-2">
              <View className="flex-1 mr-3">
                <Text className="text-gray-900 dark:text-gray-100 font-medium">Meal Reminders</Text>
                <Text className="text-gray-500 dark:text-gray-200 text-sm">Daily recipe suggestions</Text>
              </View>
              <View className="flex-row items-center">
                {updatingNotification === 'mealReminders' && (
                  <ActivityIndicator size="small" color={isDark ? DarkColors.primary : Colors.primary} style={{ marginRight: 8 }} />
                )}
                <Switch
                  value={notifications.mealReminders}
                  onValueChange={() => onToggleNotification('mealReminders')}
                  disabled={updatingNotification !== null}
                  trackColor={{ false: '#D1D5DB', true: isDark ? DarkColors.primary : Colors.primary }}
                  thumbColor={notifications.mealReminders ? '#FFFFFF' : '#F3F4F6'}
                />
              </View>
            </View>
            {notifications.mealReminders && (
              <View className="mt-2 ml-1">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-sm text-gray-600 dark:text-gray-400">Scheduled Times</Text>
                  <HapticTouchableOpacity
                    onPress={() => {
                      setShowMealReminderSchedule(true);
                      if (!notifications.mealReminderTimes || notifications.mealReminderTimes.length === 0) {
                        setEditingTimeIndex(0);
                        setSelectedHour(8);
                        setSelectedMinute(0);
                        setManualTimeInput('8:00 AM');
                      }
                    }}
                    className="px-3 py-1 rounded-lg"
                    style={{ backgroundColor: isDark ? `${DarkColors.primary}33` : `${Colors.primary}1A` }}
                  >
                    <Text className="text-sm font-medium" style={{ color: isDark ? DarkColors.primary : Colors.primary }}>
                      {notifications.mealReminderTimes && notifications.mealReminderTimes.length > 0 ? 'Edit' : 'Set Times'}
                    </Text>
                  </HapticTouchableOpacity>
                </View>
                {notifications.mealReminderTimes && notifications.mealReminderTimes.length > 0 ? (
                  <View className="flex-row flex-wrap gap-2">
                    {notifications.mealReminderTimes.map((time, index) => (
                      <View
                        key={index}
                        className="px-3 py-1 rounded-full"
                        style={{ backgroundColor: isDark ? DarkColors.surface : Colors.surface, borderWidth: 1, borderColor: isDark ? DarkColors.border.medium : Colors.border.medium }}
                      >
                        <Text className="text-sm" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
                          {formatTime(time)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text className="text-xs text-gray-500 dark:text-gray-400 italic">No times set</Text>
                )}
              </View>
            )}
          </View>

          {/* New Recipes */}
          <View className="flex-row justify-between items-center">
            <View className="flex-1 mr-3">
              <Text className="text-gray-900 dark:text-gray-100 font-medium">New Recipes</Text>
              <Text className="text-gray-500 dark:text-gray-200 text-sm">When new recipes match your goals</Text>
            </View>
            <View className="flex-row items-center">
              {updatingNotification === 'newRecipes' && (
                <ActivityIndicator size="small" color={isDark ? DarkColors.primary : Colors.primary} style={{ marginRight: 8 }} />
              )}
              <Switch
                value={notifications.newRecipes}
                onValueChange={() => onToggleNotification('newRecipes')}
                disabled={updatingNotification !== null}
                trackColor={{ false: '#D1D5DB', true: isDark ? DarkColors.primary : Colors.primary }}
                thumbColor={notifications.newRecipes ? '#FFFFFF' : '#F3F4F6'}
              />
            </View>
          </View>

          {/* Goal Updates */}
          <View>
            <View className="flex-row justify-between items-center mb-2">
              <View className="flex-1 mr-3">
                <Text className="text-gray-900 dark:text-gray-100 font-medium">Goal Updates</Text>
                <Text className="text-gray-500 dark:text-gray-200 text-sm">Weekly progress reports</Text>
              </View>
              <View className="flex-row items-center">
                {updatingNotification === 'goalUpdates' && (
                  <ActivityIndicator size="small" color={isDark ? DarkColors.primary : Colors.primary} style={{ marginRight: 8 }} />
                )}
                <Switch
                  value={notifications.goalUpdates}
                  onValueChange={() => onToggleNotification('goalUpdates')}
                  disabled={updatingNotification !== null}
                  trackColor={{ false: '#D1D5DB', true: isDark ? DarkColors.primary : Colors.primary }}
                  thumbColor={notifications.goalUpdates ? '#FFFFFF' : '#F3F4F6'}
                />
              </View>
            </View>
            {notifications.goalUpdates && (
              <View className="mt-2 ml-1">
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  {notifications.goalUpdateDay || 'Monday'} at {notifications.goalUpdateTime ? formatTime(notifications.goalUpdateTime) : '9:00 AM'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Meal Reminder Schedule Modal */}
      <Modal
        visible={showMealReminderSchedule}
        transparent={true}
        animationType="fade"
        onRequestClose={resetModal}
      >
        <View className="flex-1 bg-black bg-opacity-50 items-center justify-center px-4">
          <View className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm max-h-[80%]">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Meal Reminder Times
            </Text>

            <ScrollView className="max-h-64 mb-4">
              {notifications.mealReminderTimes && notifications.mealReminderTimes.length > 0 ? (
                <View className="space-y-2">
                  {notifications.mealReminderTimes.map((time, index) => (
                    <View key={index} className="flex-row items-center justify-between p-3 rounded-lg border" style={{ borderColor: isDark ? DarkColors.border.medium : Colors.border.medium }}>
                      <Text className="text-gray-900 dark:text-gray-100 font-medium">
                        {formatTime(time)}
                      </Text>
                      <View className="flex-row items-center space-x-2">
                        <HapticTouchableOpacity
                          onPress={() => {
                            setEditingTimeIndex(index);
                            const [hours, minutes] = time.split(':');
                            setSelectedHour(parseInt(hours, 10));
                            setSelectedMinute(parseInt(minutes, 10));
                            const hour12 = parseInt(hours, 10) % 12 || 12;
                            const ampm = parseInt(hours, 10) >= 12 ? 'PM' : 'AM';
                            setManualTimeInput(`${hour12}:${minutes} ${ampm}`);
                          }}
                          className="px-3 py-1 rounded"
                          style={{ backgroundColor: isDark ? `${DarkColors.primary}33` : `${Colors.primary}1A` }}
                        >
                          <Text className="text-sm" style={{ color: isDark ? DarkColors.primary : Colors.primary }}>Edit</Text>
                        </HapticTouchableOpacity>
                        <HapticTouchableOpacity
                          onPress={() => onRemoveMealReminderTime(index)}
                          className="px-3 py-1 rounded"
                          style={{ backgroundColor: isDark ? `${DarkColors.secondaryRed}33` : `${Colors.secondaryRed}1A` }}
                        >
                          <Text className="text-sm" style={{ color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed }}>Remove</Text>
                        </HapticTouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="text-gray-500 dark:text-gray-400 text-center py-4">No times set</Text>
              )}
            </ScrollView>

            {(editingTimeIndex !== null || !notifications.mealReminderTimes || notifications.mealReminderTimes.length === 0) && (
              <View className="mb-4 border-t pt-4" style={{ borderTopColor: isDark ? DarkColors.border.medium : Colors.border.medium }}>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-100 mb-3">
                  {editingTimeIndex !== null ? 'Edit Time' : 'Add Time'}
                </Text>

                <View className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                  <Text className="text-sm font-medium mb-2" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>Selected Time</Text>
                  <View className="items-center">
                    <TextInput
                      value={manualTimeInput}
                      onChangeText={handleManualTimeInput}
                      placeholder="8:00 AM"
                      placeholderTextColor="#9CA3AF"
                      className="text-2xl font-bold text-center bg-white dark:bg-gray-800 rounded-lg px-4 py-2 border border-gray-300 dark:border-gray-600 w-full"
                      style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}
                      keyboardType="default"
                    />
                    <Text className="text-xs mt-1" style={{ color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary }}>
                      Format: 8:00 AM or 08:00
                    </Text>
                  </View>
                </View>

                <View className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                  <View className="flex-row justify-center items-center">
                    <View className="items-center mr-6">
                      <Text className="text-sm font-medium mb-2" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>Hour</Text>
                      <WheelPicker
                        data={Array.from({ length: 24 }, (_, i) => i)}
                        selectedValue={selectedHour}
                        onValueChange={setSelectedHour}
                        width={90}
                        isDark={isDark}
                      />
                    </View>
                    <View className="items-center justify-center">
                      <Text className="text-3xl font-bold" style={{ color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary }}>:</Text>
                    </View>
                    <View className="items-center ml-6">
                      <Text className="text-sm font-medium mb-2" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>Min</Text>
                      <WheelPicker
                        data={Array.from({ length: 60 }, (_, i) => i)}
                        selectedValue={selectedMinute}
                        onValueChange={setSelectedMinute}
                        width={90}
                        isDark={isDark}
                      />
                    </View>
                  </View>
                </View>

                <HapticTouchableOpacity
                  onPress={handleSave}
                  className="mt-2 py-2 px-4 rounded-lg"
                  style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
                >
                  <Text className="text-white font-medium text-center">Save</Text>
                </HapticTouchableOpacity>
              </View>
            )}

            {editingTimeIndex === null && notifications.mealReminderTimes && notifications.mealReminderTimes.length > 0 && (
              <HapticTouchableOpacity
                onPress={() => {
                  const times = notifications.mealReminderTimes || [];
                  setEditingTimeIndex(times.length);
                  setSelectedHour(8);
                  setSelectedMinute(0);
                  setManualTimeInput('8:00 AM');
                }}
                className="py-2 px-4 rounded-lg border"
                style={{ borderColor: isDark ? DarkColors.border.medium : Colors.border.medium }}
              >
                <Text className="text-center font-medium" style={{ color: isDark ? DarkColors.primary : Colors.primary }}>Add Time</Text>
              </HapticTouchableOpacity>
            )}

            <View className="mt-4">
              <HapticTouchableOpacity
                onPress={resetModal}
                className="py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                <Text className="text-gray-700 dark:text-gray-100 font-medium text-center">Done</Text>
              </HapticTouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
