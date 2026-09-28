import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useAtom } from 'jotai';
import { Dropdown } from 'react-native-element-dropdown';
import { quizConfigAtom } from '../store/atoms';
import { Category } from '../types/quiz';
import { getCategories, getFavoriteCategories, toggleFavorite } from '../lib/database';
import { powersync } from '../lib/powersync/system';
import * as Haptics from 'expo-haptics';

export default function SetupScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode: 'solo' | 'group' }>();
  const [config, setConfig] = useAtom(quizConfigAtom);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [favoriteCategories, setFavoriteCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFocus, setCategoryFocus] = useState(false);
  const [subCategoryFocus, setSubCategoryFocus] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);

  useEffect(() => {
    let disposed = false;
    let loadId = 0;
    let favoriteReloadTimer: ReturnType<typeof setTimeout> | null = null;

    async function loadCategories() {
      const thisLoad = ++loadId;
      try {
        const data = await getCategories();

        if (disposed || thisLoad !== loadId) return;

        setCategories(data);

        const topLevelData = data.filter(c => !c.parentId);

        setConfig(prev => {
          if (topLevelData.length > 0 && !prev.category) {
            return {
              ...prev,
              mode: mode || 'solo',
              category: topLevelData[0],
              playerCount: mode === 'group' ? 2 : 1,
            };
          }
          return { ...prev, mode: mode || 'solo' };
        });

        if (data.length > 0 || powersync.currentStatus.hasSynced) {
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to load categories', error);
        if (!disposed && thisLoad === loadId) {
          setLoading(false);
        }
      }
    }

    async function loadFavorites() {
      try {
        const favs = await getFavoriteCategories();
        if (!disposed) setFavoriteCategories(favs);
      } catch (error) {
        console.error('Failed to load favorites', error);
      }
    }

    // Debounce favorite reloads so PowerSync's delete-then-put reconcile
    // doesn't briefly clear the Favorites dropdown option.
    function scheduleFavoriteReload() {
      if (favoriteReloadTimer) clearTimeout(favoriteReloadTimer);
      favoriteReloadTimer = setTimeout(loadFavorites, 250);
    }

    loadCategories();
    loadFavorites();

    const disposeCategoryChange = powersync.onChangeWithCallback(
      { onChange: () => { loadCategories(); } },
      { tables: ['Category'] }
    );

    const disposeFavoriteChange = powersync.onChangeWithCallback(
      { onChange: () => { scheduleFavoriteReload(); } },
      { tables: ['Favorite'] }
    );

    const disposeStatus = powersync.registerListener({
      statusChanged: (status) => {
        if (status.hasSynced) {
          loadCategories();
          loadFavorites();
        }
      },
    });

    const timeout = setTimeout(() => {
      if (!disposed) setLoading(false);
    }, 10000);

    return () => {
      disposed = true;
      clearTimeout(timeout);
      if (favoriteReloadTimer) clearTimeout(favoriteReloadTimer);
      disposeCategoryChange();
      disposeFavoriteChange();
      disposeStatus();
    };
  }, [mode, setConfig]);

  const parentCategories = useMemo(() => categories.filter(c => !c.parentId), [categories]);
  
  const [viewingFavorites, setViewingFavorites] = useState(false);

  const favoriteIds = useMemo(() => new Set(favoriteCategories.map(f => f.id)), [favoriteCategories]);

  const handleToggleFavorite = async (categoryId: string) => {
    const currentlyFavorite = favoriteIds.has(categoryId);

    // Optimistic UI so the Favorites option doesn't flash away during sync
    if (currentlyFavorite) {
      setFavoriteCategories(prev => prev.filter(c => c.id !== categoryId));
      if (viewingFavorites) {
        const remaining = favoriteCategories.filter(c => c.id !== categoryId);
        if (remaining.length === 0) {
          setViewingFavorites(false);
        } else if (config.category?.id === categoryId) {
          setConfig(prev => ({ ...prev, category: remaining[0] }));
        }
      }
    } else {
      const cat = categories.find(c => c.id === categoryId);
      if (cat) {
        setFavoriteCategories(prev =>
          prev.some(c => c.id === categoryId) ? prev : [...prev, cat]
        );
      }
    }

    try {
      await toggleFavorite(categoryId);
    } catch (error) {
      console.error('Failed to toggle favorite', error);
      // Roll back optimistic update from source of truth
      const favs = await getFavoriteCategories();
      setFavoriteCategories(favs);
    }
  };

  const activeParentId = useMemo(() => {
    if (viewingFavorites) return '__favorites__';
    if (!config.category) return null;
    return config.category.parentId || config.category.id;
  }, [config.category, viewingFavorites]);

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

  const parentDropdownData = [
    ...(favoriteCategories.length > 0 ? [{ label: '⭐ Favorites', value: '__favorites__' }] : []),
    ...parentCategories.map(cat => ({ label: cat.name, value: cat.id })),
  ];
  const subDropdownData = activeParentId === '__favorites__'
    ? favoriteCategories.map(cat => ({ label: cat.name, value: cat.id }))
    : [
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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{mode === 'solo' ? 'Quiz Yourself' : 'Quiz Others'}</Text>
        
        <View style={styles.section}>
          <Text style={styles.label}>Main Category</Text>
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
              if (item.value === '__favorites__') {
                setViewingFavorites(true);
                setConfig(prev => ({ ...prev, category: favoriteCategories[0] || null }));
              } else {
                setViewingFavorites(false);
                const selectedCat = categories.find(c => c.id === item.value);
                setConfig(prev => ({ ...prev, category: selectedCat || null }));
              }
              setCategoryFocus(false);
            }}
          />
          <View style={styles.dropdownActions}>
            {config.category && activeParentId !== '__favorites__' && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleToggleFavorite(activeParentId!)}
              >
                <Text style={styles.actionIcon}>{favoriteIds.has(activeParentId!) ? '⭐' : '☆'}</Text>
                <Text style={styles.actionLabel}>
                  {favoriteIds.has(activeParentId!) ? 'Saved as favorite' : 'Save as favorite'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionButton, isSpinning && styles.actionButtonDisabled]}
              onPress={spinCategories}
              disabled={isSpinning}
            >
              <Text style={styles.actionIcon}>🎲</Text>
              <Text style={styles.actionLabel}>Random select</Text>
            </TouchableOpacity>
          </View>
        </View>

        {(subCategories.length > 0 || activeParentId === '__favorites__') && (
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
            {(config.category?.parentId || (subCategories.length > 1 && activeParentId !== '__favorites__')) && (
              <View style={styles.dropdownActions}>
                {config.category?.parentId && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleToggleFavorite(config.category!.id)}
                  >
                    <Text style={styles.actionIcon}>{favoriteIds.has(config.category!.id) ? '⭐' : '☆'}</Text>
                    <Text style={styles.actionLabel}>
                      {favoriteIds.has(config.category!.id) ? 'Saved as favorite' : 'Save as favorite'}
                    </Text>
                  </TouchableOpacity>
                )}
                {subCategories.length > 1 && activeParentId !== '__favorites__' && (
                  <TouchableOpacity
                    style={[styles.actionButton, isSpinning && styles.actionButtonDisabled]}
                    disabled={isSpinning}
                    onPress={() => {
                      const randomSub = subCategories[Math.floor(Math.random() * subCategories.length)];
                      setConfig(prev => ({ ...prev, category: randomSub }));
                    }}
                  >
                    <Text style={styles.actionIcon}>🎲</Text>
                    <Text style={styles.actionLabel}>Random select</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
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
      </ScrollView>

      <View style={styles.stickyFooter}>
        <TouchableOpacity 
          style={[styles.startButton, isSpinning && { opacity: 0.5 }]} 
          onPress={handleStart}
          disabled={isSpinning}
        >
          <Text style={styles.startButtonText}>Start Quiz</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 24,
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
  dropdownActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    marginTop: 12,
    paddingHorizontal: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionIcon: {
    fontSize: 15,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#636E72',
    textDecorationLine: 'underline',
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
  stickyFooter: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    backgroundColor: '#F5F7FA',
    borderTopWidth: 1,
    borderTopColor: '#DFE6E9',
  },
  startButton: {
    backgroundColor: '#1a73e8',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
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
