// frontend/components/shopping/BuyAgainSection.tsx
// "Buy Again" section showing frequently purchased items and favorites

import { View, Text, ScrollView } from 'react-native';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { PurchaseHistoryItem } from '../../types';

interface BuyAgainSectionProps {
  purchaseHistory: PurchaseHistoryItem[];
  loading: boolean;
  onAddItem: (item: PurchaseHistoryItem) => void;
  onToggleFavorite: (item: PurchaseHistoryItem) => void;
  onReorderLastWeek: () => void;
}

export default function BuyAgainSection({
  purchaseHistory,
  loading,
  onAddItem,
  onToggleFavorite,
  onReorderLastWeek,
}: BuyAgainSectionProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (loading || purchaseHistory.length === 0) return null;

  const favorites = purchaseHistory.filter(item => item.isFavorite);
  const frequent = purchaseHistory.filter(item => !item.isFavorite);

  const formatItemName = (name: string) =>
    name.charAt(0).toUpperCase() + name.slice(1);

  const renderChip = (item: PurchaseHistoryItem) => (
    <HapticTouchableOpacity
      key={item.id}
      onPress={() => onAddItem(item)}
      onLongPress={() => onToggleFavorite(item)}
      className="flex-row items-center px-3 py-2 rounded-full border"
      style={{
        backgroundColor: item.isFavorite
          ? (isDark ? '#78350F' : '#FFFBEB')
          : (isDark ? '#1F2937' : '#F9FAFB'),
        borderColor: item.isFavorite
          ? (isDark ? '#F59E0B' : '#FCD34D')
          : (isDark ? '#374151' : '#E5E7EB'),
      }}
    >
      {item.isFavorite && (
        <Icon
          name={Icons.STAR}
          size={14}
          color={isDark ? '#F59E0B' : '#D97706'}
          accessibilityLabel="Favorite"
          style={{ marginRight: 4 }}
        />
      )}
      <Text
        className="text-sm font-medium"
        style={{
          color: item.isFavorite
            ? (isDark ? '#FCD34D' : '#92400E')
            : (isDark ? '#D1D5DB' : '#374151'),
        }}
        numberOfLines={1}
      >
        {formatItemName(item.itemName)}
      </Text>
      {item.lastPrice != null && item.lastPrice > 0 && (
        <Text
          className="text-xs ml-1"
          style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}
        >
          ${item.lastPrice.toFixed(2)}
        </Text>
      )}
      {item.purchaseCount > 1 && (
        <Text
          className="text-xs ml-1"
          style={{ color: isDark ? '#9CA3AF' : '#9CA3AF' }}
        >
          x{item.purchaseCount}
        </Text>
      )}
    </HapticTouchableOpacity>
  );

  return (
    <View className="mx-4 mb-4">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Buy Again
        </Text>
        <HapticTouchableOpacity
          onPress={onReorderLastWeek}
          className="flex-row items-center px-3 py-1.5 rounded-full"
          style={{
            backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight,
          }}
        >
          <Icon
            name={Icons.REFRESH}
            size={14}
            color={isDark ? DarkColors.primary : Colors.primary}
            accessibilityLabel="Reorder last week"
            style={{ marginRight: 4 }}
          />
          <Text
            className="text-xs font-semibold"
            style={{ color: isDark ? DarkColors.primary : Colors.primary }}
          >
            Last Week
          </Text>
        </HapticTouchableOpacity>
      </View>

      {favorites.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 16 }}
          className="mb-2"
        >
          <View className="flex-row" style={{ gap: 8 }}>
            {favorites.map(renderChip)}
          </View>
        </ScrollView>
      )}

      {frequent.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 16 }}
        >
          <View className="flex-row" style={{ gap: 8 }}>
            {frequent.map(renderChip)}
          </View>
        </ScrollView>
      )}

      <Text className="text-xs text-gray-400 dark:text-gray-500 mt-1">
        Tap to add, long-press to favorite
      </Text>
    </View>
  );
}
