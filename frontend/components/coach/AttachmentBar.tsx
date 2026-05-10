// Phase 5 (10Y-E): Composer-adjacent thumbnail strip. Shows pending photo
// attachments before send. Each thumb has a remove (×) affordance. Disabled
// state respects MAX_COACH_ATTACHMENTS.

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark } from '../../constants/Colors';
import {
  MAX_COACH_ATTACHMENTS,
  type PendingCoachAttachment,
} from '../../hooks/useCoachAttachments';

interface AttachmentBarProps {
  attachments: PendingCoachAttachment[];
  onRemove: (id: string) => void;
}

export default function AttachmentBar({
  attachments,
  onRemove,
}: AttachmentBarProps): React.ReactElement | null {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const removeBg = isDark ? PastelDark.peach : Pastel.peach;
  const subtleText = isDark ? '#C7C7C7' : '#5A4A3F';

  if (attachments.length === 0) return null;

  return (
    <View
      style={styles.row}
      accessibilityLabel={`${attachments.length} of ${MAX_COACH_ATTACHMENTS} photos attached`}
    >
      {attachments.map((att) => (
        <View key={att.id} style={styles.thumbWrap}>
          <Image
            source={{ uri: att.uri }}
            style={styles.thumb}
            accessibilityLabel="Pending photo attachment"
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
          />
          <HapticTouchableOpacity
            onPress={() => onRemove(att.id)}
            accessibilityLabel="Remove photo attachment"
            accessibilityRole="button"
            style={[styles.removeBtn, { backgroundColor: removeBg }]}
          >
            <Ionicons name="close" size={12} color="#2C1810" />
          </HapticTouchableOpacity>
        </View>
      ))}
      <Text style={[styles.count, { color: subtleText }]}>
        {attachments.length}/{MAX_COACH_ATTACHMENTS}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 8,
  },
  thumbWrap: {
    position: 'relative',
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: 'visible',
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 16,
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    marginLeft: 'auto',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
});
