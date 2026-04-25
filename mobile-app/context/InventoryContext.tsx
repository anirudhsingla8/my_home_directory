import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { CategoryNode } from "../api";
import { useAuth } from "./AuthContext";

interface InventoryContextType {
  userId: string;
  setUserId: (id: string) => void;
  locationId: string;
  setLocationId: (id: string) => void;
  selectedCategory: CategoryNode | null;
  setSelectedCategory: (category: CategoryNode | null) => void;
  refreshKey: number;
  triggerRefresh: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [userId, setUserId] = useState(user?.id || "");
  const [locationId, setLocationId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryNode | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (user?.id) {
      setUserId(user.id);
    }
  }, [user]);

  const triggerRefresh = () => setRefreshKey((prev) => prev + 1);

  return (
    <InventoryContext.Provider
      value={{
        userId,
        setUserId,
        locationId,
        setLocationId,
        selectedCategory,
        setSelectedCategory,
        refreshKey,
        triggerRefresh,
        searchQuery,
        setSearchQuery
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error("useInventory must be used within an InventoryProvider");
  }
  return context;
};
