# Task — Issue #329

## What needs to be done
### 🎯 Descrição da Tarefa

Preciso refatorar o uso de um ConfirmationModal genérico em TypeScript para corrigir um texto de botão incorreto, sem quebrar os outros locais onde esse modal já é utilizado.Siga estas instruções:Alteração no Componente do Modal Genérico:Adicione uma nova propriedade opcional na interface de Props chamada confirmButtonText?: string.No elemento do botão de confirmação do modal, use essa propriedade. Se ela não for enviada, mantenha o texto padrão atual como fallback (ex: confirmButtonText || 'confirmar exclusão').Alteração na Tela do Modal de Pagamentos:Texto do corpo: Atualize a mensagem para incluir dinamicamente a quantidade de itens filtrados. Use a variável de contagem já existente no sistema. Exemplo: "Tem certeza de que deseja marcar os X itens filtrados como pagos?".Texto do botão: Passe a nova propriedade confirmButtonText="confirmar ação" para a instância do modal nessa tela.Por favor, altere a assinatura do componente genérico e envie o código corrigido de ambas as partes. 

frontend/src/components/ConfirmationModal.tsx
frontend/src/components/TransactionList.tsx

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
