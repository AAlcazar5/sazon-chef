// frontend/constants/Icons.ts
// Icon constants for consistent icon usage across the app
import type { IconName } from '../components/ui/Icon';

/**
 * Standardized icon names for common use cases
 * Use these constants instead of hardcoding icon names
 */
export const Icons = {
  // Navigation
  HOME: 'home' as IconName,
  HOME_OUTLINE: 'home-outline' as IconName,
  COOKBOOK: 'book' as IconName,
  COOKBOOK_OUTLINE: 'book-outline' as IconName,
  MEAL_PLAN: 'calendar' as IconName,
  MEAL_PLAN_OUTLINE: 'calendar-outline' as IconName,
  SHOPPING_LIST: 'list' as IconName,
  SHOPPING_LIST_OUTLINE: 'list-outline' as IconName,
  PROFILE: 'person' as IconName,
  PROFILE_OUTLINE: 'person-outline' as IconName,
  ACCOUNT: 'person-circle' as IconName,
  ACCOUNT_OUTLINE: 'person-circle-outline' as IconName,
  
  // Actions
  ADD: 'add' as IconName,
  ADD_CIRCLE: 'add-circle' as IconName,
  ADD_CIRCLE_OUTLINE: 'add-circle-outline' as IconName,
  CLOSE: 'close' as IconName,
  CLOSE_CIRCLE: 'close-circle' as IconName,
  CHECKMARK: 'checkmark' as IconName,
  CHECKMARK_CIRCLE: 'checkmark-circle' as IconName,
  CHECKMARK_CIRCLE_OUTLINE: 'checkmark-circle-outline' as IconName,
  ELLIPSE_OUTLINE: 'ellipse-outline' as IconName,
  DELETE: 'trash' as IconName,
  DELETE_OUTLINE: 'trash-outline' as IconName,
  EDIT: 'pencil' as IconName,
  EDIT_OUTLINE: 'pencil-outline' as IconName,
  SAVE: 'save' as IconName,
  SAVE_OUTLINE: 'save-outline' as IconName,
  SHARE: 'share' as IconName,
  SHARE_OUTLINE: 'share-outline' as IconName,
  
  // Recipe Feedback
  LIKE: 'thumbs-up' as IconName,
  LIKE_OUTLINE: 'thumbs-up-outline' as IconName,
  DISLIKE: 'thumbs-down' as IconName,
  DISLIKE_OUTLINE: 'thumbs-down-outline' as IconName,
  FAVORITE: 'heart' as IconName,
  FAVORITE_OUTLINE: 'heart-outline' as IconName,
  BOOKMARK: 'bookmark' as IconName,
  BOOKMARK_OUTLINE: 'bookmark-outline' as IconName,
  STAR: 'star' as IconName,
  STAR_OUTLINE: 'star-outline' as IconName,
  
  // Status
  SUCCESS: 'checkmark-done-circle' as IconName,
  ERROR: 'alert-circle' as IconName,
  ERROR_OUTLINE: 'alert-circle-outline' as IconName,
  INFO: 'information-circle' as IconName,
  INFO_OUTLINE: 'information-circle-outline' as IconName,
  WARNING: 'warning' as IconName,
  WARNING_OUTLINE: 'warning-outline' as IconName,
  REFRESH: 'refresh' as IconName,
  REFRESH_CIRCLE: 'refresh-circle' as IconName,
  RELOAD: 'reload' as IconName,
  
  // Media & Scanner
  CAMERA: 'camera' as IconName,
  CAMERA_OUTLINE: 'camera-outline' as IconName,
  IMAGE: 'image' as IconName,
  IMAGE_OUTLINE: 'image-outline' as IconName,
  BARCODE: 'barcode' as IconName,
  BARCODE_OUTLINE: 'barcode-outline' as IconName,
  SCAN: 'scan' as IconName,
  SCAN_OUTLINE: 'scan-outline' as IconName,
  
  // Settings
  SETTINGS: 'settings' as IconName,
  SETTINGS_OUTLINE: 'settings-outline' as IconName,
  OPTIONS: 'options' as IconName,
  OPTIONS_OUTLINE: 'options-outline' as IconName,
  FILTER: 'filter' as IconName,
  FILTER_OUTLINE: 'filter-outline' as IconName,
  SEARCH: 'search' as IconName,
  SEARCH_OUTLINE: 'search-outline' as IconName,
  NOTIFICATIONS: 'notifications' as IconName,
  NOTIFICATIONS_OUTLINE: 'notifications-outline' as IconName,
  
  // Food & Recipe
  RESTAURANT: 'restaurant' as IconName,
  RESTAURANT_OUTLINE: 'restaurant-outline' as IconName,
  NUTRITION: 'nutrition' as IconName,
  NUTRITION_OUTLINE: 'nutrition-outline' as IconName,
  FLAME: 'flame' as IconName,
  FLAME_OUTLINE: 'flame-outline' as IconName,
  TIME: 'time' as IconName,
  TIME_OUTLINE: 'time-outline' as IconName,
  TIMER: 'timer' as IconName,
  TIMER_OUTLINE: 'timer-outline' as IconName,
  
  // Custom App-Specific Icons
  RANDOM_RECIPE: 'dice' as IconName,
  RANDOM_RECIPE_OUTLINE: 'dice-outline' as IconName,
  RECIPE_LOADING: 'hourglass-outline' as IconName,
  RECIPE_ERROR: 'close-circle' as IconName,
  EMPTY_RECIPES: 'book-outline' as IconName,
  COOK_TIME: 'timer-outline' as IconName,
  RECIPE_FILTER: 'filter-outline' as IconName,
  SAVE_RECIPE: 'bookmark-outline' as IconName,
  AI_GENERATE: 'sparkles' as IconName,
  AI_GENERATE_OUTLINE: 'sparkles-outline' as IconName,
  NOTE: 'document-text' as IconName,
  NOTE_OUTLINE: 'document-text-outline' as IconName,
  SWAP_HORIZONTAL: 'swap-horizontal' as IconName,
  
  // Shopping
  CART: 'cart' as IconName,
  CART_OUTLINE: 'cart-outline' as IconName,
  STORE: 'storefront' as IconName,
  STORE_OUTLINE: 'storefront-outline' as IconName,
  LOCATION: 'location' as IconName,
  LOCATION_OUTLINE: 'location-outline' as IconName,
  SYNC: 'sync' as IconName,
  SYNC_OUTLINE: 'sync-outline' as IconName,
  MERGE_LISTS: 'git-merge' as IconName,
  MERGE_LISTS_OUTLINE: 'git-merge-outline' as IconName,
  MAP: 'map' as IconName,
  MAP_OUTLINE: 'map-outline' as IconName,
  
  // Navigation & UI
  MENU: 'menu' as IconName,
  MENU_OUTLINE: 'menu-outline' as IconName,
  MORE: 'ellipsis-horizontal' as IconName,
  MORE_CIRCLE: 'ellipsis-horizontal-circle' as IconName,
  CHEVRON_BACK: 'chevron-back' as IconName,
  CHEVRON_FORWARD: 'chevron-forward' as IconName,
  CHEVRON_UP: 'chevron-up' as IconName,
  CHEVRON_DOWN: 'chevron-down' as IconName,
  ARROW_BACK: 'arrow-back' as IconName,
  ARROW_FORWARD: 'arrow-forward' as IconName,
  
  // Misc
  LINK: 'link' as IconName,
  LINK_OUTLINE: 'link-outline' as IconName,
  GLOBE: 'globe' as IconName,
  GLOBE_OUTLINE: 'globe-outline' as IconName,
  LOCK: 'lock-closed' as IconName,
  LOCK_OUTLINE: 'lock-closed-outline' as IconName,
  THEME: 'color-palette' as IconName,
  THEME_OUTLINE: 'color-palette-outline' as IconName,
  LIGHT_MODE: 'sunny' as IconName,
  LIGHT_MODE_OUTLINE: 'sunny-outline' as IconName,
  DARK_MODE: 'moon' as IconName,
  DARK_MODE_OUTLINE: 'moon-outline' as IconName,
  SYSTEM_MODE: 'phone-portrait' as IconName,
  SYSTEM_MODE_OUTLINE: 'phone-portrait-outline' as IconName,
  PHYSICAL_PROFILE: 'body' as IconName,
  PHYSICAL_PROFILE_OUTLINE: 'body-outline' as IconName,
  MACRO_GOALS: 'flag' as IconName,
  MACRO_GOALS_OUTLINE: 'flag-outline' as IconName,
  EXPORT: 'download' as IconName,
  EXPORT_OUTLINE: 'download-outline' as IconName,
  LOG_OUT: 'log-out' as IconName,
  LOG_OUT_OUTLINE: 'log-out-outline' as IconName,
  EYE: 'eye' as IconName,
  EYE_OUTLINE: 'eye-outline' as IconName,
  EYE_OFF: 'eye-off' as IconName,
  EYE_OFF_OUTLINE: 'eye-off-outline' as IconName,
} as const;

/**
 * Icon size presets for consistent sizing
 */
export const IconSizes = {
  XS: 'xs' as const,  // 12px - Very small, inline text
  SM: 'sm' as const,   // 16px - Small buttons, list items
  MD: 'md' as const,  // 20px - Default size, buttons
  LG: 'lg' as const,  // 24px - Large buttons, headers
  XL: 'xl' as const,  // 32px - Extra large, feature icons
} as const;

