import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { CATEGORIES } from '../constants/data';
import { Category, Question, Difficulty } from '../types/quiz';

const DATABASE_NAME = 'quiz_yourself.db';

export async function initializeDatabase() {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  // Enable foreign keys
  await db.execAsync('PRAGMA foreign_keys = ON;');

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

// Categories CRUD
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

export async function addCategory(name: string) {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  const id = Crypto.randomUUID();
  await db.runAsync('INSERT INTO categories (id, name) VALUES (?, ?)', [id, name]);
  return id;
}

export async function updateCategory(id: string, name: string) {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.runAsync('UPDATE categories SET name = ? WHERE id = ?', [name, id]);
}

export async function deleteCategory(id: string) {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
}

// Questions CRUD
export async function getQuestions(categoryId?: string, difficulty?: string): Promise<Question[]> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  let query = 'SELECT * FROM questions';
  const params: any[] = [];

  if (categoryId || difficulty) {
    query += ' WHERE ';
    const conditions = [];
    if (categoryId) {
      conditions.push('category_id = ?');
      params.push(categoryId);
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
    category_id: string
  }>(query, params);

  return rows.map(q => ({
    ...q,
    options: JSON.parse(q.options),
    difficulty: q.difficulty as Difficulty
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
