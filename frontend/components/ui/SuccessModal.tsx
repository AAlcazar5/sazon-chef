import React, { useState } from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SuccessState from './SuccessState';
import { SazonExpression } from '../mascot/SazonMascot';

interface SuccessModalProps {
  visible: boolean;
  title: string;
  message?: string;
  expression?: SazonExpression;
  onDismiss: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

export default function SuccessModal({
  visible,
  title,
  message,
  expression = 'chef-kiss',
  onDismiss,
  actionLabel,
  onAction,
}: SuccessModalProps) {
  const handleDismiss = () => {
    onDismiss();
  };

  const handleAction = () => {
    if (onAction) {
      onAction();
    }
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container}>
          <SuccessState
            title={title}
            message={message}
            expression={expression}
            size="large"
            variant="orange"
            fullScreen
            actionLabel={actionLabel}
            onAction={handleAction}
            autoDismiss={!actionLabel}
            onDismiss={handleDismiss}
            dismissDelay={2500}
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
});

