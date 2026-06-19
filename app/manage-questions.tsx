import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { Dropdown } from 'react-native-element-dropdown';
import { Category, Question, Difficulty } from '../types/quiz';
import { getCategories, getQuestions, deleteQuestion, isSystemContent } from '../lib/database';

export default function ManageQuestionsScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedParentId, setSelectedParentId] = useState<string | 'all'>('all');
  const [selectedSubId, setSelectedSubId] = useState<string | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | 'All'>('All');

  const [parentFocus, setParentFocus] = useState(false);
  const [subFocus, setSubFocus] = useState(false);

  const parentCategories = useMemo(() => categories.filter(c => !c.parentId), [categories]);
  const subCategories = useMemo(() => {
    if (selectedParentId === 'all') return [];
    return categories.filter(c => c.parentId === selectedParentId);
  }, [categories, selectedParentId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const cats = await getCategories();
    setCategories(cats);
    
    // Logic for filtering:
    // If sub is selected, use that. 
    // If only parent is selected, use parent (database will pull all children).
    // If 'all' is selected for parent, use undefined.
    let filterCatId: string | undefined = undefined;
    if (selectedParentId !== 'all') {
      filterCatId = (selectedSubId && selectedSubId !== 'all') ? selectedSubId : selectedParentId;
    }

    const diff = selectedDifficulty === 'All' ? undefined : selectedDifficulty;
    const qs = await getQuestions(filterCatId, diff);
    setQuestions(qs);
    
    setLoading(false);
  }, [selectedParentId, selectedSubId, selectedDifficulty]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleDelete = (id: string) => {
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

  const parentDropdownData = [
    { label: 'All Categories', value: 'all' },
    ...parentCategories.map(cat => ({ label: cat.name, value: cat.id }))
  ];

  const subDropdownData = [
    { label: 'All Sub-categories', value: 'all' },
    ...subCategories.map(cat => ({ label: cat.name, value: cat.id }))
  ];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Questions' }} />
      
      <View style={styles.filterSection}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Main Category</Text>
          <Dropdown
            style={[styles.dropdown, parentFocus && { borderColor: '#1a73e8' }]}
            data={parentDropdownData}
            search
            maxHeight={300}
            labelField="label"
            valueField="value"
            placeholder="Main Category"
            value={selectedParentId}
            onFocus={() => setParentFocus(true)}
            onBlur={() => setParentFocus(false)}
            onChange={item => {
              setSelectedParentId(item.value);
              setSelectedSubId('all');
              setParentFocus(false);
            }}
          />
        </View>

        {subCategories.length > 0 && (
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Sub-category</Text>
            <Dropdown
              style={[styles.dropdown, subFocus && { borderColor: '#1a73e8' }]}
              data={subDropdownData}
              maxHeight={300}
              labelField="label"
              valueField="value"
              placeholder="All Sub-categories"
              value={selectedSubId}
              onFocus={() => setSubFocus(true)}
              onBlur={() => setSubFocus(false)}
              onChange={item => {
                setSelectedSubId(item.value);
                setSubFocus(false);
              }}
            />
          </View>
        )}

        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Difficulty</Text>
          <View style={styles.difficultyFilters}>
            {(['All', 'Easy', 'Medium', 'Hard'] as const).map(level => (
              <TouchableOpacity 
                key={level}
                style={[styles.diffChip, selectedDifficulty === level && styles.diffChipActive]}
                onPress={() => setSelectedDifficulty(level)}
              >
                <Text style={[styles.diffChipText, selectedDifficulty === level && styles.diffChipTextActive]}>{level}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#1a73e8" style={{ marginTop: 40 }} />
        ) : questions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No questions found.</Text>
          </View>
        ) : (
          questions.map(q => (
            <View key={q.id} style={styles.qCard}>
              <View style={styles.qHeader}>
                <View style={styles.tagRow}>
                  <View style={[styles.diffTag, { backgroundColor: getDifficultyColor(q.difficulty) }]}>
                    <Text style={styles.diffText}>{q.difficulty}</Text>
                  </View>
                  <View style={[styles.typeTag, { backgroundColor: q.type === 'numeric' ? '#6C5CE7' : '#00B894' }]}>
                    <Text style={styles.typeText}>
                      {q.type === 'numeric' ? 'Numeric' : 'Multiple Choice'}
                    </Text>
                  </View>
                </View>
                <View style={styles.headerActions}>
                  {!isSystemContent(q.userId) && (
                    <>
                      <TouchableOpacity onPress={() => router.push({ pathname: '/add-question', params: { id: q.id } } as any)}>
                        <Text style={styles.editAction}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(q.id)}>
                        <Text style={styles.deleteAction}>Delete</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
              <Text style={styles.qText}>{q.question}</Text>
              <Text style={styles.correctLabel}>Correct Answer:</Text>
              <Text style={styles.correctText}>{q.correctAnswer}</Text>
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => router.push({
          pathname: '/add-question',
          params: { 
            categoryId: (selectedSubId && selectedSubId !== 'all') ? selectedSubId : (selectedParentId !== 'all' ? selectedParentId : undefined),
            difficulty: selectedDifficulty === 'All' ? undefined : selectedDifficulty
          }
        } as any)}
      >
        <Text style={styles.fabText}>+ Add Question</Text>
      </TouchableOpacity>
    </View>
  );
}

function getDifficultyColor(diff: string) {
  switch (diff) {
    case 'Easy': return '#00AAFF';
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
  filterSection: {
    backgroundColor: '#FFFFFF',
    paddingTop: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F2F6',
  },
  filterGroup: {
    paddingVertical: 8,
  },
  dropdown: {
    marginHorizontal: 20,
    height: 50,
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#DFE6E9',
  },
  filterLabel: {
    paddingHorizontal: 20,
    fontSize: 10,
    fontWeight: '700',
    color: '#B2BEC3',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  difficultyFilters: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 8,
  },
  diffChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DFE6E9',
  },
  diffChipActive: {
    backgroundColor: '#1A2340',
    borderColor: '#1A2340',
  },
  diffChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#636E72',
  },
  diffChipTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  qCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F2F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  qHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  diffTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  diffText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  editAction: {
    color: '#1a73e8',
    fontSize: 12,
    fontWeight: '700',
  },
  deleteAction: {
    color: '#FF7675',
    fontSize: 12,
    fontWeight: '700',
  },
  qText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 12,
  },
  correctLabel: {
    fontSize: 12,
    color: '#636E72',
    fontWeight: '600',
    marginBottom: 2,
  },
  correctText: {
    fontSize: 14,
    color: '#00AAFF',
    fontWeight: '700',
  },
  emptyState: {
    marginTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: '#636E72',
    fontStyle: 'italic',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#1a73e8',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#1a73e8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  tagRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  typeTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});
