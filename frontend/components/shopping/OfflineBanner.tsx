// frontend/components/shopping/OfflineBanner.tsx
// Banner indicating offline status, pending sync, or stale cache

import { View, Text, ActivityIndicator } from 'react-native';
import { useColorScheme } from 'nativewind';
import Icon from '../ui/Icon';
import { Icons } from '../../constants/Icons';

interface OfflineBannerProps {
  isOffline: boolean;
  hasPendingSync: boolean;
  cacheAge: number | null;
}

function formatCacheAge(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  if (hours < 1) return 'less than an hour ago';
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

export default function OfflineBanner({
  isOffline,
  hasPendingSync,
  cacheAge,
}: OfflineBannerProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (isOffline) {
    return (
      <View
        className="mx-4 mt-2 mb-1 flex-row items-center p-3 rounded-xl"
        style={{
          backgroundColor: isDark ? '#78350F' : '#FFFBEB',
          borderWidth: 1,
          borderColor: isDark ? '#92400E' : '#FDE68A',
        }}
      >
        <Icon
          name={Icons.CLOUD_OFFLINE_OUTLINE}
          size={18}
          color={isDark ? '#FCD34D' : '#92400E'}
          accessibilityLabel="Offline"
          style={{ marginRight: 10 }}
        />
        <View className="flex-1">
          <Text
            className="text-sm font-semibold"
            style={{ color: isDark ? '#FCD34D' : '#92400E' }}
          >
            You're offline
          </Text>
          <Text
            className="text-xs"
            style={{ color: isDark ? '#FDE68A' : '#B45309' }}
          >
            Changes will sync when you reconnect
          </Text>
        </View>
      </View>
    );
  }

  if (hasPendingSync) {
    return (
      <View
        className="mx-4 mt-2 mb-1 flex-row items-center p-3 rounded-xl"
        style={{
          backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF',
          borderWidth: 1,
          borderColor: isDark ? '#1E40AF' : '#BFDBFE',
        }}
      >
        <ActivityIndicator
          size="small"
          color={isDark ? '#93C5FD' : '#2563EB'}
          style={{ marginRight: 10 }}
        />
        <Text
          className="text-sm font-medium"
          style={{ color: isDark ? '#93C5FD' : '#1E40AF' }}
        >
          Syncing changes...
        </Text>
      </View>
    );
  }

  if (cacheAge != null && cacheAge > 3600000) {
    return (
      <View className="mx-4 mt-1 mb-1">
        <Text className="text-xs text-center text-gray-400 dark:text-gray-500">
          Last updated {formatCacheAge(cacheAge)}
        </Text>
      </View>
    );
  }

  return null;
}
