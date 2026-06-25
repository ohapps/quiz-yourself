import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { Category, Question, Difficulty, QuestionType } from '../types/quiz';
import { powersync } from './powersync/system';
import { getDeviceId } from './device-id';
import { getAuthUserId } from './auth';
import {
  getCategories as psGetCategories,
  getQuestions as psGetQuestions,
  getQuestion as psGetQuestion,
} from './powersync/queries';

const DATABASE_NAME = 'quiz_yourself.db';

/** Returns Auth0 user ID if logged in, otherwise device ID */
async function getCurrentUserId(): Promise<string> {
  const auth0Id = await getAuthUserId();
  return auth0Id || await getDeviceId();
}

// === Local-only database for quiz history ===

export async function initializeDatabase() {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.execAsync('PRAGMA foreign_keys = ON;');

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS quiz_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      mode TEXT NOT NULL,
      category_id TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      player_count INTEGER NOT NULL,
      score_data TEXT NOT NULL
    );
  `);

  return db;
}

// === Synced data — delegated to PowerSync ===

export const getCategories = psGetCategories;
export const getQuestions = psGetQuestions;
export const getQuestion = psGetQuestion;

// === Helpers for ownership ===

export function isSystemContent(userId: string | null | undefined): boolean {
  return !userId;
}

export async function isOwnContent(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const currentId = await getCurrentUserId();
  return userId === currentId;
}

// === Write operations — stamp userId on user-created content ===

export async function addCategory(name: string, parentId?: string) {
  const id = Crypto.randomUUID();
  const userId = await getCurrentUserId();
  await powersync.execute(
    'INSERT INTO Category (id, name, parentId, userId) VALUES (?, ?, ?, ?)',
    [id, name, parentId || null, userId]
  );
  return id;
}

export async function updateCategory(id: string, name: string, parentId?: string) {
  const existing = await powersync.getOptional<{ userId: string | null }>(
    'SELECT userId FROM Category WHERE id = ?', [id]
  );
  if (isSystemContent(existing?.userId)) return;
  await powersync.execute(
    'UPDATE Category SET name = ?, parentId = ? WHERE id = ?',
    [name, parentId || null, id]
  );
}

export async function deleteCategory(id: string) {
  const existing = await powersync.getOptional<{ userId: string | null }>(
    'SELECT userId FROM Category WHERE id = ?', [id]
  );
  if (isSystemContent(existing?.userId)) return;
  await powersync.execute('DELETE FROM Category WHERE id = ?', [id]);
}

export async function addQuestion(question: Omit<Question, 'id'>, categoryId: string) {
  const id = Crypto.randomUUID();
  const userId = await getCurrentUserId();
  await powersync.execute(
    'INSERT INTO Question (id, categoryId, question, options, correctAnswer, difficulty, imageUrl, type, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, categoryId, question.question, JSON.stringify(question.options), question.correctAnswer, question.difficulty, question.imageUrl || null, question.type || 'multiple_choice', userId]
  );
  return id;
}

export async function updateQuestion(id: string, question: Omit<Question, 'id'>, categoryId: string) {
  const existing = await powersync.getOptional<{ userId: string | null }>(
    'SELECT userId FROM Question WHERE id = ?', [id]
  );
  if (isSystemContent(existing?.userId)) return;
  await powersync.execute(
    'UPDATE Question SET categoryId = ?, question = ?, options = ?, correctAnswer = ?, difficulty = ?, imageUrl = ?, type = ? WHERE id = ?',
    [categoryId, question.question, JSON.stringify(question.options), question.correctAnswer, question.difficulty, question.imageUrl || null, question.type || 'multiple_choice', id]
  );
}

export async function deleteQuestion(id: string) {
  const existing = await powersync.getOptional<{ userId: string | null }>(
    'SELECT userId FROM Question WHERE id = ?', [id]
  );
  if (isSystemContent(existing?.userId)) return;
  await powersync.execute('DELETE FROM Question WHERE id = ?', [id]);
}

export async function markQuestionsAsShown(ids: string[]) {
  if (ids.length === 0) return;
  for (const id of ids) {
    await powersync.execute(
      'UPDATE Question SET shownCount = COALESCE(shownCount, 0) + 1 WHERE id = ?',
      [id]
    );
  }
}

// === Local-only operations (quiz history) ===

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
  const rows = await db.getAllAsync<{
    id: number;
    date: string;
    mode: string;
    category_id: string;
    difficulty: string;
    player_count: number;
    score_data: string;
  }>('SELECT * FROM quiz_history ORDER BY date DESC');

  const result = [];
  for (const row of rows) {
    const cat = await powersync.getOptional<{ name: string }>(
      'SELECT name FROM Category WHERE id = ?',
      [row.category_id]
    );
    result.push({ ...row, category_name: cat?.name ?? 'Unknown' });
  }
  return result;
}

export async function clearQuizHistory() {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.runAsync('DELETE FROM quiz_history');
}

export async function resetDatabase() {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.execAsync('DROP TABLE IF EXISTS quiz_history;');
  await initializeDatabase();

  // Delete all user-created content (leaves system content intact)
  const userId = await getCurrentUserId();
  await powersync.execute('DELETE FROM Question WHERE userId = ?', [userId]);
  await powersync.execute('DELETE FROM Category WHERE userId = ?', [userId]);
}

export async function applyContentUpdate(_categories: Category[], _version: number) {
  return { newCategories: 0, newQuestions: 0 };
}

// === Favorites ===

export async function getFavoriteCategories(): Promise<Category[]> {
  const userId = await getCurrentUserId();
  const favs = await powersync.getAll<{ categoryId: string }>(
    'SELECT categoryId FROM Favorite WHERE userId = ?',
    [userId]
  );
  if (favs.length === 0) return [];

  const ids = favs.map(f => f.categoryId);
  const placeholders = ids.map(() => '?').join(',');
  const cats = await powersync.getAll<{
    id: string; name: string; parentId: string | null; userId: string | null;
  }>(`SELECT id, name, parentId, userId FROM Category WHERE id IN (${placeholders}) ORDER BY name`, ids);

  return cats.map(c => ({ id: c.id, name: c.name, parentId: c.parentId || undefined, userId: c.userId || undefined, questions: [] }));
}

export async function isFavorite(categoryId: string): Promise<boolean> {
  const userId = await getCurrentUserId();
  const row = await powersync.getOptional(
    'SELECT id FROM Favorite WHERE userId = ? AND categoryId = ?',
    [userId, categoryId]
  );
  return !!row;
}

export async function toggleFavorite(categoryId: string): Promise<boolean> {
  const userId = await getCurrentUserId();
  const existing = await powersync.getOptional<{ id: string }>(
    'SELECT id FROM Favorite WHERE userId = ? AND categoryId = ?',
    [userId, categoryId]
  );

  if (existing) {
    await powersync.execute('DELETE FROM Favorite WHERE id = ?', [existing.id]);
    return false;
  } else {
    const id = Crypto.randomUUID();
    await powersync.execute(
      'INSERT INTO Favorite (id, userId, categoryId) VALUES (?, ?, ?)',
      [id, userId, categoryId]
    );
    return true;
  }
}
