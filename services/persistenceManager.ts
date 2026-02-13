import { AppState } from '../types';
import { db } from '../utils/db';
import { decompressBatch } from '../utils/common';

const LEGACY_STORAGE_KEY = 'app_data_v4_global';

export const persistenceManager = {
  save: async (state: AppState): Promise<void> => {
    try {
      await db.save(state);
    } catch (e) {
      console.error("Failed to save to DB", e);
      throw e;
    }
  },

  load: async (): Promise<AppState | null> => {
    try {
      const dbData = await db.load();
      if (dbData) return dbData;

      // Migration from localStorage
      const stored = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.batches) {
            parsed.batches = parsed.batches.map((b: any) => decompressBatch(b));
        }
        await db.save(parsed);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        return parsed;
      }

      return null;
    } catch (e) {
      console.error("Failed to load data", e);
      return null;
    }
  },

  clear: async (): Promise<void> => {
    await db.clear();
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }
};
