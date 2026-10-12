import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { initializeDatabase } from "../lib/database";
import { startSyncLifecycle, syncOnLaunch } from "../lib/sync";

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function setup() {
      try {
        await initializeDatabase();
        startSyncLifecycle();
        // Best-effort first sync so screens have content when online;
        // times out so the app still opens offline with cached data.
        await syncOnLaunch();
      } catch (error) {
        console.error("Failed to initialize", error);
      } finally {
        setIsReady(true);
      }
    }
    setup();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA' }}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  return <Stack />;
}
