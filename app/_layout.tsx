import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { initializeDatabase } from "../lib/database";
import { setupPowerSync } from "../lib/powersync/system";

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);  

  useEffect(() => {
    async function setup() {
      try {
        // Initialize legacy local DB (for quiz_history and local-only data)
        await initializeDatabase();
        setIsReady(true);

        // Connect PowerSync for synced data (categories, questions, app state)
        await setupPowerSync();
      } catch (error) {
        console.error("Failed to initialize", error);
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
