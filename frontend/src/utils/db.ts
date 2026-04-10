import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'vibecodia-finances-sync';
const STORE_NAME = 'outbox';

export interface SyncRequest {
  id?: number;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  timestamp: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db: IDBPDatabase) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        }
      },
    });
  }
  return dbPromise;
};

export const saveToSyncQueue = async (request: Omit<SyncRequest, 'id' | 'timestamp'>) => {
  const db = await getDB();
  return db.add(STORE_NAME, {
    ...request,
    timestamp: Date.now(),
  });
};

export const getSyncQueue = async (): Promise<SyncRequest[]> => {
  const db = await getDB();
  return db.getAll(STORE_NAME);
};

export const removeFromSyncQueue = async (id: number) => {
  const db = await getDB();
  return db.delete(STORE_NAME, id);
};

export const registerBackgroundSync = async () => {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const registration = await navigator.serviceWorker.ready;
    try {
      await (registration as any).sync.register('sync-transactions');
      console.log('Background sync registered');
    } catch (err) {
      console.error('Background sync registration failed:', err);
    }
  }
};
