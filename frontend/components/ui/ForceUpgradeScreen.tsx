// frontend/components/ui/ForceUpgradeScreen.tsx
// ROADMAP 4.0 U3 — Force-upgrade blocking screen.
//
// Rendered when `useForceUpgrade` reports the current build is below the
// minimum-supported floor. Tap → Linking opens the App Store / Play Store.

import { View, Text, Linking, Platform } from 'react-native';
import BrandButton from './BrandButton';
import Sazon from '../mascot/Sazon';

const APP_STORE_URL = 'https://apps.apple.com/app/sazon-chef/id0000000000';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.sazon.chef';

interface ForceUpgradeScreenProps {
  floor?: string | null;
}

export default function ForceUpgradeScreen({ floor }: ForceUpgradeScreenProps) {
  const handleUpgrade = () => {
    const url = Platform.OS === 'android' ? PLAY_STORE_URL : APP_STORE_URL;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View
      className="flex-1 items-center justify-center px-8 bg-white dark:bg-gray-900"
      accessibilityRole="alert"
      accessibilityLabel="App update required"
    >
      <Sazon variant="orange" motion="wobble" fx={['sparkle']} size={192} />
      <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-6 mb-2 text-center">
        A fresh Sazon awaits
      </Text>
      <Text className="text-base text-gray-500 dark:text-gray-400 mb-6 text-center">
        We've shipped a newer build with sharper flavor.
        {floor ? `\nMinimum version: ${floor}` : ''}
      </Text>
      <BrandButton
        label={Platform.OS === 'android' ? 'Open Play Store' : 'Open App Store'}
        onPress={handleUpgrade}
        variant="brand"
        accessibilityLabel="Open store to upgrade Sazon"
      />
    </View>
  );
}
