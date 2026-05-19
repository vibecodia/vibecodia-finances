---
name: "🤖 Tarefa Guiada por IA"
about: "Inicia um fluxo de trabalho de desenvolvimento orientado por IA."
title: "[IA-Driven] - "
labels: ["ai-driven", "automation"]

---

**Atenção:** Ao criar esta issue, você acionará uma automação baseada em **Aider + OpenCode Zen (big-pickle)** que irá:
1. Criar uma nova branch `ia/task-<issue-number>-<timestamp>`.
2. Gerar um plano de implementação em `ia/tasks/`.
3. Executar o **Aider** para modificar o código automaticamente.
4. Validar as alterações (Lint/Build).
5. Fazer o push e abrir um Pull Request.

---

### 🎯 Descrição da Tarefa

<!-- Descreva claramente o que precisa ser feito. Esta descrição será inserida no template do plano de ação e usada como prompt principal para a IA. -->

Ex: Adicionar um novo campo 'data de nascimento' ao formulário de usuário, incluindo validação no frontend e atualização no backend.
