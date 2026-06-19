import { powersync } from './system';
import { Category, Question, Difficulty, QuestionType } from '../../types/quiz';

export async function getCategories(): Promise<Category[]> {
  const cats = await powersync.getAll<{
    id: string;
    name: string;
    parentId: string | null;
    userId: string | null;
  }>('SELECT id, name, parentId, userId FROM Category');

  const result: Category[] = [];
  for (const cat of cats) {
    const questions = await powersync.getAll<{
      id: string;
      question: string;
      options: string;
      correctAnswer: string;
      difficulty: string;
      shownCount: number;
      imageUrl: string | null;
      type: string | null;
      userId: string | null;
    }>('SELECT * FROM Question WHERE categoryId = ?', [cat.id]);

    result.push({
      id: cat.id,
      name: cat.name,
      parentId: cat.parentId || undefined,
      userId: cat.userId || undefined,
      questions: questions.map((q) => ({
        id: q.id,
        question: q.question,
        options: parseOptions(q.options),
        correctAnswer: q.correctAnswer,
        difficulty: q.difficulty as Difficulty,
        shownCount: q.shownCount,
        imageUrl: q.imageUrl || undefined,
        type: (q.type as QuestionType) || 'multiple_choice',
        userId: q.userId || undefined,
      })),
    });
  }
  return result;
}

export async function getQuestions(
  categoryId?: string,
  difficulty?: string
): Promise<Question[]> {
  let query = 'SELECT * FROM Question';
  const params: string[] = [];

  if (categoryId || difficulty) {
    const conditions: string[] = [];
    if (categoryId) {
      conditions.push('(categoryId = ? OR categoryId IN (SELECT id FROM Category WHERE parentId = ?))');
      params.push(categoryId, categoryId);
    }
    if (difficulty) {
      conditions.push('difficulty = ?');
      params.push(difficulty);
    }
    query += ' WHERE ' + conditions.join(' AND ');
  }

  const rows = await powersync.getAll<{
    id: string;
    question: string;
    options: string;
    correctAnswer: string;
    difficulty: string;
    categoryId: string;
    shownCount: number;
    imageUrl: string | null;
    type: string | null;
    userId: string | null;
  }>(query, params);

  return rows.map((q) => ({
    id: q.id,
    question: q.question,
    options: parseOptions(q.options),
    correctAnswer: q.correctAnswer,
    difficulty: q.difficulty as Difficulty,
    shownCount: q.shownCount,
    imageUrl: q.imageUrl || undefined,
    type: (q.type as QuestionType) || 'multiple_choice',
    userId: q.userId || undefined,
  }));
}

export async function getQuestion(id: string): Promise<Question | null> {
  const q = await powersync.getOptional<{
    id: string;
    question: string;
    options: string;
    correctAnswer: string;
    difficulty: string;
    categoryId: string;
    shownCount: number;
    imageUrl: string | null;
    type: string | null;
    userId: string | null;
  }>('SELECT * FROM Question WHERE id = ?', [id]);

  if (!q) return null;

  return {
    id: q.id,
    question: q.question,
    options: parseOptions(q.options),
    correctAnswer: q.correctAnswer,
    difficulty: q.difficulty as Difficulty,
    shownCount: q.shownCount,
    imageUrl: q.imageUrl || undefined,
    type: (q.type as QuestionType) || 'multiple_choice',
    userId: q.userId || undefined,
  };
}

function parseOptions(raw: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  if (raw.startsWith('{') && raw.endsWith('}')) {
    return raw.slice(1, -1).split(',').map((s) => s.replace(/^"|"$/g, ''));
  }
  return [raw];
}
