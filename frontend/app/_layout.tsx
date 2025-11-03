import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import '../global.css';

export default function RootLayout() {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    try {
      const onboardingComplete = await AsyncStorage.getItem('onboarding_complete');
      setIsOnboardingComplete(onboardingComplete === 'true');
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setIsOnboardingComplete(false);
    }
  };

  useEffect(() => {
    if (isOnboardingComplete === null) return; // Still loading

    const inOnboarding = segments[0] === 'onboarding';

    if (!isOnboardingComplete && !inOnboarding) {
      // User hasn't completed onboarding, redirect to onboarding
      router.replace('/onboarding');
    } else if (isOnboardingComplete && inOnboarding && segments.length === 1) {
      // User has completed onboarding but is on onboarding screen (without edit param)
      // This can happen on app restart - redirect to main app
      // router.replace('/(tabs)');
      // Actually, let's not redirect here - they might be intentionally redoing onboarding
    }
  }, [isOnboardingComplete, segments]);

  if (isOnboardingComplete === null) {
    // Show loading screen while checking onboarding status
    return null;
  }

  return (
    <SafeAreaProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="modal" 
          options={{ 
            presentation: 'modal',
            headerShown: false
          }} 
        />
        <Stack.Screen 
          name="edit-physical-profile" 
          options={{ 
            headerShown: false
          }} 
        />
        <Stack.Screen 
          name="edit-macro-goals" 
          options={{ 
            headerShown: false
          }} 
        />
        <Stack.Screen 
          name="edit-preferences" 
          options={{ 
            headerShown: false
          }} 
        />
        <Stack.Screen 
          name="recipe-form" 
          options={{ 
            headerShown: false
          }} 
        />
        <Stack.Screen 
          name="onboarding" 
          options={{ 
            headerShown: false
          }} 
        />
      </Stack>
    </SafeAreaProvider>
  );
}