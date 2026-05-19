# Task — Issue #316

## What needs to be done
Este plano descreve a criação de um sistema de histórico de ações para as tarefas do Trello, permitindo visualizar quem fez o quê e quando, com uma interface limpa e foco em UX.

1. Alterações em Tipos (`frontend/src/types/trello/task.ts`)

Adicionar a estrutura de dados para as entradas de histórico.

```typescript
export interface HistoryEntry {
  id: string;
  action: 'create' | 'update' | 'move' | 'archive' | 'unarchive' | 'pin' | 'unpin' | 'checklist_toggle' | 'timelog_add';
  details: string;
  date: string; // ISO String
  previousValue?: any;
  newValue?: any;
}

// Atualizar a interface Task
export interface Task {
  // ... campos existentes
  history?: HistoryEntry[];
}
```

## 2. Atualização do Hook (`frontend/src/hooks/trello/useTrello.ts`)

Modificar as funções de manipulação de tarefas para registrar eventos no histórico.

*   `addTask`: Registrar 'Tarefa criada'.
*   `updateTask`: Comparar mudanças importantes e registrar (ex: mudança de prioridade, título).
*   `moveTask`: Registrar mudança de coluna.
*   `togglePinTask`: Registrar fixação/desafixação.

## 3. Novo Componente: `TaskHistory.tsx`

Criar `frontend/src/components/trello/TaskHistory.tsx`.

*   **UI/UX**: Lista vertical (timeline) com ícones da `lucide-react`.
*   **Visual**: Cores sutis, tipografia clara, datas formatadas (ex: "há 2 horas" ou data completa).
*   **Componentes**: Usar `ScrollArea` ou apenas overflow-y.

## 4. Integração no `TaskModal.tsx`

Incluir o `TaskHistory` dentro do modal.

*   **Sugestão de UX**: Adicionar uma seção colapsável ou uma aba "Histórico" na lateral ou no rodapé do modal.
*   **Exemplo de Posicionamento**: Abaixo do lançamento de horas, ocupando a coluna da direita em modo fullscreen.

---

## Arquivos que serão modificados:
- `frontend/src/types/trello/task.ts` (Definição de tipos)
- `frontend/src/hooks/trello/useTrello.ts` (Lógica de gravação)
- `frontend/src/components/trello/TaskModal.tsx` (Interface do usuário)

## Arquivos que serão criados:
- `frontend/src/components/trello/TaskHistory.tsx` (Componente de visualização)

## O que NÃO mexer:
- Não alterar lógica de persistência (LocalStorage já resolve).
- Não alterar componentes de UI base (`frontend/src/components/ui/*`) a menos que estritamente necessário.
- Não alterar lógica de outros módulos (Dashboard, Reports, etc).


## Rules
- Follow existing code patterns, file structure and naming conventions
- Frontend is under frontend/ (React, TypeScript, Vite, Tailwind CSS)
- Backend is under backend/ (Node.js, Express, MongoDB/Mongoose)
- Do not modify unrelated files
- Do not change package.json, lock files or config files unless explicitly required
- Never modify authentication, environment configuration or database schema unless explicitly requested
- Implement only minimal and safe changes
- Do not refactor unrelated code
