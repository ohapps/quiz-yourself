import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { Dropdown } from 'react-native-element-dropdown';
import { Category } from '../types/quiz';
import { getCategories, deleteCategory, addCategory, updateCategory, isSystemContent } from '../lib/database';

export default function ManageCategoriesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCatName, setNewCatName] = useState('');
  const [newParentId, setNewParentId] = useState<string | null>(null);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editParentId, setEditParentId] = useState<string | null>(null);

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
    await addCategory(newCatName, newParentId || undefined);
    setNewCatName('');
    setNewParentId(null);
    loadCategories();
  };

  const handleUpdate = async () => {
    if (!editingId || !editName.trim()) return;
    await updateCategory(editingId, editName, editParentId || undefined);
    setEditingId(null);
    loadCategories();
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${name}"? This will also delete all sub-categories and questions in this category.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteCategory(id);
          loadCategories();
        }}
      ]
    );
  };

  // Organize categories into a tree
  const categoryTree = useMemo(() => {
    const topLevel = categories.filter(c => !c.parentId);
    return topLevel.map(parent => ({
      ...parent,
      children: categories.filter(c => c.parentId === parent.id)
    }));
  }, [categories]);

  const dropdownData = useMemo(() => {
    const topLevel = categories.filter(c => !c.parentId);
    return [
      { label: 'None (Top Level)', value: 'none' },
      ...topLevel.map(c => ({ label: c.name, value: c.id }))
    ];
  }, [categories]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Categories' }} />
      
      <View style={styles.addSection}>
        <View style={styles.addInputs}>
          <TextInput
            style={styles.input}
            placeholder="New Category Name"
            value={newCatName}
            onChangeText={setNewCatName}
          />
          <Dropdown
            style={styles.dropdown}
            placeholderStyle={styles.placeholderStyle}
            selectedTextStyle={styles.selectedTextStyle}
            data={dropdownData}
            maxHeight={300}
            labelField="label"
            valueField="value"
            placeholder="Parent Category"
            value={newParentId || 'none'}
            onChange={item => setNewParentId(item.value === 'none' ? null : item.value)}
          />
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#1a73e8" style={{ marginTop: 40 }} />
        ) : (
          categoryTree.map(parent => (
            <View key={parent.id}>
              {/* Parent Category Card */}
              <View style={styles.listItem}>
                {editingId === parent.id ? (
                  <View style={styles.editContainer}>
                    <TextInput
                      style={styles.inputSmall}
                      value={editName}
                      onChangeText={setEditName}
                      autoFocus
                    />
                    <Dropdown
                      style={styles.dropdownSmall}
                      data={dropdownData}
                      labelField="label"
                      valueField="value"
                      value={editParentId || 'none'}
                      onChange={item => setEditParentId(item.value === 'none' ? null : item.value)}
                    />
                    <View style={styles.editActions}>
                      <TouchableOpacity onPress={handleUpdate}>
                        <Text style={styles.saveAction}>Save</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setEditingId(null)}>
                        <Text style={styles.cancelAction}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <>
                    <View style={styles.catInfo}>
                      <Text style={styles.catName}>{parent.name}</Text>
                      <Text style={styles.catCount}>{parent.questions.length} questions</Text>
                    </View>
                    {!isSystemContent(parent.userId) && (
                      <View style={styles.actions}>
                        <TouchableOpacity onPress={() => { 
                          setEditingId(parent.id); 
                          setEditName(parent.name);
                          setEditParentId(parent.parentId || null);
                        }}>
                          <Text style={styles.editAction}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(parent.id, parent.name)}>
                          <Text style={styles.deleteAction}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                )}
              </View>

              {/* Children Sub-Categories */}
              {parent.children.map(child => (
                <View key={child.id} style={[styles.listItem, styles.childItem]}>
                  {editingId === child.id ? (
                    <View style={styles.editContainer}>
                      <TextInput
                        style={styles.inputSmall}
                        value={editName}
                        onChangeText={setEditName}
                        autoFocus
                      />
                      <Dropdown
                        style={styles.dropdownSmall}
                        data={dropdownData}
                        labelField="label"
                        valueField="value"
                        value={editParentId || 'none'}
                        onChange={item => setEditParentId(item.value === 'none' ? null : item.value)}
                      />
                      <View style={styles.editActions}>
                        <TouchableOpacity onPress={handleUpdate}>
                          <Text style={styles.saveAction}>Save</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setEditingId(null)}>
                          <Text style={styles.cancelAction}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <>
                      <View style={styles.catInfo}>
                        <View style={styles.childRow}>
                          <Text style={styles.childArrow}>↳</Text>
                          <Text style={styles.childName}>{child.name}</Text>
                        </View>
                        <Text style={[styles.catCount, { marginLeft: 20 }]}>{child.questions.length} questions</Text>
                      </View>
                      {!isSystemContent(child.userId) && (
                        <View style={styles.actions}>
                          <TouchableOpacity onPress={() => { 
                            setEditingId(child.id); 
                            setEditName(child.name);
                            setEditParentId(child.parentId || null);
                          }}>
                            <Text style={styles.editAction}>Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDelete(child.id, child.name)}>
                            <Text style={styles.deleteAction}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </>
                  )}
                </View>
              ))}
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
    borderBottomColor: '#E1E4E8',
    alignItems: 'flex-start',
  },
  addInputs: {
    flex: 1,
    gap: 8,
  },
  input: {
    backgroundColor: '#F5F7FA',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    fontSize: 16,
  },
  dropdown: {
    backgroundColor: '#F5F7FA',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DFE6E9',
  },
  placeholderStyle: {
    fontSize: 14,
    color: '#B2BEC3',
  },
  selectedTextStyle: {
    fontSize: 14,
    color: '#2D3436',
  },
  addButton: {
    backgroundColor: '#1a73e8',
    paddingHorizontal: 20,
    height: 50,
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
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F2F6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  childItem: {
    marginLeft: 24,
    backgroundColor: '#F9FAFB',
    borderColor: '#E1E4E8',
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  childArrow: {
    fontSize: 18,
    color: '#B2BEC3',
    fontWeight: '700',
  },
  childName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
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
    color: '#1a73e8',
    fontWeight: '600',
  },
  deleteAction: {
    color: '#FF7675',
    fontWeight: '600',
  },
  editContainer: {
    flex: 1,
    gap: 8,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 4,
  },
  saveAction: {
    color: '#00AAFF',
    fontWeight: '700',
  },
  cancelAction: {
    color: '#636E72',
    fontWeight: '600',
  },
  inputSmall: {
    backgroundColor: '#F5F7FA',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1a73e8',
  },
  dropdownSmall: {
    backgroundColor: '#F5F7FA',
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DFE6E9',
  },
});
