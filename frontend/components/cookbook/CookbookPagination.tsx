// frontend/components/cookbook/CookbookPagination.tsx
// Pagination controls for cookbook recipe lists

import { View, Text } from 'react-native';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { HapticPatterns } from '../../constants/Haptics';

interface PaginationInfo {
  totalItems: number;
  totalPages: number;
  isFirstPage: boolean;
  isLastPage: boolean;
  hasMultiplePages: boolean;
  from: number;
  to: number;
}

interface CookbookPaginationProps {
  /** Current page index (0-based) */
  currentPage: number;
  /** Update the current page */
  onPageChange: (page: number) => void;
  /** Pagination info computed from recipes */
  paginationInfo: PaginationInfo;
}

export default function CookbookPagination({
  currentPage,
  onPageChange,
  paginationInfo,
}: CookbookPaginationProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (!paginationInfo.hasMultiplePages) {
    return null;
  }

  return (
    <View className="px-4 py-6">
      <View className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex-row items-center justify-between">
        <HapticTouchableOpacity
          onPress={() => {
            if (!paginationInfo.isFirstPage) {
              onPageChange(currentPage - 1);
              HapticPatterns.buttonPress();
            }
          }}
          disabled={paginationInfo.isFirstPage}
          className={`px-4 py-2 rounded-lg flex-row items-center justify-center ${
            paginationInfo.isFirstPage ? 'opacity-50' : ''
          }`}
          style={{
            backgroundColor: paginationInfo.isFirstPage
              ? isDark ? '#374151' : '#F3F4F6'
              : isDark ? DarkColors.primary : Colors.primary,
            minWidth: 100,
            width: 100
          }}
        >
          <Icon
            name={Icons.CHEVRON_BACK}
            size={IconSizes.SM}
            color={paginationInfo.isFirstPage ? (isDark ? '#6B7280' : '#9CA3AF') : '#FFFFFF'}
            accessibilityLabel="Previous page"
          />
          <Text
            className="text-sm font-semibold ml-1"
            style={{ color: paginationInfo.isFirstPage ? (isDark ? '#6B7280' : '#9CA3AF') : '#FFFFFF' }}
          >
            Previous
          </Text>
        </HapticTouchableOpacity>

        {/* Page Indicator */}
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Page {currentPage + 1} of {paginationInfo.totalPages}
          </Text>
        </View>

        <HapticTouchableOpacity
          onPress={() => {
            if (!paginationInfo.isLastPage) {
              onPageChange(currentPage + 1);
              HapticPatterns.buttonPress();
            }
          }}
          disabled={paginationInfo.isLastPage}
          className={`px-4 py-2 rounded-lg flex-row items-center justify-center ${
            paginationInfo.isLastPage ? 'opacity-50' : ''
          }`}
          style={{
            backgroundColor: paginationInfo.isLastPage
              ? isDark ? '#374151' : '#F3F4F6'
              : isDark ? DarkColors.primary : Colors.primary,
            minWidth: 100,
            width: 100
          }}
        >
          <Text
            className="text-sm font-semibold mr-1"
            style={{ color: paginationInfo.isLastPage ? (isDark ? '#6B7280' : '#9CA3AF') : '#FFFFFF' }}
          >
            Next
          </Text>
          <Icon
            name={Icons.CHEVRON_FORWARD}
            size={IconSizes.SM}
            color={paginationInfo.isLastPage ? (isDark ? '#6B7280' : '#9CA3AF') : '#FFFFFF'}
            accessibilityLabel="Next page"
          />
        </HapticTouchableOpacity>
      </View>
    </View>
  );
}
