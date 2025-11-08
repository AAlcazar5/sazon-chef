import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import '../global.css';

function RootLayoutNav() {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading } = useAuth();

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
    if (isOnboardingComplete === null || isLoading) return; // Still loading

    const inAuth = segments[0] === 'login' || segments[0] === 'register';
    const inOnboarding = segments[0] === 'onboarding';
    const inTabs = segments[0] === '(tabs)';

    // Check authentication first
    if (!isAuthenticated && !inAuth && !inOnboarding) {
      // User is not authenticated and not on auth/onboarding screens
      router.replace('/login');
      return;
    }

    if (isAuthenticated && inAuth) {
      // User is authenticated but on auth screen, redirect to tabs
      router.replace('/(tabs)');
      return;
    }

    // Then check onboarding
    if (isAuthenticated && !isOnboardingComplete && !inOnboarding) {
      // User is authenticated but hasn't completed onboarding
      router.replace('/onboarding');
    } else if (isOnboardingComplete && inOnboarding && segments.length === 1) {
      // User has completed onboarding but is on onboarding screen (without edit param)
      // This can happen on app restart - redirect to main app
      // router.replace('/(tabs)');
      // Actually, let's not redirect here - they might be intentionally redoing onboarding
    }
  }, [isOnboardingComplete, segments, isAuthenticated, isLoading]);

  if (isOnboardingComplete === null || isLoading) {
    // Show loading screen while checking onboarding/authentication status
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
          name="scanner-results" 
          options={{ 
            headerShown: false
          }} 
        />
        <Stack.Screen 
          name="edit-budget" 
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
        <Stack.Screen 
          name="login" 
          options={{ 
            headerShown: false,
            presentation: 'modal'
          }} 
        />
        <Stack.Screen 
          name="register" 
          options={{ 
            headerShown: false,
            presentation: 'modal'
          }} 
        />
      </Stack>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}