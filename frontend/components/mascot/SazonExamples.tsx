/**
 * Example usage of Sazon Mascot components
 * This file demonstrates various ways to use Sazon in the app
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SazonMascot, AnimatedSazon } from './index';

export function SazonExamples() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Sazon Mascot Examples</Text>

      {/* Expression Examples */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Expressions</Text>
        <View style={styles.row}>
          <View style={styles.example}>
            <SazonMascot expression="happy" size="medium" />
            <Text style={styles.label}>Happy</Text>
          </View>
          <View style={styles.example}>
            <SazonMascot expression="excited" size="medium" />
            <Text style={styles.label}>Excited</Text>
          </View>
          <View style={styles.example}>
            <SazonMascot expression="curious" size="medium" />
            <Text style={styles.label}>Curious</Text>
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.example}>
            <SazonMascot expression="proud" size="medium" />
            <Text style={styles.label}>Proud</Text>
          </View>
          <View style={styles.example}>
            <SazonMascot expression="supportive" size="medium" />
            <Text style={styles.label}>Supportive</Text>
          </View>
          <View style={styles.example}>
            <SazonMascot expression="celebrating" size="medium" />
            <Text style={styles.label}>Celebrating</Text>
          </View>
        </View>
      </View>

      {/* Size Examples */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sizes</Text>
        <View style={styles.row}>
          <View style={styles.example}>
            <SazonMascot size="tiny" />
            <Text style={styles.label}>Tiny (24px)</Text>
          </View>
          <View style={styles.example}>
            <SazonMascot size="small" />
            <Text style={styles.label}>Small (48px)</Text>
          </View>
          <View style={styles.example}>
            <SazonMascot size="medium" />
            <Text style={styles.label}>Medium (96px)</Text>
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.example}>
            <SazonMascot size="large" />
            <Text style={styles.label}>Large (192px)</Text>
          </View>
          <View style={styles.example}>
            <SazonMascot size="hero" />
            <Text style={styles.label}>Hero (256px)</Text>
          </View>
        </View>
      </View>

      {/* Animation Examples */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Animations</Text>
        <View style={styles.row}>
          <View style={styles.example}>
            <AnimatedSazon animationType="idle" size="medium" />
            <Text style={styles.label}>Idle</Text>
          </View>
          <View style={styles.example}>
            <AnimatedSazon animationType="pulse" size="medium" />
            <Text style={styles.label}>Pulse</Text>
          </View>
          <View style={styles.example}>
            <AnimatedSazon animationType="wave" size="medium" />
            <Text style={styles.label}>Wave</Text>
          </View>
        </View>
      </View>

      {/* Usage Examples */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Usage Examples</Text>
        
        {/* Empty State Example */}
        <View style={styles.usageExample}>
          <Text style={styles.usageTitle}>Empty State</Text>
          <View style={styles.emptyState}>
            <AnimatedSazon 
              expression="supportive" 
              size="large" 
              animationType="idle" 
            />
            <Text style={styles.emptyStateText}>No recipes found yet!</Text>
            <Text style={styles.emptyStateSubtext}>
              Sazon is here to help you discover amazing recipes.
            </Text>
          </View>
        </View>

        {/* Success Example */}
        <View style={styles.usageExample}>
          <Text style={styles.usageTitle}>Success State</Text>
          <View style={styles.successState}>
            <AnimatedSazon 
              expression="celebrating" 
              size="large" 
              animationType="celebrate" 
            />
            <Text style={styles.successText}>Goal Achieved! 🎉</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  example: {
    alignItems: 'center',
  },
  label: {
    marginTop: 8,
    fontSize: 12,
    color: '#6B7280',
  },
  usageExample: {
    marginBottom: 30,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  usageTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  emptyState: {
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 15,
    color: '#111827',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  successState: {
    alignItems: 'center',
    padding: 20,
  },
  successText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 15,
    color: '#10B981',
  },
});

