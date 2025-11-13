// frontend/components/ui/Icon.tsx
// Centralized Icon component for consistent iconography across the app
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

export type IconName = 
  // Navigation
  | 'home' | 'home-outline'
  | 'book' | 'book-outline'
  | 'calendar' | 'calendar-outline'
  | 'list' | 'list-outline'
  | 'person' | 'person-outline'
  | 'person-circle' | 'person-circle-outline'
  // Actions
  | 'add' | 'add-circle' | 'add-circle-outline'
  | 'close' | 'close-circle' | 'close-circle-outline'
  | 'checkmark' | 'checkmark-circle' | 'checkmark-circle-outline'
  | 'ellipse-outline'
  | 'trash' | 'trash-outline'
  | 'pencil' | 'pencil-outline'
  | 'save' | 'save-outline'
  | 'share' | 'share-outline'
  | 'heart' | 'heart-outline'
  | 'thumbs-up' | 'thumbs-up-outline'
  | 'thumbs-down' | 'thumbs-down-outline'
  | 'bookmark' | 'bookmark-outline'
  | 'star' | 'star-outline'
  // Feedback & Status
  | 'checkmark-done' | 'checkmark-done-circle'
  | 'alert-circle' | 'alert-circle-outline'
  | 'information-circle' | 'information-circle-outline'
  | 'warning' | 'warning-outline'
  | 'refresh' | 'refresh-circle'
  | 'reload'
  | 'sync' | 'sync-outline'
  | 'git-merge' | 'git-merge-outline'
  // Media
  | 'camera' | 'camera-outline'
  | 'image' | 'image-outline'
  | 'barcode' | 'barcode-outline'
  | 'scan' | 'scan-outline'
  // Settings & Preferences
  | 'settings' | 'settings-outline'
  | 'options' | 'options-outline'
  | 'filter' | 'filter-outline'
  | 'search' | 'search-outline'
  | 'notifications' | 'notifications-outline'
  | 'color-palette' | 'color-palette-outline'
  | 'sunny' | 'sunny-outline'
  | 'moon' | 'moon-outline'
  | 'phone-portrait' | 'phone-portrait-outline'
  | 'body' | 'body-outline'
  | 'target' | 'target-outline'
  | 'download' | 'download-outline'
  | 'log-out' | 'log-out-outline'
  // Food & Recipe
  | 'restaurant' | 'restaurant-outline'
  | 'nutrition' | 'nutrition-outline'
  | 'flame' | 'flame-outline'
  | 'time' | 'time-outline'
  | 'timer' | 'timer-outline'
  | 'hourglass' | 'hourglass-outline'
  | 'dice' | 'dice-outline'
  | 'sparkles' | 'sparkles-outline'
  | 'document' | 'document-outline'
  | 'book-outline'
  // Shopping
  | 'cart' | 'cart-outline'
  | 'storefront' | 'storefront-outline'
  | 'location' | 'location-outline'
  | 'map' | 'map-outline'
  // Misc
  | 'menu' | 'menu-outline'
  | 'ellipsis-horizontal' | 'ellipsis-horizontal-circle'
  | 'chevron-back' | 'chevron-forward'
  | 'chevron-up' | 'chevron-down'
  | 'arrow-back' | 'arrow-forward'
  | 'link' | 'link-outline'
  | 'globe' | 'globe-outline'
  | 'lock-closed' | 'lock-closed-outline'
  | 'eye' | 'eye-outline'
  | 'eye-off' | 'eye-off-outline';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface IconProps {
  name: IconName;
  size?: IconSize | number;
  color?: string;
  className?: string;
  style?: any;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

const sizeMap: Record<IconSize, number> = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

/**
 * Centralized Icon component for consistent iconography
 * 
 * @example
 * <Icon name="home" size="md" />
 * <Icon name="heart" size="lg" color="#FF0000" />
 */
export default function Icon({
  name,
  size = 'md',
  color,
  className,
  style,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: IconProps) {
  const { colors } = useTheme();
  
  // Convert size string to number if needed
  const iconSize = typeof size === 'number' ? size : sizeMap[size];
  
  // Use theme color if no color specified
  const iconColor = color || colors.text.primary;
  
  // Map our icon names to Ionicons names
  const ioniconName = mapIconName(name);
  
  return (
    <Ionicons
      name={ioniconName as any}
      size={iconSize}
      color={iconColor}
      style={style}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel || name}
      accessibilityHint={accessibilityHint}
      accessibilityRole="image"
      testID={testID || `icon-${name}`}
    />
  );
}

/**
 * Maps our standardized icon names to Ionicons names
 */
function mapIconName(name: IconName): string {
  const iconMap: Record<IconName, string> = {
    // Navigation
    'home': 'home',
    'home-outline': 'home-outline',
    'book': 'book',
    'book-outline': 'book-outline',
    'calendar': 'calendar',
    'calendar-outline': 'calendar-outline',
    'list': 'list',
    'list-outline': 'list-outline',
    'person': 'person',
    'person-outline': 'person-outline',
    'person-circle': 'person-circle',
    'person-circle-outline': 'person-circle-outline',
    // Actions
    'add': 'add',
    'add-circle': 'add-circle',
    'add-circle-outline': 'add-circle-outline',
    'close': 'close',
    'close-circle': 'close-circle',
    'close-circle-outline': 'close-circle-outline',
    'checkmark': 'checkmark',
    'checkmark-circle': 'checkmark-circle',
    'checkmark-circle-outline': 'checkmark-circle-outline',
    'ellipse-outline': 'ellipse-outline',
    'trash': 'trash',
    'trash-outline': 'trash-outline',
    'pencil': 'pencil',
    'pencil-outline': 'pencil-outline',
    'save': 'save',
    'save-outline': 'save-outline',
    'share': 'share',
    'share-outline': 'share-outline',
    'heart': 'heart',
    'heart-outline': 'heart-outline',
    'thumbs-up': 'thumbs-up',
    'thumbs-up-outline': 'thumbs-up-outline',
    'thumbs-down': 'thumbs-down',
    'thumbs-down-outline': 'thumbs-down-outline',
    'bookmark': 'bookmark',
    'bookmark-outline': 'bookmark-outline',
    'star': 'star',
    'star-outline': 'star-outline',
    // Feedback & Status
    'checkmark-done': 'checkmark-done',
    'checkmark-done-circle': 'checkmark-done-circle',
    'alert-circle': 'alert-circle',
    'alert-circle-outline': 'alert-circle-outline',
    'information-circle': 'information-circle',
    'information-circle-outline': 'information-circle-outline',
    'warning': 'warning',
    'warning-outline': 'warning-outline',
    'refresh': 'refresh',
    'refresh-circle': 'refresh-circle',
    'reload': 'reload',
    'sync': 'sync',
    'sync-outline': 'sync-outline',
    'git-merge': 'git-merge',
    'git-merge-outline': 'git-merge-outline',
    // Media
    'camera': 'camera',
    'camera-outline': 'camera-outline',
    'image': 'image',
    'image-outline': 'image-outline',
    'barcode': 'barcode',
    'barcode-outline': 'barcode-outline',
    'scan': 'scan',
    'scan-outline': 'scan-outline',
    // Settings & Preferences
    'settings': 'settings',
    'settings-outline': 'settings-outline',
    'options': 'options',
    'options-outline': 'options-outline',
    'filter': 'filter',
    'filter-outline': 'filter-outline',
    'search': 'search',
    'search-outline': 'search-outline',
    'notifications': 'notifications',
    'notifications-outline': 'notifications-outline',
    'color-palette': 'color-palette',
    'color-palette-outline': 'color-palette-outline',
    'sunny': 'sunny',
    'sunny-outline': 'sunny-outline',
    'moon': 'moon',
    'moon-outline': 'moon-outline',
    'phone-portrait': 'phone-portrait',
    'phone-portrait-outline': 'phone-portrait-outline',
    'body': 'body',
    'body-outline': 'body-outline',
    'target': 'target',
    'target-outline': 'target-outline',
    'download': 'download',
    'download-outline': 'download-outline',
    'log-out': 'log-out',
    'log-out-outline': 'log-out-outline',
    // Food & Recipe
    'restaurant': 'restaurant',
    'restaurant-outline': 'restaurant-outline',
    'nutrition': 'nutrition',
    'nutrition-outline': 'nutrition-outline',
    'flame': 'flame',
    'flame-outline': 'flame-outline',
    'time': 'time',
    'time-outline': 'time-outline',
    'timer': 'timer',
    'timer-outline': 'timer-outline',
    'hourglass': 'hourglass',
    'hourglass-outline': 'hourglass-outline',
    'dice': 'dice',
    'dice-outline': 'dice-outline',
    'sparkles': 'sparkles',
    'sparkles-outline': 'sparkles-outline',
    'document': 'document',
    'document-outline': 'document-outline',
    'book-outline': 'book-outline',
    // Shopping
    'cart': 'cart',
    'cart-outline': 'cart-outline',
    'storefront': 'storefront',
    'storefront-outline': 'storefront-outline',
    'location': 'location',
    'location-outline': 'location-outline',
    'map': 'map',
    'map-outline': 'map-outline',
    // Misc
    'menu': 'menu',
    'menu-outline': 'menu-outline',
    'ellipsis-horizontal': 'ellipsis-horizontal',
    'ellipsis-horizontal-circle': 'ellipsis-horizontal-circle',
    'chevron-back': 'chevron-back',
    'chevron-forward': 'chevron-forward',
    'chevron-up': 'chevron-up',
    'chevron-down': 'chevron-down',
    'arrow-back': 'arrow-back',
    'arrow-forward': 'arrow-forward',
    'link': 'link',
    'link-outline': 'link-outline',
    'globe': 'globe',
    'globe-outline': 'globe-outline',
    'lock-closed': 'lock-closed',
    'lock-closed-outline': 'lock-closed-outline',
    'eye': 'eye',
    'eye-outline': 'eye-outline',
    'eye-off': 'eye-off',
    'eye-off-outline': 'eye-off-outline',
  };
  
  return iconMap[name] || name;
}

