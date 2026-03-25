export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  difficulty: Difficulty;
}

export interface Category {
  id: string;
  name: string;
  questions: Question[];
}

export type QuizMode = 'solo' | 'group';

export interface QuizConfig {
  mode: QuizMode;
  category: Category | null;
  difficulty: Difficulty;
  questionCount: number;
  playerCount: number;
  playerNames: string[];
}

export interface PlayerScore {
  id: number;
  name: string;
  score: number;
}

export interface QuizState {
  currentQuestionIndex: number;
  playerScores: PlayerScore[];
  isFinished: boolean;
  questions: Question[];
}
