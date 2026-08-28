import { useState, useEffect, useCallback, useMemo } from "react";

import { guestStorageAdapter } from "../services/storage/guestStorageAdapter";
import { SavingsGoal, SavingsContribution } from "../types";
import { getCurrentBrazilDate, getBrazilDateString } from "../utils/helpers";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export interface UseSavingsGoalsOptions {
  pin: string | null;
  isGuest: boolean;
  isInitializing: boolean;
  onGoalsChange?: () => void;
}

export const useSavingsGoals = ({
  pin,
  isGuest,
  isInitializing,
  onGoalsChange,
}: UseSavingsGoalsOptions) => {
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      "x-pin": pin || "",
    }),
    [pin],
  );

  const fetchGoals = useCallback(async () => {
    if (isInitializing) return;

    if (isGuest) {
      setIsLoading(true);
      try {
        const stored = guestStorageAdapter.getGoals();
        setSavingsGoals(stored);
        setHasLoaded(true);
      } catch (error) {
        console.error("Error reading guest goals:", error);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!pin) {
      setSavingsGoals([]);
      setIsLoading(false);
      setHasLoaded(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/goals`, { headers });
      if (!response.ok) throw new Error("Failed to fetch goals");
      const data = await response.json();
      setSavingsGoals(data);
      setHasLoaded(true);
    } catch (error) {
      console.error("Error fetching savings goals:", error);
      setSavingsGoals([]);
    } finally {
      setIsLoading(false);
    }
  }, [headers, isGuest, isInitializing, pin]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const refreshGoals = async () => {
    if (isInitializing) return;

    if (isGuest) {
      setSavingsGoals(guestStorageAdapter.getGoals());
      return;
    }

    if (!pin) return;

    try {
      const response = await fetch(`${API_BASE_URL}/goals`, { headers });
      if (!response.ok) return;
      const data = await response.json();
      setSavingsGoals(data);
    } catch {
      return;
    }
  };

  const addSavingsGoal = async (
    goal: Omit<SavingsGoal, "id" | "createdAt" | "updatedAt">,
  ) => {
    if (!pin && !isGuest) throw new Error("PIN not verified");

    if (isGuest) {
      const newGoal: SavingsGoal = {
        ...goal,
        id: crypto.randomUUID(),
        createdAt: getCurrentBrazilDate().toISOString(),
        updatedAt: getCurrentBrazilDate().toISOString(),
        contributions: [],
      };
      const updatedGoals = [newGoal, ...savingsGoals];
      setSavingsGoals(updatedGoals);
      guestStorageAdapter.saveGoals(updatedGoals);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/goals`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...goal,
          createdAt: getCurrentBrazilDate().toISOString(),
          contributions: [],
        }),
      });
      if (!response.ok) throw new Error("Failed to add savings goal");
      const newGoal = await response.json();
      setSavingsGoals((prev) => [newGoal, ...prev]);
    } catch (error) {
      console.error("Error adding savings goal:", error);
    }
  };

  const updateSavingsGoal = async (
    id: string,
    updates: Partial<SavingsGoal>,
  ) => {
    if (!pin && !isGuest) throw new Error("PIN not verified");

    if (isGuest) {
      const updatedGoals = savingsGoals.map((g) =>
        g.id === id
          ? {
              ...g,
              ...updates,
              updatedAt: getCurrentBrazilDate().toISOString(),
            }
          : g,
      );
      setSavingsGoals(updatedGoals);
      guestStorageAdapter.saveGoals(updatedGoals);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/goals/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update savings goal");
      const updatedGoal = await response.json();

      if (updates.status === "active") {
        setSavingsGoals((prev) =>
          prev.map((g) =>
            g.id === id
              ? {
                  ...updatedGoal,
                  status: "active",
                  deletedAt: undefined,
                  contributions: (g.contributions || []).map((c) => ({
                    ...c,
                    status: "active",
                    deletedAt: undefined,
                  })),
                }
              : g,
          ),
        );
      } else {
        setSavingsGoals((prev) =>
          prev.map((g) => (g.id === id ? { ...g, ...updatedGoal } : g)),
        );
      }
    } catch (error) {
      console.error("Error updating savings goal:", error);
    }
  };

  const addSavingsContribution = async (
    goalId: string,
    amount: number,
    date?: string,
    type: "deposit" | "withdrawal" = "deposit",
    notes?: string,
  ) => {
    if (!pin) throw new Error("PIN not verified");
    try {
      const goalToUpdate = savingsGoals.find((g) => g.id === goalId);
      if (!goalToUpdate) throw new Error("Goal not found");

      const contribution = {
        amount,
        date: date || getBrazilDateString(),
        type,
        notes,
      };

      const response = await fetch(
        `${API_BASE_URL}/goals/${goalId}/contributions`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(contribution),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to add savings contribution");
      }
      const updatedGoal = await response.json();
      setSavingsGoals((prev) =>
        prev.map((goal) => (goal.id === goalId ? updatedGoal : goal)),
      );
      onGoalsChange?.();
      return updatedGoal;
    } catch (error) {
      console.error("Error adding savings contribution:", error);
      throw error;
    }
  };

  const restoreSavingsContribution = async (
    goalId: string,
    contributionId: string,
  ) => {
    if (!pin) throw new Error("PIN not verified");
    try {
      const response = await fetch(
        `${API_BASE_URL}/goals/${goalId}/contributions/${contributionId}/restore`,
        {
          method: "POST",
          headers,
        },
      );

      if (!response.ok)
        throw new Error("Failed to restore savings contribution");
      const updatedGoal = await response.json();
      setSavingsGoals((prev) =>
        prev.map((goal) => (goal.id === goalId ? updatedGoal : goal)),
      );
      onGoalsChange?.();
      return updatedGoal;
    } catch (error) {
      console.error("Error restoring savings contribution:", error);
      throw error;
    }
  };

  const updateSavingsContribution = async (
    goalId: string,
    contributionId: string,
    updates: Partial<SavingsContribution>,
  ) => {
    if (!pin) throw new Error("PIN not verified");
    try {
      const response = await fetch(
        `${API_BASE_URL}/goals/${goalId}/contributions/${contributionId}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify(updates),
        },
      );

      if (!response.ok)
        throw new Error("Failed to update savings contribution");
      const updatedGoal = await response.json();
      setSavingsGoals((prev) =>
        prev.map((goal) => (goal.id === goalId ? updatedGoal : goal)),
      );
      onGoalsChange?.();
    } catch (error) {
      console.error("Error updating savings contribution:", error);
    }
  };

  const deleteSavingsContribution = async (
    goalId: string,
    contributionId: string,
  ) => {
    if (!pin) throw new Error("PIN not verified");
    try {
      const response = await fetch(
        `${API_BASE_URL}/goals/${goalId}/contributions/${contributionId}`,
        {
          method: "DELETE",
          headers,
        },
      );

      if (!response.ok)
        throw new Error("Failed to delete savings contribution");
      const updatedGoal = await response.json();
      setSavingsGoals((prev) =>
        prev.map((goal) => (goal.id === goalId ? updatedGoal : goal)),
      );
      onGoalsChange?.();
    } catch (error) {
      console.error("Error deleting savings contribution:", error);
    }
  };

  const archiveSavingsGoal = async (id: string) => {
    try {
      if (isGuest) {
        const now = new Date().toISOString();
        const updatedGoals = savingsGoals.map((g) =>
          g.id === id ? { ...g, status: "archived" as const, archivedAt: now } : g,
        );
        setSavingsGoals(updatedGoals);
        guestStorageAdapter.saveGoals(updatedGoals);
        onGoalsChange?.();
        return;
      }

      if (!pin) throw new Error("PIN not verified");
      const response = await fetch(`${API_BASE_URL}/goals/${id}/archive`, {
        method: "PATCH",
        headers,
      });
      if (!response.ok) throw new Error("Failed to archive savings goal");

      const now = new Date().toISOString();
      setSavingsGoals((prev) =>
        prev.map((g) =>
          g.id === id ? { ...g, status: "archived" as const, archivedAt: now } : g,
        ),
      );
      onGoalsChange?.();
    } catch (error) {
      console.error("Error archiving savings goal:", error);
    }
  };

  const unarchiveSavingsGoal = async (id: string) => {
    try {
      if (isGuest) {
        const updatedGoals = savingsGoals.map((g) =>
          g.id === id ? { ...g, status: "active" as const, archivedAt: undefined } : g,
        );
        setSavingsGoals(updatedGoals);
        guestStorageAdapter.saveGoals(updatedGoals);
        onGoalsChange?.();
        return;
      }

      if (!pin) throw new Error("PIN not verified");
      const response = await fetch(`${API_BASE_URL}/goals/${id}/unarchive`, {
        method: "PATCH",
        headers,
      });
      if (!response.ok) throw new Error("Failed to unarchive savings goal");

      setSavingsGoals((prev) =>
        prev.map((g) =>
          g.id === id ? { ...g, status: "active" as const, archivedAt: undefined } : g,
        ),
      );
      onGoalsChange?.();
    } catch (error) {
      console.error("Error unarchiving savings goal:", error);
    }
  };

  const deleteSavingsGoal = async (id: string) => {
    try {
      if (isGuest) {
        const now = new Date().toISOString();
        const updatedGoals = savingsGoals.map((g) =>
          g.id === id
            ? {
                ...g,
                status: "deleted" as const,
                deletedAt: now,
                contributions: (g.contributions || []).map((c) => ({
                  ...c,
                  status: "deleted" as const,
                  deletedAt: c.status === "deleted" ? c.deletedAt : now,
                })),
              }
            : g,
        );
        setSavingsGoals(updatedGoals);
        guestStorageAdapter.saveGoals(updatedGoals);
        onGoalsChange?.();
        return;
      }

      if (!pin) throw new Error("PIN not verified");
      const response = await fetch(`${API_BASE_URL}/goals/${id}`, {
        method: "DELETE",
        headers,
      });
      if (!response.ok) throw new Error("Failed to delete savings goal");

      const now = new Date().toISOString();
      setSavingsGoals((prev) =>
        prev.map((g) =>
          g.id === id
            ? {
                ...g,
                status: "deleted",
                deletedAt: now,
                contributions: (g.contributions || []).map((c) => ({
                  ...c,
                  status: "deleted",
                  deletedAt: c.status === "deleted" ? c.deletedAt : now,
                })),
              }
            : g,
        ),
      );
      onGoalsChange?.();
    } catch (error) {
      console.error("Error deleting savings goal:", error);
    }
  };

  return {
    savingsGoals,
    isLoading,
    hasLoaded,
    fetchGoals,
    refreshGoals,
    setSavingsGoals,
    addSavingsGoal,
    updateSavingsGoal,
    archiveSavingsGoal,
    unarchiveSavingsGoal,
    deleteSavingsGoal,
    addSavingsContribution,
    updateSavingsContribution,
    deleteSavingsContribution,
    restoreSavingsContribution,
  };
};
