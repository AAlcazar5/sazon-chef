import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SazonExamples } from '../components/mascot/SazonExamples';

export default function MascotExamplesScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <SazonExamples />
    </SafeAreaView>
  );
}

