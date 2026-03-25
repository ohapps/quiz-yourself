import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useAtom } from 'jotai';
import { quizConfigAtom, quizStateAtom } from '../store/atoms';

export default function QuizScreen() {
  const router = useRouter();
  const [config] = useAtom(quizConfigAtom);
  const [state, setState] = useAtom(quizStateAtom);

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  // Initialize quiz state
  useEffect(() => {
    if (!config.category) {
      router.replace('/');
      return;
    }

    // Filter by difficulty, then shuffle and pick questions
    const filteredByDifficulty = config.category.questions.filter(
      (q) => q.difficulty === config.difficulty
    );
    
    const shuffled = [...filteredByDifficulty].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, config.questionCount);

    setState({
      currentQuestionIndex: 0,
      playerScores: Array.from({ length: config.playerCount }, (_, i) => ({ 
        id: i + 1, 
        name: config.playerNames[i] || `Player ${i + 1}`,
        score: 0 
      })),
      isFinished: false,
      questions: selected,
    });
  }, []);

  const currentQuestion = state.questions[state.currentQuestionIndex];

  if (!currentQuestion) return null;

  const handleSoloAnswer = (option: string) => {
    if (showResult) return;
    setSelectedOption(option);
    setShowResult(true);

    if (option === currentQuestion.correctAnswer) {
      setState((prev) => ({
        ...prev,
        playerScores: prev.playerScores.map((ps, i) => 
          i === 0 ? { ...ps, score: ps.score + 1 } : ps
        ),
      }));
    }
  };

  const handleGroupPoint = (playerId: number) => {
    setState((prev) => ({
      ...prev,
      playerScores: prev.playerScores.map((ps) =>
        ps.id === playerId ? { ...ps, score: ps.score + 1 } : ps
      ),
    }));
  };

  const handleNext = () => {
    if (state.currentQuestionIndex + 1 < state.questions.length) {
      setState((prev) => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1,
      }));
      setSelectedOption(null);
      setShowResult(false);
    } else {
      setState((prev) => ({ ...prev, isFinished: true }));
      router.push('/results');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.progress}>
          Question {state.currentQuestionIndex + 1} of {state.questions.length}
        </Text>
        {config.mode === 'group' && (
          <View style={styles.scoresRow}>
            {state.playerScores.map((ps) => (
              <Text key={ps.id} style={styles.scoreText}>{ps.name}: {ps.score}</Text>
            ))}
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.questionText}>{currentQuestion.question}</Text>

        {config.mode === 'solo' ? (
          <View style={styles.optionsContainer}>
            {currentQuestion.options.map((option) => {
              const isCorrect = option === currentQuestion.correctAnswer;
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
                  onPress={() => handleSoloAnswer(option)}
                  disabled={showResult}
                >
                  <Text style={textStyle}>{option}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.moderatorContainer}>
            <View style={styles.answerBox}>
              <Text style={styles.answerLabel}>Correct Answer:</Text>
              <Text style={styles.answerText}>{currentQuestion.correctAnswer}</Text>
            </View>
            
            <Text style={styles.label}>Award point to:</Text>
            <View style={styles.playerButtonsGrid}>
              {state.playerScores.map((ps) => (
                <TouchableOpacity
                  key={ps.id}
                  style={styles.playerPointButton}
                  onPress={() => handleGroupPoint(ps.id)}
                >
                  <Text style={styles.playerPointButtonText}>{ps.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {(config.mode === 'group' || showResult) && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>
              {state.currentQuestionIndex + 1 === state.questions.length ? 'Finish' : 'Next Question'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#DFE6E9',
  },
  progress: {
    fontSize: 14,
    fontWeight: '700',
    color: '#636E72',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  scoresRow: {
    flexDirection: 'row',
    gap: 16,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
  },
  content: {
    padding: 24,
    paddingBottom: 100,
  },
  questionText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2D3436',
    marginBottom: 40,
    lineHeight: 36,
  },
  optionsContainer: {
    gap: 16,
  },
  option: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#DFE6E9',
  },
  optionSelected: {
    borderColor: '#6C5CE7',
  },
  optionCorrect: {
    borderColor: '#00B894',
    backgroundColor: '#00B894',
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
  moderatorContainer: {
    gap: 32,
  },
  answerBox: {
    backgroundColor: '#E6FFF9',
    padding: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#00B894',
  },
  answerLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00B894',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  answerText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2D3436',
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    color: '#636E72',
  },
  playerButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  playerPointButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#6C5CE7',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  playerPointButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#DFE6E9',
  },
  nextButton: {
    backgroundColor: '#2D3436',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
