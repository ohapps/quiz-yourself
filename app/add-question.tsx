import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Dropdown } from 'react-native-element-dropdown';
import { Category, Difficulty } from '../types/quiz';
import { getCategories, addQuestion, updateQuestion, getQuestion } from '../lib/database';

export default function AddQuestionScreen() {
  const router = useRouter();
  const { id, categoryId: paramCategoryId, difficulty: paramDifficulty } = useLocalSearchParams<{ id?: string, categoryId?: string, difficulty?: string }>();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedParentId, setSelectedParentId] = useState('');
  const [selectedSubId, setSelectedSubId] = useState('');
  
  const [questionText, setQuestionText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>((paramDifficulty as Difficulty) || 'Easy');

  const [parentFocus, setParentFocus] = useState(false);
  const [subFocus, setSubFocus] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await getCategories();
      setCategories(data);
      
      const topLevel = data.filter(c => !c.parentId);

      if (id) {
        const q = await getQuestion(id);
        if (q) {
          setQuestionText(q.question);
          setImageUrl(q.imageUrl || '');
          setOptions(q.options);
          setDifficulty(q.difficulty);
          const correctIdx = q.options.indexOf(q.correctAnswer);
          setCorrectAnswerIndex(correctIdx !== -1 ? correctIdx : 0);
          
          // Find which category this question belongs to and its parent
          const cat = data.find(c => c.id === (q as any).category_id);
          if (cat) {
            if (cat.parentId) {
              setSelectedParentId(cat.parentId);
              setSelectedSubId(cat.id);
            } else {
              setSelectedParentId(cat.id);
              setSelectedSubId('');
            }
          }
        }
      } else if (paramCategoryId) {
        const cat = data.find(c => c.id === paramCategoryId);
        if (cat) {
          if (cat.parentId) {
            setSelectedParentId(cat.parentId);
            setSelectedSubId(cat.id);
          } else {
            setSelectedParentId(cat.id);
            setSelectedSubId('');
          }
        }
      } else if (topLevel.length > 0) {
        setSelectedParentId(topLevel[0].id);
      }
      
      setLoading(false);
    }
    load();
  }, [id, paramCategoryId]);

  const parentCategories = useMemo(() => categories.filter(c => !c.parentId), [categories]);
  const subCategories = useMemo(() => {
    if (!selectedParentId) return [];
    return categories.filter(c => c.parentId === selectedParentId);
  }, [categories, selectedParentId]);

  const handleSave = async () => {
    if (!questionText.trim()) {
      Alert.alert('Error', 'Please enter a question');
      return;
    }
    if (options.some(opt => !opt.trim())) {
      Alert.alert('Error', 'Please fill in all options');
      return;
    }

    const finalCategoryId = selectedSubId || selectedParentId;
    if (!finalCategoryId) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    const questionData = {
      question: questionText,
      options,
      correctAnswer: options[correctAnswerIndex],
      difficulty,
      imageUrl: imageUrl.trim() || undefined,
    };

    if (id) {
      await updateQuestion(id, questionData, finalCategoryId);
    } else {
      await addQuestion(questionData, finalCategoryId);
    }

    if (imageUrl.trim()) {
      Image.prefetch(imageUrl.trim()).catch(e => console.warn('Saved image prefetch failed:', e));
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
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  const parentDropdownData = parentCategories.map(cat => ({ label: cat.name, value: cat.id }));
  const subDropdownData = [
    { label: 'None (Root Category)', value: 'none' },
    ...subCategories.map(cat => ({ label: cat.name, value: cat.id }))
  ];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: id ? 'Edit Question' : 'Add Question' }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.label}>Main Category</Text>
          <Dropdown
            style={[styles.dropdown, parentFocus && { borderColor: '#1a73e8' }]}
            placeholderStyle={styles.placeholderStyle}
            selectedTextStyle={styles.selectedTextStyle}
            inputSearchStyle={styles.inputSearchStyle}
            data={parentDropdownData}
            search
            maxHeight={300}
            labelField="label"
            valueField="value"
            placeholder="Select category"
            value={selectedParentId}
            onFocus={() => setParentFocus(true)}
            onBlur={() => setParentFocus(false)}
            onChange={item => {
              setSelectedParentId(item.value);
              setSelectedSubId(''); // Reset sub-category when parent changes
              setParentFocus(false);
            }}
          />
        </View>

        {subCategories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Sub-category (Optional)</Text>
            <Dropdown
              style={[styles.dropdown, subFocus && { borderColor: '#1a73e8' }]}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              data={subDropdownData}
              maxHeight={300}
              labelField="label"
              valueField="value"
              placeholder="Select sub-category"
              value={selectedSubId || 'none'}
              onFocus={() => setSubFocus(true)}
              onBlur={() => setSubFocus(false)}
              onChange={item => {
                setSelectedSubId(item.value === 'none' ? '' : item.value);
                setSubFocus(false);
              }}
            />
          </View>
        )}

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
          <Text style={styles.label}>Image URL (Optional)</Text>
          <TextInput
            style={styles.inputSingle}
            placeholder="Enter image URL..."
            value={imageUrl}
            onChangeText={setImageUrl}
            autoCapitalize="none"
            keyboardType="url"
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
    fontSize: 14,
    fontWeight: '700',
    color: '#636E72',
    marginBottom: 10,
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
    borderColor: '#1a73e8',
    backgroundColor: '#E8F0FE',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3436',
  },
  chipTextSelected: {
    color: '#1a73e8',
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
  inputSingle: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#DFE6E9',
    color: '#2D3436',
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
    borderColor: '#1a73e8',
    backgroundColor: '#1a73e8',
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
    backgroundColor: '#1a73e8',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#1a73e8',
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
