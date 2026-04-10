# Plano de Implementação: Service Worker PWA

Este guia detalha a implementação do Service Worker (`sw.js`) para otimizar a performance (cache offline) e habilitar funcionalidades nativas como o App Badge no PWA.

---

## 1. Registro do Service Worker (`frontend/src/main.tsx`)

Adicione o bloco de registro no final do arquivo `main.tsx` para ativar o Service Worker assim que o app carregar.

```tsx
// Ao final do arquivo main.tsx
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registrado com sucesso:', registration.scope);
      })
      .catch(error => {
        console.error('Falha ao registrar SW:', error);
      });
  });
}
```

---

## 2. Configuração do Service Worker (`frontend/public/sw.js`)

Crie este arquivo na pasta `public`. Ele usará a estratégia **Stale-While-Revalidate**: serve o que está no cache imediatamente e atualiza o cache em background.

```javascript
const CACHE_NAME = 'vibecodia-finances-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
];

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
```

---

## 3. Ajustes no Nginx (`infra/docker/nginx.conf`)

O Service Worker nunca deve ser mantido em cache pelo navegador, para que novas versões do app sejam detectadas instantaneamente. Adicione este bloco dentro do `server` de finances:

```nginx
# No bloco server { server_name finances.vibecodia.com.br; ... }

location = /sw.js {
    root /usr/share/nginx/html;
    add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
    expires off;
    proxy_no_cache 1;
}
```

---

## 4. Por que implementar agora?

1.  **Performance**: O app carrega instantaneamente em visitas subsequentes.
2.  **Resiliência**: Funciona (leitura) mesmo em conexões instáveis ou offline.
3.  **App Badge**: Aumenta o engajamento permitindo que o ícone do sistema mostre pendências.
4.  **Update Silencioso**: O navegador baixa novas versões do app em background e as aplica na próxima abertura.

---
*Guia gerado via Gemini CLI para Vibecodia Finances.*
