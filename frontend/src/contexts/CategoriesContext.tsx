import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  DEFAULT_CATEGORIES,
  DEFAULT_CATEGORY_BY_CODE,
} from "../data/defaultCategories";
import { getCategory, toCode } from "../utils/categoryUtils";
import { useLocalStorage } from "../hooks/trello/useLocalStorage";
import { useVerification } from "./VerificationContext";
import { Category, Transaction } from "../types";

const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL || "/api";
const STORAGE_KEY = "manageable_categories";

// Chaves legadas (string arrays) — migradas uma única vez para Category[].
const LEGACY_KEYS: Record<"expense" | "income" | "payment_method", string> = {
  expense: "manageable_expense_categories",
  income: "manageable_income_categories",
  payment_method: "manageable_payment_methods",
};

export type CategoryType = "expense" | "income" | "payment_method";

interface CategoriesContextValue {
  categories: Category[];
  expenseCategories: Category[];
  incomeCategories: Category[];
  paymentMethods: Category[];
  isLoading: boolean;
  refreshCategories: () => Promise<void>;
  addCategory: (
    type: CategoryType,
    data: Partial<Category> & { name: string },
  ) => Promise<boolean>;
  updateCategory: (
    type: CategoryType,
    nameOrCode: string,
    data: Partial<Category>,
  ) => Promise<boolean>;
  removeCategory: (
    type: CategoryType,
    nameOrCode: string,
    transactions?: Transaction[],
  ) => Promise<{ success: boolean; message?: string }>;
  resetToDefaults: (
    type: CategoryType,
    transactions?: Transaction[],
  ) => Promise<{ restored: number; preserved: number }>;
}

const CategoriesContext = createContext<CategoriesContextValue | null>(null);

// Constrói a lista de defaults a partir de um array de nomes legado (strings),
// resolvendo para o documento Category correspondente.
const migrateLegacy = (): Category[] => {
  const merged = new Map<string, Category>();

  // Se já houver a chave unificada, usa-a.
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) {
      const parsed = JSON.parse(existing);
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsed.forEach((c) => {
          if (c && typeof c === "object" && c.code && c.name) merged.set(c.code, c);
        });
      }
    }
  } catch {
    /* ignore */
  }

  // Migra as chaves legadas (strings) para documentos Category.
  (Object.keys(LEGACY_KEYS) as CategoryType[]).forEach((type) => {
    try {
      const raw = localStorage.getItem(LEGACY_KEYS[type]);
      if (!raw) return;
      const list: unknown = JSON.parse(raw);
      if (!Array.isArray(list)) return;
      list.forEach((item) => {
        const name =
          typeof item === "string"
            ? item
            : item && typeof item === "object" && (item as any).name
              ? (item as any).name
              : null;
        if (!name) return;
        const code = toCode(name);
        if (merged.has(code)) return; // já coberto
        const def = DEFAULT_CATEGORY_BY_CODE.get(code);
        merged.set(code, {
          id: `cat-${code}`,
          name: String(name),
          code,
          type,
          status: "active",
          // Código conhecido → aplica as flags/emoji/color do default para a
          // lógica semântica (aporte/rendimentos/benefício) funcionar no guest
          // mesmo migrando de chaves legadas. Preserva o nome do usuário.
          ...(def
            ? {
                emoji: def.emoji,
                color: def.color,
                isSavingsContribution: def.isSavingsContribution,
                isPassiveIncome: def.isPassiveIncome,
                isBenefit: def.isBenefit,
                isSystem: def.isSystem,
              }
            : {}),
        });
      });
    } catch {
      /* ignore */
    }
  });

  // Se nada foi encontrado, usa os defaults completos.
  if (merged.size === 0) {
    return DEFAULT_CATEGORIES;
  }

  // Garante que os defaults de sistema (Aporte, Saldo em Conta) existam mesmo
  // após migração de dados antigos.
  for (const def of DEFAULT_CATEGORIES) {
    if (def.isSystem && !merged.has(def.code)) merged.set(def.code, def);
  }
  return Array.from(merged.values());
};

