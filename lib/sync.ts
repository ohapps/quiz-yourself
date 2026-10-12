import { AppState, AppStateStatus } from 'react-native';
import { refreshAccessToken, getAuthUserId } from './auth';
import { getBackendUrl } from './config';
import {
  applyContentSnapshot,
  hasSyncedContent,
  getPendingOps,
  deletePendingOp,
  registerSyncScheduler,
} from './database';

export interface SyncResult {
  updated: boolean;
  newCategories: number;
  newQuestions: number;
  error?: string;
}

let syncInFlight: Promise<SyncResult> | null = null;
let appStateSubscription: { remove: () => void } | null = null;
let scheduledSyncTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced sync after local writes — coalesces bursts of edits into one sync. */
export function scheduleSync(delayMs = 750) {
  if (scheduledSyncTimer) clearTimeout(scheduledSyncTimer);
  scheduledSyncTimer = setTimeout(() => {
    scheduledSyncTimer = null;
    syncNow().catch(() => {});
  }, delayMs);
}

// Allow database.ts to request a sync after queuing a local write.
registerSyncScheduler(() => scheduleSync());

function authHeaders(token: string | null): Record<string, string> {
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/** Send every queued local write to the backend, stopping on hard failures. */
async function flushUploadQueue(token: string): Promise<{ uploaded: number; error?: string }> {
  const backendUrl = getBackendUrl();
  const ops = await getPendingOps();
  let uploaded = 0;

  for (const op of ops) {
    const { table_name: table, record_id: recordId, op: kind } = op;

    try {
      let response: Response;

      if (kind === 'delete') {
        response = await fetch(
          `${backendUrl}/api/sync/${encodeURIComponent(table)}/${encodeURIComponent(recordId)}`,
          { method: 'DELETE', headers: authHeaders(token) }
        );
      } else {
        const payload = op.payload ? JSON.parse(op.payload) : {};
        response = await fetch(`${backendUrl}/api/sync/${encodeURIComponent(table)}`, {
          method: 'POST',
          headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (response.ok) {
        await deletePendingOp(op.id);
        uploaded += 1;
        continue;
      }

      // Token problems are retryable — keep the op queued for the next sync.
      if (response.status === 401) {
        const body = await response.text().catch(() => '');
        return { uploaded, error: `Upload unauthorized (${table} ${kind}): ${response.status} ${body}` };
      }

      // Conflicts/bad requests won't succeed on retry — drop to avoid a poison queue.
      if (response.status >= 400 && response.status < 500) {
        console.warn(`Dropping sync op ${table}/${recordId} (${kind}): ${response.status}`);
        await deletePendingOp(op.id);
        continue;
      }

      // Server errors are retryable — stop and keep the remaining ops.
      const body = await response.text().catch(() => '');
      return { uploaded, error: `Upload failed (${table} ${kind}): ${response.status} ${body}` };
    } catch (error: any) {
      return { uploaded, error: error?.message || 'Network error during upload' };
    }
  }

  return { uploaded };
}

async function pullSnapshot(token: string | null): Promise<{
  updated: boolean;
  categories: number;
  questions: number;
  error?: string;
}> {
  const backendUrl = getBackendUrl();

  try {
    const response = await fetch(`${backendUrl}/api/content`, {
      headers: authHeaders(token),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return {
        updated: false,
        categories: 0,
        questions: 0,
        error: `Content pull failed: ${response.status} ${body}`,
      };
    }

    const data = await response.json();
    const authUserId = token ? await getAuthUserId() : null;

    await applyContentSnapshot(
      {
        categories: data.categories ?? [],
        questions: data.questions ?? [],
        favorites: data.favorites ?? [],
        reports: data.reports ?? [],
        quizHistory: data.quizHistory ?? [],
      },
      data.authenticated ? authUserId : null
    );

    return {
      updated: true,
      categories: (data.categories ?? []).length,
      questions: (data.questions ?? []).length,
    };
  } catch (error: any) {
    return {
      updated: false,
      categories: 0,
      questions: 0,
      error: error?.message || 'Network error while pulling content',
    };
  }
}

/**
 * Flush queued local writes (signed-in only), then pull content.
 * Anonymous users only pull the public system catalog.
 */
export async function syncNow(): Promise<SyncResult> {
  if (syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
    const token = await refreshAccessToken();

    let uploadError: string | undefined;
    if (token) {
      const flush = await flushUploadQueue(token);
      if (flush.error) uploadError = flush.error;
    }

    const pull = await pullSnapshot(token);
    return {
      updated: pull.updated,
      newCategories: pull.categories,
      newQuestions: pull.questions,
      error: pull.error || uploadError,
    };
  })();

  try {
    return await syncInFlight;
  } finally {
    syncInFlight = null;
  }
}

/** Best-effort sync with a timeout so launch isn't blocked forever offline. */
export async function syncOnLaunch(timeoutMs = 8000): Promise<SyncResult> {
  try {
    return await Promise.race([
      syncNow(),
      new Promise<SyncResult>((resolve) =>
        setTimeout(
          () =>
            resolve({
              updated: false,
              newCategories: 0,
              newQuestions: 0,
              error: 'Sync timed out',
            }),
          timeoutMs
        )
      ),
    ]);
  } catch (error: any) {
    return {
      updated: false,
      newCategories: 0,
      newQuestions: 0,
      error: error?.message || 'Sync failed',
    };
  }
}

export async function checkForUpdates(): Promise<SyncResult> {
  return syncNow();
}

/** Start listening for app foreground to sync. Call once from root layout. */
export function startSyncLifecycle() {
  if (appStateSubscription) return;

  let lastState: AppStateStatus = AppState.currentState;
  appStateSubscription = AppState.addEventListener('change', (next) => {
    if (lastState.match(/inactive|background/) && next === 'active') {
      syncNow().catch(() => {});
    }
    lastState = next;
  });
}

export function stopSyncLifecycle() {
  appStateSubscription?.remove();
  appStateSubscription = null;
}

export { hasSyncedContent };
