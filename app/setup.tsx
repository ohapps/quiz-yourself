import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAtom } from 'jotai';
import { Category, Difficulty, QuizMode } from '../types/quiz';
import { quizConfigAtom } from '../store/atoms';
import { getCategories } from '../lib/database';

export default function SetupScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode: QuizMode }>();
  const [_, setConfig] = useAtom(quizConfigAtom);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
  const [questionCount, setQuestionCount] = useState('20');
  const [playerCount, setPlayerCount] = useState('1');
  const [playerNames, setPlayerNames] = useState<string[]>(['Player 1', 'Player 2', 'Player 3', 'Player 4']);

  useEffect(() => {
    async function load() {
      const data = await getCategories();
      setCategories(data);
      if (data.length > 0) {
        setSelectedCategory(data[0]);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleStart = () => {
    if (!selectedCategory) return;
    const pCount = mode === 'group' ? parseInt(playerCount) || 1 : 1;
    
    // Set config
    setConfig({
      mode: mode || 'solo',
      category: selectedCategory,
      difficulty: difficulty,
      questionCount: parseInt(questionCount) || 20,
      playerCount: pCount,
      playerNames: playerNames.slice(0, pCount),
    });

    router.push('/quiz');
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#6C5CE7" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{mode === 'solo' ? 'Quiz Yourself' : 'Quiz Others'}</Text>
      
      <View style={styles.section}>
        <Text style={styles.label}>Select Category</Text>
        <View style={styles.categoryGrid}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryButton,
                selectedCategory?.id === cat.id && styles.categoryButtonSelected,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[
                styles.categoryButtonText,
                selectedCategory?.id === cat.id && styles.categoryButtonTextSelected,
              ]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Select Difficulty</Text>
        <View style={styles.difficultyGrid}>
          {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.difficultyButton,
                difficulty === level && styles.difficultyButtonSelected,
              ]}
              onPress={() => setDifficulty(level)}
            >
              <Text style={[
                styles.difficultyButtonText,
                difficulty === level && styles.difficultyButtonTextSelected,
              ]}>
                {level}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Number of Questions</Text>
        <View style={styles.stepperContainer}>
          <TouchableOpacity 
            style={styles.stepperButton} 
            onPress={() => setQuestionCount(prev => Math.max(1, parseInt(prev) - 1).toString())}
          >
            <Text style={styles.stepperButtonText}>−</Text>
          </TouchableOpacity>
          
          <View style={styles.stepperValueContainer}>
            <Text style={styles.stepperValue}>{questionCount}</Text>
          </View>

          <TouchableOpacity 
            style={styles.stepperButton} 
            onPress={() => setQuestionCount(prev => Math.min(50, parseInt(prev) + 1).toString())}
          >
            <Text style={styles.stepperButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {mode === 'group' && (
        <>
          <View style={styles.section}>
            <Text style={styles.label}>Number of Players (Max 4)</Text>
            <View style={styles.playerCountContainer}>
              {['1', '2', '3', '4'].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.playerButton,
                    playerCount === num && styles.playerButtonSelected,
                  ]}
                  onPress={() => setPlayerCount(num)}
                >
                  <Text style={[
                    styles.playerButtonText,
                    playerCount === num && styles.playerButtonTextSelected,
                  ]}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Player Names</Text>
            <View style={styles.namesContainer}>
              {Array.from({ length: parseInt(playerCount) || 1 }).map((_, i) => (
                <View key={i} style={styles.nameInputWrapper}>
                  <Text style={styles.nameInputLabel}>Player {i + 1}</Text>
                  <TextInput
                    style={styles.nameInput}
                    value={playerNames[i]}
                    onChangeText={(text) => {
                      const newNames = [...playerNames];
                      newNames[i] = text;
                      setPlayerNames(newNames);
                    }}
                    placeholder={`Player ${i + 1}`}
                  />
                </View>
              ))}
            </View>
          </View>
        </>
      )}

      <TouchableOpacity style={styles.startButton} onPress={handleStart}>
        <Text style={styles.startButtonText}>Start Quiz</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: '#F5F7FA',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2D3436',
    marginBottom: 32,
    marginTop: 40,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#636E72',
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#DFE6E9',
  },
  categoryButtonSelected: {
    borderColor: '#6C5CE7',
    backgroundColor: '#EFEDFF',
  },
  categoryButtonText: {
    fontSize: 16,
    color: '#2D3436',
    fontWeight: '500',
  },
  categoryButtonTextSelected: {
    color: '#6C5CE7',
    fontWeight: '700',
  },
  difficultyGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  difficultyButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#DFE6E9',
    alignItems: 'center',
  },
  difficultyButtonSelected: {
    borderColor: '#6C5CE7',
    backgroundColor: '#EFEDFF',
  },
  difficultyButtonText: {
    fontSize: 16,
    color: '#2D3436',
    fontWeight: '500',
  },
  difficultyButtonTextSelected: {
    color: '#6C5CE7',
    fontWeight: '700',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    maxWidth: 250,
  },
  stepperButton: {
    backgroundColor: '#6C5CE7',
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  stepperButtonText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '600',
  },
  stepperValueContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#DFE6E9',
  },
  stepperValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D3436',
  },
  playerCountContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  playerButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#DFE6E9',
  },
  playerButtonSelected: {
    borderColor: '#00B894',
    backgroundColor: '#E6FFF9',
  },
  playerButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3436',
  },
  playerButtonTextSelected: {
    color: '#00B894',
  },
  namesContainer: {
    gap: 16,
  },
  nameInputWrapper: {
    gap: 8,
  },
  nameInputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#636E72',
    textTransform: 'uppercase',
  },
  nameInput: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#DFE6E9',
    color: '#2D3436',
  },
  startButton: {
    backgroundColor: '#6C5CE7',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 40,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
});
