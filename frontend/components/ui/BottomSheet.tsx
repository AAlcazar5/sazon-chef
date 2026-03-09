// Sazon-branded BottomSheet wrapper around @gorhom/bottom-sheet
// Drop-in replacement for React Native Modal — use visible + onClose props

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetScrollView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { useTheme } from '../../contexts/ThemeContext';

interface BottomSheetProps {
  /** Controls visibility — matches the RN Modal `visible` prop pattern */
  visible: boolean;
  onClose: () => void;
  /** Sheet title shown in branded handle area */
  title?: string;
  /** Snap points — default is a single 50% height sheet */
  snapPoints?: (string | number)[];
  /** Use scrollable content area (for long lists) */
  scrollable?: boolean;
  children: React.ReactNode;
}

export default function BottomSheet({
  visible,
  onClose,
  title,
  snapPoints: snapPointsProp,
  scrollable = false,
  children,
}: BottomSheetProps) {
  const ref = useRef<BottomSheetModal>(null);
  const { colors } = useTheme();
  const snapPoints = useMemo(() => snapPointsProp ?? ['50%'], [snapPointsProp]);

  useEffect(() => {
    if (visible) {
      ref.current?.present();
    } else {
      ref.current?.dismiss();
    }
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.45}
        pressBehavior="close"
        onPress={onClose}
      />
    ),
    [onClose]
  );

  const Handle = () => (
    <View style={[styles.handle, { backgroundColor: colors.background }]}>
      <View style={styles.handleBar} />
      {title && (
        <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
      )}
    </View>
  );

  const ContentWrapper = scrollable ? BottomSheetScrollView : BottomSheetView;

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
      handleComponent={Handle}
      backgroundStyle={{ backgroundColor: colors.background }}
      enablePanDownToClose
    >
      <ContentWrapper style={styles.content}>
        {children}
      </ContentWrapper>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  handle: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'center',
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 6,
    marginBottom: 2,
  },
  content: {
    flex: 1,
  },
});
