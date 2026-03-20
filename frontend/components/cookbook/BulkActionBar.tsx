// frontend/components/cookbook/BulkActionBar.tsx
// Floating action bar shown during multi-select mode in the cookbook.
// Actions: Move to Collection, Remove from Cookbook, Cancel.

import { View, Text } from 'react-native';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';

interface BulkActionBarProps {
  selectedCount: number;
  onMoveToCollection: () => void;
  onRemoveFromCookbook: () => void;
  onSelectAll: () => void;
  onCancel: () => void;
}

export default function BulkActionBar({
  selectedCount,
  onMoveToCollection,
  onRemoveFromCookbook,
  onSelectAll,
  onCancel,
}: BulkActionBarProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const actions = [
    { label: 'Move', icon: Icons.FOLDER_OUTLINE, onPress: onMoveToCollection },
    { label: 'Remove', icon: Icons.TRASH_OUTLINE, onPress: onRemoveFromCookbook },
    { label: 'Select All', icon: Icons.CHECKMARK_CIRCLE_OUTLINE, onPress: onSelectAll },
  ];

  return (
    <View
      style={[
        {
          position: 'absolute',
          bottom: 24,
          left: 16,
          right: 16,
          borderRadius: 20,
          paddingVertical: 12,
          paddingHorizontal: 16,
          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
          flexDirection: 'row',
          alignItems: 'center',
        },
        Shadows.LG,
      ]}
    >
      {/* Selected count */}
      <View style={{ marginRight: 12 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '700',
            color: isDark ? DarkColors.text.primary : Colors.text.primary,
          }}
        >
          {selectedCount} selected
        </Text>
      </View>

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      {/* Action buttons */}
      {actions.map((action) => (
        <HapticTouchableOpacity
          key={action.label}
          onPress={action.onPress}
          style={{
            alignItems: 'center',
            paddingHorizontal: 10,
          }}
          accessibilityLabel={action.label}
        >
          <Icon
            name={action.icon as any}
            size={IconSizes.MD}
            color={action.label === 'Remove'
              ? (isDark ? '#FCA5A5' : '#DC2626')
              : (isDark ? DarkColors.primary : Colors.primary)
            }
          />
          <Text
            style={{
              fontSize: 10,
              fontWeight: '600',
              marginTop: 2,
              color: action.label === 'Remove'
                ? (isDark ? '#FCA5A5' : '#DC2626')
                : (isDark ? '#9CA3AF' : '#6B7280'),
            }}
          >
            {action.label}
          </Text>
        </HapticTouchableOpacity>
      ))}

      {/* Cancel */}
      <HapticTouchableOpacity
        onPress={onCancel}
        style={{ paddingHorizontal: 10, alignItems: 'center' }}
        accessibilityLabel="Cancel selection"
      >
        <Icon
          name={Icons.CLOSE as any}
          size={IconSizes.MD}
          color={isDark ? '#9CA3AF' : '#6B7280'}
        />
        <Text style={{ fontSize: 10, fontWeight: '600', marginTop: 2, color: isDark ? '#9CA3AF' : '#6B7280' }}>
          Cancel
        </Text>
      </HapticTouchableOpacity>
    </View>
  );
}
