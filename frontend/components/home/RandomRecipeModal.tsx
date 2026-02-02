// frontend/components/home/RandomRecipeModal.tsx
// Modal shown while generating a random recipe

import React from 'react';
import { View, Modal } from 'react-native';
import LoadingState from '../ui/LoadingState';
import { HomeLoadingStates } from '../../constants/LoadingStates';
import { BorderRadius } from '../../constants/Spacing';
import { Spacing } from '../../constants/Spacing';

interface RandomRecipeModalProps {
  visible: boolean;
  isDark: boolean;
  onClose: () => void;
}

function RandomRecipeModal({
  visible,
  isDark,
  onClose,
}: RandomRecipeModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <View style={{
          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
          borderRadius: BorderRadius.lg,
          padding: Spacing.xl,
          margin: Spacing.xl,
          maxWidth: 300,
          alignItems: 'center'
        }}>
          <LoadingState config={HomeLoadingStates.generatingRecipe} />
        </View>
      </View>
    </Modal>
  );
}

export default RandomRecipeModal;
