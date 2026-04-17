
## Prompt 2 — Categorias e Meios de Pagamento Dinâmicos (Estático → MongoDB)

**Objetivo:** Migrar categorias e meios de pagamento de arrays estáticos no frontend para entidades dinâmicas gerenciadas no MongoDB, com CRUD completo em Settings e soft delete.

---

### CONTEXTO DO ESTADO ATUAL

- `EXPENSE_CATEGORIES`, `INCOME_CATEGORIES` e `PAYMENT_METHODS` estão hardcoded em `helpers.ts`
- Categorias já existem no Mongo com shape `{ name: string, type: 'expense' | 'income' }`
- Transações salvam `category` como string (nome) e `paymentMethod` como string de id (ex: `'flash'`, `'vero_card'`)
- Settings já tem seções visuais de categorias e meios de pagamento — seguir exatamente esse padrão visual

---

### 1. SCHEMA MONGODB

#### Collection `categories` — adicionar campos novos

```ts
{
  name: { type: String, required: true },
  type: { type: String, enum: ['expense', 'income'], required: true },
  isBenefit: { type: Boolean, default: false }, // só relevante para type: 'income'
  status: { type: String, enum: ['active', 'deleted'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
}
```

#### Collection `paymentMethods` — nova collection

```ts
{
  id: { type: String, required: true, unique: true }, // ex: 'nubank', 'flash'
  label: { type: String, required: true },
  status: { type: String, enum: ['active', 'deleted'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
}
```

---

### 2. SEED DE MIGRAÇÃO (idempotente)

Script que popula o Mongo a partir dos arrays atuais do `helpers.ts`, sem duplicar se já existirem. Usar `insertMany` com `{ ordered: false }` + índice unique para ignorar duplicatas:

```ts
const expenseDefaults = ['Moradia','Dívidas','Educação','Serviços','Saúde',
  'Internet','Transporte','Entretenimento','Alimentação','Utilidades',
  'Beleza','Compras','Consumo','Aporte','Outros','Patrimônio'];

const incomeDefaults = ['Salário','Vale','Reembolsos','Aluguéis',
  'Premiação','Déc.Terceiro','Férias','Rendimentos'];

const paymentDefaults = [
  { id: 'pix', label: 'PIX' },
  { id: 'xp', label: 'XP' },
  { id: 'c6', label: 'C6 Bank' },
  { id: 'bradesco_t', label: 'Bradesco T' },
  { id: 'bradesco_r', label: 'Bradesco R' },
  { id: 'nubank', label: 'Nubank' },
  { id: 'vero_card', label: 'Vero Card' },
  { id: 'flash', label: 'Flash' },
  { id: 'saldo_conta', label: 'Saldo em Conta' },
];
```

---

### 3. ROTAS DE API

#### Categories

```
GET    /api/categories?type=expense|income   → lista status: active
POST   /api/categories                        → cria { name, type, isBenefit? }
PUT    /api/categories/:id                    → edita name e/ou isBenefit
DELETE /api/categories/:id                    → soft delete: status = 'deleted'
```

**Regra DELETE:** Não bloquear — soft delete apenas. Transações existentes mantêm a string de categoria intacta.

#### Payment Methods

```
GET    /api/payment-methods                   → lista status: active
POST   /api/payment-methods                   → cria { id, label }
PUT    /api/payment-methods/:id               → edita label apenas (id imutável)
DELETE /api/payment-methods/:id               → soft delete: status = 'deleted'
```

**Regra id:** Imutável após criação pois é o valor salvo nas transações históricas. Apenas `label` é editável.

---

### 4. FRONTEND — `helpers.ts`

Remover os três arrays estáticos: `EXPENSE_CATEGORIES`, `INCOME_CATEGORIES`, `PAYMENT_METHODS`.

Atualizar `formatPaymentMethod` para receber o array dinâmico como parâmetro:

```ts
export const formatPaymentMethod = (
  methodId: string | undefined,
  paymentMethods: { id: string; label: string }[]
): string => {
  if (!methodId) return 'Não informado';
  const found = paymentMethods.find(m => m.id === methodId);
  return found ? found.label : methodId;
};
```

Fazer busca global por importações de `EXPENSE_CATEGORIES`, `INCOME_CATEGORIES` e `PAYMENT_METHODS` e atualizar cada ocorrência para usar os hooks dinâmicos.

---

### 5. HOOKS

```ts
// useCategories.ts
export const useCategories = (type?: 'expense' | 'income') => {
  // GET /api/categories?type=...
  // Retorna: { categories, benefitCategories, isLoading, refetch, create, update, remove }
  // benefitCategories = categories.filter(c => c.isBenefit && c.type === 'income')
};

// usePaymentMethods.ts
export const usePaymentMethods = () => {
  // GET /api/payment-methods
  // Retorna: { paymentMethods, isLoading, refetch, create, update, remove }
};
```

