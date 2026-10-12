import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { Category, Question, Difficulty, QuestionType } from '../types/quiz';
import { getDeviceId } from './device-id';
import { getAuthUserId } from './auth';

const DATABASE_NAME = 'quiz_yourself.db';

// === Sync types ===

export type SyncTable = 'Category' | 'Question' | 'Favorite' | 'QuestionReport' | 'QuizHistory';

export interface ServerCategory {
  id: string;
  name: string;
  parentId: string | null;
  userId: string | null;
}

export interface ServerQuestion {
  id: string;
  question: string;
  options: string[] | string | null;
  correctAnswer: string;
  difficulty: string;
  type: string | null;
  shownCount: number | null;
  categoryId: string;
  imageUrl: string | null;
  userId: string | null;
}

export interface ServerFavorite {
  id: string;
  userId: string;
  categoryId: string;
}

export interface ServerReport {
  id: string;
  questionId: string;
  userId: string | null;
  description: string;
  createdAt: string;
  resolved: boolean | number;
}

export interface ServerQuizHistory {
  id: string;
  date: string;
  mode: string;
  categoryId: string;
  difficulty: string;
  playerCount: number;
  scoreData: unknown[] | string | null;
}

export interface ContentSnapshot {
  categories: ServerCategory[];
  questions: ServerQuestion[];
  favorites: ServerFavorite[];
  reports: ServerReport[];
  quizHistory: ServerQuizHistory[];
}

export interface PendingOp {
  id: number;
  table_name: SyncTable;
  op: 'put' | 'delete';
  record_id: string;
  payload: string | null;
  created_at: string;
}

// === Deferred scheduler hook ===
// Registered by lib/sync.ts so local writes can trigger a debounced sync.
// Kept here (rather than importing sync.ts) to avoid a circular import.

let syncScheduler: (() => void) | null = null;

export function registerSyncScheduler(fn: () => void): void {
  syncScheduler = fn;
}

function scheduleSyncIfAvailable(): void {
  if (syncScheduler) syncScheduler();
}

/** Returns Auth0 user ID if logged in, otherwise device ID */
async function getCurrentUserId(): Promise<string> {
  const auth0Id = await getAuthUserId();
  return auth0Id || (await getDeviceId());
}

// === Database setup ===

async function ensureColumn(
  db: SQLite.SQLiteDatabase,
  table: string,
  column: string,
  type: string,
): Promise<void> {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (!columns.some((c) => c.name === column)) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
  }
}

/**
 * One-time repairs for installs created by an early build of the HTTP-sync
 * refactor. Both are no-ops once the current schema is in place:
 *  - `pending_ops.row_id` was renamed to `record_id`.
 *  - `quiz_history.id` was a TEXT primary key; it is now an auto-assigned
 *    INTEGER rowid with the server id kept in `uuid`.
 */
async function migrateLegacyPendingOps(db: SQLite.SQLiteDatabase): Promise<void> {
  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(pending_ops)');
  const names = new Set(columns.map((c) => c.name));
  if (!names.has('record_id') && names.has('row_id')) {
    await db.execAsync('ALTER TABLE pending_ops RENAME COLUMN row_id TO record_id;');
  }
}

async function migrateLegacyQuizHistory(db: SQLite.SQLiteDatabase): Promise<void> {
  const columns = await db.getAllAsync<{ name: string; type: string; pk: number }>(
    'PRAGMA table_info(quiz_history)',
  );
  const idColumn = columns.find((c) => c.name === 'id');
  const idIsRowid =
    !!idColumn && idColumn.pk === 1 && /integer/i.test(idColumn.type || '');
  if (idIsRowid) return;

  const hasUuid = columns.some((c) => c.name === 'uuid');
  const hasUserId = columns.some((c) => c.name === 'user_id');
  const uuidExpr = idColumn ? (hasUuid ? 'COALESCE(uuid, id)' : 'id') : hasUuid ? 'uuid' : 'NULL';
  const userIdExpr = hasUserId ? 'user_id' : 'NULL';

  await db.execAsync(`
    DROP TABLE IF EXISTS quiz_history_legacy;
    ALTER TABLE quiz_history RENAME TO quiz_history_legacy;
    CREATE TABLE quiz_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT,
      user_id TEXT,
      date TEXT NOT NULL,
      mode TEXT NOT NULL,
      category_id TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      player_count INTEGER NOT NULL,
      score_data TEXT NOT NULL
    );
    INSERT INTO quiz_history (uuid, user_id, date, mode, category_id, difficulty, player_count, score_data)
      SELECT ${uuidExpr}, ${userIdExpr}, date, mode, category_id, difficulty, player_count, score_data
      FROM quiz_history_legacy;
    DROP TABLE quiz_history_legacy;
  `);
}

