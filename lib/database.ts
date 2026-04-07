import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { CATEGORIES } from '../constants/data';
import { Category, Question, Difficulty } from '../types/quiz';

const DATABASE_NAME = 'quiz_yourself.db';

export async function initializeDatabase() {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  // Enable foreign keys
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Migration: Add parent_id to categories if it doesn't exist
  try {
    const tableInfo = await db.getAllAsync<{ name: string }>('PRAGMA table_info(categories)');
    const hasParentId = tableInfo.some(col => col.name === 'parent_id');
    if (!hasParentId) {
      await db.execAsync('ALTER TABLE categories ADD COLUMN parent_id TEXT;');
    }
  } catch (e) {
    console.warn('Migration failed or table not yet created', e);
  }

  // Migration: Add shown_count to questions if it doesn't exist
  try {
    const tableInfo = await db.getAllAsync<{ name: string }>('PRAGMA table_info(questions)');
    const hasShownCount = tableInfo.some(col => col.name === 'shown_count');
    if (!hasShownCount) {
      await db.execAsync('ALTER TABLE questions ADD COLUMN shown_count INTEGER DEFAULT 0;');
    }
  } catch (e) {
    console.warn('Migration failed or table not yet created', e);
  }

  // Create Categories table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      parent_id TEXT,
      FOREIGN KEY (parent_id) REFERENCES categories (id) ON DELETE CASCADE
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
      shown_count INTEGER DEFAULT 0,
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

// Categories CRUD
export async function getCategories(): Promise<Category[]> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  const rows = await db.getAllAsync<{ id: string, name: string, parent_id: string | null }>('SELECT * FROM categories');
  
  const categories: Category[] = [];
  for (const row of rows) {
    const questionsRows = await db.getAllAsync<{
      id: string,
      question: string,
      options: string,
      correctAnswer: string,
      difficulty: string,
      shown_count: number
    }>('SELECT * FROM questions WHERE category_id = ?', [row.id]);

    const questions: Question[] = questionsRows.map(q => ({
      ...q,
      options: JSON.parse(q.options),
      difficulty: q.difficulty as Difficulty,
      shownCount: q.shown_count
    }));

    categories.push({
      id: row.id,
      name: row.name,
      parentId: row.parent_id || undefined,
      questions
    });
  }
  
  return categories;
}

export async function addCategory(name: string, parentId?: string) {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  const id = Crypto.randomUUID();
  await db.runAsync('INSERT INTO categories (id, name, parent_id) VALUES (?, ?, ?)', [id, name, parentId || null]);
  return id;
}

export async function updateCategory(id: string, name: string, parentId?: string) {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.runAsync('UPDATE categories SET name = ?, parent_id = ? WHERE id = ?', [name, parentId || null, id]);
}

export async function deleteCategory(id: string) {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
}

// Questions CRUD
export async function getQuestion(id: string): Promise<Question | null> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  const result = await db.getFirstAsync<{
    id: string,
    question: string,
    options: string,
    correctAnswer: string,
    difficulty: string,
    category_id: string,
    shown_count: number
  }>('SELECT * FROM questions WHERE id = ?', [id]);

  if (!result) return null;

  return {
    ...result,
    options: JSON.parse(result.options),
    difficulty: result.difficulty as Difficulty,
    shownCount: result.shown_count
  } as any;
}

export async function getQuestions(categoryId?: string, difficulty?: string): Promise<Question[]> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  let query = 'SELECT * FROM questions';
  const params: any[] = [];

  if (categoryId || difficulty) {
    query += ' WHERE ';
    const conditions = [];
    if (categoryId) {
      conditions.push('category_id IN (SELECT id FROM categories WHERE id = ? OR parent_id = ?)');
      params.push(categoryId, categoryId);
    }
    if (difficulty) {
      conditions.push('difficulty = ?');
      params.push(difficulty);
    }
    query += conditions.join(' AND ');
  }

  const rows = await db.getAllAsync<{
    id: string,
    question: string,
    options: string,
    correctAnswer: string,
    difficulty: string,
    category_id: string,
    shown_count: number
  }>(query, params);

  return rows.map(q => ({
    ...q,
    options: JSON.parse(q.options),
    difficulty: q.difficulty as Difficulty,
    shownCount: q.shown_count
  }));
}

export async function addQuestion(question: Omit<Question, 'id'>, categoryId: string) {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  const id = Crypto.randomUUID();
  await db.runAsync(
    'INSERT INTO questions (id, category_id, question, options, correctAnswer, difficulty) VALUES (?, ?, ?, ?, ?, ?)',
    [id, categoryId, question.question, JSON.stringify(question.options), question.correctAnswer, question.difficulty]
  );
  return id;
}

export async function updateQuestion(id: string, question: Omit<Question, 'id'>, categoryId: string) {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.runAsync(
    'UPDATE questions SET category_id = ?, question = ?, options = ?, correctAnswer = ?, difficulty = ? WHERE id = ?',
    [categoryId, question.question, JSON.stringify(question.options), question.correctAnswer, question.difficulty, id]
  );
}

export async function deleteQuestion(id: string) {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.runAsync('DELETE FROM questions WHERE id = ?', [id]);
}

// History
export async function saveQuizResult(mode: string, categoryId: string, difficulty: string, playerCount: number, scores: any[]) {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  const date = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO quiz_history (date, mode, category_id, difficulty, player_count, score_data) VALUES (?, ?, ?, ?, ?, ?)',
    [date, mode, categoryId, difficulty, playerCount, JSON.stringify(scores)]
  );
}

export async function getQuizHistory() {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  return db.getAllAsync<{
    id: number,
    date: string,
    mode: string,
    category_name: string,
    difficulty: string,
    player_count: number,
    score_data: string
  }>(`
    SELECT h.*, c.name as category_name 
    FROM quiz_history h
    LEFT JOIN categories c ON h.category_id = c.id
    ORDER BY date DESC
  `);
}

export async function clearQuizHistory() {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.runAsync('DELETE FROM quiz_history');
}

export async function resetDatabase() {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.execAsync('DROP TABLE IF EXISTS questions;');
  await db.execAsync('DROP TABLE IF EXISTS categories;');
  await db.execAsync('DROP TABLE IF EXISTS quiz_history;');
  await initializeDatabase();
}

export async function markQuestionsAsShown(ids: string[]) {
  if (ids.length === 0) return;
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(
    `UPDATE questions SET shown_count = COALESCE(shown_count, 0) + 1 WHERE id IN (${placeholders})`,
    ids
  );
}
