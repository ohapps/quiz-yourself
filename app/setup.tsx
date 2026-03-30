import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useAtom } from 'jotai';
import { Dropdown } from 'react-native-element-dropdown';
import { quizConfigAtom } from '../store/atoms';
import { Category } from '../types/quiz';
import { getCategories } from '../lib/database';

export default function SetupScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode: 'solo' | 'group' }>();
  const [config, setConfig] = useAtom(quizConfigAtom);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFocus, setIsFocus] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await getCategories();
      setCategories(data);
      
      // Initialize config with the first category if none is selected
      if (data.length > 0 && !config.category) {
        setConfig(prev => ({ 
          ...prev, 
          mode: mode || 'solo',
          category: data[0],
          playerCount: mode === 'group' ? 2 : 1
        }));
      } else {
        setConfig(prev => ({ ...prev, mode: mode || 'solo' }));
      }
      setLoading(false);
    }
    load();
  }, [mode]);

  const handleStart = () => {
    if (!config.category) {
      alert('Please select a category');
      return;
    }
    router.push('/quiz');
  };

  const handlePlayerNameChange = (index: number, name: string) => {
    const newNames = [...config.playerNames];
    newNames[index] = name;
    setConfig(prev => ({ ...prev, playerNames: newNames }));
  };

  const adjustQuestionCount = (amount: number) => {
    const newCount = Math.max(1, Math.min(50, config.questionCount + amount));
    setConfig(prev => ({ ...prev, questionCount: newCount }));
  };

  const adjustPlayerCount = (amount: number) => {
    const newCount = Math.max(2, Math.min(4, config.playerCount + amount));
    setConfig(prev => ({ ...prev, playerCount: newCount }));
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
      <Stack.Screen options={{ title: mode === 'solo' ? 'Solo Setup' : 'Group Setup' }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{mode === 'solo' ? 'Quiz Yourself' : 'Quiz Others'}</Text>
        
        <View style={styles.section}>
          <Text style={styles.label}>Category</Text>
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
            value={config.category?.id || ''}
            onFocus={() => setIsFocus(true)}
            onBlur={() => setIsFocus(false)}
            onChange={item => {
              const selectedCat = categories.find(c => c.id === item.value);
              setConfig(prev => ({ ...prev, category: selectedCat || null }));
              setIsFocus(false);
            }}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Difficulty</Text>
          <View style={styles.difficultyGrid}>
            {(['Easy', 'Medium', 'Hard'] as const).map(level => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.chip,
                  config.difficulty === level && styles.chipSelected
                ]}
                onPress={() => setConfig(prev => ({ ...prev, difficulty: level }))}
              >
                <Text style={[
                  styles.chipText,
                  config.difficulty === level && styles.chipTextSelected
                ]}>{level}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Number of Questions</Text>
          <View style={styles.counterContainer}>
            <TouchableOpacity 
              style={styles.counterButton} 
              onPress={() => adjustQuestionCount(-1)}
            >
              <Text style={styles.counterButtonText}>−</Text>
            </TouchableOpacity>
            <View style={styles.countDisplay}>
              <Text style={styles.countText}>{config.questionCount}</Text>
            </View>
            <TouchableOpacity 
              style={styles.counterButton} 
              onPress={() => adjustQuestionCount(1)}
            >
              <Text style={styles.counterButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {mode === 'group' && (
          <>
            <View style={styles.section}>
              <Text style={styles.label}>Number of Players</Text>
              <View style={styles.counterContainer}>
                <TouchableOpacity 
                  style={styles.counterButton} 
                  onPress={() => adjustPlayerCount(-1)}
                >
                  <Text style={styles.counterButtonText}>−</Text>
                </TouchableOpacity>
                <View style={styles.countDisplay}>
                  <Text style={styles.countText}>{config.playerCount}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.counterButton} 
                  onPress={() => adjustPlayerCount(1)}
                >
                  <Text style={styles.counterButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Player Names</Text>
              {Array.from({ length: config.playerCount }).map((_, index) => (
                <View key={index} style={styles.playerInputRow}>
                  <Text style={styles.playerNumber}>#{index + 1}</Text>
                  <TextInput
                    style={styles.playerInput}
                    placeholder={`Player ${index + 1}`}
                    value={config.playerNames[index] || ''}
                    onChangeText={(text) => handlePlayerNameChange(index, text)}
                  />
                </View>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity style={styles.startButton} onPress={handleStart}>
          <Text style={styles.startButtonText}>Start Quiz</Text>
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
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2D3436',
    marginBottom: 32,
    marginTop: 40,
  },
  section: {
    marginBottom: 32,
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
    height: 60,
    backgroundColor: 'white',
    borderRadius: 16,
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
    gap: 12,
  },
  chip: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#DFE6E9',
    alignItems: 'center',
  },
  chipSelected: {
    borderColor: '#6C5CE7',
    backgroundColor: '#EFEDFF',
  },
  chipText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3436',
  },
  chipTextSelected: {
    color: '#6C5CE7',
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 200,
  },
  counterButton: {
    width: 50,
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#DFE6E9',
  },
  counterButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#6C5CE7',
  },
  countDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  countText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2D3436',
  },
  playerInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  playerNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#6C5CE7',
    width: 30,
  },
  playerInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#DFE6E9',
  },
  startButton: {
    backgroundColor: '#6C5CE7',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
});
