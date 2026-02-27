// frontend/components/voice/VoiceOverlay.tsx
// Full-screen modal overlay when voice input is active.

import React, { useEffect } from 'react';
import { View, Text, Modal, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons } from '../../constants/Icons';
import { Colors } from '../../constants/Colors';
import { SazonMascot } from '../mascot';

interface VoiceOverlayProps {
  visible: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  onClose: () => void;
  continuous?: boolean;
  recognizedItems?: string[];
}

export default function VoiceOverlay({
  visible,
  isListening,
  transcript,
  interimTranscript,
  onClose,
  continuous = false,
  recognizedItems = [],
}: VoiceOverlayProps) {
  // Pulsing ring animations
  const ring1Scale = useSharedValue(1);
  const ring2Scale = useSharedValue(1);
  const ring3Scale = useSharedValue(1);
  const ring1Opacity = useSharedValue(0.3);
  const ring2Opacity = useSharedValue(0.2);
  const ring3Opacity = useSharedValue(0.1);

  useEffect(() => {
    if (isListening) {
      // Staggered pulsing rings
      ring1Scale.value = withRepeat(
        withTiming(1.3, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        -1, true
      );
      ring1Opacity.value = withRepeat(
        withTiming(0.5, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        -1, true
      );

      ring2Scale.value = withDelay(200, withRepeat(
        withTiming(1.5, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        -1, true
      ));
      ring2Opacity.value = withDelay(200, withRepeat(
        withTiming(0.3, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        -1, true
      ));

      ring3Scale.value = withDelay(400, withRepeat(
        withTiming(1.7, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        -1, true
      ));
      ring3Opacity.value = withDelay(400, withRepeat(
        withTiming(0.2, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        -1, true
      ));
    } else {
      [ring1Scale, ring2Scale, ring3Scale, ring1Opacity, ring2Opacity, ring3Opacity].forEach(v => {
        cancelAnimation(v);
      });
      ring1Scale.value = withTiming(1, { duration: 300 });
      ring2Scale.value = withTiming(1, { duration: 300 });
      ring3Scale.value = withTiming(1, { duration: 300 });
      ring1Opacity.value = withTiming(0, { duration: 300 });
      ring2Opacity.value = withTiming(0, { duration: 300 });
      ring3Opacity.value = withTiming(0, { duration: 300 });
    }
  }, [isListening]);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }],
    opacity: ring1Opacity.value,
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: ring2Opacity.value,
  }));

  const ring3Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring3Scale.value }],
    opacity: ring3Opacity.value,
  }));

  const displayText = interimTranscript || transcript;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          {/* Mascot */}
          <View style={styles.mascotContainer}>
            <SazonMascot expression={isListening ? 'thinking' : 'happy'} size={80} />
          </View>

          {/* Pulsing rings */}
          <View style={styles.ringsContainer}>
            <Animated.View style={[styles.ring, styles.ring3, ring3Style]} />
            <Animated.View style={[styles.ring, styles.ring2, ring2Style]} />
            <Animated.View style={[styles.ring, styles.ring1, ring1Style]} />
            <View style={styles.micCircle}>
              <Icon
                name={isListening ? Icons.MIC : Icons.MIC_OFF}
                size={32}
                color="white"
              />
            </View>
          </View>

          {/* Status text */}
          <Text style={styles.statusText}>
            {isListening ? (continuous ? 'Say your items... say "done" when finished' : 'Listening...') : 'Processing...'}
          </Text>

          {/* Transcript */}
          {displayText ? (
            <View style={styles.transcriptContainer}>
              <Text style={styles.transcriptText}>"{displayText}"</Text>
            </View>
          ) : null}

          {/* Continuous mode: show recognized items as chips */}
          {continuous && recognizedItems.length > 0 && (
            <View style={styles.chipsContainer}>
              {recognizedItems.map((item, index) => (
                <View key={index} style={styles.chip}>
                  <Text style={styles.chipText}>{item}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Cancel button */}
          <HapticTouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Icon name={Icons.CLOSE} size={20} color={Colors.secondary} />
            <Text style={styles.cancelText}>Cancel</Text>
          </HapticTouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    width: '100%',
  },
  mascotContainer: {
    marginBottom: 24,
  },
  ringsContainer: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  ring: {
    position: 'absolute',
    borderRadius: 80,
    backgroundColor: Colors.error,
  },
  ring1: {
    width: 100,
    height: 100,
  },
  ring2: {
    width: 130,
    height: 130,
  },
  ring3: {
    width: 160,
    height: 160,
  },
  micCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.secondaryRed,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  statusText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  transcriptContainer: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 16,
    maxWidth: '90%',
  },
  transcriptText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    maxWidth: '90%',
  },
  chip: {
    backgroundColor: Colors.success,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  chipText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  cancelText: {
    color: '#D1D5DB',
    fontSize: 16,
    fontWeight: '500',
  },
});
