import { getContentVersion, applyContentUpdate } from './database';
import { Category } from '../types/quiz';

const SYNC_URL = 'https://quiz-yourself-admin.ohapps.com/api/content';

export interface SyncResult {
  updated: boolean;
  newCategories: number;
  newQuestions: number;
  error?: string;
}

export async function checkForUpdates(): Promise<SyncResult> {
  try {
    const currentVersion = await getContentVersion();
    
    const response = await fetch(`${SYNC_URL}?version=${currentVersion}`);
    
    if (!response.ok) {
      throw new Error(`Sync server returned ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.upToDate) {
      return { updated: false, newCategories: 0, newQuestions: 0 };
    }
    
    // Server returned new content
    const categories = data.data as Category[];
    const newVersion = data.version as number;
    
    if (!categories || !newVersion) {
      throw new Error('Invalid response format from sync server');
    }
    
    const result = await applyContentUpdate(categories, newVersion);
    
    return {
      updated: true,
      newCategories: result.newCategories,
      newQuestions: result.newQuestions
    };
  } catch (error: any) {
    console.error('Content sync failed:', error);
    return { 
      updated: false, 
      newCategories: 0, 
      newQuestions: 0, 
      error: error.message || 'Unknown sync error' 
    };
  }
}
