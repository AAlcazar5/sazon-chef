// frontend/utils/socialAuth.ts
// Social authentication utilities for Google and Apple Sign In

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

// Complete the auth session for web browser
WebBrowser.maybeCompleteAuthSession();

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
const GOOGLE_REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: 'sazon',
  path: 'auth/google',
});

// Apple OAuth configuration
const APPLE_CLIENT_ID = process.env.EXPO_PUBLIC_APPLE_CLIENT_ID || '';
const APPLE_REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: 'sazon',
  path: 'auth/apple',
});

interface SocialAuthResult {
  provider: 'google' | 'apple';
  providerId: string;
  email: string;
  name: string;
  idToken?: string;
  accessToken?: string;
}

/**
 * Authenticate with Google
 */
export async function authenticateWithGoogle(): Promise<SocialAuthResult | null> {
  try {
    // For web/development, use a simpler flow
    // In production, you'd use Google Sign-In SDK for native apps
    
    if (Platform.OS === 'web') {
      // Web implementation - redirect to Google OAuth
      const discovery = {
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
        revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
      };

      const request = new AuthSession.AuthRequest({
        clientId: GOOGLE_CLIENT_ID,
        scopes: ['openid', 'profile', 'email'],
        responseType: AuthSession.ResponseType.Token,
        redirectUri: GOOGLE_REDIRECT_URI,
      });

      const result = await request.promptAsync(discovery, {
        useProxy: true,
        showInRecents: true,
      });

      if (result.type === 'success' && result.params) {
        // Get user info from Google
        const userInfoResponse = await fetch(
          `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${result.params.access_token}`
        );
        const userInfo = await userInfoResponse.json();

        return {
          provider: 'google',
          providerId: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          accessToken: result.params.access_token,
        };
      }
    } else {
      // Native implementation - for now, return mock data
      // In production, integrate with @react-native-google-signin/google-signin
      // For this implementation, we'll use a simplified approach
      console.warn('Native Google Sign-In requires additional setup. Using mock for development.');
      
      // This would normally use the native Google Sign-In SDK
      // For now, we'll handle it on the backend with a token verification approach
      return null;
    }

    return null;
  } catch (error) {
    console.error('Google authentication error:', error);
    return null;
  }
}

/**
 * Authenticate with Apple
 */
export async function authenticateWithApple(): Promise<SocialAuthResult | null> {
  try {
    if (Platform.OS === 'ios' || Platform.OS === 'web') {
      const request = new AuthSession.AuthRequest({
        clientId: APPLE_CLIENT_ID,
        scopes: [AuthSession.Scope.EMAIL, AuthSession.Scope.FULL_NAME],
        responseType: AuthSession.ResponseType.Token,
        redirectUri: APPLE_REDIRECT_URI,
      });

      const discovery = {
        authorizationEndpoint: 'https://appleid.apple.com/auth/authorize',
        tokenEndpoint: 'https://appleid.apple.com/auth/token',
      };

      const result = await request.promptAsync(discovery, {
        useProxy: true,
        showInRecents: true,
      });

      if (result.type === 'success' && result.params) {
        // Apple returns user info in the ID token
        // For a full implementation, you'd decode the JWT id_token
        // For now, we'll extract what we can from the response
        
        return {
          provider: 'apple',
          providerId: result.params.user || 'apple_user', // Apple provides user ID
          email: result.params.email || '',
          name: result.params.full_name || 'Apple User',
          idToken: result.params.id_token,
        };
      }
    } else {
      console.warn('Apple Sign-In is only available on iOS and web');
      return null;
    }

    return null;
  } catch (error) {
    console.error('Apple authentication error:', error);
    return null;
  }
}

/**
 * Simplified social auth for development/testing
 * This allows manual entry of social auth data for testing
 */
export function createMockSocialAuth(
  provider: 'google' | 'apple',
  email: string,
  name: string,
  providerId?: string
): SocialAuthResult {
  return {
    provider,
    providerId: providerId || `${provider}_${Date.now()}`,
    email,
    name,
  };
}

