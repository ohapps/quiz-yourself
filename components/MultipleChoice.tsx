import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle, TextStyle } from 'react-native';

interface MultipleChoiceProps {
  options: string[];
  correctAnswer: string;
  selectedOption: string | null;
  showResult: boolean;
  onSelect: (option: string) => void;
}

export function MultipleChoice({
  options,
  correctAnswer,
  selectedOption,
  showResult,
  onSelect,
}: MultipleChoiceProps) {
  return (
    <>
      {options.map((option) => {
        const isCorrect = option === correctAnswer;
        const isSelected = option === selectedOption;

        let optionStyle: StyleProp<ViewStyle> = styles.option;
        let textStyle: StyleProp<TextStyle> = styles.optionText;

        if (showResult) {
          if (isCorrect) {
            optionStyle = [styles.option, styles.optionCorrect];
            textStyle = [styles.optionText, styles.optionTextSelected];
          } else if (isSelected) {
            optionStyle = [styles.option, styles.optionWrong];
            textStyle = [styles.optionText, styles.optionTextSelected];
          }
        } else if (isSelected) {
          optionStyle = [styles.option, styles.optionSelected];
        }

        return (
          <TouchableOpacity
            key={option}
            style={optionStyle}
            onPress={() => onSelect(option)}
            disabled={showResult}
          >
            <Text style={textStyle}>{option}</Text>
          </TouchableOpacity>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  option: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#DFE6E9',
  },
  optionSelected: {
    borderColor: '#1a73e8',
  },
  optionCorrect: {
    borderColor: '#00AAFF',
    backgroundColor: '#00AAFF',
  },
  optionWrong: {
    borderColor: '#FF7675',
    backgroundColor: '#FF7675',
  },
  optionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3436',
  },
  optionTextSelected: {
    color: '#FFFFFF',
  },
});
