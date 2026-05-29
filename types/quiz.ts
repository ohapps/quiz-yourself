export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type QuestionType = 'multiple_choice' | 'numeric';

export interface Question {
  id: string;
  question: string;
  type?: QuestionType;
  options: string[];
  correctAnswer: string;
  difficulty: Difficulty;
  shownCount?: number;
  imageUrl?: string;
}

export interface Category {
  id: string;
  name: string;
  parentId?: string;
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
