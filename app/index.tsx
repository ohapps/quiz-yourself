import { Text, View, StyleSheet, TouchableOpacity, Image } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useAtom } from 'jotai';
import { updateResultAtom } from '../store/atoms';

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
  const [updateResult, setUpdateResult] = useAtom(updateResultAtom);

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

      {updateResult && (
        <View style={styles.notification}>
          <View style={styles.notificationContent}>
            <Text style={styles.notificationTitle}>New Content Added! 🎉</Text>
            <Text style={styles.notificationText}>
              We've added {updateResult.newCategories} categories and {updateResult.newQuestions} new questions to your library.
            </Text>
          </View>
          <TouchableOpacity onPress={() => setUpdateResult(null)} style={styles.notificationClose}>
            <Text style={styles.notificationCloseText}>×</Text>
          </TouchableOpacity>
        </View>
      )}

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
  notification: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E8F0FE',
    zIndex: 100,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a73e8',
    marginBottom: 4,
  },
  notificationText: {
    fontSize: 13,
    color: '#636E72',
    lineHeight: 18,
  },
  notificationClose: {
    padding: 8,
    marginLeft: 8,
  },
  notificationCloseText: {
    fontSize: 24,
    color: '#B2BEC3',
    fontWeight: '300',
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
