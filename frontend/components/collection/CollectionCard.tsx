import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { useColorScheme } from 'nativewind';

interface CollectionCardProps {
  collection: {
    id: string;
    name: string;
    isDefault?: boolean;
    recipeCount?: number;
    updatedAt?: string;
    coverImageUrl?: string;
  };
  isSelected?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function CollectionCard({
  collection,
  isSelected = false,
  onPress,
  onLongPress,
  onEdit,
  onDelete,
}: CollectionCardProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Format last updated date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
      return `${Math.floor(diffDays / 365)} years ago`;
    } catch {
      return 'Unknown';
    }
  };

  const defaultImageUrl = 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&h=300&fit=crop';

  return (
    <HapticTouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
      className="rounded-xl overflow-hidden mb-4"
      style={{
        backgroundColor: isSelected 
          ? (isDark ? `${Colors.primaryLight}33` : Colors.primaryLight)
          : (isDark ? DarkColors.primaryDark : '#FFFFFF'),
        borderWidth: isSelected ? 2 : 1,
        borderColor: isSelected 
          ? (isDark ? DarkColors.primary : Colors.primary)
          : (isDark ? DarkColors.border.light : Colors.border.light),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isSelected ? 0.2 : 0.1,
        shadowRadius: 4,
        elevation: isSelected ? 4 : 2,
      }}
      activeOpacity={0.8}
    >
      {/* Cover Image */}
      <View style={{ position: 'relative', height: 140 }}>
        <Image
          source={{ uri: collection.coverImageUrl || defaultImageUrl }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
        />
        <LinearGradient
          colors={isDark
            ? ['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)']
            : ['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']
          }
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 80,
          }}
        />
        
        {/* Selected Indicator */}
        {isSelected && (
          <View className="absolute top-3 right-3">
            <View className="w-6 h-6 rounded-full items-center justify-center" style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}>
              <Icon name={Icons.CHECKMARK} size={12} color="#FFFFFF" accessibilityLabel="Selected" />
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View className="absolute top-3 left-3 flex-row" style={{ gap: 6 }}>
          {onEdit && (
            <HapticTouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="w-8 h-8 rounded-full items-center justify-center"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            >
              <Icon name={Icons.EDIT_OUTLINE} size={16} color="#FFFFFF" accessibilityLabel="Edit collection" />
            </HapticTouchableOpacity>
          )}
          {onDelete && (
            <HapticTouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="w-8 h-8 rounded-full items-center justify-center"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            >
              <Icon name={Icons.DELETE_OUTLINE} size={16} color={Colors.secondaryRed} accessibilityLabel="Delete collection" />
            </HapticTouchableOpacity>
          )}
        </View>

        {/* Collection Name Overlay */}
        <View className="absolute bottom-0 left-0 right-0 p-3">
          <Text 
            className="text-white font-bold text-lg" 
            numberOfLines={2}
            style={{ textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}
          >
            {collection.name}
          </Text>
        </View>
      </View>

      {/* Collection Info */}
      <View className="p-3">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center">
            <Icon name={Icons.COOKBOOK} size={IconSizes.XS} color={isDark ? DarkColors.text.secondary : Colors.text.secondary} accessibilityLabel="Recipe count" />
            <Text className="text-sm font-semibold ml-1.5" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
              {collection.recipeCount || 0} {collection.recipeCount === 1 ? 'recipe' : 'recipes'}
            </Text>
          </View>
          {collection.updatedAt && (
            <View className="flex-row items-center">
              <Icon name={Icons.CLOCK_OUTLINE} size={IconSizes.XS} color={isDark ? DarkColors.text.secondary : Colors.text.secondary} accessibilityLabel="Last updated" />
              <Text className="text-xs ml-1" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
                {formatDate(collection.updatedAt)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </HapticTouchableOpacity>
  );
}

