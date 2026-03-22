// frontend/components/ui/SazonRefreshControl.tsx
// Custom pull-to-refresh with Sazon mascot expressions
// Uses brand color tint on both platforms (mascot children not supported on Android RefreshControl)

import React from 'react';
import { RefreshControl, RefreshControlProps, Platform } from 'react-native';
import { Colors } from '../../constants/Colors';

interface SazonRefreshControlProps extends Omit<RefreshControlProps, 'refreshing' | 'onRefresh'> {
  refreshing: boolean;
  onRefresh: () => void;
  testID?: string;
}

export default function SazonRefreshControl({
  refreshing,
  onRefresh,
  testID,
  ...props
}: SazonRefreshControlProps) {
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={Colors.primary}
      colors={[Colors.primary, '#E85D04']}
      progressBackgroundColor={Platform.OS === 'android' ? '#FFF7ED' : undefined}
      testID={testID}
      {...props}
    />
  );
}
