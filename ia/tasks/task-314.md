# Task — Issue #314

## What needs to be done
### ⚡ Opções do Workflow

- [ ] Modo Fast (ai-fast): Execução rápida, sem plano detalhado (2 min)
- [ ] Modo Zen (ai-zen): Tempo estendido para tarefas complexas (20 min)

### 🎯 Descrição da Tarefa

# Plano de Refatoração: Toggle de Filtros na TransactionList

Este plano descreve as alterações necessárias para adicionar a funcionalidade de "esconder/mostrar" os filtros na lista de transações, mantendo-os visíveis por padrão.

## 1. Alterações no Estado
Adicionar um novo estado no componente `TransactionList` para controlar a visibilidade dos filtros.

```typescript
const [showFilters, setShowFilters] = useState(true);
```

## 2. Interface (UI)

### Botão de Toggle
Adicionar um botão sutil no cabeçalho da lista (ao lado do total ou contador de itens) para alternar o estado `showFilters`.

- **Ícone**: Utilizar o ícone `Filter` (já importado).
- **Estilo**: `variant="ghost"`, tamanho pequeno (`sm`), com uma transição suave.
- **Texto**: Opcional, mas um ícone com um "badge" ou mudança de cor/opacidade quando inativo é o ideal para ser "sutil".

### Container de Filtros
Envolver o bloco de filtros em uma lógica condicional ou aplicar classes CSS para animação de colapso.

```tsx
{showFilters && (
  <div className="space-y-4 relative z-30 animate-in fade-in duration-300">
    {/* Filtros existentes */}
  </div>
)}
```

## 3. Localização Sugerida
O botão de toggle pode ser inserido logo após o contador de itens/excluídos:

```tsx
<Button 
  onClick={() => setShowFilters(!showFilters)}
  variant={showFilters ? 'primary' : 'ghost'}
  size="sm"
  className="h-6 text-[10px] px-2 py-0"
>
  <Filter className="w-3 h-3 mr-1" />
  Filtros
  {showFilters ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
</Button>
```

## 4. Passos de Implementação
1. Localizar a declaração de estados no `TransactionList.tsx`.
2. Adicionar o estado `showFilters`.
3. Localizar o cabeçalho onde o `Total` e os contadores de itens são exibidos.
4. Inserir o botão de toggle.
5. Envolver o bloco `{/* Filters */}` com a condição `{showFilters && ...}`.
6. Testar a persistência visual (garantir que ao mudar de aba ou recarregar, volte a `true` conforme solicitado, ou decidir se deve persistir em `localStorage`). *Nota: O pedido especificou que ao entrar na lista o padrão é não estar "hide", então o estado inicial `true` sem persistência atende.*


## Rules
- Follow existing code patterns, file structure and naming conventions
- Frontend is under frontend/ (React, TypeScript, Vite, Tailwind CSS)
- Backend is under backend/ (Node.js, Express, MongoDB/Mongoose)
- Do not modify unrelated files
- Do not change package.json, lock files or config files unless explicitly required
- Never modify authentication, environment configuration or database schema unless explicitly requested
- Implement only minimal and safe changes
- Do not refactor unrelated code
