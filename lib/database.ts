import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { Category, Question, Difficulty } from '../types/quiz';

const DATABASE_NAME = 'quiz_yourself.db';

export async function initializeDatabase() {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  // Enable foreign keys
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // 1. Create Tables First (if they don't exist)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      parent_id TEXT,
      is_official INTEGER DEFAULT 0,
      user_modified INTEGER DEFAULT 0,
      FOREIGN KEY (parent_id) REFERENCES categories (id) ON DELETE CASCADE
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY NOT NULL,
      category_id TEXT NOT NULL,
      question TEXT NOT NULL,
      options TEXT NOT NULL, -- JSON string
      correctAnswer TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      shown_count INTEGER DEFAULT 0,
      is_official INTEGER DEFAULT 0,
      user_modified INTEGER DEFAULT 0,
      FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
    );
  `);

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

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS app_metadata (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

  // 2. Run Migrations for existing users
  try {
    const tableInfo = await db.getAllAsync<{ name: string }>('PRAGMA table_info(categories)');
    if (!tableInfo.some(col => col.name === 'parent_id')) {
      await db.execAsync('ALTER TABLE categories ADD COLUMN parent_id TEXT;');
    }
  } catch (e) {
    console.warn('Migration failed for parent_id', e);
  }

  try {
    const tableInfo = await db.getAllAsync<{ name: string }>('PRAGMA table_info(questions)');
    if (!tableInfo.some(col => col.name === 'shown_count')) {
      await db.execAsync('ALTER TABLE questions ADD COLUMN shown_count INTEGER DEFAULT 0;');
    }
  } catch (e) {
    console.warn('Migration failed for shown_count', e);
  }

  try {
    const catInfo = await db.getAllAsync<{ name: string }>('PRAGMA table_info(categories)');
    if (!catInfo.some(col => col.name === 'is_official')) {
      await db.execAsync('ALTER TABLE categories ADD COLUMN is_official INTEGER DEFAULT 0;');
    }
    if (!catInfo.some(col => col.name === 'user_modified')) {
      await db.execAsync('ALTER TABLE categories ADD COLUMN user_modified INTEGER DEFAULT 0;');
    }

    const qInfo = await db.getAllAsync<{ name: string }>('PRAGMA table_info(questions)');
    if (!qInfo.some(col => col.name === 'is_official')) {
      await db.execAsync('ALTER TABLE questions ADD COLUMN is_official INTEGER DEFAULT 0;');
    }
    if (!qInfo.some(col => col.name === 'user_modified')) {
      await db.execAsync('ALTER TABLE questions ADD COLUMN user_modified INTEGER DEFAULT 0;');
    }
  } catch (e) {
    console.warn('Migration failed for official/modified columns', e);
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
  await db.runAsync('UPDATE categories SET name = ?, parent_id = ?, user_modified = 1 WHERE id = ?', [name, parentId || null, id]);
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
    'UPDATE questions SET category_id = ?, question = ?, options = ?, correctAnswer = ?, difficulty = ?, user_modified = 1 WHERE id = ?',
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

export async function applyContentUpdate(providedCategories: Category[], providedVersion: number): Promise<{ newCategories: number; newQuestions: number }> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  // Check current applied version
  const meta = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_metadata WHERE key = 'content_version'"
  );
  const appliedVersion = meta ? parseInt(meta.value) : 0;

  if (appliedVersion >= providedVersion) {
    return { newCategories: 0, newQuestions: 0 };
  }

  let newCategoriesCount = 0;
  let newQuestionsCount = 0;

  for (const cat of providedCategories) {
    // 1. Check/Upsert category
    const existingCat = await db.getFirstAsync<{ user_modified: number }>(
      'SELECT user_modified FROM categories WHERE id = ?', [cat.id]
    );

    if (!existingCat) {
      await db.runAsync(
        'INSERT INTO categories (id, name, parent_id, is_official) VALUES (?, ?, ?, 1)',
        [cat.id, cat.name, cat.parentId || null]
      );
      newCategoriesCount++;
    } else if (existingCat.user_modified === 0) {
      await db.runAsync(
        'UPDATE categories SET name = ?, parent_id = ? WHERE id = ?',
        [cat.name, cat.parentId || null, cat.id]
      );
    }

    // 2. Check/Upsert questions
    for (const q of cat.questions) {
      const existingQ = await db.getFirstAsync<{ user_modified: number }>(
        'SELECT user_modified FROM questions WHERE id = ?', [q.id]
      );

      if (!existingQ) {
        await db.runAsync(
          'INSERT INTO questions (id, category_id, question, options, correctAnswer, difficulty, is_official) VALUES (?, ?, ?, ?, ?, ?, 1)',
          [q.id, cat.id, q.question, JSON.stringify(q.options), q.correctAnswer, q.difficulty]
        );
        newQuestionsCount++;
      } else if (existingQ.user_modified === 0) {
        await db.runAsync(
          'UPDATE questions SET category_id = ?, question = ?, options = ?, correctAnswer = ?, difficulty = ? WHERE id = ?',
          [cat.id, q.question, JSON.stringify(q.options), q.correctAnswer, q.difficulty, q.id]
        );
      }
    }
  }

  // 3. Prune official content that is no longer in the set
  const allIdsCat = providedCategories.map(c => c.id);
  const allIdsQuestion = providedCategories.flatMap(c => c.questions.map(q => q.id));

  const officialCats = await db.getAllAsync<{ id: string }>('SELECT id FROM categories WHERE is_official = 1 AND user_modified = 0');
  for (const cat of officialCats) {
    if (!allIdsCat.includes(cat.id)) {
      await db.runAsync('DELETE FROM categories WHERE id = ?', [cat.id]);
    }
  }

  const officialQs = await db.getAllAsync<{ id: string }>('SELECT id FROM questions WHERE is_official = 1 AND user_modified = 0');
  for (const q of officialQs) {
    if (!allIdsQuestion.includes(q.id)) {
      await db.runAsync('DELETE FROM questions WHERE id = ?', [q.id]);
    }
  }

  // Update version
  await db.runAsync(
    "INSERT OR REPLACE INTO app_metadata (key, value) VALUES (?, ?)",
    ['content_version', String(providedVersion)]
  );

  return { newCategories: newCategoriesCount, newQuestions: newQuestionsCount };
}

export async function getContentVersion(): Promise<number> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  const result = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_metadata WHERE key = 'content_version'"
  );
  return result ? parseInt(result.value) : 0;
}
