import React from 'react';
import { SafeAreaView } from 'react-native';
import { SazonExamples } from '../components/mascot/SazonExamples';

export default function MascotExamplesScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <SazonExamples />
    </SafeAreaView>
  );
}

