// frontend/components/premium/CancellationFlow.tsx
// 3-step cancellation flow: survey → offer → confirm
// No dark patterns — cancel is always reachable.

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import AnimatedActivityIndicator from '../ui/AnimatedActivityIndicator';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { SazonMascot } from '../mascot';
import { stripeApi } from '../../lib/api';
import { Colors } from '../../constants/Colors';

type CancelReason = 'too_expensive' | 'not_using' | 'missing_feature' | 'other';
type Step = 'survey' | 'offer' | 'confirm';

const REASONS: { value: CancelReason; label: string }[] = [
  { value: 'too_expensive', label: 'Too expensive' },
  { value: 'not_using', label: "Not using it enough" },
  { value: 'missing_feature', label: 'Missing a feature I need' },
  { value: 'other', label: 'Other' },
];

interface CancellationFlowProps {
  visible: boolean;
  onClose: () => void;
  /** Called after a successful cancel or pause — use to sign out or refresh subscription. */
  onCancelled: () => void;
}

export function CancellationFlow({ visible, onClose, onCancelled }: CancellationFlowProps) {
  const [step, setStep] = useState<Step>('survey');
  const [reason, setReason] = useState<CancelReason | null>(null);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStep('survey');
    setReason(null);
    setFeedback('');
    setLoading(false);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleReasonSelect = (r: CancelReason) => {
    setReason(r);
    // "other" has no offer — go straight to confirm
    setStep(r === 'other' ? 'confirm' : 'offer');
  };

  const handleAction = async (action: 'cancel' | 'pause') => {
    if (!reason) return;
    setLoading(true);
    setError(null);
    try {
      await stripeApi.cancelSubscription({
        reason,
        feedback: feedback.trim() || undefined,
        action,
      });
      reset();
      onCancelled();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white dark:bg-gray-900 rounded-t-3xl px-6 pt-6 pb-10">
          <ScrollView showsVerticalScrollIndicator={false}>
            {step === 'survey' && (
              <SurveyStep
                onSelect={handleReasonSelect}
                onClose={handleClose}
              />
            )}
            {step === 'offer' && reason && (
              <OfferStep
                reason={reason}
                feedback={feedback}
                onFeedbackChange={setFeedback}
                loading={loading}
                error={error}
                onAcceptOffer={() => handleAction('pause')}
                onSkipOffer={() => setStep('confirm')}
                onBack={() => setStep('survey')}
              />
            )}
            {step === 'confirm' && reason && (
              <ConfirmStep
                loading={loading}
                error={error}
                onConfirm={() => handleAction('cancel')}
                onBack={() => setStep(reason === 'other' ? 'survey' : 'offer')}
                onClose={handleClose}
              />
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Step: Survey ─────────────────────────────────────────────────────────────

function SurveyStep({
  onSelect,
  onClose,
}: {
  onSelect: (r: CancelReason) => void;
  onClose: () => void;
}) {
  return (
    <>
      <SazonMascot expression="supportive" size="small" />
      <Text className="text-xl font-bold text-gray-900 dark:text-white text-center mt-4 mb-1">
        Before you go...
      </Text>
      <Text className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
        What's the main reason you want to cancel?
      </Text>

      {REASONS.map((r) => (
        <HapticTouchableOpacity
          key={r.value}
          testID={`reason-${r.value}`}
          className="flex-row items-center justify-between px-4 py-4 mb-3 rounded-xl bg-surface dark:bg-card-dark border border-gray-200 dark:border-gray-700"
          onPress={() => onSelect(r.value)}
          hapticStyle="light"
        >
          <Text className="text-base text-gray-900 dark:text-gray-100">{r.label}</Text>
          <Text className="text-gray-400">›</Text>
        </HapticTouchableOpacity>
      ))}

      <HapticTouchableOpacity
        className="py-3 items-center mt-2"
        onPress={onClose}
        hapticDisabled
      >
        <Text className="text-gray-400 dark:text-gray-500 text-sm">Keep my subscription</Text>
      </HapticTouchableOpacity>
    </>
  );
}

// ─── Step: Offer ──────────────────────────────────────────────────────────────

function OfferStep({
  reason,
  feedback,
  onFeedbackChange,
  loading,
  error,
  onAcceptOffer,
  onSkipOffer,
  onBack,
}: {
  reason: CancelReason;
  feedback: string;
  onFeedbackChange: (v: string) => void;
  loading: boolean;
  error: string | null;
  onAcceptOffer: () => void;
  onSkipOffer: () => void;
  onBack: () => void;
}) {
  return (
    <>
      <SazonMascot expression="thinking" size="small" />

      {reason === 'too_expensive' && (
        <>
          <Text className="text-xl font-bold text-gray-900 dark:text-white text-center mt-4 mb-2">
            Pause instead of cancel?
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
            Pause for 1 month — your data stays safe and you can resume anytime. No charge while paused.
          </Text>
          {error && <ErrorMessage message={error} />}
          <HapticTouchableOpacity
            testID="accept-offer-button"
            className="w-full py-4 rounded-2xl items-center mb-3"
            style={{ backgroundColor: Colors.primary }}
            onPress={onAcceptOffer}
            disabled={loading}
            hapticStyle="medium"
          >
            {loading ? (
              <AnimatedActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base">Pause for 1 month</Text>
            )}
          </HapticTouchableOpacity>
        </>
      )}

      {reason === 'not_using' && (
        <>
          <Text className="text-xl font-bold text-gray-900 dark:text-white text-center mt-4 mb-2">
            Give it one more week?
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
            We'll send you a weekly meal idea to help you get back into the groove. Cancel in 3 months if it's still not clicking — no pressure.
          </Text>
        </>
      )}

      {reason === 'missing_feature' && (
        <>
          <Text className="text-xl font-bold text-gray-900 dark:text-white text-center mt-4 mb-2">
            What's missing?
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
            Tell us what would make Sazon work better for you. Every response goes directly to the team.
          </Text>
          <TextInput
            testID="feedback-input"
            value={feedback}
            onChangeText={onFeedbackChange}
            placeholder="Describe the feature or issue..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            className="border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-gray-100 bg-surface dark:bg-card-dark mb-4 text-sm"
            style={{ minHeight: 96, textAlignVertical: 'top' }}
          />
        </>
      )}

      <HapticTouchableOpacity
        testID="skip-offer-button"
        className="w-full py-4 rounded-2xl items-center mb-3 border border-gray-200 dark:border-gray-700"
        onPress={onSkipOffer}
        hapticStyle="light"
      >
        <Text className="text-gray-600 dark:text-gray-300 font-medium text-base">
          Continue to cancel
        </Text>
      </HapticTouchableOpacity>

      <HapticTouchableOpacity
        className="py-3 items-center"
        onPress={onBack}
        hapticDisabled
      >
        <Text className="text-gray-400 dark:text-gray-500 text-sm">Back</Text>
      </HapticTouchableOpacity>
    </>
  );
}

// ─── Step: Confirm ────────────────────────────────────────────────────────────

function ConfirmStep({
  loading,
  error,
  onConfirm,
  onBack,
  onClose,
}: {
  loading: boolean;
  error: string | null;
  onConfirm: () => void;
  onBack: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <SazonMascot expression="supportive" size="small" />
      <Text className="text-xl font-bold text-gray-900 dark:text-white text-center mt-4 mb-2">
        Cancel subscription?
      </Text>
      <Text className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
        You'll keep Premium access until the end of your billing period. Your data is saved — you can resubscribe anytime.
      </Text>

      {error && <ErrorMessage message={error} />}

      <HapticTouchableOpacity
        testID="confirm-cancel-button"
        className="w-full py-4 rounded-2xl items-center mb-3 bg-red-500"
        onPress={onConfirm}
        disabled={loading}
        hapticStyle="heavy"
      >
        {loading ? (
          <AnimatedActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-bold text-base">Cancel Subscription</Text>
        )}
      </HapticTouchableOpacity>

      <HapticTouchableOpacity
        testID="keep-subscription-button"
        className="w-full py-4 rounded-2xl items-center mb-3"
        style={{ backgroundColor: Colors.primary }}
        onPress={onClose}
        hapticStyle="light"
      >
        <Text className="text-white font-bold text-base">Keep my subscription</Text>
      </HapticTouchableOpacity>

      <HapticTouchableOpacity
        className="py-3 items-center"
        onPress={onBack}
        hapticDisabled
      >
        <Text className="text-gray-400 dark:text-gray-500 text-sm">Back</Text>
      </HapticTouchableOpacity>
    </>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function ErrorMessage({ message }: { message: string }) {
  return (
    <View className="bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-3 mb-4">
      <Text className="text-red-600 dark:text-red-400 text-sm">{message}</Text>
    </View>
  );
}
