import React from 'react';
// frontend/components/home/PaginationControls.tsx
// Pagination controls for recipe lists

import { View, Text, TouchableOpacity } from 'react-native';
import { useColorScheme } from 'nativewind';
import AnimatedActivityIndicator from '../ui/AnimatedActivityIndicator';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { FontSize } from '../../constants/Typography';

interface PaginationInfo {
  totalPages: number;
  isFirstPage: boolean;
  isLastPage: boolean;
  hasMultiplePages: boolean;
}

interface PaginationControlsProps {
  /** Current page (0-indexed) */
  currentPage: number;
  /** Total number of items */
  totalItems: number;
  /** Number of items currently shown */
  itemsShown: number;
  /** Pagination info object */
  paginationInfo: PaginationInfo;
  /** Whether pagination is loading */
  isLoading: boolean;
  /** Called when previous page is pressed */
  onPrevPage: () => void;
  /** Called when next page is pressed */
  onNextPage: () => void;
}

/**
 * Pagination controls component with Previous/Next buttons and page indicator
 */
function PaginationControls({
  currentPage,
  totalItems,
  itemsShown,
  paginationInfo,
  isLoading,
  onPrevPage,
  onNextPage,
}: PaginationControlsProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (totalItems === 0 || !paginationInfo.hasMultiplePages) {
    return null;
  }

  const startItem = currentPage * itemsShown + 1;
  const endItem = Math.min(currentPage * itemsShown + itemsShown, totalItems);

  return (
    <View className="mt-6">
      {/* Recipe count summary */}
      <Text className="text-center text-sm text-gray-500 dark:text-gray-400 mb-3">
        Showing {startItem}-{endItem} of {totalItems} recipes
      </Text>

      <View className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex-row items-center justify-between">
        {/* Previous Button */}
        <TouchableOpacity
          onPress={onPrevPage}
          disabled={paginationInfo.isFirstPage || isLoading}
          activeOpacity={0.7}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: paginationInfo.isFirstPage || isLoading ? 0.5 : 1,
            backgroundColor:
              paginationInfo.isFirstPage || isLoading
                ? isDark
                  ? '#374151'
                  : '#F3F4F6'
                : isDark
                ? DarkColors.primary
                : Colors.primary,
            minWidth: 100,
          }}
        >
          <Icon
            name={Icons.CHEVRON_BACK}
            size={IconSizes.SM}
            color={
              paginationInfo.isFirstPage || isLoading
                ? isDark
                  ? '#6B7280'
                  : '#9CA3AF'
                : '#FFFFFF'
            }
            accessibilityLabel="Previous page"
          />
          <Text
            style={{
              fontSize: FontSize.base,
              fontWeight: '600',
              marginLeft: 4,
              color:
                paginationInfo.isFirstPage || isLoading
                  ? isDark
                    ? '#6B7280'
                    : '#9CA3AF'
                  : '#FFFFFF',
            }}
          >
            Previous
          </Text>
        </TouchableOpacity>

        {/* Page Indicator */}
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          {isLoading ? (
            <AnimatedActivityIndicator
              size="small"
              color={isDark ? DarkColors.primary : Colors.primary}
            />
          ) : (
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Page {currentPage + 1} of {paginationInfo.totalPages}
            </Text>
          )}
        </View>

        {/* Next Button */}
        <TouchableOpacity
          onPress={onNextPage}
          disabled={paginationInfo.isLastPage || isLoading}
          activeOpacity={0.7}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: paginationInfo.isLastPage || isLoading ? 0.5 : 1,
            backgroundColor:
              paginationInfo.isLastPage || isLoading
                ? isDark
                  ? '#374151'
                  : '#F3F4F6'
                : isDark
                ? DarkColors.primary
                : Colors.primary,
            minWidth: 100,
          }}
        >
          <Text
            style={{
              fontSize: FontSize.base,
              fontWeight: '600',
              marginRight: 4,
              color:
                paginationInfo.isLastPage || isLoading
                  ? isDark
                    ? '#6B7280'
                    : '#9CA3AF'
                  : '#FFFFFF',
            }}
          >
            Next
          </Text>
          <Icon
            name={Icons.CHEVRON_FORWARD}
            size={IconSizes.SM}
            color={
              paginationInfo.isLastPage || isLoading
                ? isDark
                  ? '#6B7280'
                  : '#9CA3AF'
                : '#FFFFFF'
            }
            accessibilityLabel="Next page"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default React.memo(PaginationControls);
