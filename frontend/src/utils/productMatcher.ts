import { ReceiptItem, StructuredNotes, Transaction } from "../types";

import { parseLocalDate } from "./helpers";

export interface RawItemPurchase {
  date: string;
  price: number; // Unit price (e.g. per unit or per kg)
  quantity: number;
  totalPrice: number;
  originalName: string;
  transactionDescription: string;
  transactionId?: string;
}

export interface NestedVariant {
  originalName: string;
  count: number;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  latestPrice: number;
  latestDate: string;
  purchases: RawItemPurchase[];
}

export interface ProductStats {
  min: number;
  max: number;
  avg: number;
  latestPrice: number;
  firstPrice: number;
  priceChangePct: number;
  priceTrend: "up" | "down" | "stable";
  minPurchase?: RawItemPurchase;
  maxPurchase?: RawItemPurchase;
  latestPurchase?: RawItemPurchase;
}

export interface GroupedProductCluster {
  id: string;
  displayName: string;
  size?: string;
  isWeighed: boolean;
  totalPurchases: number;
  variantCount: number;
  variants: NestedVariant[];
  allPurchases: RawItemPurchase[];
  stats: ProductStats;
}

export interface ItemSignature {
  rawName: string;
  cleanName: string;
  tokens: string[];
  size?: string;
  isWeighed: boolean;
  qualifiers: Set<string>;
}

// Map of common retail receipt abbreviations used across Brazilian supermarkets
export const COMMON_RETAIL_ABBREVIATIONS: Record<string, string> = {
  // Laticínios e Mercearia
  marg: "margarina",
  margar: "margarina",
  mant: "manteiga",
  manteig: "manteiga",
  lt: "leite",
  le: "leite",
  int: "integral",
  integ: "integral",
  desn: "desnatado",
  desnat: "desnatado",
  semidesn: "semidesnatado",
  semides: "semidesnatado",
  semid: "semidesnatado",
  cond: "condensado",
  condens: "condensado",
  crm: "creme",
  crem: "creme",
  qjo: "queijo",
  qj: "queijo",
  queij: "queijo",
  pres: "presunto",
  presunt: "presunto",
  req: "requeijao",
  requeij: "requeijao",
  iog: "iogurte",
  iogur: "iogurte",
  muss: "mussarela",
  mussar: "mussarela",
  parm: "parmesao",
  parmes: "parmesao",
  prat: "prato",
  prov: "provolone",

  // Hortifruti / Produtos Pesados
  tom: "tomate",
  ceb: "cebola",
  bat: "batata",
  cen: "cenoura",
  ban: "banana",
  mac: "maca",
  melanc: "melancia",
  lar: "laranja",
  lim: "limao",
  alm: "alface",
  alc: "alcatra",
  alcat: "alcatra",
  pat: "patinho",
  cost: "costela",
  frg: "frango",
  frang: "frango",
  ling: "linguica",
  lingui: "linguica",
  pican: "picanha",
  moida: "moida",
  bov: "bovino",
  bovina: "bovina",
  suin: "suino",
  suina: "suina",
  gran: "granel",
  cx: "coxa",
  sbcoxa: "sobrecoxa",

  // Bebidas
  refri: "refrigerante",
  refrig: "refrigerante",
  cerv: "cerveja",
  cervej: "cerveja",
  sc: "suco",
  suc: "suco",
  ag: "agua",
  min: "mineral",
  guar: "guarana",

  // Matinais / Padaria / Despensa
  arr: "arroz",
  feij: "feijao",
  macar: "macarrao",
  mass: "massa",
  ol: "oleo",
  az: "azeite",
  azeit: "azeite",
  vin: "vinagre",
  bisc: "biscoito",
  bol: "bolacha",
  choc: "chocolate",
  acuc: "acucar",
  ac: "acucar",
  cf: "cafe",
  mlh: "molho",
  ext: "extrato",
  far: "farinha",
  pao: "pao",
  torr: "torrada",

  // Limpeza e Higiene
  det: "detergente",
  deterg: "detergente",
  sab: "sabonete",
  sabon: "sabonete",
  amac: "amaciante",
  desod: "desodorante",
  des: "desodorante",
  sh: "shampoo",
  shamp: "shampoo",
  condic: "condicionador",
  pap: "papel",
  hig: "higienico",
  desinf: "desinfetante",

  // Principais marcas frequentes
  bec: "becel",
  pirac: "piracanjuba",
  itamb: "itambe",
  nest: "nestle",
  qual: "qualy",
  perd: "perdigao",
  sear: "seara",
  sad: "sadia",
  vig: "vigor",
  hellm: "hellmanns",
  hnz: "heinz",
  camil: "camil",
};

