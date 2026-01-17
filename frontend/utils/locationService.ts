// Location service that respects user privacy settings
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

class LocationService {
  private userId: string | null = null;
  private enabled: boolean = false;

  /**
   * Initialize location service with user ID
   */
  async initialize(userId: string) {
    this.userId = userId;
    await this.checkPrivacySetting();
  }

  /**
   * Check if location services are enabled for the current user
   */
  private async checkPrivacySetting(): Promise<boolean> {
    try {
      if (!this.userId) {
        this.enabled = false;
        return false;
      }

      const savedSettings = await AsyncStorage.getItem(`privacy_settings_${this.userId}`);
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        this.enabled = settings.locationServicesEnabled === true;
      } else {
        this.enabled = false; // Default to disabled for privacy
      }
      return this.enabled;
    } catch (error) {
      console.error('Error checking location services privacy setting:', error);
      this.enabled = false;
      return false;
    }
  }

  /**
   * Request location permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  /**
   * Get current location (only if location services are enabled)
   */
  async getCurrentLocation(): Promise<LocationCoordinates | null> {
    // Check privacy setting first
    const isEnabled = await this.checkPrivacySetting();
    
    if (!isEnabled) {
      console.log('🔒 Location services disabled - cannot get location');
      return null;
    }

    try {
      // Check if permissions are granted
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const granted = await this.requestPermissions();
        if (!granted) {
          console.log('📍 Location permission not granted');
          return null;
        }
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || undefined,
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  /**
   * Watch position (only if location services are enabled)
   */
  async watchPosition(
    callback: (location: LocationCoordinates) => void
  ): Promise<Location.LocationSubscription | null> {
    // Check privacy setting first
    const isEnabled = await this.checkPrivacySetting();
    
    if (!isEnabled) {
      console.log('🔒 Location services disabled - cannot watch position');
      return null;
    }

    try {
      // Check if permissions are granted
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const granted = await this.requestPermissions();
        if (!granted) {
          console.log('📍 Location permission not granted');
          return null;
        }
      }

      // Watch position
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Update every 10 meters
        },
        (location) => {
          callback({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || undefined,
          });
        }
      );

      return subscription;
    } catch (error) {
      console.error('Error watching position:', error);
      return null;
    }
  }

  /**
   * Check if location services are enabled
   */
  async isEnabled(): Promise<boolean> {
    return await this.checkPrivacySetting();
  }
}

// Export singleton instance
export const locationService = new LocationService();

