# Prompts de Refatoração — Trae.ai

---

## Prompt 1 — Generalizar Lógica de Benefícios (Flash/Vero → Genérico)

**Objetivo:** Refatorar o sistema de benefícios no Dashboard para um modelo genérico baseado em categorias flagadas pelo usuário, removendo toda lógica hardcoded de "Flash" e "Vero Card".

---

### CONTEXTO DO ESTADO ATUAL

- Dashboard possui lógica hardcoded de benefícios referenciando "Flash" e "Vero Card" por nome
- Transações são identificadas como benefício pelo `paymentMethod` hardcoded
- Existem `AccountSlider` individuais de Flash e Vero no Dashboard
- Chaves de localStorage com nomes específicos de Flash/Vero

---

### 1. REMOÇÃO DE REFERÊNCIAS ESPECÍFICAS

Busca global e remoção completa de:
- Strings literais: `"Flash"`, `"Vero"`, `"VeroCard"`, `"vero_card"`, `"flash"` usadas como identificadores de lógica de benefício
- Variáveis: `flashIncome`, `veroIncome`, `flashSpent`, `veroSpent`, `isFlash`, `isVero`
- Todas as chaves de localStorage contendo `flash` ou `vero`

**Nota:** Os valores `'flash'` e `'vero_card'` continuam existindo como IDs no Mongo nas transações históricas — não apagar dados. O que se remove é a lógica que trata esses IDs de forma especial no código.

---

### 2. MODELO DE DADOS — FLAG `isBenefit` NA CATEGORIA

A estrutura de categoria já existente deve ganhar um campo booleano `isBenefit`:

```ts
interface Category {
  name: string;
  type: 'expense' | 'income';
  isBenefit: boolean; // NOVO — true = income desta categoria conta como saldo de benefício
  status: 'active' | 'deleted';
}
```

---

### 3. `Settings.tsx` — FLAG NA EDIÇÃO DE CATEGORIA

Na seção de categorias já existente, ao criar ou editar uma categoria de **receita**, adicionar:

- Um toggle/checkbox com label `"Categoria de benefício"`
- Quando ativado, `isBenefit: true` é salvo junto ao objeto da categoria
- Sem seção nova separada — a flag vive dentro do card/form de categoria existente, seguindo o mesmo padrão visual atual

Remover completamente campos de split que referenciem Flash/Vero. Renomear para:

| Antigo | Novo |
|---|---|
| `flashSplitEnabled` / `veroSplitEnabled` | `benefitSplitEnabled` |
| `flashSplitAmount` / `veroSplitAmount` | `benefitSplitAmount` |

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

### 5. DASHBOARD — LÓGICA DE BENEFÍCIO GENÉRICA

```ts
const { benefitCategories } = useCategories('income');
// benefitCategories = categorias com isBenefit: true

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
{/* Substituir todos os AccountSlider individuais de Flash/Vero por este único: */}
<AccountSlider
  label="Benefício"
  income={benefitIncome}
  spent={benefitSpent}
/>
```

---

### 6. RESTRIÇÕES

- ❌ Não alterar nenhuma lógica fora deste escopo
- ❌ Não renomear componentes genéricos (`AccountSlider`, `TransactionList`, etc.)
- ❌ Não apagar dados históricos de Flash/Vero no Mongo
- ✅ Manter tipagem TypeScript consistente
- ✅ Atualizar testes que referenciem Flash/Vero para a nova nomenclatura genérica

---
---