---

### 6. `Settings.tsx` — CRUD VISUAL

Seguindo **exatamente** o padrão visual e de interação dos cards já existentes:

#### Seção "Categorias de Despesa" e "Categorias de Receita"
- Listar categorias ativas da API
- Botão `+` para adicionar nova categoria
- Botão de editar nome por item
- Botão de deletar por item (soft delete)
- **Apenas nas categorias de receita:** toggle `"Categoria de benefício"` por item — chama `PUT` com `isBenefit: true/false`

#### Seção "Meios de Pagamento"
- Listar meios ativos da API
- Botão `+` para adicionar (campos: `id` slug + `label` display)
- Botão de editar **somente o label**
- Botão de deletar (soft delete)
- Aviso inline ao tentar editar id: *"O ID é usado nas transações existentes e não pode ser alterado"*

---

### 7. RESTRIÇÕES

- ❌ Não alterar lógica de transações, recorrência, metas ou qualquer outro domínio
- ❌ Não alterar o `id` de meios de pagamento existentes no Mongo
- ❌ Não fazer hard delete em nenhuma categoria ou meio de pagamento
- ✅ Transações com categoria/meio deletado continuam exibindo o valor salvo
- ✅ O seed de migração é idempotente — pode rodar múltiplas vezes sem duplicar
- ✅ Dados históricos de Flash e Vero no Mongo são preservados integralmente

---
---

## Prompt Unificado — Ambas as Refatorações Combinadas

**Objetivo:** Duas refatorações combinadas: (1) migrar categorias e meios de pagamento de arrays estáticos para entidades dinâmicas no MongoDB com CRUD em Settings, e (2) generalizar toda a lógica de benefícios removendo referências hardcoded a "Flash" e "Vero Card".

---

### CONTEXTO DO ESTADO ATUAL

- `EXPENSE_CATEGORIES`, `INCOME_CATEGORIES` e `PAYMENT_METHODS` estão hardcoded em `helpers.ts`
- Categorias já existem no Mongo com shape `{ name: string, type: 'expense' | 'income' }`
- Transações salvam `category` como string (nome) e `paymentMethod` como string de id (ex: `'flash'`, `'vero_card'`)
- Dashboard possui lógica hardcoded de benefícios referenciando "Flash" e "Vero Card" por nome
- Settings já tem seções visuais de categorias e meios de pagamento — seguir exatamente esse padrão visual

---

### 1. REMOÇÃO DE REFERÊNCIAS HARDCODED A FLASH/VERO

Busca global no projeto inteiro. Remover ou renomear **todas** as ocorrências de:

- Strings literais: `"Flash"`, `"Vero"`, `"VeroCard"`, `"vero_card"`, `"flash"` usadas como identificadores de lógica de benefício
- Variáveis: `flashIncome`, `veroIncome`, `flashSpent`, `veroSpent`, `isFlash`, `isVero`
- Chaves de localStorage: qualquer key contendo `flash` ou `vero`
- `AccountSlider` individuais de Flash e Vero no Dashboard

**Nota:** Os valores `'flash'` e `'vero_card'` continuam existindo como IDs no Mongo nas transações históricas — não apagar dados. O que se remove é a lógica que trata esses IDs de forma especial no código.

---

### 2. SCHEMA MONGODB

#### Collection `categories` — adicionar campos novos

```ts
{
  name: { type: String, required: true },
  type: { type: String, enum: ['expense', 'income'], required: true },
  isBenefit: { type: Boolean, default: false }, // só relevante para type: 'income'
  status: { type: String, enum: ['active', 'deleted'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
}
```

#### Collection `paymentMethods` — nova collection

```ts
{
  id: { type: String, required: true, unique: true },
  label: { type: String, required: true },
  status: { type: String, enum: ['active', 'deleted'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
}
```

---

### 3. SEED DE MIGRAÇÃO (idempotente)

```ts
const expenseDefaults = ['Moradia','Dívidas','Educação','Serviços','Saúde',
  'Internet','Transporte','Entretenimento','Alimentação','Utilidades',
  'Beleza','Compras','Consumo','Aporte','Outros','Patrimônio'];

const incomeDefaults = ['Salário','Vale','Reembolsos','Aluguéis',
  'Premiação','Déc.Terceiro','Férias','Rendimentos'];

const paymentDefaults = [
  { id: 'pix', label: 'PIX' },
  { id: 'xp', label: 'XP' },
  { id: 'c6', label: 'C6 Bank' },
  { id: 'bradesco_t', label: 'Bradesco T' },
  { id: 'bradesco_r', label: 'Bradesco R' },
  { id: 'nubank', label: 'Nubank' },
  { id: 'vero_card', label: 'Vero Card' },
  { id: 'flash', label: 'Flash' },
  { id: 'saldo_conta', label: 'Saldo em Conta' },
];
// Usar insertMany com { ordered: false } + índice unique para ignorar duplicatas
```

