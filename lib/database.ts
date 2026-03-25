import * as SQLite from 'expo-sqlite';
import { CATEGORIES } from '../constants/data';
import { Category, Question, Difficulty } from '../types/quiz';

const DATABASE_NAME = 'quiz_yourself.db';

export async function initializeDatabase() {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  // Create Categories table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL
    );
  `);

  // Create Questions table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY NOT NULL,
      category_id TEXT NOT NULL,
      question TEXT NOT NULL,
      options TEXT NOT NULL, -- JSON string
      correctAnswer TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
    );
  `);

  // Create Quiz History table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS quiz_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      mode TEXT NOT NULL,
      category_id TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      player_count INTEGER NOT NULL,
      score_data TEXT NOT NULL -- JSON string of player scores
    );
  `);

  // Seed data if empty
  const categoryCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM categories');
  
  if (categoryCount?.count === 0) {
    console.log('Seeding initial data...');
    for (const cat of CATEGORIES) {
      await db.runAsync('INSERT INTO categories (id, name) VALUES (?, ?)', [cat.id, cat.name]);
      for (const q of cat.questions) {
        await db.runAsync(
          'INSERT INTO questions (id, category_id, question, options, correctAnswer, difficulty) VALUES (?, ?, ?, ?, ?, ?)',
          [q.id, cat.id, q.question, JSON.stringify(q.options), q.correctAnswer, q.difficulty]
        );
      }
    }
    console.log('Seeding complete.');
  }

  return db;
}

export async function getCategories(): Promise<Category[]> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  const rows = await db.getAllAsync<{ id: string, name: string }>('SELECT * FROM categories');
  
  const categories: Category[] = [];
  for (const row of rows) {
    const questionsRows = await db.getAllAsync<{
      id: string,
      question: string,
      options: string,
      correctAnswer: string,
      difficulty: string
    }>('SELECT * FROM questions WHERE category_id = ?', [row.id]);

    const questions: Question[] = questionsRows.map(q => ({
      ...q,
      options: JSON.parse(q.options),
      difficulty: q.difficulty as Difficulty
    }));

    categories.push({
      id: row.id,
      name: row.name,
      questions
    });
  }
  
  return categories;
}

export async function addQuestion(question: Omit<Question, 'id'>, categoryId: string) {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  const id = Math.random().toString(36).substr(2, 9);
  await db.runAsync(
    'INSERT INTO questions (id, category_id, question, options, correctAnswer, difficulty) VALUES (?, ?, ?, ?, ?, ?)',
    [id, categoryId, question.question, JSON.stringify(question.options), question.correctAnswer, question.difficulty]
  );
}

export async function saveQuizResult(mode: string, categoryId: string, difficulty: string, playerCount: number, scores: any[]) {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  const date = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO quiz_history (date, mode, category_id, difficulty, player_count, score_data) VALUES (?, ?, ?, ?, ?, ?)',
    [date, mode, categoryId, difficulty, playerCount, JSON.stringify(scores)]
  );
}
