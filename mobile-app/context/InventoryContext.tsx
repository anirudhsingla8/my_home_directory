import { createContext, useCallback, useContext, useState, useEffect, ReactNode } from "react";
import { CategoryNode, Item, Location, fetchAlertItems, fetchLocations } from "../api";
import { useAuth } from "./AuthContext";

interface InventoryContextType {
  locations: Location[];
  selectedLocationId: string;
  setSelectedLocationId: (id: string) => void;
  reloadLocations: () => void;
  selectedCategory: CategoryNode | null;
  setSelectedCategory: (category: CategoryNode | null) => void;
  refreshKey: number;
  triggerRefresh: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  alerts: Item[];
  reloadAlerts: () => void;
  removeAlertOptimistic: (itemId: string) => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryNode | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [alerts, setAlerts] = useState<Item[]>([]);

  const loadLocations = () => {
    if (!isAuthenticated) return;
    fetchLocations()
      .then((locs) => {
        setLocations(locs);
        if (!selectedLocationId && locs.length > 0) {
          setSelectedLocationId(locs[0].id);
        }
      })
      .catch(console.error);
  };

  const reloadAlerts = useCallback(() => {
    if (!isAuthenticated) return;
    fetchAlertItems()
      .then(setAlerts)
      .catch(console.error);
  }, [isAuthenticated]);

  const removeAlertOptimistic = useCallback((itemId: string) => {
    setAlerts((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  useEffect(() => {
    loadLocations();
  }, [isAuthenticated]);

  useEffect(() => {
    reloadAlerts();
  }, [isAuthenticated, refreshKey, reloadAlerts]);

  const triggerRefresh = () => setRefreshKey((prev) => prev + 1);

  return (
    <InventoryContext.Provider
      value={{
        locations,
        selectedLocationId,
        setSelectedLocationId,
        reloadLocations: loadLocations,
        selectedCategory,
        setSelectedCategory,
        refreshKey,
        triggerRefresh,
        searchQuery,
        setSearchQuery,
        alerts,
        reloadAlerts,
        removeAlertOptimistic
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
