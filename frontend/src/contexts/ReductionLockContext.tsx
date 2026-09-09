import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

import {
  ExpenseReductionAlert,
  ReductionAlertLevel,
  ReductionLockConfig,
  ReductionWeek,
} from "../types/reductionLock";
import {
  checkExpenseReductionAlert,
  copyPlanToNextMonth,
  getDefaultWeeksForMonth,
  getInitialReductionConfig,
  REDUCTION_LOCK_STORAGE_KEY,
} from "../utils/reductionLockUtils";

import { useVerification } from "./VerificationContext";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

interface ReductionLockContextValue {
  config: ReductionLockConfig;
  isEnabled: boolean;
  setIsEnabled: (enabled: boolean) => void;
  monitoredPaymentMethods: string[];
  setMonitoredPaymentMethods: (methods: string[]) => void;
  togglePaymentMethod: (method: string) => void;
  getWeeksForMonth: (month: string) => ReductionWeek[];
  setWeeksForMonth: (month: string, weeks: ReductionWeek[]) => void;
  updateWeekRule: (
    month: string,
    weekId: string,
    category: string,
    level: ReductionAlertLevel,
  ) => void;
  setWeekAllCategories: (
    month: string,
    weekId: string,
    level: ReductionAlertLevel,
    categories: string[],
  ) => void;
  copyMonthRulesToNext: (month: string) => string;
  resetMonthRules: (month: string) => void;
  checkExpenseAlert: (params: {
    category: string;
    paymentMethod?: string;
    date: string;
    dueDate?: string;
  }) => ExpenseReductionAlert | null;
}

const ReductionLockContext = createContext<ReductionLockContextValue | null>(null);

