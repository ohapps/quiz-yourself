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
