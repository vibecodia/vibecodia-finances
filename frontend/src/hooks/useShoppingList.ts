import { useState, useEffect, useMemo } from "react";

import { useVerification } from "../contexts/VerificationContext";

export interface ShoppingItem {
  id: string;
  name: string;
  purchased: boolean;
  isPriority: boolean;
  type: "compras" | "afazeres";
  createdAt: string;
}

const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL || "/api";

export const useShoppingList = () => {
  const { pin, isGuest } = useVerification();
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      "x-pin": pin || "",
    }),
    [pin],
  );

  useEffect(() => {
    const fetchShoppingList = async () => {
      if (isGuest) {
        const storedList = localStorage.getItem("guest_shopping_list");
        setShoppingList(storedList ? JSON.parse(storedList) : []);
        return;
      }
      if (!pin) return;
      try {
        const response = await fetch(`${API_BASE_URL}/shopping-list`, {
          headers,
        });
        if (!response.ok) throw new Error("Failed to fetch shopping list");
        const data = await response.json();
        setShoppingList(data);
      } catch (error) {
        console.error("Error fetching shopping list:", error);
      }
    };
    fetchShoppingList();
  }, [pin, isGuest, headers]);

  const sortedShoppingList = [...shoppingList].sort((a, b) => {
    if (a.isPriority && !b.isPriority) return -1;
    if (!a.isPriority && b.isPriority) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const addItem = async (
    name: string,
    type: "compras" | "afazeres" = "compras",
  ) => {
    if (name.trim() === "" || (!pin && !isGuest)) return;

    if (isGuest) {
      const newItem: ShoppingItem = {
        id: crypto.randomUUID(),
        name: name.trim(),
        purchased: false,
        isPriority: false,
        type,
        createdAt: new Date().toISOString(),
      };
      const updatedList = [newItem, ...shoppingList];
      setShoppingList(updatedList);
      localStorage.setItem("guest_shopping_list", JSON.stringify(updatedList));
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/shopping-list`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: name.trim(),
          isPriority: false,
          type,
          createdAt: new Date().toISOString(),
        }),
      });
      if (!response.ok) throw new Error("Failed to add item");
      const newItem = await response.json();
      setShoppingList((prevList) => [newItem, ...prevList]);
    } catch (error) {
      console.error("Error adding item:", error);
    }
  };

  const togglePriority = async (id: string) => {
    if (!pin && !isGuest) return;

    if (isGuest) {
      const updatedList = shoppingList.map((item) =>
        item.id === id ? { ...item, isPriority: !item.isPriority } : item,
      );
      setShoppingList(updatedList);
      localStorage.setItem("guest_shopping_list", JSON.stringify(updatedList));
      return;
    }

    try {
      const itemToUpdate = shoppingList.find((item) => item.id === id);
      if (!itemToUpdate) return;

      const response = await fetch(`${API_BASE_URL}/shopping-list/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ isPriority: !itemToUpdate.isPriority }),
      });

      if (!response.ok) throw new Error("Failed to toggle priority");
      const updatedItem = await response.json();
      setShoppingList((prevList) =>
        prevList.map((item) => (item.id === id ? updatedItem : item)),
      );
    } catch (error) {
      console.error("Error toggling priority:", error);
    }
  };

  const togglePurchased = async (id: string) => {
    if (!pin && !isGuest) return;

    if (isGuest) {
      const updatedList = shoppingList.map((item) =>
        item.id === id ? { ...item, purchased: !item.purchased } : item,
      );
      setShoppingList(updatedList);
      localStorage.setItem("guest_shopping_list", JSON.stringify(updatedList));
      return;
    }

    try {
      const itemToUpdate = shoppingList.find((item) => item.id === id);
      if (!itemToUpdate) return;

      const response = await fetch(`${API_BASE_URL}/shopping-list/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ purchased: !itemToUpdate.purchased }),
      });
      if (!response.ok) throw new Error("Failed to toggle purchased status");
      const updatedItem = await response.json();
      setShoppingList((prevList) =>
        prevList.map((item) => (item.id === id ? updatedItem : item)),
      );
    } catch (error) {
      console.error("Error toggling purchased status:", error);
    }
  };

  const removeItem = async (id: string) => {
    if (!pin && !isGuest) return;

    if (isGuest) {
      const updatedList = shoppingList.filter((item) => item.id !== id);
      setShoppingList(updatedList);
      localStorage.setItem("guest_shopping_list", JSON.stringify(updatedList));
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/shopping-list/${id}`, {
        method: "DELETE",
        headers,
      });
      if (!response.ok) throw new Error("Failed to remove item");
      setShoppingList((prevList) => prevList.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Error removing item:", error);
    }
  };

  const clearPurchased = async () => {
    if (!pin && !isGuest) return;

    if (isGuest) {
      const updatedList = shoppingList.filter((item) => !item.purchased);
      setShoppingList(updatedList);
      localStorage.setItem("guest_shopping_list", JSON.stringify(updatedList));
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/shopping-list/purchased`, {
        method: "DELETE",
        headers,
      });
      if (!response.ok) throw new Error("Failed to clear purchased items");
      setShoppingList((prevList) => prevList.filter((item) => !item.purchased));
    } catch (error) {
      console.error("Error clearing purchased items:", error);
    }
  };

  return {
    shoppingList: sortedShoppingList,
    addItem,
    togglePurchased,
    removeItem,
    clearPurchased,
    togglePriority,
  };
};
