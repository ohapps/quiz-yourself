import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';

const DATABASE_NAME = 'quiz_yourself.db';
let cachedDeviceId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;

  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS app_metadata (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_metadata WHERE key = 'device_id'"
  );

  if (row) {
    cachedDeviceId = row.value;
    return row.value;
  }

  const id = Crypto.randomUUID();
  await db.runAsync(
    "INSERT INTO app_metadata (key, value) VALUES ('device_id', ?)",
    [id]
  );
  cachedDeviceId = id;
  return id;
}
