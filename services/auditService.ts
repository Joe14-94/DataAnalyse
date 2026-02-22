// Audit trail service — IndexedDB journal for finance module actions

const AUDIT_DB = 'DataScopeAuditDB';
const AUDIT_DB_VERSION = 1;
const AUDIT_STORE = 'auditEntries';

export type AuditModule = 'budget' | 'forecast' | 'referential' | 'dataset' | 'dashboard';
export type AuditAction =
  | 'create' | 'update' | 'delete' | 'submit' | 'validate' | 'reject' | 'lock'
  | 'import' | 'export' | 'add_line' | 'delete_line' | 'add_version' | 'use_template';

export interface AuditEntry {
  id: string;
  timestamp: number;
  module: AuditModule;
  action: AuditAction;
  entityId: string;
  entityName: string;
  userId?: string;
  details?: string;
  before?: unknown;
  after?: unknown;
}

export interface AuditFilter {
  module?: AuditModule;
  action?: AuditAction;
  entityId?: string;
  fromDate?: number;
  toDate?: number;
  limit?: number;
}

// Singleton promise so we only open the DB once
let dbPromise: Promise<IDBDatabase> | null = null;

export function openAuditDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(AUDIT_DB, AUDIT_DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(AUDIT_STORE)) {
        const store = db.createObjectStore(AUDIT_STORE, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('module', 'module', { unique: false });
        store.createIndex('entityId', 'entityId', { unique: false });
      }
    };

    request.onsuccess = (event: Event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event: Event) => {
      dbPromise = null; // allow retry on next call
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbPromise;
}

export async function logAudit(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<void> {
  try {
    const db = await openAuditDB();
    const fullEntry: AuditEntry = {
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
    };

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(AUDIT_STORE, 'readwrite');
      const store = tx.objectStore(AUDIT_STORE);
      const req = store.add(fullEntry);
      req.onsuccess = () => resolve();
      req.onerror = (e: Event) => reject((e.target as IDBRequest).error);
    });
  } catch (err) {
    console.error('[AuditService] Failed to log audit entry:', err);
  }
}

export async function getAuditEntries(filter?: AuditFilter): Promise<AuditEntry[]> {
  try {
    const db = await openAuditDB();

    const entries = await new Promise<AuditEntry[]>((resolve, reject) => {
      const tx = db.transaction(AUDIT_STORE, 'readonly');
      const store = tx.objectStore(AUDIT_STORE);
      const req = store.getAll();
      req.onsuccess = (e: Event) => resolve((e.target as IDBRequest<AuditEntry[]>).result);
      req.onerror = (e: Event) => reject((e.target as IDBRequest).error);
    });

    let result = entries;

    if (filter) {
      if (filter.module !== undefined) {
        result = result.filter(e => e.module === filter.module);
      }
      if (filter.action !== undefined) {
        result = result.filter(e => e.action === filter.action);
      }
      if (filter.entityId !== undefined) {
        result = result.filter(e => e.entityId === filter.entityId);
      }
      if (filter.fromDate !== undefined) {
        result = result.filter(e => e.timestamp >= filter.fromDate!);
      }
      if (filter.toDate !== undefined) {
        result = result.filter(e => e.timestamp <= filter.toDate!);
      }
    }

    // Sort by timestamp DESC
    result.sort((a, b) => b.timestamp - a.timestamp);

    if (filter?.limit !== undefined) {
      result = result.slice(0, filter.limit);
    }

    return result;
  } catch (err) {
    console.error('[AuditService] Failed to retrieve audit entries:', err);
    return [];
  }
}

export async function clearAuditEntries(olderThanMs?: number): Promise<void> {
  try {
    const db = await openAuditDB();

    if (olderThanMs !== undefined) {
      const cutoff = Date.now() - olderThanMs;

      // Fetch all entries and delete those older than cutoff
      const entries = await new Promise<AuditEntry[]>((resolve, reject) => {
        const tx = db.transaction(AUDIT_STORE, 'readonly');
        const store = tx.objectStore(AUDIT_STORE);
        const req = store.getAll();
        req.onsuccess = (e: Event) => resolve((e.target as IDBRequest<AuditEntry[]>).result);
        req.onerror = (e: Event) => reject((e.target as IDBRequest).error);
      });

      const oldEntries = entries.filter(e => e.timestamp < cutoff);

      if (oldEntries.length === 0) return;

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(AUDIT_STORE, 'readwrite');
        const store = tx.objectStore(AUDIT_STORE);
        let pending = oldEntries.length;

        if (pending === 0) { resolve(); return; }

        oldEntries.forEach(entry => {
          const req = store.delete(entry.id);
          req.onsuccess = () => {
            pending--;
            if (pending === 0) resolve();
          };
          req.onerror = (e: Event) => reject((e.target as IDBRequest).error);
        });
      });
    } else {
      // Clear all entries
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(AUDIT_STORE, 'readwrite');
        const store = tx.objectStore(AUDIT_STORE);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = (e: Event) => reject((e.target as IDBRequest).error);
      });
    }
  } catch (err) {
    console.error('[AuditService] Failed to clear audit entries:', err);
  }
}

export function exportAuditToCSV(entries: AuditEntry[]): string {
  const header = 'id,timestamp,module,action,entityId,entityName,userId,details';

  const escapeField = (value: string | undefined): string => {
    if (value === undefined || value === null) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = entries.map(entry => {
    const timestampISO = new Date(entry.timestamp).toISOString();
    return [
      escapeField(entry.id),
      escapeField(timestampISO),
      escapeField(entry.module),
      escapeField(entry.action),
      escapeField(entry.entityId),
      escapeField(entry.entityName),
      escapeField(entry.userId),
      escapeField(entry.details),
    ].join(',');
  });

  return [header, ...rows].join('\n');
}