---

### 4. MIGRAÇÃO DE localStorage

Na inicialização do app, executar uma vez:

```ts
const migrateLocalStorage = () => {
  const migrations: Record<string, string> = {
    "flashSplitEnabled": "benefitSplitEnabled",
    "flashSplitAmount": "benefitSplitAmount",
    "veroSplitEnabled": "benefitSplitEnabled",
    "veroSplitAmount": "benefitSplitAmount",
  };
  for (const [oldKey, newKey] of Object.entries(migrations)) {
    const val = localStorage.getItem(oldKey);
    if (val !== null && !localStorage.getItem(newKey)) {
      localStorage.setItem(newKey, val);
    }
    localStorage.removeItem(oldKey);
  }
};
```

---

### 5. ROTAS DE API

#### Categories

```
GET    /api/categories?type=expense|income   → lista status: active
POST   /api/categories                        → cria { name, type, isBenefit? }
PUT    /api/categories/:id                    → edita name e/ou isBenefit
DELETE /api/categories/:id                    → soft delete: status = 'deleted'
```

#### Payment Methods

```
GET    /api/payment-methods                   → lista status: active
POST   /api/payment-methods                   → cria { id, label }
PUT    /api/payment-methods/:id               → edita label apenas (id imutável)
DELETE /api/payment-methods/:id               → soft delete: status = 'deleted'
```

---

### 6. FRONTEND — `helpers.ts`

Remover os três arrays estáticos: `EXPENSE_CATEGORIES`, `INCOME_CATEGORIES`, `PAYMENT_METHODS`.

```ts
export const formatPaymentMethod = (
  methodId: string | undefined,
  paymentMethods: { id: string; label: string }[]
): string => {
  if (!methodId) return 'Não informado';
  const found = paymentMethods.find(m => m.id === methodId);
  return found ? found.label : methodId;
};
```

Busca global por importações das três constantes removidas e atualizar cada ocorrência para usar os hooks dinâmicos.

---

### 7. HOOKS

```ts
// useCategories.ts
export const useCategories = (type?: 'expense' | 'income') => {
  // GET /api/categories?type=...
  // Retorna: { categories, benefitCategories, isLoading, refetch, create, update, remove }
  // benefitCategories = categories.filter(c => c.isBenefit && c.type === 'income')
};

// usePaymentMethods.ts
export const usePaymentMethods = () => {
  // GET /api/payment-methods
  // Retorna: { paymentMethods, isLoading, refetch, create, update, remove }
};
```

---

### 8. `Settings.tsx` — CRUD VISUAL

Seguindo **exatamente** o padrão visual e de interação dos cards já existentes:

#### Seção "Categorias de Despesa" e "Categorias de Receita"
- Listar categorias ativas da API
- Botão `+` para adicionar nova categoria
- Botão de editar nome por item
- Botão de deletar por item (soft delete)
- **Apenas nas categorias de receita:** toggle `"Categoria de benefício"` por item — chama `PUT` com `isBenefit: true/false`

#### Seção "Meios de Pagamento"
- Listar meios ativos da API
- Botão `+` para adicionar (campos: `id` slug + `label` display)
- Botão de editar **somente o label**
- Botão de deletar (soft delete)
- Aviso inline: *"O ID é usado nas transações existentes e não pode ser alterado"*

Remover campos de split com referência a Flash/Vero. Usar `benefitSplitEnabled` e `benefitSplitAmount`.

---

### 9. DASHBOARD — LÓGICA DE BENEFÍCIO GENÉRICA

```ts
const { benefitCategories } = useCategories('income');

const isBenefitTransaction = (t: Transaction): boolean =>
  benefitCategories.some(c => c.name === t.category);

const benefitIncome = transactions
  .filter(t => t.type === 'income' && isBenefitTransaction(t))
  .reduce((sum, t) => sum + t.amount, 0);

const benefitSpent = transactions
  .filter(t => t.type === 'expense' && isBenefitTransaction(t))
  .reduce((sum, t) => sum + t.amount, 0);
```

```tsx
<AccountSlider
  label="Benefício"
  income={benefitIncome}
  spent={benefitSpent}
/>
```

---

### 10. RESTRIÇÕES

- ❌ Não alterar lógica de transações, recorrência, metas ou qualquer outro domínio
- ❌ Não alterar o `id` de meios de pagamento existentes no Mongo
- ❌ Não fazer hard delete em nenhuma categoria ou meio de pagamento
- ❌ Não apagar dados históricos de Flash/Vero no Mongo
- ✅ Transações com categoria/meio deletado continuam exibindo o valor salvo
- ✅ O seed de migração é idempotente — pode rodar múltiplas vezes sem duplicar
- ✅ Dados históricos de Flash e Vero no Mongo são preservados integralmente