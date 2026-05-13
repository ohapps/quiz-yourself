import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useAtom } from 'jotai';
import { Dropdown } from 'react-native-element-dropdown';
import { quizConfigAtom } from '../store/atoms';
import { Category } from '../types/quiz';
import { getCategories } from '../lib/database';
import * as Haptics from 'expo-haptics';

export default function SetupScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode: 'solo' | 'group' }>();
  const [config, setConfig] = useAtom(quizConfigAtom);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFocus, setCategoryFocus] = useState(false);
  const [subCategoryFocus, setSubCategoryFocus] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await getCategories();
      setCategories(data);
      
      const topLevelData = data.filter(c => !c.parentId);

      // Initialize config with the first top-level category if none is selected
      if (topLevelData.length > 0 && !config.category) {
        setConfig(prev => ({ 
          ...prev, 
          mode: mode || 'solo',
          category: topLevelData[0],
          playerCount: mode === 'group' ? 2 : 1
        }));
      } else {
        setConfig(prev => ({ ...prev, mode: mode || 'solo' }));
      }
      setLoading(false);
    }
    load();
  }, [mode]);

  const parentCategories = useMemo(() => categories.filter(c => !c.parentId), [categories]);
  
  // Find which top-level category is currently "active" (either directly or as parent)
  const activeParentId = useMemo(() => {
    if (!config.category) return null;
    return config.category.parentId || config.category.id;
  }, [config.category]);

  const subCategories = useMemo(() => {
    if (!activeParentId) return [];
    return categories.filter(c => c.parentId === activeParentId);
  }, [categories, activeParentId]);

  const spinCategories = async () => {
    if (parentCategories.length === 0 || isSpinning) return;
    
    setIsSpinning(true);

    const mainSpins = 20;
    let finalMainCat = parentCategories[0];
    
    // Spin main categories
    for (let i = 0; i < mainSpins; i++) {
      const randomCat = parentCategories[Math.floor(Math.random() * parentCategories.length)];
      setConfig(prev => ({ ...prev, category: randomCat }));
      
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
      
      const delay = 40 + (i * i * 0.5);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      if (i === mainSpins - 1) {
        finalMainCat = randomCat;
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }
    }

    const subs = categories.filter(c => c.parentId === finalMainCat.id);
    
    if (subs.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Pause before sub spin
      
      const subSpins = 20;
      for (let i = 0; i < subSpins; i++) {
        const randomSub = subs[Math.floor(Math.random() * subs.length)];
        setConfig(prev => ({ ...prev, category: randomSub }));
        
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {}
        
        const delay = 40 + (i * i * 0.5);
        await new Promise(resolve => setTimeout(resolve, delay));

        if (i === subSpins - 1) {
          try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {}
        }
      }
    }

    setIsSpinning(false);
  };

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
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  const parentDropdownData = parentCategories.map(cat => ({ label: cat.name, value: cat.id }));
  const subDropdownData = [
    { label: 'All Sub-categories', value: 'all' },
    ...subCategories.map(cat => ({ label: cat.name, value: cat.id }))
  ];

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen options={{ title: mode === 'solo' ? 'Solo Setup' : 'Group Setup' }} />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{mode === 'solo' ? 'Quiz Yourself' : 'Quiz Others'}</Text>
        
        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Main Category</Text>
            <TouchableOpacity 
              style={[styles.randomButton, isSpinning && { opacity: 0.5 }]} 
              onPress={spinCategories}
              disabled={isSpinning}
            >
              <Text style={styles.randomButtonText}>🎲 Randomize</Text>
            </TouchableOpacity>
          </View>
          <Dropdown
            style={[styles.dropdown, categoryFocus && { borderColor: '#1a73e8' }, isSpinning && styles.dropdownDisabled]}
            placeholderStyle={styles.placeholderStyle}
            selectedTextStyle={styles.selectedTextStyle}
            inputSearchStyle={styles.inputSearchStyle}
            iconStyle={styles.iconStyle}
            data={parentDropdownData}
            search
            disable={isSpinning}
            maxHeight={300}
            labelField="label"
            valueField="value"
            placeholder={!categoryFocus ? 'Select category' : '...'}
            searchPlaceholder="Search..."
            value={activeParentId || ''}
            onFocus={() => setCategoryFocus(true)}
            onBlur={() => setCategoryFocus(false)}
            onChange={item => {
              const selectedCat = categories.find(c => c.id === item.value);
              setConfig(prev => ({ ...prev, category: selectedCat || null }));
              setCategoryFocus(false);
            }}
          />
        </View>

        {subCategories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Sub-category (Optional)</Text>
            <Dropdown
              style={[styles.dropdown, subCategoryFocus && { borderColor: '#1a73e8' }, isSpinning && styles.dropdownDisabled]}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              data={subDropdownData}
              maxHeight={300}
              disable={isSpinning}
              labelField="label"
              valueField="value"
              placeholder="All Sub-categories"
              value={config.category?.parentId ? config.category.id : 'all'}
              onFocus={() => setSubCategoryFocus(true)}
              onBlur={() => setSubCategoryFocus(false)}
              onChange={item => {
                if (item.value === 'all') {
                  const parentCat = categories.find(c => c.id === activeParentId);
                  setConfig(prev => ({ ...prev, category: parentCat || null }));
                } else {
                  const selectedSub = categories.find(c => c.id === item.value);
                  setConfig(prev => ({ ...prev, category: selectedSub || null }));
                }
                setSubCategoryFocus(false);
              }}
            />
          </View>
        )}

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

        <TouchableOpacity 
          style={[styles.startButton, isSpinning && { opacity: 0.5 }]} 
          onPress={handleStart}
          disabled={isSpinning}
        >
          <Text style={styles.startButtonText}>Start Quiz</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  randomButton: {
    backgroundColor: '#FFEAA7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDCB6E',
  },
  randomButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D35400',
    textTransform: 'uppercase',
  },
  dropdown: {
    height: 60,
    backgroundColor: 'white',
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#DFE6E9',
  },
  dropdownDisabled: {
    backgroundColor: '#F1F2F6',
    opacity: 0.8,
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
    borderColor: '#1a73e8',
    backgroundColor: '#E8F0FE',
  },
  chipText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3436',
  },
  chipTextSelected: {
    color: '#1a73e8',
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
    color: '#1a73e8',
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
    color: '#1a73e8',
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
    backgroundColor: '#1a73e8',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#1a73e8',
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
