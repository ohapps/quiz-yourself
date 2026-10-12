import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { login, logout, getStoredAuth, AuthState } from '../lib/auth';
import { getDeviceId } from '../lib/device-id';
import { enqueueAllQuizHistoryForBackup, migrateLocalUserId } from '../lib/database';
import { syncNow } from '../lib/sync';

export default function AccountScreen() {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    getStoredAuth().then((state) => {
      setAuth(state);
      setLoading(false);
    });
  }, []);

  const handleLogin = async () => {
    try {
      setLoading(true);
      const deviceId = await getDeviceId();

      const result = await login();
      setAuth(result);
      setLoading(false);

      // Rewrite local ownership from the device ID to the signed-in user, back
      // up anything recorded while anonymous, then sync.
      setSyncing(true);
      await migrateLocalUserId(deviceId, result.userId!);
      await enqueueAllQuizHistoryForBackup();
      await syncNow();
      setSyncing(false);

      Alert.alert('Success', 'Logged in! Your content and quiz history will now sync across devices.');
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Error', error.message || 'Login failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Your content stays on this device. Cloud backup pauses until you sign in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            setAuth({ accessToken: null, userId: null, email: null, isLoggedIn: false });
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Account' }} />
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Account' }} />

      <View style={styles.card}>
        {auth?.isLoggedIn ? (
          <>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>✓ Signed In</Text>
            </View>
            {auth.email && (
              <Text style={styles.email}>{auth.email}</Text>
            )}
            <Text style={styles.description}>
              Your custom categories, questions, and quiz history sync across devices.
            </Text>
            {syncing && (
              <View style={styles.syncingRow}>
                <ActivityIndicator size="small" color="#1a73e8" />
                <Text style={styles.syncingText}>Syncing your content...</Text>
              </View>
            )}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.title}>Backup & Sync</Text>
            <Text style={styles.description}>
              The app works fully offline. Sign in to back up your custom categories,
              questions, and quiz history so they sync across your devices.
            </Text>
            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <Text style={styles.loginText}>Sign In</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#636E72',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  statusBadge: {
    backgroundColor: '#E8F8F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  statusText: {
    color: '#00B894',
    fontWeight: '700',
    fontSize: 14,
  },
  email: {
    fontSize: 15,
    color: '#2D3436',
    fontWeight: '600',
    marginBottom: 8,
  },
  loginButton: {
    backgroundColor: '#1a73e8',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  loginText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E1E4E8',
  },
  logoutText: {
    color: '#FF7675',
    fontWeight: '700',
    fontSize: 16,
  },
  syncingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  syncingText: {
    color: '#636E72',
    fontSize: 13,
  },
});
