# Plano de Implementação: Service Worker com Idempotência (PWA)

Este plano detalha como garantir que transações (gastos/receitas) nunca sejam duplicadas e sejam enviadas automaticamente quando houver queda de conexão, utilizando a **Background Sync API** e **Idempotency Keys**.

---

## 1. Geração de Idempotency-Key (`frontend/src/hooks/useFinancialData.ts`)

Antes de enviar cada transação, geramos uma chave única (UUID v4) que identifica aquela tentativa específica de criação.

```tsx
// Exemplo de alteração no addTransaction
const addTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
  // Geramos a chave de idempotência logo no início
  const idempotencyKey = crypto.randomUUID(); 

  const requestOptions = {
    method: 'POST',
    headers: {
      ...headers,
      'X-Idempotency-Key': idempotencyKey
    },
    body: JSON.stringify({ ...transaction, idempotencyKey })
  };

  try {
    const response = await fetch(`${API_BASE_URL}/transactions`, requestOptions);
    // ... lógica normal
  } catch (error) {
    // Se falhar por rede (offline), enfileiramos no IndexedDB
    if (!navigator.onLine) {
      await saveToSyncQueue(requestOptions); // Função a implementar
      registerBackgroundSync(); // Registra o evento no Service Worker
    }
    throw error;
  }
};
```

---

## 2. Service Worker e IndexedDB (`frontend/public/sw.js`)

O Service Worker gerencia uma fila no IndexedDB. Se a requisição falhar, ela é salva e o navegador tentará reenviá-la automaticamente.

```javascript
// public/sw.js

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(processSyncQueue());
  }
});

async function processSyncQueue() {
  const db = await openIndexedDB();
  const queue = await db.getAll('outbox'); // Fila de requisições pendentes

  for (const requestData of queue) {
    try {
      const response = await fetch(requestData.url, {
        method: requestData.method,
        headers: requestData.headers,
        body: requestData.body
      });

      if (response.ok) {
        await db.delete('outbox', requestData.id); // Remove da fila se tiver sucesso
      }
    } catch (err) {
      console.error('Falha ao sincronizar item:', err);
      // Mantém na fila para a próxima tentativa do sistema
    }
  }
}
```

---

## 3. Background Sync API (`frontend/src/main.tsx`)

No registro do Service Worker, solicitamos a permissão para sincronização em background.

```tsx
// main.tsx
navigator.serviceWorker.ready.then((registration) => {
  return registration.sync.register('sync-transactions');
}).catch(() => {
  // Background Sync não suportado ou falhou
});
```

---

## 4. Segurança no Nginx (`infra/docker/nginx.conf`)

Garante que o `sw.js` seja sempre validado e nunca servido de um cache antigo do navegador ou proxy.

```nginx
# Dentro do bloco server de finances.vibecodia.com.br

location = /sw.js {
    root /usr/share/nginx/html;
    add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
    add_header Service-Worker-Allowed "/";
    expires off;
}
```

---

## 5. Vantagens da Idempotência

1.  **Duplicidade Zero**: Mesmo que o Service Worker tente reenviar o mesmo gasto duas vezes devido a um erro de conexão no meio do caminho, o Servidor saberá (pelo `X-Idempotency-Key`) que deve ignorar a segunda chamada.
2.  **Offline First**: O usuário pode cadastrar um gasto no supermercado sem sinal 4G. O app confirma visualmente o registro e o Service Worker "trabalha em silêncio" para efetivar o dado no servidor assim que houver sinal.
3.  **Confiabilidade**: Reduz erros de "Duplicate Key" ou gastos duplicados no banco de dados causados por cliques duplos em botões de salvar lentos.

---
*Guia de Idempotência gerado via Gemini CLI para Vibecodia Finances.*
