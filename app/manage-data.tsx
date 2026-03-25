import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { addCategory, deleteCategory, deleteQuestion, getCategories, getQuestions, resetDatabase, updateCategory } from '../lib/database';
import { Category, Difficulty, Question } from '../types/quiz';

export default function ManageDataScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | 'All'>('All');

  const loadData = useCallback(async () => {
    setLoading(true);
    const cats = await getCategories();
    setCategories(cats);
    
    const catId = selectedCategoryId === 'all' ? undefined : selectedCategoryId;
    const diff = selectedDifficulty === 'All' ? undefined : selectedDifficulty;
    const qs = await getQuestions(catId, diff);
    setQuestions(qs);
    
    setLoading(false);
  }, [selectedCategoryId, selectedDifficulty]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleResetToDefaults = () => {
    Alert.alert(
      'Reset to Defaults',
      'This will delete all custom content and reset the database to the 400 default questions. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: async () => {
          await resetDatabase();
          loadData();
        }}
      ]
    );
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    await addCategory(newCategoryName);
    setNewCategoryName('');
    loadData();
  };

  const handleUpdateCategory = async () => {
    if (!editingCategoryId || !editCategoryName.trim()) return;
    await updateCategory(editingCategoryId, editCategoryName);
    setEditingCategoryId(null);
    loadData();
  };

  const handleDeleteCategory = (id: string, name: string) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${name}"? This will also delete all questions in this category.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteCategory(id);
          loadData();
        }}
      ]
    );
  };

  const handleDeleteQuestion = (id: string) => {
    Alert.alert(
      'Delete Question',
      'Are you sure you want to delete this question?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteQuestion(id);
          loadData();
        }}
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Manage Content' }} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Categories Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <TouchableOpacity 
              style={styles.resetButton}
              onPress={handleResetToDefaults}
            >
              <Text style={styles.resetButtonText}>Reset to Defaults</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.addCategoryRow}>
            <TextInput
              style={styles.input}
              placeholder="New Category Name"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
            />
            <TouchableOpacity style={styles.addButton} onPress={handleAddCategory}>
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {categories.map(cat => (
            <View key={cat.id} style={styles.listItem}>
              {editingCategoryId === cat.id ? (
                <View style={styles.editRow}>
                  <TextInput
                    style={styles.inputSmall}
                    value={editCategoryName}
                    onChangeText={setEditCategoryName}
                    autoFocus
                  />
                  <TouchableOpacity onPress={handleUpdateCategory}>
                    <Text style={styles.saveAction}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditingCategoryId(null)}>
                    <Text style={styles.cancelAction}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.listItemText}>{cat.name} ({cat.questions.length})</Text>
                  <View style={styles.actions}>
                    <TouchableOpacity onPress={() => {
                      setEditingCategoryId(cat.id);
                      setEditCategoryName(cat.name);
                    }}>
                      <Text style={styles.editAction}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteCategory(cat.id, cat.name)}>
                      <Text style={styles.deleteAction}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          ))}
        </View>

        {/* Questions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Questions</Text>
            <TouchableOpacity 
              style={styles.addQuestionBtn}
              onPress={() => router.push({
                pathname: '/add-question',
                params: { 
                  categoryId: selectedCategoryId === 'all' ? undefined : selectedCategoryId,
                  difficulty: selectedDifficulty === 'All' ? undefined : selectedDifficulty
                }
              } as any)}
            >
              <Text style={styles.addQuestionBtnText}>+ Add Question</Text>
            </TouchableOpacity>
          </View>

          {/* Filters */}
          <View style={styles.filters}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
              <TouchableOpacity 
                style={[styles.filterChip, selectedCategoryId === 'all' && styles.filterChipSelected]}
                onPress={() => setSelectedCategoryId('all')}
              >
                <Text style={[styles.filterChipText, selectedCategoryId === 'all' && styles.filterChipTextSelected]}>All Categories</Text>
              </TouchableOpacity>
              {categories.map(cat => (
                <TouchableOpacity 
                  key={cat.id}
                  style={[styles.filterChip, selectedCategoryId === cat.id && styles.filterChipSelected]}
                  onPress={() => setSelectedCategoryId(cat.id)}
                >
                  <Text style={[styles.filterChipText, selectedCategoryId === cat.id && styles.filterChipTextSelected]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.difficultyFilter}>
              {(['All', 'Easy', 'Medium', 'Hard'] as const).map(level => (
                <TouchableOpacity 
                  key={level}
                  style={[styles.diffChip, selectedDifficulty === level && styles.diffChipSelected]}
                  onPress={() => setSelectedDifficulty(level)}
                >
                  <Text style={[styles.diffChipText, selectedDifficulty === level && styles.diffChipTextSelected]}>{level}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color="#6C5CE7" style={{ marginTop: 20 }} />
          ) : (
            questions.map(q => (
              <View key={q.id} style={styles.questionCard}>
                <View style={styles.qHeader}>
                  <View style={[styles.tag, { backgroundColor: getDifficultyColor(q.difficulty) }]}>
                    <Text style={styles.tagText}>{q.difficulty}</Text>
                  </View>
                  <View style={styles.qActions}>
                    <TouchableOpacity onPress={() => handleDeleteQuestion(q.id)}>
                      <Text style={styles.deleteAction}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.qText}>{q.question}</Text>
                <Text style={styles.qAnswer}>A: {q.correctAnswer}</Text>
              </View>
            ))
          )}
          {!loading && questions.length === 0 && (
            <Text style={styles.emptyText}>No questions found for these filters.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function getDifficultyColor(diff: Difficulty) {
  switch (diff) {
    case 'Easy': return '#00B894';
    case 'Medium': return '#FDCB6E';
    case 'Hard': return '#FF7675';
    default: return '#636E72';
  }
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
  section: {
    marginBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resetButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF7675',
  },
  resetButtonText: {
    color: '#FF7675',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2D3436',
    marginBottom: 16,
  },
  addCategoryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#DFE6E9',
  },
  inputSmall: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6C5CE7',
  },
  addButton: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderRadius: 12,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F2F6',
  },
  listItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
  },
  editAction: {
    color: '#6C5CE7',
    fontWeight: '600',
  },
  deleteAction: {
    color: '#FF7675',
    fontWeight: '600',
  },
  saveAction: {
    color: '#00B894',
    fontWeight: '700',
    marginLeft: 12,
  },
  cancelAction: {
    color: '#636E72',
    fontWeight: '600',
    marginLeft: 12,
  },
  editRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addQuestionBtn: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addQuestionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  filters: {
    marginBottom: 20,
    gap: 12,
  },
  filterRow: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#DFE6E9',
  },
  filterChipSelected: {
    backgroundColor: '#6C5CE7',
    borderColor: '#6C5CE7',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#636E72',
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
  },
  difficultyFilter: {
    flexDirection: 'row',
    gap: 8,
  },
  diffChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DFE6E9',
  },
  diffChipSelected: {
    backgroundColor: '#2D3436',
    borderColor: '#2D3436',
  },
  diffChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#636E72',
  },
  diffChipTextSelected: {
    color: '#FFFFFF',
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F2F6',
  },
  qHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  qActions: {
    flexDirection: 'row',
    gap: 12,
  },
  qText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 8,
  },
  qAnswer: {
    fontSize: 14,
    color: '#00B894',
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    color: '#636E72',
    marginTop: 40,
    fontStyle: 'italic',
  },
});
