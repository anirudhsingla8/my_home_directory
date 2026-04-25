import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Item, api } from "../api";
import { useInventory } from "../context/InventoryContext";

type HomeScreenProps = {
  onOpenAdd?: () => void;
};

const getInventoryCacheKey = (userId: string) =>
  userId ? `home_inventory_cached_items_${userId}` : "home_inventory_cached_items_all";

export default function HomeScreen({ onOpenAdd }: HomeScreenProps) {
  const { userId, setUserId, searchQuery, setSearchQuery, refreshKey } = useInventory();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const loadItems = useCallback(
    async (isRefresh = false) => {
      const trimmedUserId = userId.trim();
      const trimmedSearch = searchQuery.trim();
      const cacheKey = getInventoryCacheKey(trimmedUserId);

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await api.get<Item[]>("/items", {
          params: trimmedUserId || trimmedSearch
            ? {
                userId: trimmedUserId || undefined,
                search: trimmedSearch || undefined
              }
            : undefined
        });

        setItems(response.data);
        await AsyncStorage.setItem(cacheKey, JSON.stringify(response.data));
        setIsOfflineMode(false);
        setError(null);
      } catch (err) {
        try {
          const cachedItemsJson = await AsyncStorage.getItem(cacheKey);

          if (cachedItemsJson) {
            const cachedItems = JSON.parse(cachedItemsJson) as Item[];
            setItems(cachedItems);
            setIsOfflineMode(true);
            setError(null);
          } else {
            const message = axios.isAxiosError(err)
              ? err.response?.data?.message ?? "Could not fetch inventory items."
              : "Could not fetch inventory items.";

            setError(message);
            setIsOfflineMode(false);
          }
        } catch (storageError) {
          const message = axios.isAxiosError(err)
            ? err.response?.data?.message ?? "Could not fetch inventory items."
            : "Could not fetch inventory items.";

          console.error("Failed to read cached inventory:", storageError);
          setError(message);
          setIsOfflineMode(false);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userId, searchQuery]
  );

  useEffect(() => {
    void loadItems();
  }, [loadItems, refreshKey]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadItems(true)} />}
        ListHeaderComponent={
          <View style={styles.headerWrapper}>
            {isOfflineMode ? (
              <View style={styles.offlineBanner}>
                <Text style={styles.offlineBannerText}>Offline Mode: Viewing Cached Data</Text>
              </View>
            ) : null}

            <View style={styles.heroCard}>
              <Text style={styles.eyebrow}>Home Inventory</Text>
              <Text style={styles.heroTitle}>Mobile inventory feed for your item photos.</Text>
            </View>

            <View style={styles.filterCard}>
              <Text style={styles.sectionTitle}>Filter & Search Items</Text>
              <TextInput
                autoCapitalize="none"
                placeholder="Optional user ID"
                placeholderTextColor="#64748b"
                style={styles.input}
                value={userId}
                onChangeText={setUserId}
              />
              <TextInput
                autoCapitalize="none"
                placeholder="Search items by name..."
                placeholderTextColor="#64748b"
                style={[styles.input, { marginTop: 8 }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />

              <View style={styles.actionRow}>
                <Pressable style={styles.primaryButton} onPress={() => void loadItems()}>
                  <Text style={styles.primaryButtonText}>Reload Items</Text>
                </Pressable>

                {onOpenAdd ? (
                  <Pressable style={styles.secondaryButton} onPress={onOpenAdd}>
                    <Text style={styles.secondaryButtonText}>Add Item</Text>
                  </Pressable>
                ) : null}
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#fbbf24" />
              <Text style={styles.emptyStateTitle}>Loading inventory…</Text>
              <Text style={styles.emptyStateText}>Fetching your items from the server.</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIcon}>
                <Text style={{ fontSize: 32 }}>📦</Text>
              </View>
              <Text style={styles.emptyStateTitle}>Welcome! No items yet.</Text>
              <Text style={styles.emptyStateText}>
                Tap "Add Item" to start organizing your household inventory.
              </Text>
              {onOpenAdd ? (
                <Pressable style={[styles.primaryButton, { marginTop: 16, paddingHorizontal: 32 }]} onPress={onOpenAdd}>
                  <Text style={styles.primaryButtonText}>Add Your First Item</Text>
                </Pressable>
              ) : null}
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderText}>No Image</Text>
              </View>
            )}

            <View style={styles.itemBody}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemMeta}>
                {item.quantity} {item.unit}
              </Text>
              <Text numberOfLines={2} style={styles.itemUrl}>
                {item.imageUrl ?? "No image URL available"}
              </Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc"
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 32
  },
  headerWrapper: {
    gap: 16,
    marginBottom: 16
  },
  offlineBanner: {
    borderRadius: 16,
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#f59e0b",
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  offlineBannerText: {
    color: "#92400e",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center"
  },
  heroCard: {
    borderRadius: 24,
    backgroundColor: "#0f172a",
    padding: 20
  },
  eyebrow: {
    color: "#fbbf24",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase"
  },
  heroTitle: {
    marginTop: 10,
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 32
  },
  filterCard: {
    borderRadius: 24,
    backgroundColor: "#ffffff",
    padding: 18,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6
    },
    elevation: 3
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 12
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 16,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: "#0f172a",
    fontSize: 15
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12
  },
  primaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 999,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center"
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "700"
  },
  secondaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center"
  },
  secondaryButtonText: {
    color: "#0f172a",
    fontWeight: "700"
  },
  errorText: {
    marginTop: 12,
    color: "#b91c1c",
    fontSize: 14
  },
  emptyState: {
    borderRadius: 24,
    backgroundColor: "#ffffff",
    padding: 32,
    alignItems: "center"
  },
  emptyStateIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fef3c7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16
  },
  emptyStateTitle: {
    marginTop: 8,
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center"
  },
  emptyStateText: {
    marginTop: 6,
    color: "#475569",
    fontSize: 14,
    textAlign: "center",
    maxWidth: 260
  },
  itemCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 14,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6
    },
    elevation: 3
  },
  itemImage: {
    width: 120,
    height: 120
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center"
  },
  imagePlaceholderText: {
    color: "#475569",
    fontWeight: "600"
  },
  itemBody: {
    flex: 1,
    padding: 14,
    justifyContent: "center"
  },
  itemName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a"
  },
  itemMeta: {
    marginTop: 4,
    fontSize: 15,
    color: "#334155",
    fontWeight: "600"
  },
  itemUrl: {
    marginTop: 8,
    fontSize: 12,
    color: "#64748b"
  }
});
