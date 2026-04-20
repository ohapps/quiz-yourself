import { atom } from 'jotai';
import { QuizConfig, QuizState } from '../types/quiz';

export const quizConfigAtom = atom<QuizConfig>({
  mode: 'solo',
  category: null,
  difficulty: 'Easy',
  questionCount: 20,
  playerCount: 1,
  playerNames: ['Player 1', 'Player 2', 'Player 3', 'Player 4'],
});

export const quizStateAtom = atom<QuizState>({
  currentQuestionIndex: 0,
  playerScores: [],
  isFinished: false,
  questions: [],
});

export const updateResultAtom = atom<{ newCategories: number; newQuestions: number } | null>(null);
