import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface NumericEntryProps {
  typedAnswer: string;
  submittedAnswer: string | null;
  showResult: boolean;
  correctAnswer: string;
  onDigitPress: (digit: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
}

export function NumericEntry({
  typedAnswer,
  submittedAnswer,
  showResult,
  correctAnswer,
  onDigitPress,
  onBackspace,
  onSubmit,
}: NumericEntryProps) {
  const isCorrect = showResult && (submittedAnswer || '').trim().toLowerCase() === correctAnswer.trim().toLowerCase();

  return (
    <>
      {showResult && (
        <View style={[styles.feedbackBox, isCorrect ? styles.feedbackBoxCorrect : styles.feedbackBoxWrong]}>
          <Text style={styles.feedbackLabel}>{isCorrect ? '✨ Correct!' : '❌ Incorrect'}</Text>
          {!isCorrect && (
            <Text style={styles.feedbackCorrectText}>Correct Answer: {correctAnswer}</Text>
          )}
        </View>
      )}
      <View style={styles.numpadDisplay}>
        <Text style={styles.numpadDisplayText}>{typedAnswer || '0'}</Text>
      </View>
      <View style={styles.numpadGrid}>
        {['1','2','3','4','5','6','7','8','9'].map((digit) => (
          <TouchableOpacity key={digit} style={[styles.numpadButton, showResult && styles.numpadButtonDisabled]} onPress={() => onDigitPress(digit)} disabled={showResult}>
            <Text style={[styles.numpadButtonText, showResult && styles.numpadButtonTextDisabled]}>{digit}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[styles.numpadButton, showResult && styles.numpadButtonDisabled]} onPress={() => onDigitPress('.')} disabled={showResult}>
          <Text style={[styles.numpadButtonText, showResult && styles.numpadButtonTextDisabled]}>.</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.numpadButton, showResult && styles.numpadButtonDisabled]} onPress={() => onDigitPress('0')} disabled={showResult}>
          <Text style={[styles.numpadButtonText, showResult && styles.numpadButtonTextDisabled]}>0</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.numpadButton, showResult && styles.numpadButtonDisabled]} onPress={onBackspace} disabled={showResult}>
          <Text style={[styles.numpadButtonText, showResult && styles.numpadButtonTextDisabled]}>⌫</Text>
        </TouchableOpacity>
      </View>
      {!showResult && (
        <TouchableOpacity style={styles.submitButton} onPress={onSubmit}>
          <Text style={styles.submitButtonText}>Submit Answer</Text>
        </TouchableOpacity>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  numpadDisplay: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#DFE6E9',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  numpadDisplayText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2D3436',
  },
  numpadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  numpadButton: {
    width: '30%',
    height: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#DFE6E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numpadButtonText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D3436',
  },
  numpadButtonDisabled: {
    opacity: 0.4,
  },
  numpadButtonTextDisabled: {
    color: '#636E72',
  },
  submitButton: {
    backgroundColor: '#1a73e8',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#1a73e8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  feedbackBox: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 16,
  },
  feedbackBoxCorrect: {
    backgroundColor: '#E6F4EA',
    borderColor: '#137333',
  },
  feedbackBoxWrong: {
    backgroundColor: '#FCE8E6',
    borderColor: '#C5221F',
  },
  feedbackLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2D3436',
    marginBottom: 8,
  },
  feedbackCorrectText: {
    fontSize: 16,
    color: '#C5221F',
    fontWeight: '700',
  },
});
