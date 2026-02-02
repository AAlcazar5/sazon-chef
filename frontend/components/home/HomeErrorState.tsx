// frontend/components/home/HomeErrorState.tsx
// Error state with contextual messaging and retry for home screen

import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedLogoMascot } from '../mascot';
import { LogoMascot } from '../mascot';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { HapticPatterns } from '../../constants/Haptics';

interface HomeErrorStateProps {
  error: string;
  onRetry: () => void;
}

function HomeErrorState({ error, onRetry }: HomeErrorStateProps) {
  // Determine error type and message
  const getErrorInfo = () => {
    if (error.includes('network') || error.includes('Network') || error.includes('fetch')) {
      return {
        title: "Connection Problem",
        message: "We couldn't connect to our servers. Please check your internet connection.",
        suggestions: [
          "Check your Wi-Fi or mobile data connection",
          "Make sure you're connected to the internet",
          "Try again in a moment"
        ]
      };
    }
    if (error.includes('timeout') || error.includes('Timeout')) {
      return {
        title: "Request Timed Out",
        message: "The request took too long to complete.",
        suggestions: [
          "Check your internet connection speed",
          "Try again in a moment",
          "Restart the app if the problem persists"
        ]
      };
    }
    if (error.includes('500') || error.includes('server')) {
      return {
        title: "Server Error",
        message: "Our servers are experiencing some issues.",
        suggestions: [
          "This is usually temporary",
          "Try again in a few moments",
          "We're working on fixing this"
        ]
      };
    }
    return {
      title: "Oops! Something went wrong",
      message: "We couldn't load recipes right now.",
      suggestions: [
        "Pull down to refresh",
        "Check your internet connection",
        "Try again in a moment"
      ]
    };
  };

  const errorInfo = getErrorInfo();

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
      <View className="bg-white dark:bg-gray-800 px-4 pt-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row items-center">
          <AnimatedLogoMascot
            expression="supportive"
            size="xsmall"
            animationType="idle"
          />
          <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100" style={{ marginLeft: -2 }} accessibilityRole="header">Sazon Chef</Text>
        </View>
      </View>
      <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 items-center justify-center p-8">
          <LogoMascot
            expression="supportive"
            size="large"
          />
          <Text className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 text-center">
            {errorInfo.title}
          </Text>
          <Text className="text-gray-600 dark:text-gray-300 text-center mt-3 text-base leading-6 max-w-sm">
            {errorInfo.message}
          </Text>

          <View className="mt-6 w-full max-w-sm">
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 text-center">
              💡 What you can try:
            </Text>
            <View className="space-y-2">
              {errorInfo.suggestions.map((suggestion, index) => (
                <View key={index} className="flex-row items-start bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                  <Text className="text-gray-500 dark:text-gray-400 mr-2">•</Text>
                  <Text className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                    {suggestion}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View className="mt-8 w-full max-w-sm">
            <HapticTouchableOpacity
              onPress={() => {
                onRetry();
                HapticPatterns.buttonPressPrimary();
              }}
              className="bg-orange-500 dark:bg-orange-600 px-6 py-3 rounded-lg"
            >
              <Text className="text-white font-semibold text-center">Try Again</Text>
            </HapticTouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default HomeErrorState;
