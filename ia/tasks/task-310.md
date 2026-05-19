# Task — Issue #310

## What needs to be done
**Atenção:** Ao criar esta issue, você acionará uma automação baseada em **Aider + OpenCode Zen (big-pickle)** que irá:
1. Criar uma nova branch `ia/task-<issue-number>-<timestamp>`.
2. Gerar um plano de implementação em `ia/tasks/`.
3. Executar o **Aider** para modificar o código automaticamente.
4. Validar as alterações (Lint/Build).
5. Fazer o push e abrir um Pull Request.

---

### 🎯 Descrição da Tarefa

Alterar frontend/src/hooks/trello/useTrello.ts para incluir um contador de matches durante o filtro por texto (título, descrição, checklist, labels e flag). Retornar esse count junto com filteredTasks. Em frontend/src/components/trello/Board.tsx, exibir o número de resultados encontrados em tempo real ao lado da SearchBar. Isso mantém a lógica centralizada no hook e a interface apenas consome o valor atualizado.


## Rules
- Follow existing code patterns, file structure and naming conventions
- Frontend is under frontend/ (React, TypeScript, Vite, Tailwind CSS)
- Backend is under backend/ (Node.js, Express, MongoDB/Mongoose)
- Do not modify unrelated files
- Do not change package.json, lock files or config files unless explicitly required
- Never modify authentication, environment configuration or database schema unless explicitly requested
- Implement only minimal and safe changes
- Do not refactor unrelated code
