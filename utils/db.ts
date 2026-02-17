import { compressBatch, decompressBatch, APP_VERSION } from './common';

const DB_NAME = 'DataScopeDB';
const DB_VERSION = 2; // Incremented for multi-store support
const STORE_NAME = 'appState';
const BATCHES_STORE = 'batches';
const KEY_NAME = 'global_state';

export const db = {
  open: (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
        if (!db.objectStoreNames.contains(BATCHES_STORE)) {
          db.createObjectStore(BATCHES_STORE);
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  },

  save: async (data: any): Promise<void> => {
    const database = await db.open();
    return new Promise((resolve, reject) => {
      const hasBatches = data && Array.isArray(data.batches);
      const stores = hasBatches ? [STORE_NAME, BATCHES_STORE] : [STORE_NAME];
      const transaction = database.transaction(stores, 'readwrite');

      if (hasBatches) {
        const batchStore = transaction.objectStore(BATCHES_STORE);
        const batches = data.batches as any[];

        batches.forEach(b => {
          // Only save to batch store if it has rows (prevent redundant saves of metadata-only objects)
          if (b.rows) {
            batchStore.put(compressBatch(b), b.id);
          }
        });
      }

      const mainStore = transaction.objectStore(STORE_NAME);

      // We strip the actual rows from the global state to keep it lightweight
      let stateToSave = data;
      if (hasBatches) {
        stateToSave = {
          ...data,
          batches: (data.batches as any[]).map(b => {
            const meta = { ...b };
            delete (meta as any).rows;
            delete (meta as any).f;
            delete (meta as any).d;
            delete (meta as any)._c;
            return meta; // Only metadata stays in appState
          })
        };
      }

      mainStore.put(stateToSave, KEY_NAME);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  },

  load: async (): Promise<any | null> => {
    const database = await db.open();

    // 1. Load main state
    const mainData = await new Promise<any>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(KEY_NAME);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });

    if (!mainData) return null;

    // 2. Load batches if metadata exists
    if (Array.isArray(mainData.batches) && mainData.batches.length > 0) {
      const tx = database.transaction(BATCHES_STORE, 'readonly');
      const batchStore = tx.objectStore(BATCHES_STORE);

      const fullBatches = await Promise.all(mainData.batches.map((meta: any) => {
        return new Promise((res) => {
          const req = batchStore.get(meta.id);
          req.onsuccess = () => {
            if (req.result) {
              res(decompressBatch(req.result));
            } else {
              // Fallback for legacy data that might still be in the meta object
              res(decompressBatch(meta));
            }
          };
          req.onerror = () => res(decompressBatch(meta));
        });
      }));

      mainData.batches = fullBatches.filter(b => b && (b as any).rows);
    }

    return mainData;
  },

  saveAppState: async (partialState: any): Promise<void> => {
    const database = await db.open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const getReq = store.get(KEY_NAME);
      getReq.onsuccess = () => {
        const currentState = getReq.result || { version: APP_VERSION };
        const newState = { ...currentState, ...partialState };
        store.put(newState, KEY_NAME);
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  },

  clear: async (): Promise<void> => {
    const database = await db.open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME, BATCHES_STORE], 'readwrite');
      transaction.objectStore(STORE_NAME).clear();
      transaction.objectStore(BATCHES_STORE).clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
};
