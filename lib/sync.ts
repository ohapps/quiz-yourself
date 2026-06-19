// PowerSync handles real-time sync automatically.
// This file is kept for API compatibility with _layout.tsx and other consumers.

export interface SyncResult {
  updated: boolean;
  newCategories: number;
  newQuestions: number;
  error?: string;
}

export async function checkForUpdates(): Promise<SyncResult> {
  // PowerSync syncs continuously in the background.
  // No manual check needed.
  return { updated: false, newCategories: 0, newQuestions: 0 };
}
