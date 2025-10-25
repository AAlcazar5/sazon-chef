import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../global.css';

export default function RootLayout() {
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