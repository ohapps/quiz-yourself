import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import * as Crypto from 'expo-crypto';
import { powersync } from '../lib/powersync/system';
import { getDeviceId } from '../lib/device-id';
import { getAuthUserId } from '../lib/auth';

interface ReportModalProps {
  visible: boolean;
  questionId: string;
  onClose: () => void;
}

export function ReportModal({ visible, questionId, onClose }: ReportModalProps) {
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please describe the issue.');
      return;
    }

    setSubmitting(true);
    try {
      const userId = (await getAuthUserId()) || (await getDeviceId());
      await powersync.execute(
        'INSERT INTO QuestionReport (id, questionId, userId, description, createdAt, resolved) VALUES (?, ?, ?, ?, ?, ?)',
        [Crypto.randomUUID(), questionId, userId, description.trim(), new Date().toISOString(), 0]
      );
      Alert.alert('Thanks!', 'Your report has been submitted.');
      setDescription('');
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Report an Issue</Text>
          <Text style={styles.subtitle}>What's wrong with this question?</Text>
          <TextInput
            style={styles.input}
            placeholder="Describe the problem..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={submitting}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.submitText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    padding: 12,
    fontSize: 15,
    minHeight: 80,
    marginBottom: 16,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F5F7FA',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#636E72',
  },
  submitButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#1a73e8',
    alignItems: 'center',
  },
  submitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
});
