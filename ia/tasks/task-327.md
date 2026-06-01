# Task — Issue #327

## What needs to be done
### 🎯 Descrição da Tarefa

Refatore o componente no arquivo frontend/src/components/TransactionList.tsx para implementar a seguinte regra de negócio na listagem de transações:Exibição do Botão: Adicione um botão com o texto "Marcar todos como pago".Condição de Ativação (Disabled): O botão deve iniciar desabilitado. Ele só deve ser habilitado se ambas as condições abaixo forem verdadeiras ao mesmo tempo:O filtro de status "pendentes" estiver selecionado.Qualquer filtro de categoria de pagamento também estiver selecionado (o filtro de categoria não pode estar vazio ou em um estado "todos").Ação do Botão: Ao ser clicado, o botão deve abrir um alerta visual (ou modal de confirmação do projeto) perguntando se o usuário realmente deseja marcar todos os itens filtrados como pagos.Por favor, forneça apenas o código TypeScript refatorado ou os trechos exatos que precisam ser alterados (como o estado dos filtros, a lógica do disabled e o retorno do JSX).

## Rules
- Follow existing code patterns, file structure and naming conventions
- Frontend is under frontend/ (React, TypeScript, Vite, Tailwind CSS)
- Backend is under backend/ (Node.js, Express, MongoDB/Mongoose)
- Do not modify unrelated files
- Do not change package.json, lock files or config files unless explicitly required
- Never modify authentication, environment configuration or database schema unless explicitly requested
- Implement only minimal and safe changes
- Do not refactor unrelated code
- Never create unused imports/vars - prefix unused params with _
- Verify with npx tsc --noEmit
