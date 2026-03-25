import { Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter, Stack } from "expo-router";

export default function Index() {
  const router = useRouter();

  const handlePress = (mode: 'solo' | 'group') => {
    router.push({
      pathname: '/setup',
      params: { mode }
    });
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Home' }} />
      <Text style={styles.title}>Quiz Yourself</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => handlePress('solo')}
        >
          <Text style={styles.buttonText}>Quiz Yourself</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.buttonSecondary]} 
          onPress={() => handlePress('group')}
        >
          <Text style={styles.buttonText}>Quiz Others</Text>
        </TouchableOpacity>

        <View style={styles.secondaryActions}>
          <TouchableOpacity 
            style={[styles.buttonSmall, styles.buttonTertiary]} 
            onPress={() => router.push('/manage-data' as any)}
          >
            <Text style={styles.buttonTextTertiary}>Manage Content</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.buttonSmall, styles.buttonTertiary]} 
            onPress={() => router.push('/history' as any)}
          >
            <Text style={styles.buttonTextTertiary}>Quiz History</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
    padding: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: "800",
    color: "#2D3436",
    marginBottom: 60,
    textAlign: "center",
  },
  buttonContainer: {
    width: "100%",
    gap: 20,
    maxWidth: 400,
  },
  secondaryActions: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    backgroundColor: "#6C5CE7",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#6C5CE7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonSmall: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonSecondary: {
    backgroundColor: "#00B894",
    shadowColor: "#00B894",
  },
  buttonTertiary: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#636E72",
    shadowOpacity: 0,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600",
  },
  buttonTextTertiary: {
    color: "#636E72",
    fontSize: 20,
    fontWeight: "600",
  },
});
