# Task — Issue #320

## What needs to be done
### 🎯 Descrição da Tarefa

## O que precisa ser feito
Criar um componente AmountRangeSlider nos mesmos moldes do DailyDateSlider para filtrar transações por valor (amount).

### Requisitos específicos:
1. Novo componente AmountRangeSlider :
   
   - Basear-se na estrutura e comportamento do DailyDateSlider.tsx
   - Usar valores mínimos e máximos das transações filtradas atualmente como limites do slider
   - Dois thumbs (inicial e final) para selecionar o range de valores
   - Tooltips mostrando os valores selecionados
2. Integração com TransactionList.tsx :
   
   - Adicionar o AmountRangeSlider abaixo do DailyDateSlider
   - Calcular dinamicamente o minAmount e maxAmount com base nas transações filtradas atualmente
3. Botão Limpar :
   
   - Modificar o botão "Limpar" já existente para também resetar o AmountRangeSlider para os valores padrão (min e max atuais)
4. Qualidade :
   
   - Garantir que o novo componente não quebre o build do frontend
   - Manter a consistência visual com o tema existente
   - Suportar tanto mouse quanto touch
## Comportamento esperado
- O slider deve se adaptar automaticamente aos valores mínimos e máximos das transações visíveis no momento
- Ao arrastar os thumbs, as transações devem ser filtradas para mostrar apenas aquelas com amount dentro do range selecionado
- O botão "Limpar" deve resetar todos os filtros, incluindo o range de valores
- Nenhum erro de TypeScript ou build deve ocorrer
## Arquivos relacionados
- frontend/src/components/TransactionList.tsx
- frontend/src/components/DailyDateSlider.tsx (referência para o novo componente)

## Rules
- Follow existing code patterns, file structure and naming conventions
- Frontend is under frontend/ (React, TypeScript, Vite, Tailwind CSS)
- Backend is under backend/ (Node.js, Express, MongoDB/Mongoose)
- Do not modify unrelated files
- Do not change package.json, lock files or config files unless explicitly required
- Never modify authentication, environment configuration or database schema unless explicitly requested
- Implement only minimal and safe changes
- Do not refactor unrelated code
