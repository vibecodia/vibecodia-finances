# Task — Issue #321

## What needs to be done
### 🎯 Descrição da Tarefa

# Contexto e Objetivo
Precisamos corrigir o comportamento e a experiência de usuário (UX) do componente `AmountRangeSlider`. Atualmente, ele está operando de forma linear (centavo por centavo), o que gera uma péssima experiência e exibe estados vazios. O objetivo é refatorá-lo para que ele faça "snap" (salte) estritamente pelos valores (amounts) reais existentes nas transações filtradas.

O componente deve ser baseado na estrutura e comportamento do `DailyDateSlider.tsx`.

# Arquivos Relacionados
- `frontend/src/components/TransactionList.tsx` (Componente pai / Estado global)
- `frontend/src/components/AmountRangeSlider.tsx` (Componente do slider de valor)
- `frontend/src/components/DailyDateSlider.tsx` (Referência visual e estrutural)

# Requisitos Específicos

## 1. Lógica de Escala Baseada em Índices (Essencial para UX)
- O slider NÃO deve usar valores monetários diretos como `min`, `max` ou `step` decimais (ex: step=0.01).
- No componente pai (`TransactionList`), extraia todas as transações disponíveis, mapeie apenas os valores (`amount`), remova duplicadas e ordene-os de forma crescente em um array de valores únicos (ex: `uniqueAmounts = [10.00, 50.50, 100.00, 500.00]`).
- O `AmountRangeSlider` deve usar os **índices desse array** como sua escala numérica interna (ex: `min={0}`, `max={uniqueAmounts.length - 1}`, `step={1}`).
- Ao arrastar os dois thumbs (inicial e final), o componente deve converter o índice selecionado de volta para o valor monetário real correspondente antes de disparar o callback de filtragem.

## 2. Interface e UX do AmountRangeSlider
- Deve conter dois thumbs (seletores) para delimitar o valor mínimo e máximo.
- Deve incluir Tooltips flutuantes ou indicadores visuais limpos exibindo os valores selecionados formatados.
- Deve suportar nativamente interações de mouse (drag-and-drop) e touch para dispositivos móveis.
- Deve manter consistência visual com o tema atual do projeto e com o `DailyDateSlider`.

## 3. Integração com TransactionList.tsx
- Posicionar o `AmountRangeSlider` logo abaixo do `DailyDateSlider`.
- Calcular dinamicamente o array de valores únicos sempre que a lista base de transações mudar, atualizando os limites do slider.
- Modificar a lógica do botão "Limpar Filtros" já existente na tela para que ele também resete o range do `AmountRangeSlider` para as posições extremas padrão (primeiro e último índice do array).

# Critérios de Aceitação
- O slider nunca deve parar em um valor centavoso intermediário que não exista em nenhuma transação da lista.
- Mover os seletores deve filtrar a lista de transações em tempo real.
- Resetar os filtros através do botão "Limpar" deve retornar os thumbs para o estado inicial sem quebras de renderização.
- Código TypeScript estrito: sem uso de `any` e sem erros de tipagem ou quebra de build do frontend.


## Rules
- Follow existing code patterns, file structure and naming conventions
- Frontend is under frontend/ (React, TypeScript, Vite, Tailwind CSS)
- Backend is under backend/ (Node.js, Express, MongoDB/Mongoose)
- Do not modify unrelated files
- Do not change package.json, lock files or config files unless explicitly required
- Never modify authentication, environment configuration or database schema unless explicitly requested
- Implement only minimal and safe changes
- Do not refactor unrelated code
