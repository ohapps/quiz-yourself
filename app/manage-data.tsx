import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { resetDatabase } from '../lib/database';

export default function ManageContentMenu() {
  const router = useRouter();

  const handleResetToDefaults = () => {
    Alert.alert(
      'Reset to Defaults',
      'This will delete all custom content and reset the database to the 400 default questions. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: async () => {
          await resetDatabase();
          Alert.alert('Success', 'Database has been reset to defaults.');
        }}
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Manage Content' }} />
      
      <View style={styles.menuContainer}>
        <TouchableOpacity 
          style={styles.menuItem} 
          onPress={() => router.push('/manage-categories' as any)}
        >
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Edit Categories</Text>
            <Text style={styles.menuSubtitle}>Add, rename, or delete quiz categories</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuItem} 
          onPress={() => router.push('/manage-questions' as any)}
        >
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Edit Questions</Text>
            <Text style={styles.menuSubtitle}>Browse and manage all your trivia questions</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity 
          style={[styles.menuItem, styles.dangerItem]} 
          onPress={handleResetToDefaults}
        >
          <View style={styles.menuContent}>
            <Text style={[styles.menuTitle, styles.dangerText]}>Reset to Defaults</Text>
            <Text style={styles.menuSubtitle}>Restore the original 400 questions</Text>
          </View>
          <Text style={[styles.arrow, styles.dangerText]}>›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    padding: 20,
  },
  menuContainer: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F2F6',
  },
  dangerItem: {
    borderBottomWidth: 0,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#636E72',
  },
  arrow: {
    fontSize: 24,
    color: '#B2BEC3',
    fontWeight: '300',
    marginLeft: 10,
  },
  dangerText: {
    color: '#FF7675',
  },
  divider: {
    height: 12,
    backgroundColor: '#F5F7FA',
  },
});
