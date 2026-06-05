import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface NumericEntryProps {
  typedAnswer: string;
  submittedAnswer: string | null;
  showResult: boolean;
  correctAnswer: string;
  onDigitPress: (digit: string) => void;
  onBackspace: () => void;
}

export function NumericEntry({
  typedAnswer,
  submittedAnswer,
  showResult,
  correctAnswer,
  onDigitPress,
  onBackspace,
}: NumericEntryProps) {
  const isCorrect = showResult && (submittedAnswer || '').trim().toLowerCase() === correctAnswer.trim().toLowerCase();

  return (
    <>
      <View style={styles.numpadDisplay}>
        <Text style={styles.numpadDisplayText}>{typedAnswer || '0'}</Text>
      </View>
      {showResult ? (
        <View style={[styles.feedbackBox, isCorrect ? styles.feedbackBoxCorrect : styles.feedbackBoxWrong]}>
          <Text style={styles.feedbackLabel}>{isCorrect ? '✨ Correct!' : '❌ Incorrect'}</Text>
          {!isCorrect && (
            <Text style={styles.feedbackCorrectText}>Correct Answer: {correctAnswer}</Text>
          )}
        </View>
      ) : (
        <View style={styles.numpadGrid}>
          {['1','2','3','4','5','6','7','8','9'].map((digit) => (
            <TouchableOpacity key={digit} style={styles.numpadButton} onPress={() => onDigitPress(digit)}>
              <Text style={styles.numpadButtonText}>{digit}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.numpadButton} onPress={() => onDigitPress('.')}>
            <Text style={styles.numpadButtonText}>.</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.numpadButton} onPress={() => onDigitPress('0')}>
            <Text style={styles.numpadButtonText}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.numpadButton} onPress={onBackspace}>
            <Text style={styles.numpadButtonText}>⌫</Text>
          </TouchableOpacity>
        </View>
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
  feedbackBox: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 16,
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 24,
    fontWeight: '800',
    color: '#2D3436',
    marginBottom: 8,
    textAlign: 'center',
  },
  feedbackCorrectText: {
    fontSize: 18,
    color: '#C5221F',
    fontWeight: '700',
    textAlign: 'center',
  },
});
