import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useAtom } from 'jotai';
import { quizConfigAtom, quizStateAtom } from '../store/atoms';
import { markQuestionsAsShown } from '../lib/database';
import { NumericEntry } from '../components/NumericEntry';
import { MultipleChoice } from '../components/MultipleChoice';

export default function QuizScreen() {
  const router = useRouter();
  const [config] = useAtom(quizConfigAtom);
  const [state, setState] = useAtom(quizStateAtom);

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showGroupOptions, setShowGroupOptions] = useState(true);
  const [showGroupAnswer, setShowGroupAnswer] = useState(true);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [submittedAnswer, setSubmittedAnswer] = useState<string | null>(null);

  // Initialize quiz state
  useEffect(() => {
    if (!config.category) {
      router.replace('/');
      return;
    }

    // Filter by difficulty, then sort by shown count and random
    const filteredByDifficulty = config.category.questions.filter(
      (q) => q.difficulty === config.difficulty
    );
    
    const sortedByShown = filteredByDifficulty.sort((a, b) => {
      const countA = a.shownCount || 0;
      const countB = b.shownCount || 0;
      if (countA !== countB) {
        return countA - countB;
      }
      return 0.5 - Math.random();
    });
    
    const selected = sortedByShown
      .slice(0, config.questionCount)
      .sort(() => 0.5 - Math.random());

    // Update in-memory count and save to database
    selected.forEach(q => {
      q.shownCount = (q.shownCount || 0) + 1;
    });
    markQuestionsAsShown(selected.map(q => q.id)).catch(console.error);

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

  useEffect(() => {
    setTypedAnswer('');
    setSubmittedAnswer(null);
  }, [state.currentQuestionIndex]);

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

  const handleExactAnswerSubmit = (answer: string) => {
    if (showResult) return;
    setSubmittedAnswer(answer);
    setShowResult(true);

    const isCorrect = answer.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase();
    if (isCorrect) {
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
        <View style={styles.headerContent}>
          <View style={styles.headerLeftColumn}>
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

          {config.mode === 'group' && (
            <View style={styles.headerTogglesColumn}>
              <TouchableOpacity 
                style={[
                  styles.headerToggleAnswerButton,
                  showGroupAnswer ? styles.headerToggleAnswerButtonActive : styles.headerToggleAnswerButtonInactive
                ]} 
                onPress={() => setShowGroupAnswer(!showGroupAnswer)}
              >
                <Text style={[
                  styles.headerToggleAnswerText,
                  showGroupAnswer ? styles.headerToggleAnswerTextActive : styles.headerToggleAnswerTextInactive
                ]}>
                  {showGroupAnswer ? 'Answer: Shown' : 'Answer: Hidden'}
                </Text>
              </TouchableOpacity>

              {currentQuestion.type !== 'numeric' && (
                <TouchableOpacity 
                  style={[
                    styles.headerToggleAnswerButton,
                    showGroupOptions ? styles.headerToggleAnswerButtonActive : styles.headerToggleAnswerButtonInactive
                  ]} 
                  onPress={() => setShowGroupOptions(!showGroupOptions)}
                >
                  <Text style={[
                    styles.headerToggleAnswerText,
                    showGroupOptions ? styles.headerToggleAnswerTextActive : styles.headerToggleAnswerTextInactive
                  ]}>
                    {showGroupOptions ? 'Options: Shown' : 'Options: Hidden'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {currentQuestion.imageUrl && (
          <Image 
            source={{ uri: currentQuestion.imageUrl }} 
            style={styles.questionImage} 
            contentFit="contain"
          />
        )}
        <Text style={styles.questionText}>{currentQuestion.question}</Text>

        {config.mode === 'solo' ? (
          currentQuestion.type === 'numeric' ? (
            <View style={styles.optionsContainer}>
              <NumericEntry
                typedAnswer={typedAnswer}
                submittedAnswer={submittedAnswer}
                showResult={showResult}
                correctAnswer={currentQuestion.correctAnswer}
                onDigitPress={(digit) => setTypedAnswer(prev => {
                  if (digit === '.' && prev.includes('.')) return prev;
                  return prev + digit;
                })}
                onBackspace={() => setTypedAnswer(prev => prev.slice(0, -1))}
              />
            </View>
          ) : (
            <View style={styles.optionsContainer}>
              <MultipleChoice
                options={currentQuestion.options}
                correctAnswer={currentQuestion.correctAnswer}
                selectedOption={selectedOption}
                showResult={showResult}
                onSelect={handleSoloAnswer}
              />
            </View>
          )
        ) : (
          <View style={styles.moderatorContainer}>
            {currentQuestion.type !== 'numeric' && showGroupOptions && (
              <View style={styles.groupOptionsContainer}>
                {currentQuestion.options.map((opt, i) => (
                  <View key={i} style={styles.groupOptionItem}>
                    <View style={styles.optionBullet} />
                    <Text style={styles.groupOptionText}>{opt}</Text>
                  </View>
                ))}
              </View>
            )}

            {showGroupAnswer && (
              <View style={styles.answerBox}>
                <Text style={styles.answerLabel}>Correct Answer:</Text>
                <Text style={styles.answerText}>{currentQuestion.correctAnswer}</Text>
              </View>
            )}
            
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

      {((config.mode === 'group' || showResult) || (config.mode === 'solo' && currentQuestion.type === 'numeric' && !showResult)) && (
        <View style={styles.footer}>
          {showResult || config.mode === 'group' ? (
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>
                {state.currentQuestionIndex + 1 === state.questions.length ? 'Finish' : 'Next Question'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.submitButton} onPress={() => handleExactAnswerSubmit(typedAnswer)}>
              <Text style={styles.submitButtonText}>Submit Answer</Text>
            </TouchableOpacity>
          )}
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
    paddingTop: 16,
    paddingHorizontal: 24,
    paddingBottom: 16,
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
  },
  scoresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
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
  groupOptionsContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    gap: 12,
  },
  groupOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1a73e8',
  },
  groupOptionText: {
    fontSize: 16,
    color: '#2D3436',
    fontWeight: '500',
  },
  moderatorContainer: {
    gap: 16,
  },
  headerTogglesColumn: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 6,
  },
  answerBox: {
    backgroundColor: '#E3F2FD',
    padding: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#00AAFF',
  },
  answerLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00AAFF',
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
    backgroundColor: '#1a73e8',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  playerPointButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  questionImage: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    marginBottom: 20,
    backgroundColor: '#E4E7EB',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeftColumn: {
    flex: 1,
    flexDirection: 'column',
    gap: 6,
    marginRight: 16,
  },
  headerToggleAnswerButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  headerToggleAnswerButtonActive: {
    backgroundColor: '#E6F4EA',
  },
  headerToggleAnswerButtonInactive: {
    backgroundColor: '#F1F3F4',
  },
  headerToggleAnswerText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  headerToggleAnswerTextActive: {
    color: '#137333',
  },
  headerToggleAnswerTextInactive: {
    color: '#5F6368',
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
    backgroundColor: '#1A2340',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  submitButton: {
    backgroundColor: '#1a73e8',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
