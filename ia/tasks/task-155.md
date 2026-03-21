# Task — Issue #155

## What needs to be done
### 🎯 Descrição da Tarefa

Melhorar a informação de resumo exibida nas rotas `/expenses` e `/income`.

Atualmente, abaixo do seletor de meses existe um indicador que mostra o total de transações do período exibido. Esse valor é recalculado automaticamente quando o usuário aplica filtros, como:
- filtro por categoria
- filtro de transações pagas / não pagas

Hoje o texto exibido segue o formato:

Total: <valor>

A melhoria consiste em incluir também a quantidade de itens (transações) que compõem esse total.

O contador deve refletir exatamente o mesmo conjunto de transações considerado no cálculo do valor, respeitando todos os filtros ativos na tela.

Comportamento esperado

Exemplo atual:
Total: R$ 2.450,00

Exemplo após a melhoria:
Total: R$ 2.450,00 (8 itens)

ou

Total: R$ 2.450,00 • 8 itens

Requisitos

- Implementar nas rotas `/expenses` e `/income`
- A contagem deve considerar apenas as transações atualmente filtradas na tela
- A quantidade deve ser recalculada sempre que:
  - o mês for alterado
  - filtros forem aplicados
  - filtros forem removidos
- A implementação deve reutilizar os dados já carregados na tela, evitando novas consultas desnecessárias

## Rules
- Follow existing code patterns, file structure and naming conventions
- Frontend is under frontend/ (React, TypeScript, Vite, Tailwind CSS)
- Backend is under backend/ (Node.js, Express, MongoDB/Mongoose)
- Do not modify unrelated files
- Do not change package.json, lock files or config files unless explicitly required