export async function initializeDatabase() {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.execAsync('PRAGMA foreign_keys = ON;');

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS quiz_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT,
      user_id TEXT,
      date TEXT NOT NULL,
      mode TEXT NOT NULL,
      category_id TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      player_count INTEGER NOT NULL,
      score_data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Category (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      parentId TEXT,
      userId TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_category_parent ON Category (parentId);
    CREATE INDEX IF NOT EXISTS idx_category_user ON Category (userId);

    CREATE TABLE IF NOT EXISTS Question (
      id TEXT PRIMARY KEY NOT NULL,
      categoryId TEXT,
      question TEXT NOT NULL,
      options TEXT,
      correctAnswer TEXT,
      difficulty TEXT,
      type TEXT,
      shownCount INTEGER DEFAULT 0,
      imageUrl TEXT,
      userId TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_question_category ON Question (categoryId);
    CREATE INDEX IF NOT EXISTS idx_question_user ON Question (userId);

    CREATE TABLE IF NOT EXISTS Favorite (
      id TEXT PRIMARY KEY NOT NULL,
      userId TEXT NOT NULL,
      categoryId TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_favorite_user ON Favorite (userId);

    CREATE TABLE IF NOT EXISTS QuestionReport (
      id TEXT PRIMARY KEY NOT NULL,
      questionId TEXT NOT NULL,
      userId TEXT,
      description TEXT,
      createdAt TEXT,
      resolved INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS pending_ops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      op TEXT NOT NULL,
      record_id TEXT NOT NULL,
      payload TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Bring pre-sync installs up to date, then index the new column.
  await ensureColumn(db, 'quiz_history', 'uuid', 'TEXT');
  await ensureColumn(db, 'quiz_history', 'user_id', 'TEXT');

  // Repair schemas produced by early builds of the HTTP-sync refactor.
  await migrateLegacyPendingOps(db);
  await migrateLegacyQuizHistory(db);

  await db.execAsync(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_quiz_history_uuid ON quiz_history (uuid);'
  );

  return db;
}

// === Low-level helpers ===

async function getSQLite(): Promise<SQLite.SQLiteDatabase> {
  return SQLite.openDatabaseAsync(DATABASE_NAME);
}

async function getAll<T>(query: string, params: any[] = []): Promise<T[]> {
  const db = await getSQLite();
  return await db.getAllAsync<T>(query, params);
}

async function getOptional<T>(query: string, params: any[] = []): Promise<T | null> {
  const db = await getSQLite();
  return (await db.getFirstAsync<T>(query, params)) || null;
}

async function execute(query: string, params: any[] = []): Promise<void> {
  const db = await getSQLite();
  await db.runAsync(query, params);
}

// === Pending upload queue ===

async function enqueueOp(
  table: SyncTable,
  op: 'put' | 'delete',
  recordId: string,
  payload?: Record<string, unknown>,
): Promise<void> {
  await execute(
    'INSERT INTO pending_ops (table_name, op, record_id, payload, created_at) VALUES (?, ?, ?, ?, ?)',
    [table, op, recordId, payload ? JSON.stringify(payload) : null, new Date().toISOString()],
  );
  scheduleSyncIfAvailable();
}

export async function getPendingOps(): Promise<PendingOp[]> {
  return getAll<PendingOp>(
    'SELECT id, table_name, op, record_id, payload, created_at FROM pending_ops ORDER BY id ASC',
  );
}

export async function deletePendingOp(id: number): Promise<void> {
  await execute('DELETE FROM pending_ops WHERE id = ?', [id]);
}

export async function getPendingOpCount(): Promise<number> {
  const row = await getOptional<{ count: number }>('SELECT COUNT(*) as count FROM pending_ops');
  return row?.count ?? 0;
}

// === Read operations ===

export async function getCategories(): Promise<Category[]> {
  const cats = await getAll<{ id: string; name: string; parentId: string | null; userId: string | null }>('SELECT id, name, parentId, userId FROM Category ORDER BY name');

  const result: Category[] = [];
  for (const cat of cats) {
    const questions = await getAll<{ id: string; question: string; options: string; correctAnswer: string; difficulty: string; shownCount: number; imageUrl: string | null; type: string | null; userId: string | null }>('SELECT * FROM Question WHERE categoryId = ?', [cat.id]);

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

export async function getQuestions(categoryId?: string, difficulty?: string): Promise<Question[]> {
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

  const rows = await getAll<{ id: string; question: string; options: string; correctAnswer: string; difficulty: string; categoryId: string; shownCount: number; imageUrl: string | null; type: string | null; userId: string | null }>(query, params);

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
  const q = await getOptional<{ id: string; question: string; options: string; correctAnswer: string; difficulty: string; categoryId: string; shownCount: number; imageUrl: string | null; type: string | null; userId: string | null }>('SELECT * FROM Question WHERE id = ?', [id]);

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

// === Helpers for ownership ===

export function isSystemContent(userId: string | null | undefined): boolean {
  return !userId;
}

export async function isOwnContent(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const currentId = await getCurrentUserId();
  return userId === currentId;
}

// === Write operations — stamp userId on user-created content and queue for upload ===

export async function addCategory(name: string, parentId?: string) {
  const id = Crypto.randomUUID();
  const userId = await getCurrentUserId();
  const record = { id, name, parentId: parentId || null, userId };
  await execute(
    'INSERT INTO Category (id, name, parentId, userId) VALUES (?, ?, ?, ?)',
    [record.id, record.name, record.parentId, record.userId]
  );
  await enqueueOp('Category', 'put', id, record);
  notifyDataChange('Category');
  return id;
}

export async function updateCategory(id: string, name: string, parentId?: string) {
  const existing = await getOptional<{ userId: string | null }>('SELECT userId FROM Category WHERE id = ?', [id]);
  if (isSystemContent(existing?.userId)) return;
  const record = { id, name, parentId: parentId || null, userId: existing!.userId };
  await execute(
    'UPDATE Category SET name = ?, parentId = ? WHERE id = ?',
    [record.name, record.parentId, id]
  );
  await enqueueOp('Category', 'put', id, record);
  notifyDataChange('Category');
}

export async function deleteCategory(id: string) {
  const existing = await getOptional<{ userId: string | null }>('SELECT userId FROM Category WHERE id = ?', [id]);
  if (isSystemContent(existing?.userId)) return;
  await execute('DELETE FROM Category WHERE id = ?', [id]);
  await enqueueOp('Category', 'delete', id);
  notifyDataChange('Category');
}

export async function addQuestion(question: Omit<Question, 'id'>, categoryId: string) {
  const id = Crypto.randomUUID();
  const userId = await getCurrentUserId();
  const record = {
    id,
    categoryId,
    question: question.question,
    options: question.options,
    correctAnswer: question.correctAnswer,
    difficulty: question.difficulty,
    imageUrl: question.imageUrl || null,
    type: question.type || 'multiple_choice',
    userId,
  };
  await execute(
    'INSERT INTO Question (id, categoryId, question, options, correctAnswer, difficulty, imageUrl, type, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [record.id, record.categoryId, record.question, JSON.stringify(record.options), record.correctAnswer, record.difficulty, record.imageUrl, record.type, record.userId]
  );
  await enqueueOp('Question', 'put', id, record);
  notifyDataChange('Question');
  return id;
}

export async function updateQuestion(id: string, question: Omit<Question, 'id'>, categoryId: string) {
  const existing = await getOptional<{ userId: string | null }>('SELECT userId FROM Question WHERE id = ?', [id]);
  if (isSystemContent(existing?.userId)) return;
  const record = {
    id,
    categoryId,
    question: question.question,
    options: question.options,
    correctAnswer: question.correctAnswer,
    difficulty: question.difficulty,
    imageUrl: question.imageUrl || null,
    type: question.type || 'multiple_choice',
    userId: existing!.userId,
  };
  await execute(
    'UPDATE Question SET categoryId = ?, question = ?, options = ?, correctAnswer = ?, difficulty = ?, imageUrl = ?, type = ? WHERE id = ?',
    [record.categoryId, record.question, JSON.stringify(record.options), record.correctAnswer, record.difficulty, record.imageUrl, record.type, id]
  );
  await enqueueOp('Question', 'put', id, record);
  notifyDataChange('Question');
}

export async function deleteQuestion(id: string) {
  const existing = await getOptional<{ userId: string | null }>('SELECT userId FROM Question WHERE id = ?', [id]);
  if (isSystemContent(existing?.userId)) return;
  await execute('DELETE FROM Question WHERE id = ?', [id]);
  await enqueueOp('Question', 'delete', id);
  notifyDataChange('Question');
}

export async function markQuestionsAsShown(ids: string[]) {
  if (ids.length === 0) return;
  for (const id of ids) {
    await execute(
      'UPDATE Question SET shownCount = COALESCE(shownCount, 0) + 1 WHERE id = ?',
      [id]
    );
  }
  // shownCount is device-local telemetry; not part of the sync contract.
  notifyDataChange('Question');
}

// === Quiz history (local table, synced when signed in) ===

interface QuizHistoryRow {
  id: number;
  uuid: string | null;
  user_id: string | null;
  date: string;
  mode: string;
  category_id: string;
  difficulty: string;
  player_count: number;
  score_data: string;
}

function toScoreDataString(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (raw == null) return '[]';
  return JSON.stringify(raw);
}

export async function saveQuizResult(mode: string, categoryId: string, difficulty: string, playerCount: number, scores: any[]) {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  const date = new Date().toISOString();
  const uuid = Crypto.randomUUID();
  const userId = await getCurrentUserId();
  await db.runAsync(
    'INSERT INTO quiz_history (uuid, user_id, date, mode, category_id, difficulty, player_count, score_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [uuid, userId, date, mode, categoryId, difficulty, playerCount, JSON.stringify(scores)]
  );
  await enqueueOp('QuizHistory', 'put', uuid, {
    id: uuid,
    userId,
    date,
    mode,
    categoryId,
    difficulty,
    playerCount,
    scoreData: scores,
  });
}

export async function getQuizHistory() {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  const rows = await db.getAllAsync<QuizHistoryRow>('SELECT * FROM quiz_history ORDER BY date DESC');

  const result = [];
  for (const row of rows) {
    const cat = await getOptional<{ name: string }>('SELECT name FROM Category WHERE id = ?', [row.category_id]);
    result.push({ ...row, category_name: cat?.name ?? 'Unknown' });
  }
  return result;
}

export async function clearQuizHistory() {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  const rows = await db.getAllAsync<{ uuid: string | null }>('SELECT uuid FROM quiz_history');
  await db.runAsync('DELETE FROM quiz_history');
  for (const row of rows) {
    if (row.uuid) await enqueueOp('QuizHistory', 'delete', row.uuid);
  }
  notifyDataChange('QuizHistory');
}

export async function resetDatabase() {
  const userId = await getCurrentUserId();

  // Capture what we're about to remove so the deletes can be synced to the cloud.
  const categories = await getAll<{ id: string }>('SELECT id FROM Category WHERE userId = ?', [userId]);
  const questions = await getAll<{ id: string }>('SELECT id FROM Question WHERE userId = ?', [userId]);
  const favorites = await getAll<{ id: string }>('SELECT id FROM Favorite WHERE userId = ?', [userId]);

  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  const historyRows = await db.getAllAsync<{ uuid: string | null }>('SELECT uuid FROM quiz_history');

  // Drop any stale queued writes before queueing the deletes.
  await execute('DELETE FROM pending_ops');

  // Delete all user-created content (leaves system content intact)
  await execute('DELETE FROM Question WHERE userId = ?', [userId]);
  await execute('DELETE FROM Category WHERE userId = ?', [userId]);
  await execute('DELETE FROM Favorite WHERE userId = ?', [userId]);
  await execute('DELETE FROM QuestionReport WHERE userId = ?', [userId]);
  await db.runAsync('DELETE FROM quiz_history');

  for (const c of categories) await enqueueOp('Category', 'delete', c.id);
  for (const q of questions) await enqueueOp('Question', 'delete', q.id);
  for (const f of favorites) await enqueueOp('Favorite', 'delete', f.id);
  for (const h of historyRows) {
    if (h.uuid) await enqueueOp('QuizHistory', 'delete', h.uuid);
  }

  notifyDataChange('Question');
  notifyDataChange('Category');
  notifyDataChange('Favorite');
  notifyDataChange('QuestionReport');
  notifyDataChange('QuizHistory');
}

// === Favorites ===

export async function getFavoriteCategories(): Promise<Category[]> {
  const userId = await getCurrentUserId();
  const favs = await getAll<{ categoryId: string }>('SELECT categoryId FROM Favorite WHERE userId = ?', [userId]);
  if (favs.length === 0) return [];

  const ids = favs.map(f => f.categoryId);
  const placeholders = ids.map(() => '?').join(',');
  const cats = await getAll<{
    id: string; name: string; parentId: string | null; userId: string | null;
  }>(`SELECT id, name, parentId, userId FROM Category WHERE id IN (${placeholders}) ORDER BY name`, ids);

  return cats.map(c => ({ id: c.id, name: c.name, parentId: c.parentId || undefined, userId: c.userId || undefined, questions: [] }));
}

export async function isFavorite(categoryId: string): Promise<boolean> {
  const userId = await getCurrentUserId();
  const row = await getOptional(
    'SELECT id FROM Favorite WHERE userId = ? AND categoryId = ?',
    [userId, categoryId]
  );
  return !!row;
}

export async function toggleFavorite(categoryId: string): Promise<boolean> {
  const userId = await getCurrentUserId();
  const existing = await getOptional<{ id: string }>('SELECT id FROM Favorite WHERE userId = ? AND categoryId = ?',
    [userId, categoryId]
  );

  if (existing) {
    await execute('DELETE FROM Favorite WHERE id = ?', [existing.id]);
    await enqueueOp('Favorite', 'delete', existing.id);
    notifyDataChange('Favorite');
    return false;
  } else {
    const id = Crypto.randomUUID();
    await execute('INSERT INTO Favorite (id, userId, categoryId) VALUES (?, ?, ?)',
      [id, userId, categoryId]
    );
    await enqueueOp('Favorite', 'put', id, { id, userId, categoryId });
    notifyDataChange('Favorite');
    return true;
  }
}

export async function addQuestionReport(questionId: string, description: string): Promise<void> {
  const userId = await getCurrentUserId();
  const id = Crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const record = { id, questionId, userId, description, createdAt, resolved: 0 };
  await execute(
    'INSERT INTO QuestionReport (id, questionId, userId, description, createdAt, resolved) VALUES (?, ?, ?, ?, ?, ?)',
    [id, questionId, userId, description, createdAt, 0]
  );
  await enqueueOp('QuestionReport', 'put', id, record);
  notifyDataChange('QuestionReport');
}

export async function hasSyncedContent(): Promise<boolean> {
  const categoryCount = await getOptional<{ count: number }>('SELECT COUNT(*) as count FROM Category');
  const questionCount = await getOptional<{ count: number }>('SELECT COUNT(*) as count FROM Question');
  return (categoryCount?.count ?? 0) > 0 || (questionCount?.count ?? 0) > 0;
}

// === Applying a server snapshot ===

function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ');
}

interface OwnershipFilter {
  clause: string;
  params: string[];
}

/**
 * Upsert the server's rows for a table and remove stale server-owned rows.
 * Rows with pending local edits are preserved so unsynced changes aren't lost.
 */
async function applyTable(
  db: SQLite.SQLiteDatabase,
  table: SyncTable,
  columns: string[],
  serverRows: Array<Record<string, unknown>>,
  ownership: OwnershipFilter,
  pendingPuts: Set<string>,
  pendingDeletes: Set<string>,
): Promise<void> {
  for (const row of serverRows) {
    const id = String(row.id);
    if (pendingDeletes.has(id) || pendingPuts.has(id)) continue;
    const values = columns.map((c): any => row[c] ?? null);
    await db.runAsync(
      `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders(columns.length)})`,
      values,
    );
  }

  // Remove server-owned rows that no longer exist upstream, preserving local edits.
  const localRows = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM ${table} WHERE (${ownership.clause})`,
    ownership.params,
  );
  const keep = new Set<string>([...serverRows.map((r) => String(r.id)), ...pendingPuts]);
  const stale = localRows.map((r) => String(r.id)).filter((id) => !keep.has(id));
  for (let i = 0; i < stale.length; i += 400) {
    const batch = stale.slice(i, i + 400);
    await db.runAsync(`DELETE FROM ${table} WHERE id IN (${placeholders(batch.length)})`, batch);
  }
}

/** Quiz history lives in its own local table shape, so it gets bespoke handling. */
async function applyQuizHistory(
  db: SQLite.SQLiteDatabase,
  serverRows: ServerQuizHistory[],
  authUserId: string,
  pendingPuts: Set<string>,
  pendingDeletes: Set<string>,
): Promise<void> {
  for (const row of serverRows) {
    const id = String(row.id);
    if (pendingDeletes.has(id) || pendingPuts.has(id)) continue;
    await db.runAsync(
      `INSERT OR REPLACE INTO quiz_history (uuid, user_id, date, mode, category_id, difficulty, player_count, score_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, authUserId, row.date, row.mode, row.categoryId, row.difficulty, row.playerCount, toScoreDataString(row.scoreData)],
    );
  }

  // Only remove synced rows for this user; local-only rows (uuid NULL) are kept.
  const localRows = await db.getAllAsync<{ uuid: string | null }>(
    'SELECT uuid FROM quiz_history WHERE user_id = ? AND uuid IS NOT NULL',
    [authUserId],
  );
  const keep = new Set<string>([...serverRows.map((r) => String(r.id)), ...pendingPuts]);
  const stale = localRows.map((r) => r.uuid!).filter((uuid) => !keep.has(uuid));
  for (let i = 0; i < stale.length; i += 400) {
    const batch = stale.slice(i, i + 400);
    await db.runAsync(`DELETE FROM quiz_history WHERE uuid IN (${placeholders(batch.length)})`, batch);
  }
}

export async function applyContentSnapshot(
  snapshot: ContentSnapshot,
  authUserId: string | null,
): Promise<void> {
  const pendingPuts = new Map<string, Set<string>>();
  const pendingDeletes = new Map<string, Set<string>>();

  for (const op of await getPendingOps()) {
    const target = op.op === 'delete' ? pendingDeletes : pendingPuts;
    if (!target.has(op.table_name)) target.set(op.table_name, new Set());
    target.get(op.table_name)!.add(op.record_id);
  }

  const empty = new Set<string>();
  const putsFor = (t: SyncTable) => pendingPuts.get(t) ?? empty;
  const deletesFor = (t: SyncTable) => pendingDeletes.get(t) ?? empty;

  const db = await getSQLite();

  await db.withTransactionAsync(async () => {
    // Categories and Questions: system rows (userId NULL) are authoritative for
    // everyone; rows owned by the signed-in user are authoritative for them too.
    const catOwnership: OwnershipFilter = authUserId
      ? { clause: 'userId IS NULL OR userId = ?', params: [authUserId] }
      : { clause: 'userId IS NULL', params: [] };
    await applyTable(
      db,
      'Category',
      ['id', 'name', 'parentId', 'userId'],
      (snapshot.categories ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        parentId: c.parentId ?? null,
        userId: c.userId ?? null,
      })),
      catOwnership,
      putsFor('Category'),
      deletesFor('Category'),
    );

    const questionOwnership: OwnershipFilter = authUserId
      ? { clause: 'userId IS NULL OR userId = ?', params: [authUserId] }
      : { clause: 'userId IS NULL', params: [] };
    await applyTable(
      db,
      'Question',
      ['id', 'categoryId', 'question', 'options', 'correctAnswer', 'difficulty', 'type', 'shownCount', 'imageUrl', 'userId'],
      (snapshot.questions ?? []).map((q) => ({
        id: q.id,
        categoryId: q.categoryId ?? null,
        question: q.question,
        options: typeof q.options === 'string' ? q.options : JSON.stringify(q.options ?? []),
        correctAnswer: q.correctAnswer,
        difficulty: q.difficulty,
        type: q.type ?? 'multiple_choice',
        shownCount: q.shownCount ?? 0,
        imageUrl: q.imageUrl ?? null,
        userId: q.userId ?? null,
      })),
      questionOwnership,
      putsFor('Question'),
      deletesFor('Question'),
    );

    // Favorites, reports, and quiz history only exist for signed-in users.
    if (authUserId) {
      const userOwnership: OwnershipFilter = { clause: 'userId = ?', params: [authUserId] };

      await applyTable(
        db,
        'Favorite',
        ['id', 'userId', 'categoryId'],
        (snapshot.favorites ?? []).map((f) => ({
          id: f.id,
          userId: authUserId,
          categoryId: f.categoryId,
        })),
        userOwnership,
        putsFor('Favorite'),
        deletesFor('Favorite'),
      );

      await applyTable(
        db,
        'QuestionReport',
        ['id', 'questionId', 'userId', 'description', 'createdAt', 'resolved'],
        (snapshot.reports ?? []).map((r) => ({
          id: r.id,
          questionId: r.questionId,
          userId: authUserId,
          description: r.description,
          createdAt: r.createdAt,
          resolved: r.resolved ? 1 : 0,
        })),
        userOwnership,
        putsFor('QuestionReport'),
        deletesFor('QuestionReport'),
      );

      await applyQuizHistory(
        db,
        snapshot.quizHistory ?? [],
        authUserId,
        putsFor('QuizHistory'),
        deletesFor('QuizHistory'),
      );
    }
  });

  notifyDataChange('Category');
  notifyDataChange('Question');
  notifyDataChange('Favorite');
  notifyDataChange('QuestionReport');
  notifyDataChange('QuizHistory');
}

export async function migrateLocalUserId(deviceId: string, auth0UserId: string): Promise<void> {
  // Migrate user-created content from device ID to Auth0 user ID in local SQLite
  await execute('UPDATE Category SET userId = ? WHERE userId = ?', [auth0UserId, deviceId]);
  await execute('UPDATE Question SET userId = ? WHERE userId = ?', [auth0UserId, deviceId]);
  await execute('UPDATE Favorite SET userId = ? WHERE userId = ?', [auth0UserId, deviceId]);
  await execute('UPDATE QuestionReport SET userId = ? WHERE userId = ?', [auth0UserId, deviceId]);
  await execute('UPDATE quiz_history SET user_id = ? WHERE user_id = ?', [auth0UserId, deviceId]);
  notifyDataChange('Category');
  notifyDataChange('Question');
  notifyDataChange('Favorite');
  notifyDataChange('QuestionReport');
  notifyDataChange('QuizHistory');
}

/**
 * Ensure every locally stored quiz run has a stable server id and is queued for
 * upload. Called on sign-in so history recorded while anonymous is backed up.
 */
export async function enqueueAllQuizHistoryForBackup(): Promise<void> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  const rows = await db.getAllAsync<QuizHistoryRow>('SELECT * FROM quiz_history');
  const userId = await getCurrentUserId();

  for (const row of rows) {
    let uuid = row.uuid;
    if (!uuid) {
      uuid = Crypto.randomUUID();
      await db.runAsync('UPDATE quiz_history SET uuid = ?, user_id = ? WHERE id = ?', [uuid, userId, row.id]);
    }
    await enqueueOp('QuizHistory', 'put', uuid, {
      id: uuid,
      userId,
      date: row.date,
      mode: row.mode,
      categoryId: row.category_id,
      difficulty: row.difficulty,
      playerCount: row.player_count,
      scoreData: toScoreDataString(row.score_data),
    });
  }
}

let dataChangeListeners: Array<(changes?: { table: string }) => void> = [];

export function onDataChange(listener: (changes?: { table: string }) => void): () => void {
  dataChangeListeners.push(listener);
  return () => {
    dataChangeListeners = dataChangeListeners.filter(l => l !== listener);
  };
}

function notifyDataChange(table?: string) {
  for (const listener of dataChangeListeners) {
    listener(table ? { table } : undefined);
  }
}

export { getAll, getOptional, execute, notifyDataChange };