export const CategoriesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { pin, isGuest, isInitializing } = useVerification();
  const isAuth = !isGuest && !!pin;

  const [guestCategories, setGuestCategories] = useLocalStorage<Category[]>(
    STORAGE_KEY,
    DEFAULT_CATEGORIES,
  );
  const [serverCategories, setServerCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // No modo guest, migra chaves legadas para a chave unificada na primeira carga.
  useEffect(() => {
    if (!isGuest) return;
    try {
      const existing = localStorage.getItem(STORAGE_KEY);
      if (!existing) setGuestCategories(migrateLegacy());
    } catch {
      /* ignore */
    }
  }, [isGuest, setGuestCategories]);

  // Backfill idempotente: categorias guest com código conhecido recebem as
  // flags/emoji/color do default (recupera dados migrados por versões antigas
  // do migrateLegacy que criavam docs pelados). Retorna `prev` quando nada
  // muda, então o React ignora o set sem re-render.
  useEffect(() => {
    if (!isGuest) return;
    setGuestCategories((prev) => {
      let changed = false;
      const next = prev.map((c) => {
        const def = DEFAULT_CATEGORY_BY_CODE.get(c.code);
        if (!def) return c;
        const stale =
          c.isSavingsContribution !== def.isSavingsContribution ||
          c.isPassiveIncome !== def.isPassiveIncome ||
          c.isBenefit !== def.isBenefit ||
          (c.emoji ?? def.emoji) !== def.emoji ||
          (c.color ?? def.color) !== def.color;
        if (!stale) return c;
        changed = true;
        return {
          ...c,
          emoji: c.emoji ?? def.emoji,
          color: c.color ?? def.color,
          isSavingsContribution: def.isSavingsContribution,
          isPassiveIncome: def.isPassiveIncome,
          isBenefit: def.isBenefit,
        };
      });
      return changed ? next : prev;
    });
  }, [isGuest, setGuestCategories]);

  const categories = isAuth ? serverCategories : guestCategories;

  const refreshCategories = useCallback(async () => {
    if (!isAuth) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/categories`, {
        headers: { "x-pin": pin },
      });
      if (!res.ok) throw new Error("Failed to fetch categories");
      const data: Category[] = await res.json();
      setServerCategories(data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuth, pin]);

  useEffect(() => {
    if (isInitializing) return;
    if (isAuth) refreshCategories();
  }, [isAuth, isInitializing, refreshCategories]);

  const byType = useCallback(
    (type: CategoryType) =>
      categories.filter((c) => c.type === type && c.status !== "deleted"),
    [categories],
  );

  const expenseCategories = useMemo(() => byType("expense"), [byType]);
  const incomeCategories = useMemo(() => byType("income"), [byType]);
  const paymentMethods = useMemo(() => byType("payment_method"), [byType]);

  // ---- Mutations (API no modo auth, localStorage no modo guest) ----

  const addCategory = useCallback(
    async (type: CategoryType, data: Partial<Category> & { name: string }) => {
      const name = data.name.trim();
      if (!name) return false;
      const code = data.code || toCode(name);

      if (isAuth) {
        try {
          const res = await fetch(`${API_BASE_URL}/categories`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-pin": pin },
            body: JSON.stringify({ ...data, name, code, type }),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => null);
            console.error(body?.message || "Falha ao criar categoria");
            return false;
          }
          await refreshCategories();
          return true;
        } catch (error) {
          console.error("Error creating category:", error);
          return false;
        }
      }

      const exists = guestCategories.some(
        (c) => c.type === type && (c.name === name || c.code === code),
      );
      if (exists) return false;
      setGuestCategories((prev) => [
        ...prev,
        {
          id: `cat-${code}-${Date.now()}`,
          name,
          code,
          type,
          status: "active",
          emoji: data.emoji || "",
          color: data.color || "#6366f1",
          isSavingsContribution: !!data.isSavingsContribution,
          isPassiveIncome: !!data.isPassiveIncome,
          isBenefit: !!data.isBenefit,
          includeInBalance: data.includeInBalance !== false,
          isSystem: !!data.isSystem,
        },
      ]);
      return true;
    },
    [isAuth, pin, guestCategories, setGuestCategories, refreshCategories],
  );

  // Atualiza campos editáveis de uma categoria/meio de pagamento (ex.: toggles
  // isBenefit/includeInBalance dos cartões de benefício).
  const updateCategory = useCallback(
    async (type: CategoryType, nameOrCode: string, data: Partial<Category>) => {
      const target = categories.find(
        (c) =>
          c.type === type &&
          (c.name === nameOrCode || c.code === nameOrCode || c._id === nameOrCode),
      );
      if (!target) return false;

      if (isAuth) {
        if (!target._id) return false;
        try {
          const res = await fetch(`${API_BASE_URL}/categories/${target._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "x-pin": pin },
            body: JSON.stringify(data),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => null);
            console.error(body?.message || "Falha ao atualizar categoria");
            return false;
          }
          await refreshCategories();
          return true;
        } catch (error) {
          console.error("Error updating category:", error);
          return false;
        }
      }

      setGuestCategories((prev) =>
        prev.map((c) =>
          c.type === type &&
          (c.id === target.id || c._id === target._id || c.code === target.code)
            ? { ...c, ...data }
            : c,
        ),
      );
      return true;
    },
    [categories, isAuth, pin, setGuestCategories, refreshCategories],
  );

  const removeCategory = useCallback(
    async (type: CategoryType, nameOrCode: string, transactions?: Transaction[]) => {
      const target = categories.find(
        (c) =>
          c.type === type &&
          (c.name === nameOrCode || c.code === nameOrCode || c._id === nameOrCode),
      );
      if (!target) return { success: false, message: "Categoria não encontrada." };
      if (target.isSystem) {
        return {
          success: false,
          message: `A categoria "${target.name}" é obrigatória e não pode ser excluída.`,
        };
      }

      // Verificação de uso (client-side) para feedback imediato.
      if (transactions?.length) {
        const inUse = transactions.some((t) => {
          const catValue = t.category;
          const catName =
            typeof catValue === "object" ? catValue.name : catValue;
          return catName === target.name || catName === target.code;
        });
        if (inUse) {
          return {
            success: false,
            message: `Não é possível excluir a categoria "${target.name}" pois ela está em uso em transações existentes.`,
          };
        }
      }

      if (isAuth) {
        try {
          const res = await fetch(`${API_BASE_URL}/categories/${target._id}`, {
            method: "DELETE",
            headers: { "x-pin": pin },
          });
          if (!res.ok) {
            const body = await res.json().catch(() => null);
            return {
              success: false,
              message: body?.message || "Não foi possível excluir a categoria.",
            };
          }
          await refreshCategories();
          return { success: true };
        } catch (error) {
          console.error("Error deleting category:", error);
          return { success: false, message: "Erro ao excluir categoria." };
        }
      }

      setGuestCategories((prev) =>
        prev.filter((c) => !(c.type === type && c.id === target.id)),
      );
      return { success: true };
    },
    [categories, isAuth, pin, setGuestCategories, refreshCategories],
  );

  const resetToDefaults = useCallback(
    async (type: CategoryType, transactions?: Transaction[]) => {
      if (isAuth) {
        // API não tem "reset"; recria defaults ausentes via GET e preserva o resto.
        await refreshCategories();
        const current = serverCategories.filter((c) => c.type === type);
        const restored = DEFAULT_CATEGORIES.filter(
          (d) => d.type === type && !current.some((c) => c.code === d.code),
        ).length;
        return { restored, preserved: current.length };
      }

      const defaultsOfType = DEFAULT_CATEGORIES.filter((d) => d.type === type);
      const usedCategories = Array.from(
        new Set(
          (transactions ?? [])
            .filter((t) => {
              // Resolve o tipo pela lista de categorias (aceita documento populado
              // e o nome/código legado em string do modo guest). Fallback legado:
              // categoria que literalmente seja igual ao tipo ("expense"/"income").
              const resolved = getCategory(categories, t.category);
              if (resolved) return resolved.type === type;
              return t.category === type;
            })
            .map((t) =>
              typeof t.category === "object"
                ? (t.category as Category).code
                : toCode(t.category as string),
            ),
        ),
      );

      setGuestCategories((prev) => {
        const others = prev.filter((c) => c.type !== type);
        const restored = defaultsOfType.map((d) => ({ ...d, id: `cat-${d.code}` }));
        const preserved = usedCategories
          .map((code) => prev.find((c) => c.code === code))
          .filter((c): c is Category => Boolean(c))
          .filter((c) => !restored.some((r) => r.code === c.code));
        return [...others, ...restored, ...preserved];
      });

      return {
        restored: defaultsOfType.length,
        preserved: usedCategories.length,
      };
    },
    [isAuth, serverCategories, setGuestCategories, refreshCategories, categories],
  );

  const value: CategoriesContextValue = {
    categories,
    expenseCategories,
    incomeCategories,
    paymentMethods,
    isLoading,
    refreshCategories,
    addCategory,
    updateCategory,
    removeCategory,
    resetToDefaults,
  };

  return (
    <CategoriesContext.Provider value={value}>
      {children}
    </CategoriesContext.Provider>
  );
};

export const useCategoriesContext = () => {
  const ctx = useContext(CategoriesContext);
  if (!ctx) {
    throw new Error("useCategoriesContext deve ser usado dentro de <CategoriesProvider>");
  }
  return ctx;
};
