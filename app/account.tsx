import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { login, logout, getStoredAuth, AuthState } from '../lib/auth';
import { getDeviceId } from '../lib/device-id';
import { setupPowerSync, powersync } from '../lib/powersync/system';
import { getBackendUrl } from '../lib/config';

export default function AccountScreen() {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);

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

      // Migrate device content to Auth0 user
      setMigrating(true);
      await fetch(`${getBackendUrl()}/api/auth/migrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, auth0UserId: result.userId, auth0Token: result.accessToken }),
      });
      setMigrating(false);

      // Reconnect PowerSync with new identity
      await powersync.disconnect();
      await setupPowerSync();

      Alert.alert('Success', 'Logged in! Your content will now sync across devices.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Login failed');
    } finally {
      setLoading(false);
      setMigrating(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Your content will remain on this device but won\'t sync to other devices.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive', onPress: async () => {
          await logout();
          setAuth({ accessToken: null, userId: null, email: null, isLoggedIn: false });
          await powersync.disconnect();
          await setupPowerSync();
        }
      },
    ]);
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
              Your content syncs across all your devices.
            </Text>
            {migrating && (
              <View style={styles.migratingRow}>
                <ActivityIndicator size="small" color="#1a73e8" />
                <Text style={styles.migratingText}>Migrating content...</Text>
              </View>
            )}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.title}>Sync Across Devices</Text>
            <Text style={styles.description}>
              Sign in to sync your custom categories and questions across all your devices.
              The app works fully offline — signing in is optional.
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
  migratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  migratingText: {
    color: '#636E72',
    fontSize: 13,
  },
});
