import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Dropdown } from 'react-native-element-dropdown';
import { Category, Difficulty } from '../types/quiz';
import { getCategories, addQuestion, updateQuestion, getQuestion } from '../lib/database';

export default function AddQuestionScreen() {
  const router = useRouter();
  const { id, categoryId: paramCategoryId, difficulty: paramDifficulty } = useLocalSearchParams<{ id?: string, categoryId?: string, difficulty?: string }>();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategoryId, setSelectedCategoryId] = useState(paramCategoryId || '');
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>((paramDifficulty as Difficulty) || 'Easy');

  const [isFocus, setIsFocus] = useState(false);

  useEffect(() => {
    async function load() {
      // Load categories
      const data = await getCategories();
      setCategories(data);
      
      // If we have an ID, we are editing
      if (id) {
        const q = await getQuestion(id);
        if (q) {
          setQuestionText(q.question);
          setOptions(q.options);
          setDifficulty(q.difficulty);
          const correctIdx = q.options.indexOf(q.correctAnswer);
          setCorrectAnswerIndex(correctIdx !== -1 ? correctIdx : 0);
          // Set category if it exists
          const cat = data.find(c => c.questions.some(question => question.id === q.id));
          if (cat) setSelectedCategoryId(cat.id);
        }
      } else if (data.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(data[0].id);
      }
      
      setLoading(false);
    }
    load();
  }, [id]);

  const handleSave = async () => {
    if (!questionText.trim()) {
      Alert.alert('Error', 'Please enter a question');
      return;
    }
    if (options.some(opt => !opt.trim())) {
      Alert.alert('Error', 'Please fill in all options');
      return;
    }

    const questionData = {
      question: questionText,
      options,
      correctAnswer: options[correctAnswerIndex],
      difficulty,
    };

    if (id) {
      await updateQuestion(id, questionData, selectedCategoryId);
    } else {
      await addQuestion(questionData, selectedCategoryId);
    }

    router.back();
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

  const dropdownData = categories.map(cat => ({ label: cat.name, value: cat.id }));

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: id ? 'Edit Question' : 'Add Question' }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.label}>Select Category</Text>
          <Dropdown
            style={[styles.dropdown, isFocus && { borderColor: '#6C5CE7' }]}
            placeholderStyle={styles.placeholderStyle}
            selectedTextStyle={styles.selectedTextStyle}
            inputSearchStyle={styles.inputSearchStyle}
            iconStyle={styles.iconStyle}
            data={dropdownData}
            search
            maxHeight={300}
            labelField="label"
            valueField="value"
            placeholder={!isFocus ? 'Select category' : '...'}
            searchPlaceholder="Search..."
            value={selectedCategoryId}
            onFocus={() => setIsFocus(true)}
            onBlur={() => setIsFocus(false)}
            onChange={item => {
              setSelectedCategoryId(item.value);
              setIsFocus(false);
            }}
          />
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
          <Text style={styles.saveButtonText}>{id ? 'Update Question' : 'Save Question'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollContent: {
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
  dropdown: {
    height: 50,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#DFE6E9',
  },
  placeholderStyle: {
    fontSize: 16,
    color: '#B2BEC3',
  },
  selectedTextStyle: {
    fontSize: 16,
    color: '#2D3436',
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 16,
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  difficultyGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#DFE6E9',
    alignItems: 'center',
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