export const ReductionLockProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isGuest, pin, isInitializing } = useVerification();
  const isAuth = !isGuest && !!pin;
  const [config, setConfig] = useState<ReductionLockConfig>(() =>
    getInitialReductionConfig(),
  );

  // Sync state changes to localStorage and MongoDB (if authenticated)
  const saveConfig = useCallback(
    (newConfig: ReductionLockConfig) => {
      setConfig(newConfig);
      try {
        localStorage.setItem(REDUCTION_LOCK_STORAGE_KEY, JSON.stringify(newConfig));
      } catch (err) {
        console.error("Erro ao salvar configuração localmente:", err);
      }

      if (isAuth && pin) {
        fetch(`${API_BASE_URL}/reduction-alerts`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-pin": pin,
          },
          body: JSON.stringify(newConfig),
        }).catch((err) => {
          console.error("Erro ao salvar alerta de redução no MongoDB:", err);
        });
      }
    },
    [isAuth, pin],
  );

  // Fetch from MongoDB upon initialization or authentication & auto-migrate from localStorage
  useEffect(() => {
    if (isInitializing || !isAuth || !pin) return;

    let isMounted = true;
    const loadFromMongo = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/reduction-alerts`, {
          headers: { "x-pin": pin },
        });
        if (!res.ok) return;

        const serverData = await res.json();
        const hasServerData =
          serverData &&
          (serverData.enabled ||
            (serverData.monitoredPaymentMethods && serverData.monitoredPaymentMethods.length > 0) ||
            (serverData.plansByMonth && Object.keys(serverData.plansByMonth).length > 0));

        const localData = getInitialReductionConfig();
        const hasLocalData =
          localData &&
          (localData.enabled ||
            (localData.monitoredPaymentMethods && localData.monitoredPaymentMethods.length > 0) ||
            (localData.plansByMonth && Object.keys(localData.plansByMonth).length > 0));

        if (hasServerData) {
          if (isMounted) {
            setConfig(serverData);
            try {
              localStorage.setItem(REDUCTION_LOCK_STORAGE_KEY, JSON.stringify(serverData));
            } catch {
              // ignore
            }
          }
        } else if (hasLocalData) {
          // Auto-migrate from localStorage to MongoDB
          await fetch(`${API_BASE_URL}/reduction-alerts`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "x-pin": pin,
            },
            body: JSON.stringify(localData),
          });
          if (isMounted) {
            setConfig(localData);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar alertas de redução do MongoDB:", error);
      }
    };

    loadFromMongo();
    return () => {
      isMounted = false;
    };
  }, [isAuth, pin, isInitializing]);

  // Listen for storage events from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === REDUCTION_LOCK_STORAGE_KEY && e.newValue) {
        try {
          const updated = JSON.parse(e.newValue);
          setConfig(updated);
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const setIsEnabled = useCallback(
    (enabled: boolean) => {
      saveConfig({
        ...config,
        enabled,
      });
    },
    [config, saveConfig],
  );

  const setMonitoredPaymentMethods = useCallback(
    (methods: string[]) => {
      saveConfig({
        ...config,
        monitoredPaymentMethods: methods,
      });
    },
    [config, saveConfig],
  );

  const togglePaymentMethod = useCallback(
    (method: string) => {
      const normalized = method.trim();
      const exists = config.monitoredPaymentMethods.some(
        (m) => m.trim().toLowerCase() === normalized.toLowerCase(),
      );

      const updated = exists
        ? config.monitoredPaymentMethods.filter(
            (m) => m.trim().toLowerCase() !== normalized.toLowerCase(),
          )
        : [...config.monitoredPaymentMethods, normalized];

      saveConfig({
        ...config,
        monitoredPaymentMethods: updated,
      });
    },
    [config, saveConfig],
  );

  const getWeeksForMonth = useCallback(
    (month: string): ReductionWeek[] => {
      return config.plansByMonth[month] || getDefaultWeeksForMonth(month);
    },
    [config.plansByMonth],
  );

  const setWeeksForMonth = useCallback(
    (month: string, weeks: ReductionWeek[]) => {
      saveConfig({
        ...config,
        plansByMonth: {
          ...config.plansByMonth,
          [month]: weeks,
        },
      });
    },
    [config, saveConfig],
  );

  const updateWeekRule = useCallback(
    (
      month: string,
      weekId: string,
      category: string,
      level: ReductionAlertLevel,
    ) => {
      const currentWeeks = getWeeksForMonth(month);
      const updatedWeeks = currentWeeks.map((week) => {
        if (week.id !== weekId) return week;

        const updatedRules = { ...week.categoryRules };
        if (level === "none") {
          delete updatedRules[category];
        } else {
          updatedRules[category] = level;
        }

        return {
          ...week,
          categoryRules: updatedRules,
        };
      });

      setWeeksForMonth(month, updatedWeeks);
    },
    [getWeeksForMonth, setWeeksForMonth],
  );

  const setWeekAllCategories = useCallback(
    (
      month: string,
      weekId: string,
      level: ReductionAlertLevel,
      categories: string[],
    ) => {
      const currentWeeks = getWeeksForMonth(month);
      const updatedWeeks = currentWeeks.map((week) => {
        if (week.id !== weekId) return week;

        const updatedRules = { ...week.categoryRules };
        categories.forEach((cat) => {
          if (level === "none") {
            delete updatedRules[cat];
          } else {
            updatedRules[cat] = level;
          }
        });

        return {
          ...week,
          categoryRules: updatedRules,
        };
      });

      setWeeksForMonth(month, updatedWeeks);
    },
    [getWeeksForMonth, setWeeksForMonth],
  );

  const copyMonthRulesToNext = useCallback(
    (month: string): string => {
      const { newConfig, nextMonthStr } = copyPlanToNextMonth(month, config);
      saveConfig(newConfig);
      return nextMonthStr;
    },
    [config, saveConfig],
  );

  const resetMonthRules = useCallback(
    (month: string) => {
      const defaultWeeks = getDefaultWeeksForMonth(month);
      setWeeksForMonth(month, defaultWeeks);
    },
    [setWeeksForMonth],
  );

  const checkExpenseAlert = useCallback(
    (params: {
      category: string;
      paymentMethod?: string;
      date: string;
      dueDate?: string;
    }): ExpenseReductionAlert | null => {
      return checkExpenseReductionAlert(params, config);
    },
    [config],
  );

  return (
    <ReductionLockContext.Provider
      value={{
        config,
        isEnabled: config.enabled,
        setIsEnabled,
        monitoredPaymentMethods: config.monitoredPaymentMethods,
        setMonitoredPaymentMethods,
        togglePaymentMethod,
        getWeeksForMonth,
        setWeeksForMonth,
        updateWeekRule,
        setWeekAllCategories,
        copyMonthRulesToNext,
        resetMonthRules,
        checkExpenseAlert,
      }}
    >
      {children}
    </ReductionLockContext.Provider>
  );
};

export const useReductionLock = () => {
  const ctx = useContext(ReductionLockContext);
  if (!ctx) {
    throw new Error("useReductionLock must be used within a ReductionLockProvider");
  }
  return ctx;
};
