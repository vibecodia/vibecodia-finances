const CACHE_NAME = 'vibecodia-finances-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
];

const DB_NAME = 'vibecodia-finances-sync';
const STORE_NAME = 'outbox';

// Instalação: Cacheia assets essenciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Ativação: Limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estratégia Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  // Ignora requisições de API para garantir dados sempre frescos
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((response) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
        return response || fetchPromise;
      });
    })
  );
});

// Sincronização em Background
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(processSyncQueue());
  }
});

async function processSyncQueue() {
  const db = await openDB();
  const queue = await getAllFromStore(db, STORE_NAME);

  for (const requestData of queue) {
    try {
      const response = await fetch(requestData.url, {
        method: requestData.method,
        headers: requestData.headers,
        body: requestData.body
      });

      if (response.ok) {
        await deleteFromStore(db, STORE_NAME, requestData.id);
        console.log('Sincronização concluída com sucesso para:', requestData.url);
      }
    } catch (err) {
      console.error('Falha ao sincronizar item:', err);
      // Mantém na fila para a próxima tentativa do sistema
    }
  }
}

// Helpers para IndexedDB no Service Worker
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

function getAllFromStore(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function deleteFromStore(db, storeName, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Lógica de Push/Badge (Opcional - Preparação para Push Notifications)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Vibecodia Finances';
  const options = {
    body: data.body || 'Você tem novas atualizações pendentes.',
    icon: '/favicon.svg',
    badge: '/favicon.svg'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});
