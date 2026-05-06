// frontend/components/home/HomeErrorState.tsx
// ROADMAP 4.0 FX1.2 — body-only error state.
//
// The persistent home chrome (HomeHeader + FilterRow) lives above this body
// in app/(tabs)/index.tsx; this component renders ONLY the error body so the
// user can still reach the filter row to deselect filters that may have caused
// a zero-result fetch.

import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { LogoMascot } from '../mascot';
import GradientButton from '../ui/GradientButton';
import { HapticPatterns } from '../../constants/Haptics';

interface HomeErrorStateProps {
  error: string;
  errorCode?: string | null;
  /** Optional structured failure class from lib/api.ts. When set, drives
   *  the title + suggestions; otherwise we fall back to string heuristics. */
  failureClass?: 'offline' | 'timeout' | 'server_unreachable' | 'canceled' | 'unknown_transport' | null;
  onRetry: () => void;
}

function HomeErrorState({ error, errorCode, failureClass, onRetry }: HomeErrorStateProps) {
  // Failure-class-aware copy first; legacy string-match heuristics second.
  const getErrorInfo = () => {
    if (failureClass === 'offline' || errorCode === 'OFFLINE') {
      return {
        title: "You're offline",
        message: "Reconnect and we'll pick up where you left off.",
        suggestions: [
          "Check your Wi-Fi or mobile data",
          "Toggle airplane mode off if it's on",
          "We'll auto-retry once you're back online",
        ],
      };
    }
    if (failureClass === 'timeout' || errorCode === 'TIMEOUT' || errorCode === 'TIMEOUT_ERROR' || /timeout/i.test(error)) {
      return {
        title: "The kitchen is slow tonight",
        message: "The server's taking longer than usual. We've already retried twice.",
        suggestions: [
          "Give it a moment, then try again",
          "Strong signal helps — Wi-Fi over cellular if you can",
          "Restart the app if this keeps happening",
        ],
      };
    }
    if (failureClass === 'server_unreachable' || errorCode === 'SERVER_UNREACHABLE') {
      return {
        title: "We can't reach the kitchen",
        message: "Our servers are temporarily unreachable.",
        suggestions: [
          "This is usually a quick blip on our end",
          "Try again in a moment",
          "If it persists, we're already on it",
        ],
      };
    }
    if (errorCode === 'NETWORK_ERROR' || /network|connect|fetch/i.test(error)) {
      return {
        title: "Connection problem",
        message: "We couldn't reach our servers. Please check your internet connection and try again.",
        suggestions: [
          "Check your Wi-Fi or mobile data connection",
          "Make sure you're connected to the internet",
          "Try again in a moment",
        ],
      };
    }
    if (/500|server/i.test(error)) {
      return {
        title: "Server error",
        message: "Our servers are experiencing some issues.",
        suggestions: [
          "This is usually temporary",
          "Try again in a few moments",
          "We're working on fixing this",
        ],
      };
    }
    return {
      title: "Something hiccuped",
      message: "We couldn't load recipes right now.",
      suggestions: [
        "Pull down to refresh",
        "Check your internet connection",
        "Try again in a moment",
      ],
    };
  };

  const errorInfo = getErrorInfo();

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
      <View className="flex-1 items-center justify-center p-8">
        <LogoMascot expression="supportive" size="large" />
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
          <GradientButton
            label="Try Again"
            onPress={() => {
              onRetry();
              HapticPatterns.buttonPressPrimary();
            }}
            icon="refresh"
          />
        </View>
      </View>
    </ScrollView>
  );
}

export default HomeErrorState;
