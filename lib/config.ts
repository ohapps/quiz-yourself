import Constants from 'expo-constants';

export function getBackendUrl(): string {
  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const host = hostUri.split(':')[0];
      return `http://${host}:3000`;
    }
    return 'http://localhost:3000';
  }
  return 'https://quiz-yourself-admin.ohapps.com';
}

export function getPowerSyncUrl(): string {
  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const host = hostUri.split(':')[0];
      return `http://${host}:8090`;
    }
    return 'http://localhost:8090';
  }
  return 'https://powersync.ohapps.com';
}