// Generic noise words that add no distinguishing value
const NOISE_TOKENS = new Set([
  "un",
  "und",
  "unid",
  "unidade",
  "unidades",
  "pct",
  "pcte",
  "pacote",
  "pacotes",
  "cx",
  "caixa",
  "caixas",
  "lt",
  "lata",
  "latas",
  "tipo",
  "tp",
  "marca",
  "novo",
  "nova",
  "original",
  "promo",
  "promocao",
  "oferta",
  "lv",
  "pg",
  "leve",
  "pague",
  "tradicional",
  "especial",
  "nacional",
  "importado",
  "de",
  "do",
  "da",
  "dos",
  "das",
  "com",
  "sem",
  "em",
  "para",
  "e",
]);

/**
 * Strips diacritics and converts to lower case
 */
export function removeAccents(str: string): string {
  if (!str) return "";
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Computes Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Normalizes size/weight string (e.g. "0.5kg" -> "500g", "1000ml" -> "1l")
 */
export function normalizeSize(rawSize: string): string {
  const match = rawSize.match(/^(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml|un)$/i);
  if (!match) return rawSize.toLowerCase();

  const num = parseFloat(match[1].replace(",", "."));
  const unit = match[2].toLowerCase();

  if (unit === "kg") {
    if (num < 1 && num > 0) {
      return `${Math.round(num * 1000)}g`;
    }
    return `${num}kg`;
  }
  if (unit === "g") {
    if (num >= 1000 && num % 1000 === 0) {
      return `${num / 1000}kg`;
    }
    return `${Math.round(num)}g`;
  }
  if (unit === "l") {
    if (num < 1 && num > 0) {
      return `${Math.round(num * 1000)}ml`;
    }
    return `${num}l`;
  }
  if (unit === "ml") {
    if (num >= 1000 && num % 1000 === 0) {
      return `${num / 1000}l`;
    }
    return `${Math.round(num)}ml`;
  }

  return `${num}${unit}`;
}

/**
 * Parses raw receipt string into a structured signature for matching
 */
export function parseItemSignature(
  rawName: string,
  qty = 1,
): ItemSignature {
  const cleanRaw = removeAccents(rawName.toLowerCase())
    .replace(/[^\w\s/.,-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const qualifiers = new Set<string>();

  // Check milk type qualifiers
  if (/\b(desnatado|desnat|desn)\b/.test(cleanRaw)) {
    qualifiers.add("desnatado");
  } else if (/\b(semidesnatado|semidesn|semides|semid)\b/.test(cleanRaw)) {
    qualifiers.add("semidesnatado");
  } else if (/\b(integral|integ|int)\b/.test(cleanRaw)) {
    qualifiers.add("integral");
  }

  // Check salt qualifiers
  if (/\b(c\s*\/?\s*sal|com\s+sal|csal)\b/.test(cleanRaw)) {
    qualifiers.add("com_sal");
  } else if (/\b(s\s*\/?\s*sal|sem\s+sal|ssal)\b/.test(cleanRaw)) {
    qualifiers.add("sem_sal");
  }

  // Check sugar/diet qualifiers
  if (/\b(zero|diet|light)\b/.test(cleanRaw)) {
    qualifiers.add("zero");
  }

  // Check weighed indicator
  const isWeighedByText =
    /\b(kg|kilo|quilo|a\s+granel|granel)\b/.test(cleanRaw) ||
    cleanRaw.endsWith(" kg") ||
    cleanRaw.endsWith(" kg.") ||
    cleanRaw.endsWith("/kg");
  const isWeighedByQty = qty > 0 && qty % 1 !== 0; // Float qty e.g. 0.450
  const isWeighed = isWeighedByText || isWeighedByQty;

  // Extract explicit pack size/volume (e.g. 500g, 1kg, 2l, 350ml, 900ml)
  let extractedSize: string | undefined;
  const sizeMatch = cleanRaw.match(
    /\b(\d+(?:[.,]\d+)?)\s*(kg|kilos?|quilos?|g|gr|gramas?|l|litros?|ml|un|und)\b/i,
  );

  if (sizeMatch) {
    const rawVal = sizeMatch[1];
    let rawUnit = sizeMatch[2].toLowerCase();
    if (rawUnit.startsWith("kilo") || rawUnit.startsWith("quilo")) rawUnit = "kg";
    else if (rawUnit.startsWith("gr") || rawUnit.startsWith("grama")) rawUnit = "g";
    else if (rawUnit.startsWith("litro")) rawUnit = "l";
    else if (rawUnit.startsWith("und")) rawUnit = "un";

    extractedSize = normalizeSize(`${rawVal}${rawUnit}`);
  } else if (isWeighed) {
    extractedSize = "kg";
  }

  // Tokenize and clean tokens
  // Remove size string from token extraction
  let nameWithoutSize = cleanRaw;
  if (sizeMatch) {
    nameWithoutSize = nameWithoutSize.replace(sizeMatch[0], " ");
  }

  // Remove trailing internal store codes/barcodes (e.g. "001234")
  nameWithoutSize = nameWithoutSize.replace(/\b\d{4,}\b/g, " ");

  const rawTokens = nameWithoutSize
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !/^\d+$/.test(t));

  const tokens: string[] = [];
  for (const t of rawTokens) {
    const expanded = COMMON_RETAIL_ABBREVIATIONS[t] || t;
    if (!NOISE_TOKENS.has(expanded) && !NOISE_TOKENS.has(t)) {
      tokens.push(expanded);
    }
  }

  return {
    rawName,
    cleanName: cleanRaw,
    tokens,
    size: extractedSize,
    isWeighed,
    qualifiers,
  };
}

/**
 * Checks if two tokens match (exact, abbreviation, prefix, or minor typo)
 */
export function areTokensMatching(t1: string, t2: string): boolean {
  if (t1 === t2) return true;

  const exp1 = COMMON_RETAIL_ABBREVIATIONS[t1] || t1;
  const exp2 = COMMON_RETAIL_ABBREVIATIONS[t2] || t2;
  if (exp1 === exp2) return true;

  // Prefix matching (e.g. "marg" matches "margarina", "bec" matches "becel")
  const minLen = Math.min(t1.length, t2.length);
  if (minLen >= 3) {
    if (t1.startsWith(t2) || t2.startsWith(t1)) return true;
    if (exp1.startsWith(exp2) || exp2.startsWith(exp1)) return true;
  }

  // Typo tolerance
  if (t1.length >= 5 && t2.length >= 5) {
    if (levenshteinDistance(t1, t2) <= 1) return true;
  }
  if (t1.length >= 8 && t2.length >= 8) {
    if (levenshteinDistance(t1, t2) <= 2) return true;
  }

  return false;
}

/**
 * Checks if qualifiers conflict (e.g. "integral" vs "desnatado", "com_sal" vs "sem_sal")
 */
export function haveConflictingQualifiers(
  qA: Set<string>,
  qB: Set<string>,
): boolean {
  if (qA.has("integral") && (qB.has("desnatado") || qB.has("semidesnatado"))) return true;
  if (qB.has("integral") && (qA.has("desnatado") || qA.has("semidesnatado"))) return true;
  if (qA.has("desnatado") && qB.has("semidesnatado")) return true;
  if (qB.has("desnatado") && qA.has("semidesnatado")) return true;

  if (qA.has("com_sal") && qB.has("sem_sal")) return true;
  if (qB.has("com_sal") && qA.has("sem_sal")) return true;

  if (qA.has("zero") !== qB.has("zero") && (qA.size > 0 && qB.size > 0)) {
    // One explicitly marked zero and the other not
    if (qA.has("zero") || qB.has("zero")) return true;
  }

  return false;
}

/**
 * Calculates similarity score between two item signatures (0 to 1)
 */
export function calculateItemSimilarity(
  sigA: ItemSignature,
  sigB: ItemSignature,
): number {
  // 1. Conflicting qualifiers immediately reject match
  if (haveConflictingQualifiers(sigA.qualifiers, sigB.qualifiers)) {
    return 0;
  }

  // 2. Conflicting pack sizes immediately reject match
  // e.g. 500g vs 1kg, 350ml vs 2l
  if (sigA.size && sigB.size && sigA.size !== sigB.size) {
    // Exception: weighed produce where one note wrote "kg" and other didn't have size
    const isBothWeighed = sigA.isWeighed && sigB.isWeighed;
    if (!isBothWeighed) {
      return 0;
    }
  }

  if (sigA.tokens.length === 0 || sigB.tokens.length === 0) {
    return 0;
  }

  // 3. Count matching tokens
  const shorter = sigA.tokens.length <= sigB.tokens.length ? sigA.tokens : sigB.tokens;
  const longer = sigA.tokens.length <= sigB.tokens.length ? sigB.tokens : sigA.tokens;

  let matchedCount = 0;
  const usedIndices = new Set<number>();

  for (const sTok of shorter) {
    for (let i = 0; i < longer.length; i++) {
      if (!usedIndices.has(i) && areTokensMatching(sTok, longer[i])) {
        matchedCount++;
        usedIndices.add(i);
        break;
      }
    }
  }

  const overlapRatio = matchedCount / shorter.length;

  // If shorter has 1 token, require exact/prefix match and no extra conflicting brand in longer
  if (shorter.length === 1) {
    if (longer.length > 2) return 0; // Too broad
    return overlapRatio === 1 ? 0.85 : 0;
  }

  // If at least 2 tokens match and all (or almost all) shorter tokens match
  if (shorter.length >= 2 && matchedCount >= 2 && overlapRatio >= 0.8) {
    return overlapRatio;
  }

  return overlapRatio >= 0.75 ? overlapRatio : 0;
}

/**
 * Formats a raw product name into a clean, human-readable Title Case string
 */
export function formatToTitleCase(str: string): string {
  if (!str) return "";

  // Common retail acronyms to preserve or uppercase
  const preserveUpper = new Set(["uht", "kg", "ml", "pet", "zero", "rgb"]);

  return str
    .toLowerCase()
    .replace(/[^\w\s/.,-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word) => {
      if (preserveUpper.has(word)) return word.toUpperCase();
      if (word.length <= 2 && !/^\d/.test(word)) return word.toLowerCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Picks the best display name from a collection of raw names
 */
export function pickCanonicalDisplayName(
  variants: string[],
  size?: string,
  isWeighed = false,
): string {
  if (variants.length === 0) return "Produto Desconhecido";

  // Pick the variant with the most descriptive words (longest without being noisy)
  const sorted = [...variants].sort((a, b) => {
    // Prefer variants that don't have heavy abbreviations
    const wordsA = a.split(/\s+/).length;
    const wordsB = b.split(/\s+/).length;
    if (wordsA !== wordsB) return wordsB - wordsA;
    return b.length - a.length;
  });

  const best = sorted[0];

  // Clean and format Title Case
  let formatted = formatToTitleCase(best);

  // If size is known and not already present in the formatted name, append it
  if (size && size !== "kg" && !formatted.toLowerCase().includes(size.toLowerCase())) {
    formatted = `${formatted} ${size}`;
  } else if (isWeighed && !formatted.toLowerCase().includes("kg")) {
    formatted = `${formatted} (kg)`;
  }

  return formatted;
}

/**
 * Main Clustering Function:
 * Groups receipt items from all transactions into intelligent clusters
 */
export function clusterTransactionsItems(
  transactions: Transaction[],
  showDeleted: boolean,
): GroupedProductCluster[] {
  interface ClusterBuilder {
    id: string;
    signatures: ItemSignature[];
    rawNames: Set<string>;
    size?: string;
    isWeighed: boolean;
    purchases: RawItemPurchase[];
  }

  const clusters: ClusterBuilder[] = [];

  transactions.forEach((t: Transaction) => {
    if (showDeleted) {
      if (t.status !== "deleted") return;
    } else {
      if (t.status === "deleted") return;
    }

    let items: ReceiptItem[] = [];
    let storeName = "";

    if (t.notes) {
      if (
        typeof t.notes === "object" &&
        t.notes !== null &&
        "items" in t.notes &&
        Array.isArray((t.notes as StructuredNotes).items)
      ) {
        items = (t.notes as StructuredNotes).items || [];
        if (typeof (t.notes as Record<string, unknown>).store === "string") {
          storeName = (
            (t.notes as Record<string, unknown>).store as string
          ).trim();
        }
      } else if (typeof t.notes === "string") {
        try {
          const parsed = JSON.parse(t.notes);
          if (Array.isArray(parsed.items)) {
            items = parsed.items;
          }
          if (typeof parsed.store === "string") {
            storeName = parsed.store.trim();
          }
        } catch {
          // Not JSON
        }
      }
    }

    const txDescription =
      t.description?.trim() || storeName || "Transação sem descrição";

    items.forEach((item) => {
      const rawName = (item.description || item.name || "").trim();
      const unitPrice = item.unitPrice || item.price;

      if (!rawName || typeof unitPrice !== "number" || unitPrice <= 0) return;

      // Skip discount totals or negative adjustments
      if (rawName.toLowerCase().includes("descontos")) return;

      const qty = typeof item.qty === "number" ? item.qty : (typeof item.quantity === "number" ? item.quantity : 1);
      const totalPrice = typeof item.totalPrice === "number" ? item.totalPrice : (typeof (item as Record<string, unknown>).totalItemPrice === "number" ? (item as Record<string, unknown>).totalItemPrice as number : qty * unitPrice);

      const purchase: RawItemPurchase = {
        date: t.date,
        price: unitPrice,
        quantity: qty,
        totalPrice,
        originalName: rawName,
        transactionDescription: txDescription,
        transactionId: t.id || t._id,
      };

      const sig = parseItemSignature(rawName, qty);

      // Find best matching cluster
      let bestCluster: ClusterBuilder | null = null;
      let highestScore = 0;

      for (const cluster of clusters) {
        // Compare with all signatures in the cluster
        for (const existingSig of cluster.signatures) {
          const score = calculateItemSimilarity(sig, existingSig);
          if (score > highestScore && score >= 0.75) {
            highestScore = score;
            bestCluster = cluster;
          }
        }
      }

      if (bestCluster) {
        bestCluster.signatures.push(sig);
        bestCluster.rawNames.add(rawName);
        bestCluster.purchases.push(purchase);
        if (!bestCluster.size && sig.size) {
          bestCluster.size = sig.size;
        }
        if (sig.isWeighed) {
          bestCluster.isWeighed = true;
        }
      } else {
        const newId = `cluster_${clusters.length + 1}_${Math.random().toString(36).substring(2, 7)}`;
        clusters.push({
          id: newId,
          signatures: [sig],
          rawNames: new Set([rawName]),
          size: sig.size,
          isWeighed: sig.isWeighed,
          purchases: [purchase],
        });
      }
    });
  });

  // Convert builders to finalized GroupedProductCluster objects
  const result: GroupedProductCluster[] = clusters.map((c) => {
    // Sort all purchases chronologically
    const sortedPurchases = [...c.purchases].sort(
      (a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime(),
    );

    const prices = sortedPurchases.map((p) => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((acc, v) => acc + v, 0) / prices.length;
    const latestPrice = sortedPurchases[sortedPurchases.length - 1].price;
    const firstPrice = sortedPurchases[0].price;
    const priceChangePct =
      firstPrice > 0 ? ((latestPrice - firstPrice) / firstPrice) * 100 : 0;

    let priceTrend: "up" | "down" | "stable" = "stable";
    if (priceChangePct > 1) priceTrend = "up";
    else if (priceChangePct < -1) priceTrend = "down";

    const minPurchase = sortedPurchases.find((p) => p.price === min);
    const maxPurchase = sortedPurchases.find((p) => p.price === max);
    const latestPurchase = sortedPurchases[sortedPurchases.length - 1];

    // Group nested variants by exact originalName
    const variantMap = new Map<string, RawItemPurchase[]>();
    sortedPurchases.forEach((p) => {
      const list = variantMap.get(p.originalName) || [];
      list.push(p);
      variantMap.set(p.originalName, list);
    });

    const variants: NestedVariant[] = Array.from(variantMap.entries()).map(
      ([origName, pList]) => {
        const vPrices = pList.map((p) => p.price);
        const vMin = Math.min(...vPrices);
        const vMax = Math.max(...vPrices);
        const vAvg = vPrices.reduce((acc, v) => acc + v, 0) / vPrices.length;
        const vLatest = pList[pList.length - 1];

        return {
          originalName: origName,
          count: pList.length,
          minPrice: vMin,
          maxPrice: vMax,
          avgPrice: vAvg,
          latestPrice: vLatest.price,
          latestDate: vLatest.date,
          purchases: pList,
        };
      },
    );

    // Sort variants by count descending
    variants.sort((a, b) => b.count - a.count);

    const displayName = pickCanonicalDisplayName(
      Array.from(c.rawNames),
      c.size,
      c.isWeighed,
    );

    return {
      id: c.id,
      displayName,
      size: c.size,
      isWeighed: c.isWeighed,
      totalPurchases: sortedPurchases.length,
      variantCount: variants.length,
      variants,
      allPurchases: sortedPurchases,
      stats: {
        min,
        max,
        avg,
        latestPrice,
        firstPrice,
        priceChangePct,
        priceTrend,
        minPurchase,
        maxPurchase,
        latestPurchase,
      },
    };
  });

  // Sort clusters: multi-purchase or multi-variant items first, then by total purchases descending
  result.sort((a, b) => {
    if (a.totalPurchases !== b.totalPurchases) {
      return b.totalPurchases - a.totalPurchases;
    }
    return b.variantCount - a.variantCount;
  });

  return result;
}
