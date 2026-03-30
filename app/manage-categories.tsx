import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { Category } from '../types/quiz';
import { getCategories, deleteCategory, addCategory, updateCategory } from '../lib/database';

export default function ManageCategoriesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCatName, setNewCatName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const loadCategories = useCallback(async () => {
    setLoading(true);
    const data = await getCategories();
    setCategories(data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, [loadCategories])
  );

  const handleAdd = async () => {
    if (!newCatName.trim()) return;
    await addCategory(newCatName);
    setNewCatName('');
    loadCategories();
  };

  const handleUpdate = async () => {
    if (!editingId || !editName.trim()) return;
    await updateCategory(editingId, editName);
    setEditingId(null);
    loadCategories();
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${name}"? This will also delete all questions in this category.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteCategory(id);
          loadCategories();
        }}
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Categories' }} />
      
      <View style={styles.addSection}>
        <TextInput
          style={styles.input}
          placeholder="New Category Name"
          value={newCatName}
          onChangeText={setNewCatName}
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#6C5CE7" style={{ marginTop: 40 }} />
        ) : (
          categories.map(cat => (
            <View key={cat.id} style={styles.listItem}>
              {editingId === cat.id ? (
                <View style={styles.editRow}>
                  <TextInput
                    style={styles.inputSmall}
                    value={editName}
                    onChangeText={setEditName}
                    autoFocus
                  />
                  <TouchableOpacity onPress={handleUpdate}>
                    <Text style={styles.saveAction}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditingId(null)}>
                    <Text style={styles.cancelAction}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.catInfo}>
                    <Text style={styles.catName}>{cat.name}</Text>
                    <Text style={styles.catCount}>{cat.questions.length} questions</Text>
                  </View>
                  <View style={styles.actions}>
                    <TouchableOpacity onPress={() => { setEditingId(cat.id); setEditName(cat.name); }}>
                      <Text style={styles.editAction}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(cat.id, cat.name)}>
                      <Text style={styles.deleteAction}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  addSection: {
    padding: 20,
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F2F6',
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DFE6E9',
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
  scrollContent: {
    padding: 20,
  },
  listItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F2F6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catInfo: {
    flex: 1,
  },
  catName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3436',
  },
  catCount: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 2,
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
  inputSmall: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6C5CE7',
  },
});
