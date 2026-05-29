import { getContentVersion, applyContentUpdate } from './database';
import { Category } from '../types/quiz';
import { Image } from 'expo-image';
import Constants from 'expo-constants';

const getSyncUrl = (): string => {
  if (__DEV__) {
    // In local development, resolve the host machine's IP (necessary for physical devices and emulators)
    // expoConfig?.hostUri is usually formatted as IP:PORT (e.g., 192.168.1.5:8081)
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const host = hostUri.split(':')[0];
      return `http://${host}:3000/api/content`;
    }
    // Fallback if hostUri is unavailable (e.g., web builds)
    return 'http://localhost:3000/api/content';
  }
  return 'https://quiz-yourself-admin.ohapps.com/api/content';
};

const SYNC_URL = getSyncUrl();


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
    
    // Extract and prefetch all image URLs in the background for offline use
    try {
      const urls: string[] = [];
      categories.forEach(cat => {
        cat.questions.forEach(q => {
          if (q.imageUrl) {
            urls.push(q.imageUrl);
          }
        });
      });
      if (urls.length > 0) {
        Image.prefetch(urls).catch(e => console.warn('Sync images prefetch failed:', e));
      }
    } catch (e) {
      console.warn('Failed to extract/prefetch sync images:', e);
    }
    
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
