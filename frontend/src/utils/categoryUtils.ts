import { Category, Transaction } from "../types";

/** Gera um slug a partir de um nome (minúsculas, sem acentos, espaços → '_'). */
export const toCode = (name: string): string =>
  String(name || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

// Utilitários de categoria. Centralizam a resolução de um valor de categoria
// (nome legado | code | _id | documento completo) para o documento Category, e
// os checks semânticos que antes eram comparações de string espalhadas pelo
// código ("Aporte", "Rendimentos", "Flash"/"Vero Card").

/**
 * Resolve o valor de `category`/`paymentMethod` de uma transação para o
 * documento Category completo.
 *
 * Aceita:
 *   - Category (já resolvido/populado) → devolve direto
 *   - _id / code / name (string) → busca na lista fornecida
 */
export const getCategory = (
  categories: Category[] | undefined | null,
  value: string | Category | undefined | null,
): Category | undefined => {
  if (!value) return undefined;
  if (typeof value === "object") {
    if (value.code && value.type) return value;
    const id = value._id || value.id;
    if (id && categories) {
      const match = categories.find((c) => c._id === id || c.id === id);
      if (match) return match;
    }
    return value;
  }
  const stringValue = String(value).trim();
  const lowerValue = stringValue.toLowerCase();
  return categories?.find(
    (c) =>
      c._id === stringValue ||
      c.code === stringValue ||
      c.name === stringValue ||
      (c.name || "").toLowerCase() === lowerValue,
  );
};

/** era: `category === "Aporte"` */
export const isSavingsContribution = (
  value?: string | Category | null,
  categories?: Category[] | null,
): boolean => getCategory(categories, value)?.isSavingsContribution === true;

/** era: `category === "Resgate de Meta"` */
export const isSavingsWithdrawal = (
  value?: string | Category | null,
  categories?: Category[] | null,
): boolean => getCategory(categories, value)?.isSavingsWithdrawal === true;

/** era: `category === "Rendimentos"` */
export const isPassiveIncome = (
  value?: string | Category | null,
  categories?: Category[] | null,
): boolean => getCategory(categories, value)?.isPassiveIncome === true;

/** era: `paymentMethod === "Flash" || "Vero Card"` */
export const isBenefit = (
  value?: string | Category | null,
  categories?: Category[] | null,
): boolean => getCategory(categories, value)?.isBenefit === true;

/**
 * Lista os cartões de benefício configurados (meios de pagamento com a flag
 * `isBenefit`). Substitui a lista fixa ["Flash", "Vero Card"].
 */
export const getBenefitPaymentMethods = (
  categories?: Category[] | null,
): Category[] =>
  (categories ?? []).filter(
    (c) => c.type === "payment_method" && c.isBenefit && c.status !== "deleted",
  );

/** Nome de exibição (para selects/UI) a partir de qualquer forma de categoria. */
export const getCategoryName = (
  categories: Category[] | undefined | null,
  value?: string | Category | null,
): string => {
  const cat = getCategory(categories, value);
  return cat?.name ?? (typeof value === "string" ? value : value?.name ?? "Categoria");
};

/** Nome do meio de pagamento (substitui formatPaymentMethod). */
export const getPaymentMethodName = (
  paymentMethods: Category[] | undefined | null,
  value?: string | Category | null,
): string => {
  if (!value) return "Não informado";
  const cat = getCategory(paymentMethods, value);
  return cat?.name ?? (typeof value === "string" ? value : value?.name ?? "Não informado");
};

/** Formata o valor de categoria para envio ao backend (aceita code/name/_id). */
export const formatCategoryForApi = (
  value: string | Category | undefined | null,
): string | undefined => {
  if (!value) return undefined;
  if (typeof value === "object") return value._id || value.code || value.name;
  return value;
};

/** Encontra a categoria de contribuição (aporte) na lista. */
export const getSavingsContributionCategory = (
  categories: Category[] | undefined | null,
): Category | undefined =>
  categories?.find((c) => c.isSavingsContribution === true);

/** Encontra a categoria de resgate de meta na lista. */
export const getSavingsWithdrawalCategory = (
  categories: Category[] | undefined | null,
): Category | undefined =>
  categories?.find((c) => c.isSavingsWithdrawal === true);

/** Encontra a categoria de renda passiva (rendimentos) na lista. */
export const getPassiveIncomeCategory = (
  categories: Category[] | undefined | null,
): Category | undefined => categories?.find((c) => c.isPassiveIncome === true);

/** Verifica se uma transação é um aporte (era: t.category === "Aporte"). */
export const isContributionTransaction = (
  t: Pick<Transaction, "category">,
  categories?: Category[] | null,
): boolean => isSavingsContribution(t.category, categories);

/** Verifica se uma transação é uma movimentação de meta (aporte ou resgate). */
export const isGoalMovementTransaction = (
  t: Pick<Transaction, "category">,
  categories?: Category[] | null,
): boolean => isSavingsContribution(t.category, categories) || isSavingsWithdrawal(t.category, categories);

/**
 * Compacta texto para casamento de substring tolerante a formatação: remove
 * acentos e separadores (espaço, "_", "-"). "Vero Card" / "vero_card" /
 * "Verocard" → "verocard". Usado pelo fallback legado do getBenefitCode para
 * que dados antigos (ex.: descrição "Verocard" sem espaço) ainda sejam
 * identificados como o cartão correto.
 */
const compactText = (s?: string | null): string =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/**
 * Retorna o `code` do benefício (ex.: "flash", "vero_card") caso a transação
 * seja um benefício (Flash / Vero Card); senão `null`.
 *
 * Prefere a flag `isBenefit` do meio de pagamento (Category com
 * type === "payment_method"). Mantém um fallback legado para transações antigas
 * / modo guest onde o benefício era identificado pelo texto da descrição ou
 * categoria (rendas Flash/Vero eram lançadas sem meio de pagamento).
 */
export const getBenefitCode = (
  t: Pick<Transaction, "description" | "category" | "paymentMethod">,
  categories?: Category[] | null,
): string | null => {
  if (!t) return null;
  const pmCat = getCategory(categories, t.paymentMethod);
  if (pmCat?.isBenefit) return pmCat.code;

  const desc = compactText(t.description);

  let catName = "";
  if (t.category && typeof t.category === "object") {
    const cat = t.category as Category;
    catName = compactText(`${cat.name || ""} ${cat.code || ""}`);
  } else if (typeof t.category === "string") {
    catName = compactText(t.category);
  }

  let pmText = "";
  if (t.paymentMethod && typeof t.paymentMethod === "object") {
    const pm = t.paymentMethod as Category;
    pmText = compactText(`${pm.name || ""} ${pm.code || ""}`);
  } else if (typeof t.paymentMethod === "string") {
    pmText = compactText(t.paymentMethod);
  }

  // Fallback legado: identifica o benefício pelo texto da transação usando os
  // NOME e CÓDIGO completos dos cartões configurados, compactados (ex.:
  // "cartaoalimentacao", "verocard") — substitui as substrings fixas
  // "vero"/"flash". Casar o nome/código inteiros evita falso-positivo: uma
  // descrição "Alimentação" (categoria de despesa) não contém o nome completo
  // compactado "cartaoalimentacao". O caminho autoritativo continua sendo a
  // flag isBenefit do meio de pagamento; este fallback só cobre dados antigos.
  const haystacks = [desc, catName, pmText];
  for (const pm of getBenefitPaymentMethods(categories)) {
    const name = compactText(pm.name);
    const code = compactText(pm.code);
    if (haystacks.some((h) => (name && h.includes(name)) || (code && h.includes(code)))) {
      return pm.code;
    }
  }
  return null;
};

/** Verifica se uma transação é um benefício (era: pm === "Flash" || "Vero Card"). */
export const isBenefitTransaction = (
  t: Pick<Transaction, "description" | "category" | "paymentMethod">,
  categories?: Category[] | null,
): boolean => getBenefitCode(t, categories) !== null;
