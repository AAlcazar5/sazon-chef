// frontend/components/shopping/InStoreDoneButton.tsx
// Group 10Q-ListMgmt: "I'm done shopping" button — shown only in in-store mode.
// On confirm, calls markListDone which archives the list and rolls un-purchased
// items into a new "Unfinished from <date>" list.

import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import BrandButton from '../ui/BrandButton';
import ConfirmActionSheet from '../ui/ConfirmActionSheet';
import { shoppingListApi } from '../../lib/api';

interface MarkListDoneResult {
  archivedListId: string;
  newActiveListId?: string;
  rolledOverItemCount: number;
}

interface InStoreDoneButtonProps {
  listId: string;
  inStoreMode: boolean;
  onListDone: (result: MarkListDoneResult) => void;
}

export default function InStoreDoneButton({
  listId,
  inStoreMode,
  onListDone,
}: InStoreDoneButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!inStoreMode) return null;

  const handleConfirm = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      const result = await shoppingListApi.markListDone(listId);
      setShowConfirm(false);
      onListDone(result.data);
    } catch {
      // Silently fail — the list state won't change
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <BrandButton
        label="I'm done shopping"
        onPress={() => setShowConfirm(true)}
        variant="sage"
        accessibilityLabel="I'm done shopping"
        hapticStyle="light"
      />

      <ConfirmActionSheet
        visible={showConfirm}
        title="Wrap up shopping?"
        body="Any unfinished items will move to a new list so you can pick up where you left off."
        confirmLabel="Yes, wrap up"
        loadingLabel="Wrapping up..."
        variant="sage"
        loading={loading}
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
        confirmAccessibilityLabel="Confirm done shopping"
      />
    </>
  );
}
