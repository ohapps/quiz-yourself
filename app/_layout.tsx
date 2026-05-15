import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { initializeDatabase, applyContentUpdate } from "../lib/database";
import { checkForUpdates } from "../lib/sync";
import { View, ActivityIndicator } from "react-native";
import { useSetAtom } from 'jotai';
import { updateResultAtom } from '../store/atoms';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const setUpdateResult = useSetAtom(updateResultAtom);

  useEffect(() => {
    async function setup() {
      try {
        // 1. Initialize DB migrations and tables
        await initializeDatabase();
        
        // 2. Mark as ready so user can see the app immediately
        // If they have cached data from a previous session, they can use it.
        setIsReady(true);

        // 3. Check for remote updates in the background
        // This will populate the DB on the very first run, or update it on subsequent runs.
        const remoteResult = await checkForUpdates();
        if (remoteResult.updated) {
          setUpdateResult({
            newCategories: remoteResult.newCategories,
            newQuestions: remoteResult.newQuestions
          });
        }
      } catch (error) {
        console.error("Failed to initialize database", error);
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
