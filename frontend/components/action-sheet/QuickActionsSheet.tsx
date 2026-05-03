// frontend/components/action-sheet/QuickActionsSheet.tsx
// Group 9O — Two-tier quick-actions sheet.
//
// Wraps ActionSheet with a "primary list + More actions → secondary list"
// pattern so the always-visible "+" FAB stays uncluttered while every kept
// long-tail item remains reachable. Build-a-Plate stays the hero of the
// primary tier (sage tint, top of list).

import React, { useEffect, useState } from 'react';
import ActionSheet, { type ActionSheetItem } from '../ui/ActionSheet';

interface QuickActionsSheetProps {
  visible: boolean;
  onClose: () => void;
  primaryItems: ActionSheetItem[];
  secondaryItems: ActionSheetItem[];
  /** Override the default "More actions" + "Back" labels. */
  moreLabel?: string;
  backLabel?: string;
}

export default function QuickActionsSheet({
  visible,
  onClose,
  primaryItems,
  secondaryItems,
  moreLabel,
  backLabel,
}: QuickActionsSheetProps) {
  const [tier, setTier] = useState<'primary' | 'secondary'>('primary');

  // Whenever the parent re-opens us, snap back to the primary tier so power
  // users don't accidentally land on the long tail from a previous session.
  useEffect(() => {
    if (visible) setTier('primary');
  }, [visible]);

  const moreItem: ActionSheetItem = {
    label: moreLabel ?? 'More actions',
    icon: 'chevron-forward',
    subtitle:
      secondaryItems.length === 1
        ? '1 more shortcut'
        : `${secondaryItems.length} more shortcuts`,
    onPress: () => setTier('secondary'),
    tint: 'golden',
    keepOpen: true,
  };

  const backItem: ActionSheetItem = {
    label: backLabel ?? 'Back to main actions',
    icon: 'chevron-back',
    onPress: () => setTier('primary'),
    tint: 'sky',
    keepOpen: true,
  };

  const items: ActionSheetItem[] =
    tier === 'primary'
      ? secondaryItems.length > 0
        ? [...primaryItems, moreItem]
        : primaryItems
      : [backItem, ...secondaryItems];

  return (
    <ActionSheet
      visible={visible}
      onClose={onClose}
      items={items}
      title={tier === 'secondary' ? 'More actions' : undefined}
    />
  );
}
