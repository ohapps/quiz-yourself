import { Text, View, StyleSheet, TouchableOpacity, Image } from "react-native";
import { useRouter, Stack } from "expo-router";

function AppLogo() {
  return (
    <View style={logoStyles.circle}>
      <Image
        source={require('../assets/images/logo.png')}
        style={logoStyles.image}
        resizeMode="cover"
      />
    </View>
  );
}

function Background() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[bg.blob, { top: -120, left: -120 }]} />
      <View style={[bg.blob, { bottom: -120, right: -120 }]} />
    </View>
  );
}

const bg = StyleSheet.create({
  blob: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#1a73e8',
    opacity: 0.05,
  },
});

const logoStyles = StyleSheet.create({
  circle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#1a73e8",
    overflow: "hidden",
    shadowColor: "#1a73e8",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
    marginBottom: 20,
  },
  image: {
    width: 120,
    height: 120,
  },
});

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
      <Background />

      <View style={styles.header}>
        <AppLogo />
        <Text style={styles.title}>Quiz Yourself</Text>
        <Text style={styles.subtitle}>Test your knowledge, your way</Text>
      </View>

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
  header: {
    alignItems: "center",
    marginBottom: 52,
  },
  title: {
    fontSize: 42,
    fontWeight: "800",
    color: "#2D3436",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: "#636E72",
    fontWeight: "500",
    textAlign: "center",
    letterSpacing: 0.3,
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
    backgroundColor: "#1a73e8",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#1a73e8",
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
    backgroundColor: "#0288d1",
    shadowColor: "#0288d1",
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
