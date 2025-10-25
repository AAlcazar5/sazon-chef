import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, RefreshControl, Dimensions, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useApi } from '../../hooks/useApi';
import { mealPlanApi } from '../../lib/api';
import type { WeeklyPlan, DailySuggestion } from '../../types';

const { width } = Dimensions.get('window');

// Generate 24 hours array
const generateHours = () => {
  const hours = [];
  for (let i = 0; i < 24; i++) {
    const hour = i;
    const timeString = `${hour.toString().padStart(2, '0')}:00`;
    const period = hour < 12 ? 'AM' : 'PM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const displayTime = `${displayHour}:00 ${period}`;
    
    hours.push({
      hour,
      timeString,
      displayTime,
      isMealTime: [7, 12, 18].includes(hour), // breakfast, lunch, dinner
      label: hour === 7 ? 'Breakfast' : hour === 12 ? 'Lunch' : hour === 18 ? 'Dinner' : null
    });
  }
  return hours;
};

export default function MealPlanScreen() {
  const { recipeId, recipeTitle } = useLocalSearchParams();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [dailySuggestion, setDailySuggestion] = useState<DailySuggestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddRecipeModal, setShowAddRecipeModal] = useState(false);
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [selectedHour, setSelectedHour] = useState(12);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [manualTimeInput, setManualTimeInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  
  // Daily macros tracking
  const [dailyMacros, setDailyMacros] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  });
  
  // Target macros (from user profile)
  const [targetMacros, setTargetMacros] = useState({
    calories: 2000,
    protein: 150,
    carbs: 200,
    fat: 67
  });
  
  // Meals for each hour
  const [hourlyMeals, setHourlyMeals] = useState<{ [key: number]: any[] }>({});
  
  const hours = generateHours();

  // Get current week dates
  const getWeekDates = (date: Date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDates.push(date);
    }
    return weekDates;
  };

  const weekDates = getWeekDates(selectedDate);

  const loadMealPlan = async () => {
    try {
      setLoading(true);
      console.log('📱 MealPlan: Loading meal plan data');
      
      // Load weekly plan
      const weeklyResponse = await mealPlanApi.getWeeklyPlan();
      setWeeklyPlan(weeklyResponse.data);
      
      // Load daily suggestion for selected date
      const dailyResponse = await mealPlanApi.getDailySuggestion();
      setDailySuggestion(dailyResponse.data);
      
      console.log('📱 MealPlan: Meal plan loaded successfully');
    } catch (error) {
      console.error('📱 MealPlan: Error loading meal plan', error);
      Alert.alert('Error', 'Failed to load meal plan');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMealPlan();
    setRefreshing(false);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    // TODO: Load specific day's meal plan
  };

  const handleAddRecipe = () => {
    router.push('/cookbook');
  };

  const handleAddRecipeToMeal = (mealType: string) => {
    if (!recipeId || !recipeTitle) return;
    
    Alert.alert(
      'Add to Meal Plan',
      `Add "${recipeTitle}" to ${mealType}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: async () => {
            try {
              // TODO: Implement adding recipe to specific meal
              console.log(`Adding recipe ${recipeId} to ${mealType}`);
              Alert.alert('Success', `Recipe added to ${mealType}!`);
              setShowAddRecipeModal(false);
            } catch (error) {
              Alert.alert('Error', 'Failed to add recipe to meal plan');
            }
          },
        },
      ]
    );
  };

  const handleAddMealToHour = (hour: number) => {
    Alert.alert(
      'Add Meal',
      `Add a meal at ${hours[hour].displayTime}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'From Cookbook',
          onPress: () => {
            router.push('/cookbook');
          },
        },
        {
          text: 'Custom Meal',
          onPress: () => {
            // TODO: Open custom meal form
            Alert.alert('Coming Soon', 'Custom meal entry will be available soon');
          },
        },
      ]
    );
  };

  const handleRemoveMeal = (hour: number, mealIndex: number) => {
    const meal = hourlyMeals[hour][mealIndex];
    Alert.alert(
      'Remove Meal',
      `Remove "${meal.name}" from ${hours[hour].displayTime}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            // Remove meal from hourly meals
            setHourlyMeals(prev => ({
              ...prev,
              [hour]: prev[hour].filter((_, index) => index !== mealIndex)
            }));
            
            // Update daily macros (subtract the meal's macros)
            setDailyMacros(prev => ({
              calories: prev.calories - (meal.calories || 0),
              protein: prev.protein - (meal.protein || 0),
              carbs: prev.carbs - (meal.carbs || 0),
              fat: prev.fat - (meal.fat || 0)
            }));
          },
        },
      ]
    );
  };

  const updateDailyMacros = (newMeal: any) => {
    setDailyMacros(prev => ({
      calories: prev.calories + (newMeal.calories || 0),
      protein: prev.protein + (newMeal.protein || 0),
      carbs: prev.carbs + (newMeal.carbs || 0),
      fat: prev.fat + (newMeal.fat || 0)
    }));
  };

  const getMacroProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getMacroColor = (current: number, target: number) => {
    const progress = getMacroProgress(current, target);
    if (progress >= 100) return 'text-red-500';
    if (progress >= 80) return 'text-yellow-500';
    return 'text-green-500';
  };

  const handleTimePickerConfirm = () => {
    if (!recipeId || !recipeTitle) return;
    
    // Add recipe to selected time
    const newMeal = {
      id: recipeId,
      name: recipeTitle,
      calories: 500, // TODO: Get from recipe data
      protein: 25,
      carbs: 50,
      fat: 20,
      description: "Delicious recipe added to your meal plan", // TODO: Get from recipe data
      prepTime: "15 min", // TODO: Get from recipe data
      difficulty: "Easy" // TODO: Get from recipe data
    };
    
    setHourlyMeals(prev => ({
      ...prev,
      [selectedHour]: [...(prev[selectedHour] || []), newMeal]
    }));
    
    updateDailyMacros(newMeal);
    setShowTimePickerModal(false);
    
    Alert.alert('Success', `"${recipeTitle}" added to ${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`);
  };

  const formatTime = (hour: number, minute: number) => {
    const period = hour < 12 ? 'AM' : 'PM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  const handleManualTimeInput = (input: string) => {
    setManualTimeInput(input);
    
    // Parse time input (supports formats like "2:30", "14:30", "2:30 PM", etc.)
    const timeRegex = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i;
    const match = input.match(timeRegex);
    
    if (match) {
      let hour = parseInt(match[1]);
      const minute = parseInt(match[2]);
      const period = match[3]?.toUpperCase();
      
      // Handle 12-hour format
      if (period === 'PM' && hour !== 12) {
        hour += 12;
      } else if (period === 'AM' && hour === 12) {
        hour = 0;
      }
      
      // Validate hour and minute
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        setSelectedHour(hour);
        setSelectedMinute(minute);
      }
    }
  };

  const toggleManualInput = () => {
    setShowManualInput(!showManualInput);
    if (!showManualInput) {
      setManualTimeInput(formatTime(selectedHour, selectedMinute));
    }
  };

  // Update manual input when picker values change
  useEffect(() => {
    if (showManualInput) {
      setManualTimeInput(formatTime(selectedHour, selectedMinute));
    }
  }, [selectedHour, selectedMinute, showManualInput]);

  // Wheel Picker Component
  const WheelPicker = ({ 
    data, 
    selectedValue, 
    onValueChange, 
    width: pickerWidth = 80 
  }: {
    data: number[];
    selectedValue: number;
    onValueChange: (value: number) => void;
    width?: number;
  }) => {
    const itemHeight = 45;
    const visibleItems = 3;
    const totalHeight = itemHeight * visibleItems;
    const scrollViewRef = useRef<ScrollView>(null);
    const [isScrolling, setIsScrolling] = useState(false);

    // Calculate initial scroll position based on selected value
    const selectedIndex = data.indexOf(selectedValue);
    const initialScrollY = selectedIndex * itemHeight;

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
            <TouchableOpacity
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
                backgroundColor: selectedValue === value ? '#F97316' : 'transparent',
                borderRadius: 6,
                marginHorizontal: 2,
                marginVertical: 1,
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: selectedValue === value ? 'bold' : '600',
                  color: selectedValue === value ? 'white' : '#374151',
                }}
              >
                {value.toString().padStart(2, '0')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const handleGeneratePlan = async () => {
    try {
      Alert.alert(
        'Generate Meal Plan',
        'Generate a new meal plan based on your preferences?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Generate',
            onPress: async () => {
              try {
                await mealPlanApi.generateMealPlan({});
                Alert.alert('Success', 'New meal plan generated!');
                await loadMealPlan();
              } catch (error) {
                Alert.alert('Error', 'Failed to generate meal plan');
              }
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to generate meal plan');
    }
  };

  useEffect(() => {
    loadMealPlan();
    
    // If we have a recipe to add, show the time picker modal
    if (recipeId && recipeTitle) {
      setShowTimePickerModal(true);
    }
  }, [recipeId, recipeTitle]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
          <View className="w-8" />
          <Text className="text-lg font-semibold text-gray-900">Meal Plan</Text>
          <View className="w-8" />
        </View>
        <View className="flex-1 items-center justify-center p-8">
          <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
          <Text className="text-lg font-semibold text-gray-500 mt-4">Loading meal plan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between p-4 border-b border-gray-200 bg-white">
        <View className="w-8" />
        <Text className="text-lg font-semibold text-gray-900">Meal Plan</Text>
        <TouchableOpacity 
          onPress={handleGeneratePlan}
          className="p-2"
        >
          <Ionicons name="refresh" size={24} color="#F97316" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >

        {/* Daily Macros */}
        <View className="px-4 mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Daily Macros - {formatDate(selectedDate)}
          </Text>
          
          <View className="bg-white rounded-lg p-4 shadow-sm">
            <View className="flex-row justify-between mb-4">
              <View className="flex-1 items-center">
                <Text className="text-sm text-gray-500">Calories</Text>
                <Text className={`text-lg font-bold ${getMacroColor(dailyMacros.calories, targetMacros.calories)}`}>
                  {dailyMacros.calories}
                </Text>
                <Text className="text-xs text-gray-400">/ {targetMacros.calories}</Text>
                <View className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <View 
                    className="bg-orange-500 h-2 rounded-full" 
                    style={{ width: `${getMacroProgress(dailyMacros.calories, targetMacros.calories)}%` }}
                  />
                </View>
              </View>
              
              <View className="flex-1 items-center">
                <Text className="text-sm text-gray-500">Protein</Text>
                <Text className={`text-lg font-bold ${getMacroColor(dailyMacros.protein, targetMacros.protein)}`}>
                  {dailyMacros.protein}g
                </Text>
                <Text className="text-xs text-gray-400">/ {targetMacros.protein}g</Text>
                <View className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <View 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${getMacroProgress(dailyMacros.protein, targetMacros.protein)}%` }}
                  />
            </View>
          </View>

              <View className="flex-1 items-center">
                <Text className="text-sm text-gray-500">Carbs</Text>
                <Text className={`text-lg font-bold ${getMacroColor(dailyMacros.carbs, targetMacros.carbs)}`}>
                  {dailyMacros.carbs}g
                </Text>
                <Text className="text-xs text-gray-400">/ {targetMacros.carbs}g</Text>
                <View className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <View 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${getMacroProgress(dailyMacros.carbs, targetMacros.carbs)}%` }}
                  />
            </View>
          </View>

              <View className="flex-1 items-center">
                <Text className="text-sm text-gray-500">Fat</Text>
                <Text className={`text-lg font-bold ${getMacroColor(dailyMacros.fat, targetMacros.fat)}`}>
                  {dailyMacros.fat}g
                </Text>
                <Text className="text-xs text-gray-400">/ {targetMacros.fat}g</Text>
                <View className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <View 
                    className="bg-purple-500 h-2 rounded-full" 
                    style={{ width: `${getMacroProgress(dailyMacros.fat, targetMacros.fat)}%` }}
                  />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 24-Hour Meal Plan */}
        <View className="px-4 mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            24-Hour Meal Plan
          </Text>
          
          <View className="space-y-1">
            {hours.map((hourData, index) => (
              <View key={index}>
                {/* Hour Header */}
                <View 
                  className={`bg-white rounded-lg p-3 shadow-sm ${
                    hourData.isMealTime ? 'border-l-4 border-orange-500' : ''
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      <View className="w-16">
                        <Text className="text-sm font-medium text-gray-900">
                          {hourData.displayTime}
                        </Text>
                        {hourData.label && (
                          <Text className="text-xs text-orange-500 font-medium">
                            {hourData.label}
                          </Text>
                        )}
                      </View>
                      
                      <View className="flex-1 ml-3">
                        {hourlyMeals[hourData.hour] && hourlyMeals[hourData.hour].length > 0 ? (
                          <Text className="text-sm text-gray-600">
                            {hourlyMeals[hourData.hour].length} meal{hourlyMeals[hourData.hour].length > 1 ? 's' : ''} planned
                          </Text>
                        ) : (
                          <Text className="text-sm text-gray-400">No meals planned</Text>
                        )}
                      </View>
          </View>

                    <TouchableOpacity 
                      onPress={() => handleAddMealToHour(hourData.hour)}
                      className="p-2 ml-2"
                    >
                      <Ionicons name="add-circle-outline" size={20} color="#F97316" />
              </TouchableOpacity>
            </View>
                </View>

                {/* Meals for this hour - displayed between hours */}
                {hourlyMeals[hourData.hour] && hourlyMeals[hourData.hour].length > 0 && (
                  <View className="ml-4 mb-2">
                    {hourlyMeals[hourData.hour].map((meal, mealIndex) => (
                      <TouchableOpacity 
                        key={mealIndex} 
                        onPress={() => {
                          // Navigate to recipe details
                          router.push(`/modal?id=${meal.id}&source=meal-plan`);
                        }}
                        onLongPress={() => handleRemoveMeal(hourData.hour, mealIndex)}
                        className="bg-orange-50 rounded-lg p-4 mb-3 border border-orange-200"
                      >
                        {/* Recipe Header */}
                        <View className="flex-row items-center justify-between mb-3">
                          <View className="flex-1">
                            <Text className="text-base font-semibold text-gray-900">{meal.name}</Text>
                            <Text className="text-sm text-gray-600">{meal.calories} calories</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                        </View>
                        
                        {/* Macro Breakdown */}
                        <View className="bg-white rounded-lg p-3 mb-3">
                          <Text className="text-xs font-medium text-gray-700 mb-2">Nutritional Info</Text>
                          <View className="flex-row justify-between">
                            <View className="items-center">
                              <Text className="text-lg font-bold text-blue-600">{meal.protein}g</Text>
                              <Text className="text-xs text-gray-500">Protein</Text>
                            </View>
                            <View className="items-center">
                              <Text className="text-lg font-bold text-green-600">{meal.carbs}g</Text>
                              <Text className="text-xs text-gray-500">Carbs</Text>
                            </View>
                            <View className="items-center">
                              <Text className="text-lg font-bold text-purple-600">{meal.fat}g</Text>
                              <Text className="text-xs text-gray-500">Fat</Text>
                            </View>
                          </View>
                        </View>
                        
                        {/* Additional Info */}
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center space-x-4">
                            {meal.prepTime && (
                              <View className="flex-row items-center">
                                <Ionicons name="time-outline" size={12} color="#6B7280" />
                                <Text className="text-xs text-gray-600 ml-1">{meal.prepTime}</Text>
                              </View>
                            )}
                            {meal.difficulty && (
                              <View className="flex-row items-center">
                                <Ionicons name="star-outline" size={12} color="#6B7280" />
                                <Text className="text-xs text-gray-600 ml-1">{meal.difficulty}</Text>
                              </View>
                            )}
                          </View>
                          <View className="flex-row items-center">
                            <Text className="text-xs text-orange-500 font-medium mr-1">
                              View Recipe
                            </Text>
                            <Text className="text-xs text-gray-400">
                              • Long press to remove
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View className="px-4 mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</Text>
          
          <TouchableOpacity 
            onPress={handleAddRecipe}
            className="bg-orange-500 py-4 px-6 rounded-lg items-center mb-3"
          >
            <Text className="text-white font-semibold text-lg">Browse Cookbook</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleGeneratePlan}
            className="border border-orange-500 py-4 px-6 rounded-lg items-center mb-3"
          >
            <Text className="text-orange-500 font-semibold text-lg">Generate Smart Plan</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => {
              // TODO: Clear all meals for the day
              Alert.alert('Clear Day', 'Clear all meals for this day?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: () => {
                  setHourlyMeals({});
                  setDailyMacros({ calories: 0, protein: 0, carbs: 0, fat: 0 });
                }}
              ]);
            }}
            className="border border-gray-300 py-4 px-6 rounded-lg items-center"
          >
            <Text className="text-gray-600 font-semibold text-lg">Clear All Meals</Text>
          </TouchableOpacity>
        </View>

        {/* Daily Summary */}
          <View className="px-4 mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Today's Summary</Text>
            <View className="bg-white rounded-lg p-4 shadow-sm">
              <View className="flex-row justify-between items-center mb-2">
              <Text className="text-gray-600">Total Meals</Text>
              <Text className="font-semibold text-gray-900">
                {Object.values(hourlyMeals).flat().length}
              </Text>
            </View>
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-gray-600">Calories Consumed</Text>
              <Text className="font-semibold text-gray-900">{dailyMacros.calories}</Text>
              </View>
              <View className="flex-row justify-between items-center mb-2">
              <Text className="text-gray-600">Macro Progress</Text>
              <Text className="font-semibold text-gray-900">
                {Math.round((dailyMacros.calories / targetMacros.calories) * 100)}%
              </Text>
              </View>
              <View className="flex-row justify-between items-center">
              <Text className="text-gray-600">Remaining Calories</Text>
              <Text className={`font-semibold ${
                targetMacros.calories - dailyMacros.calories >= 0 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {targetMacros.calories - dailyMacros.calories}
              </Text>
            </View>
          </View>
        </View>

        {/* Weekly Overview - Compact View */}
        <View className="bg-white p-4 mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Weekly Overview</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row space-x-2">
              {weekDates.map((date, index) => {
                const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                const isFuture = date > new Date(new Date().setHours(23, 59, 59, 999));
                const isCurrentDay = isToday(date);
                
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleDateSelect(date)}
                    className={`p-3 rounded-lg min-w-[70px] items-center ${
                      isSelected(date) 
                        ? 'bg-orange-500' 
                        : isCurrentDay
                          ? 'bg-orange-100 border border-orange-300'
                          : isPast
                            ? 'bg-gray-50 border border-gray-200'
                            : 'bg-green-50 border border-green-200'
                    }`}
                  >
                    <Text className={`text-xs font-medium ${
                      isSelected(date) ? 'text-white' : 'text-gray-700'
                    }`}>
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </Text>
                    <Text className={`text-sm font-bold ${
                      isSelected(date) ? 'text-white' : 'text-gray-900'
                    }`}>
                      {date.getDate()}
                    </Text>
                    <Text className={`text-xs ${
                      isSelected(date) ? 'text-orange-100' : 'text-gray-500'
                    }`}>
                      {date.toLocaleDateString('en-US', { month: 'short' })}
                    </Text>
                    
                    {/* Status indicators */}
                    {isCurrentDay && !isSelected(date) && (
                      <View className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1" />
                    )}
                    {isPast && !isCurrentDay && (
                      <View className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-1" />
                    )}
                    {isFuture && (
                      <View className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
          
          {/* Week Summary */}
          <View className="mt-3 pt-3 border-t border-gray-200">
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center space-x-4">
                <View className="flex-row items-center">
                  <View className="w-2 h-2 bg-gray-400 rounded-full mr-2" />
                  <Text className="text-xs text-gray-600">Past</Text>
                </View>
                <View className="flex-row items-center">
                  <View className="w-2 h-2 bg-orange-500 rounded-full mr-2" />
                  <Text className="text-xs text-gray-600">Today</Text>
                </View>
                <View className="flex-row items-center">
                  <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                  <Text className="text-xs text-gray-600">Upcoming</Text>
                </View>
              </View>
              <TouchableOpacity 
                onPress={() => {
                  // Navigate to a full weekly view if needed
                  console.log('Navigate to full weekly view');
                }}
                className="flex-row items-center"
              >
                <Text className="text-xs text-orange-600 font-medium">View Full Week</Text>
                <Ionicons name="chevron-forward" size={12} color="#ea580c" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Time Picker Modal */}
      {showTimePickerModal && recipeId && recipeTitle && (
        <View className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <View className="bg-white rounded-lg p-6 mx-4 w-full max-w-sm">
            <Text className="text-lg font-semibold text-gray-900 mb-2">
              Schedule Recipe
            </Text>
            <Text className="text-gray-600 mb-4">
              Choose a time for "{recipeTitle}":
            </Text>
            
            {/* Time Display */}
            <View className="bg-gray-50 rounded-lg p-4 mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-sm font-medium text-gray-700">Selected Time</Text>
              <TouchableOpacity 
                  onPress={toggleManualInput}
                  className="px-3 py-1 bg-orange-100 rounded-lg"
              >
                  <Text className="text-orange-600 text-sm font-medium">
                    {showManualInput ? 'Use Picker' : 'Type Time'}
                  </Text>
              </TouchableOpacity>
              </View>
              
              {showManualInput ? (
                <View className="items-center">
                  <TextInput
                    value={manualTimeInput}
                    onChangeText={handleManualTimeInput}
                    placeholder="2:30 PM"
                    className="text-2xl font-bold text-gray-900 text-center bg-white rounded-lg px-4 py-2 border border-gray-300 w-full"
                    keyboardType="default"
                    autoFocus={true}
                  />
                  <Text className="text-xs text-gray-500 mt-1">
                    Format: 2:30 PM or 14:30
                  </Text>
                </View>
              ) : (
                <View className="items-center">
                  <Text className="text-2xl font-bold text-gray-900">
                    {formatTime(selectedHour, selectedMinute)}
                  </Text>
                </View>
              )}
            </View>
            
            {/* Time Picker Wheels */}
            <View className="bg-gray-50 rounded-lg p-4 mb-6">
              <View className="flex-row justify-center items-center">
                {/* Hour Picker */}
                <View className="items-center mr-6">
                  <Text className="text-sm font-medium text-gray-700 mb-2">Hour</Text>
                  <WheelPicker
                    data={Array.from({ length: 24 }, (_, i) => i)}
                    selectedValue={selectedHour}
                    onValueChange={setSelectedHour}
                    width={90}
                  />
                </View>
                
                {/* Separator */}
                <View className="items-center justify-center">
                  <Text className="text-3xl font-bold text-gray-400">:</Text>
                </View>
                
                {/* Minute Picker */}
                <View className="items-center ml-6">
                  <Text className="text-sm font-medium text-gray-700 mb-2">Min</Text>
                  <WheelPicker
                    data={Array.from({ length: 60 }, (_, i) => i)}
                    selectedValue={selectedMinute}
                    onValueChange={setSelectedMinute}
                    width={90}
                  />
                </View>
              </View>
            </View>
            
            {/* Action Buttons */}
            <View className="flex-row space-x-3">
              <TouchableOpacity 
                onPress={() => setShowTimePickerModal(false)}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-lg"
              >
                <Text className="text-gray-700 font-medium text-center">Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={handleTimePickerConfirm}
                className="flex-1 py-3 px-4 bg-orange-500 rounded-lg"
              >
                <Text className="text-white font-medium text-center">Add Recipe</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
