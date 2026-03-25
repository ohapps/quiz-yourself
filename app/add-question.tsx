import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Category, Difficulty } from '../types/quiz';
import { getCategories, addQuestion } from '../lib/database';

export default function AddQuestionScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy');

  useEffect(() => {
    async function load() {
      const data = await getCategories();
      setCategories(data);
      if (data.length > 0) {
        setSelectedCategoryId(data[0].id);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleSave = async () => {
    if (!questionText.trim()) {
      Alert.alert('Error', 'Please enter a question');
      return;
    }

    if (options.some(opt => !opt.trim())) {
      Alert.alert('Error', 'Please fill in all options');
      return;
    }

    try {
      await addQuestion({
        question: questionText,
        options: options,
        correctAnswer: options[correctAnswerIndex],
        difficulty: difficulty
      }, selectedCategoryId);
      
      Alert.alert('Success', 'Question added successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save question');
    }
  };

  const updateOption = (index: number, text: string) => {
    const newOptions = [...options];
    newOptions[index] = text;
    setOptions(newOptions);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Add Question' }} />
      
      <View style={styles.section}>
        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryGrid}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.chip,
                selectedCategoryId === cat.id && styles.chipSelected
              ]}
              onPress={() => setSelectedCategoryId(cat.id)}
            >
              <Text style={[
                styles.chipText,
                selectedCategoryId === cat.id && styles.chipTextSelected
              ]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Difficulty</Text>
        <View style={styles.difficultyGrid}>
          {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map(level => (
            <TouchableOpacity
              key={level}
              style={[
                styles.chip,
                difficulty === level && styles.chipSelected
              ]}
              onPress={() => setDifficulty(level)}
            >
              <Text style={[
                styles.chipText,
                difficulty === level && styles.chipTextSelected
              ]}>{level}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Question</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter question text..."
          value={questionText}
          onChangeText={setQuestionText}
          multiline
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Options (Select the correct one)</Text>
        {options.map((opt, i) => (
          <View key={i} style={styles.optionWrapper}>
            <TouchableOpacity
              style={[
                styles.radio,
                correctAnswerIndex === i && styles.radioSelected
              ]}
              onPress={() => setCorrectAnswerIndex(i)}
            />
            <TextInput
              style={styles.optionInput}
              placeholder={`Option ${i + 1}`}
              value={opt}
              onChangeText={(text) => updateOption(i, text)}
            />
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Question</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    padding: 24,
    paddingBottom: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#636E72',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  difficultyGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#DFE6E9',
  },
  chipSelected: {
    borderColor: '#6C5CE7',
    backgroundColor: '#EFEDFF',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3436',
  },
  chipTextSelected: {
    color: '#6C5CE7',
  },
  input: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#DFE6E9',
    color: '#2D3436',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  optionWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#DFE6E9',
    backgroundColor: '#FFFFFF',
  },
  radioSelected: {
    borderColor: '#6C5CE7',
    backgroundColor: '#6C5CE7',
    borderWidth: 6,
  },
  optionInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#DFE6E9',
    color: '#2D3436',
  },
  saveButton: {
    backgroundColor: '#6C5CE7',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
