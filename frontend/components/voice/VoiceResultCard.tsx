// frontend/components/voice/VoiceResultCard.tsx
// Shows the parsed intent result and action buttons for confirmation.

import React from 'react';
import { View, Text, Modal, StyleSheet, ScrollView } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons } from '../../constants/Icons';
import { Colors } from '../../constants/Colors';
import type { ParsedVoiceIntent, AddToListIntent, SearchRecipeIntent, LogMealIntent } from '../../lib/voiceIntentParser';

interface VoiceResultCardProps {
  visible: boolean;
  intent: ParsedVoiceIntent | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function VoiceResultCard({
  visible,
  intent,
  onConfirm,
  onCancel,
}: VoiceResultCardProps) {
  if (!intent || intent.type === 'UNKNOWN') return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {intent.type === 'ADD_TO_LIST' && (
            <AddToListResult intent={intent as AddToListIntent} />
          )}
          {intent.type === 'SEARCH_RECIPE' && (
            <SearchRecipeResult intent={intent as SearchRecipeIntent} />
          )}
          {intent.type === 'LOG_MEAL' && (
            <LogMealResult intent={intent as LogMealIntent} />
          )}

          {/* Action buttons */}
          <View style={styles.actions}>
            <HapticTouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </HapticTouchableOpacity>
            <HapticTouchableOpacity onPress={onConfirm} style={styles.confirmBtn}>
              <Icon name={Icons.CHECKMARK} size={18} color="white" />
              <Text style={styles.confirmBtnText}>
                {intent.type === 'ADD_TO_LIST' ? 'Add All' : intent.type === 'SEARCH_RECIPE' ? 'Search' : 'Log'}
              </Text>
            </HapticTouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function AddToListResult({ intent }: { intent: AddToListIntent }) {
  return (
    <View>
      <View style={styles.header}>
        <Icon name={Icons.CART} size={24} color={Colors.tertiaryGreen} />
        <Text style={styles.headerText}>Add to Shopping List</Text>
      </View>
      <ScrollView style={styles.itemsList} contentContainerStyle={{ gap: 6 }}>
        {intent.items.map((item, index) => (
          <View key={index} style={styles.itemRow}>
            <Icon name={Icons.ADD_CIRCLE_OUTLINE} size={18} color={Colors.success} />
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemQty}>{item.quantity}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function SearchRecipeResult({ intent }: { intent: SearchRecipeIntent }) {
  return (
    <View>
      <View style={styles.header}>
        <Icon name={Icons.SEARCH} size={24} color={Colors.primary} />
        <Text style={styles.headerText}>Search Recipes</Text>
      </View>
      <View style={styles.queryContainer}>
        <Text style={styles.queryLabel}>Searching for:</Text>
        <Text style={styles.queryText}>"{intent.query}"</Text>
      </View>
    </View>
  );
}

function LogMealResult({ intent }: { intent: LogMealIntent }) {
  return (
    <View>
      <View style={styles.header}>
        <Icon name={Icons.RESTAURANT} size={24} color={Colors.secondaryRed} />
        <Text style={styles.headerText}>Log Meal</Text>
      </View>
      <View style={styles.mealInfo}>
        <Text style={styles.mealName}>{intent.mealName}</Text>
        {intent.calories && (
          <Text style={styles.mealCalories}>{intent.calories} cal</Text>
        )}
        {intent.mealType && (
          <Text style={styles.mealType}>{intent.mealType}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  headerText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  itemsList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.surface,
    borderRadius: 10,
  },
  itemName: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  itemQty: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  queryContainer: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  queryLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  queryText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  mealInfo: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 4,
  },
  mealName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  mealCalories: {
    fontSize: 16,
    color: Colors.secondaryRed,
    fontWeight: '500',
  },
  mealType: {
    fontSize: 14,
    color: Colors.text.secondary,
    textTransform: 'capitalize',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.secondary,
  },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.secondaryRed,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
