import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAtom } from 'jotai';
import { quizConfigAtom, quizStateAtom } from '../store/atoms';
import { saveQuizResult } from '../lib/database';

export default function ResultsScreen() {
  const router = useRouter();
  const [config] = useAtom(quizConfigAtom);
  const [state] = useAtom(quizStateAtom);
  const hasSaved = useRef(false);

  useEffect(() => {
    if (!hasSaved.current && config.category) {
      saveQuizResult(
        config.mode,
        config.category.id,
        config.difficulty,
        config.playerCount,
        state.playerScores
      );
      hasSaved.current = true;
    }
  }, []);

  const handleRestart = () => {
    router.replace({ pathname: '/setup', params: { mode: config.mode } });
  };

  const handleHome = () => {
    router.replace('/');
  };

  const isSolo = config.mode === 'solo';
  const winners = [...state.playerScores].sort((a, b) => b.score - a.score);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quiz Completed!</Text>
      
      <View style={styles.resultsBox}>
        <Text style={styles.subtitle}>Final Scores</Text>
        {winners.map((ps, index) => (
          <View key={ps.id} style={styles.scoreRow}>
            <Text style={styles.playerLabel}>
              {ps.name}
              {!isSolo && index === 0 && ' 👑'}
            </Text>
            <Text style={styles.scoreValue}>{ps.score} / {state.questions.length}</Text>
          </View>
        ))}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={handleRestart}>
          <Text style={styles.buttonText}>New Round</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={handleHome}>
          <Text style={styles.buttonTextSecondary}>Home Screen</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: '#2D3436',
    marginBottom: 40,
  },
  resultsBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 60,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#636E72',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 24,
    textAlign: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F2F6',
  },
  playerLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D3436',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a73e8',
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  button: {
    backgroundColor: '#1a73e8',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#1a73e8',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  buttonTextSecondary: {
    color: '#1a73e8',
    fontSize: 18,
    fontWeight: '700',
  },
});
