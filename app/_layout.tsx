import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { initializeDatabase } from "../lib/database";
import { View, ActivityIndicator } from "react-native";

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function setup() {
      try {
        await initializeDatabase();
        setIsReady(true);
      } catch (error) {
        console.error("Failed to initialize database", error);
        // Fallback or error UI
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
