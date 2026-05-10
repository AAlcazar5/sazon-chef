import React, { useCallback } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet, type ListRenderItem } from 'react-native';
import { EditorialFontFamily } from '../../constants/Typography';

interface CollectionChip {
  id: string;
  label: string;
  count: number;
}

interface CollectionChipsProps {
  collections: CollectionChip[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function CollectionChips({ collections, activeId, onSelect }: CollectionChipsProps) {
  const renderItem = useCallback<ListRenderItem<CollectionChip>>(
    ({ item: col }) => {
      const isActive = col.id === activeId;
      return (
        <Pressable
          testID={`chip-${col.id}`}
          onPress={() => onSelect(col.id)}
          style={[styles.chip, isActive ? styles.chipActive : styles.chipInactive]}
          accessibilityRole="tab"
          accessibilityState={{ selected: isActive }}
        >
          <Text style={[styles.chipText, isActive ? styles.chipTextActive : styles.chipTextInactive]}>
            {col.count} {col.label}
          </Text>
          {isActive && <View style={styles.underline} />}
        </Pressable>
      );
    },
    [activeId, onSelect],
  );

  const keyExtractor = useCallback((c: CollectionChip) => c.id, []);

  return (
    <FlatList
      horizontal
      data={collections}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.container}
      testID="collection-chips-scroll"
      initialNumToRender={6}
      windowSize={5}
      removeClippedSubviews
    />
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: '#111827',
  },
  chipInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E0DA',
  },
  chipText: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 12,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  chipTextInactive: {
    color: '#6B7280',
  },
  underline: {
    height: 2,
    backgroundColor: '#fa7e12',
    borderRadius: 1,
    width: '80%',
    marginTop: 4,
  },
});
