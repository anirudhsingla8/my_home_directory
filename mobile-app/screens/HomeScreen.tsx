import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

import { Item, deleteItem, fetchItems } from "../api";
import { useInventory } from "../context/InventoryContext";
import { ThemeColors, useTheme } from "../context/ThemeContext";
import FilterDrawer from "./components/FilterDrawer";

type HomeScreenProps = {
  onOpenAdd?: () => void;
};

const CACHE_KEY = "home_inventory_cached_items";

const formatExpiryDate = (value: string | null): string => {
  if (!value) return "No expiry";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Invalid date";
  return parsed.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

type ExpiryStatus = "ok" | "warning" | "expired" | "none";

const getExpiryStatus = (value: string | null): ExpiryStatus => {
  if (!value) return "none";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "none";
  const now = new Date();
  const daysLeft = Math.ceil((parsed.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 30) return "warning";
  return "ok";
};

const buildExpiryBadgeColors = (colors: ThemeColors): Record<ExpiryStatus, { bg: string; fg: string }> => ({
  ok: { bg: colors.emeraldSoft, fg: colors.emeraldOnSoft },
  warning: { bg: colors.amberSoft, fg: colors.amberOnSoft },
  expired: { bg: colors.roseSoft, fg: colors.roseOnSoft },
  none: { bg: colors.bgChip, fg: colors.textMuted }
});

export default function HomeScreen({ onOpenAdd }: HomeScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const expiryBadgeColors = useMemo(() => buildExpiryBadgeColors(colors), [colors]);
  const {
    searchQuery,
    setSearchQuery,
    refreshKey,
    selectedCategory,
    setSelectedCategory,
    selectedLocationId,
    removeAlertOptimistic,
    triggerRefresh
  } = useInventory();
  const [items, setItems] = useState<Item[]>([]);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullToRefreshing, setPullToRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const categoryId = selectedCategory?.id;

  const loadItems = useCallback(
    async (mode: "background" | "pull" = "background") => {
      const trimmedSearch = searchQuery.trim();

      if (mode === "pull") setPullToRefreshing(true);
      setRefreshing(true);

      try {
        const data = await fetchItems({
          search: trimmedSearch || undefined,
          categoryId,
          locationId: selectedLocationId || undefined
        });

        setItems(data.items);
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data.items));
        setIsOfflineMode(false);
        setError(null);
      } catch (err) {
        try {
          const cached = await AsyncStorage.getItem(CACHE_KEY);
          if (cached && !categoryId && !selectedLocationId && !trimmedSearch) {
            setItems(JSON.parse(cached) as Item[]);
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
          console.error("Failed to read cached inventory:", storageError);
          setError("Could not fetch inventory items.");
          setIsOfflineMode(false);
        }
      } finally {
        setRefreshing(false);
        setPullToRefreshing(false);
        setHasLoadedOnce(true);
      }
    },
    [searchQuery, categoryId, selectedLocationId]
  );

  useEffect(() => {
    void loadItems();
  }, [loadItems, refreshKey]);

  const handleDelete = (item: Item) => {
    Alert.alert(
      "Delete Item",
      `Delete "${item.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingId(item.id);
            // Optimistic update
            setItems((prev) => prev.filter((i) => i.id !== item.id));
            removeAlertOptimistic(item.id);

            try {
              await deleteItem(item.id);
              triggerRefresh();
            } catch {
              Alert.alert("Error", "Failed to delete item.");
              triggerRefresh();
            } finally {
              setDeletingId(null);
            }
          }
        }
      ]
    );
  };

  const showInitialLoader = refreshing && !hasLoadedOnce;
  const activeFilterCount = (selectedCategory ? 1 : 0) + (selectedLocationId ? 1 : 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={pullToRefreshing}
            onRefresh={() => void loadItems("pull")}
            tintColor={colors.amber}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerWrapper}>
            {isOfflineMode && (
              <View style={styles.offlineBanner}>
                <Text style={styles.offlineBannerText}>Offline Mode — viewing cached data</Text>
              </View>
            )}

            <View style={styles.searchRow}>
              <View style={styles.searchInputWrap}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  autoCapitalize="none"
                  placeholder="Search items..."
                  placeholderTextColor={colors.textSubtle}
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                    <Text style={styles.searchClear}>{"×"}</Text>
                  </Pressable>
                )}
              </View>
              <Pressable
                style={styles.filterBtn}
                onPress={() => setFiltersOpen(true)}
              >
                <Text style={styles.filterBtnIcon}>{"☰"}</Text>
                {activeFilterCount > 0 && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                  </View>
                )}
              </Pressable>
            </View>

            {selectedCategory && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterEyebrow}>Filtering by</Text>
                <Text style={styles.activeFilterName} numberOfLines={1}>{selectedCategory.name}</Text>
                <Pressable onPress={() => setSelectedCategory(null)} hitSlop={8}>
                  <Text style={styles.activeFilterClear}>{"×"}</Text>
                </Pressable>
              </View>
            )}

            <View style={styles.metaRow}>
              {hasLoadedOnce && !showInitialLoader && (
                <Text style={styles.metaText}>
                  {items.length} item{items.length !== 1 ? "s" : ""}
                </Text>
              )}
              {refreshing && hasLoadedOnce && (
                <View style={styles.syncingPill}>
                  <ActivityIndicator size="small" color={colors.amber} />
                  <Text style={styles.syncingText}>Syncing</Text>
                </View>
              )}
            </View>

            {error && (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          showInitialLoader ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={colors.amber} />
              <Text style={styles.emptyStateTitle}>Loading inventory...</Text>
            </View>
          ) : !error && hasLoadedOnce ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIcon}>
                <Text style={{ fontSize: 32 }}>{"📦"}</Text>
              </View>
              <Text style={styles.emptyStateTitle}>
                {searchQuery || selectedCategory || selectedLocationId
                  ? "No matching items"
                  : "No items yet"}
              </Text>
              <Text style={styles.emptyStateText}>
                {searchQuery || selectedCategory || selectedLocationId
                  ? "Try clearing filters or a different search term."
                  : "Tap \"Add Item\" to start organizing your household inventory."}
              </Text>
              {onOpenAdd && !searchQuery && !selectedCategory && !selectedLocationId && (
                <Pressable style={styles.emptyAddBtn} onPress={onOpenAdd}>
                  <Text style={styles.emptyAddBtnText}>Add Your First Item</Text>
                </Pressable>
              )}
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const expiryStatus = getExpiryStatus(item.expiryDate);
          const isLowStock = item.quantity <= 1;
          const expiryColors = expiryBadgeColors[expiryStatus];

          return (
            <View style={styles.itemCard}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.imagePlaceholderText}>📷</Text>
                </View>
              )}

              <View style={styles.itemBody}>
                <View style={styles.itemTopRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                    {item.category && (
                      <Text style={styles.itemCategory} numberOfLines={1}>{item.category.name}</Text>
                    )}
                  </View>
                  <View style={[styles.qtyBadge, isLowStock && styles.qtyBadgeLow]}>
                    <Text style={[styles.qtyBadgeText, isLowStock && styles.qtyBadgeTextLow]}>
                      {item.quantity} {item.unit}
                    </Text>
                  </View>
                </View>

                <View style={styles.itemMetaRow}>
                  <View style={[styles.expiryPill, { backgroundColor: expiryColors.bg }]}>
                    <Text style={[styles.expiryPillText, { color: expiryColors.fg }]}>
                      {expiryStatus === "expired" && "Expired: "}
                      {expiryStatus === "warning" && "Expiring: "}
                      {formatExpiryDate(item.expiryDate)}
                    </Text>
                  </View>
                  {item.location && (
                    <View style={styles.locationPill}>
                      <Text style={styles.locationPillText} numberOfLines={1}>{item.location.name}</Text>
                    </View>
                  )}
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [styles.deleteBtn, pressed && styles.deleteBtnPressed]}
                onPress={() => handleDelete(item)}
                disabled={deletingId === item.id}
                hitSlop={8}
              >
                <Text style={styles.deleteBtnText}>🗑</Text>
              </Pressable>
            </View>
          );
        }}
      />

      <FilterDrawer visible={filtersOpen} onClose={() => setFiltersOpen(false)} />
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bgPage },
    contentContainer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
    headerWrapper: { gap: 12, marginBottom: 12 },
    offlineBanner: {
      borderRadius: 12,
      backgroundColor: colors.amberSoft,
      borderWidth: 1,
      borderColor: colors.amberSoftBorder,
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    offlineBannerText: { color: colors.amberOnSoft, fontSize: 13, fontWeight: "700", textAlign: "center" },
    searchRow: { flexDirection: "row", gap: 10, alignItems: "center" },
    searchInputWrap: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.bgCard,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      paddingHorizontal: 12,
      height: 44
    },
    searchIcon: { fontSize: 14, marginRight: 8, color: colors.textSubtle },
    searchInput: { flex: 1, color: colors.textPrimary, fontSize: 15 },
    searchClear: { fontSize: 22, color: colors.textSubtle, paddingHorizontal: 4, lineHeight: 22 },
    filterBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      alignItems: "center",
      justifyContent: "center"
    },
    filterBtnIcon: { fontSize: 18, color: colors.textPrimary, fontWeight: "700" },
    filterBadge: {
      position: "absolute",
      top: -4,
      right: -4,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      borderRadius: 9,
      backgroundColor: colors.amber,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: colors.bgPage
    },
    filterBadgeText: { fontSize: 10, fontWeight: "800", color: "#0f172a" },
    activeFilterChip: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.amberSoft,
      borderColor: colors.amberSoftBorder,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8
    },
    activeFilterEyebrow: { color: colors.amberOnSoft, fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
    activeFilterName: { color: colors.textPrimary, fontSize: 13, fontWeight: "700", flex: 1 },
    activeFilterClear: { color: colors.amberOnSoft, fontSize: 22, lineHeight: 22, paddingHorizontal: 4 },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 4
    },
    metaText: { color: colors.textSubtle, fontSize: 12, fontWeight: "600" },
    syncingPill: { flexDirection: "row", alignItems: "center", gap: 6 },
    syncingText: { color: colors.textSubtle, fontSize: 12, fontWeight: "600" },
    errorCard: {
      backgroundColor: colors.roseSoft,
      borderColor: colors.roseOnSoft,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    errorText: { color: colors.roseOnSoft, fontSize: 13 },
    emptyState: {
      borderRadius: 24,
      backgroundColor: colors.bgCard,
      padding: 32,
      alignItems: "center",
      marginTop: 8
    },
    emptyStateIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.amberSoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16
    },
    emptyStateTitle: { marginTop: 8, color: colors.textPrimary, fontSize: 17, fontWeight: "700", textAlign: "center" },
    emptyStateText: { marginTop: 6, color: colors.textMuted, fontSize: 13, textAlign: "center", maxWidth: 260 },
    emptyAddBtn: {
      marginTop: 16,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 999,
      backgroundColor: colors.bgStrong
    },
    emptyAddBtnText: { color: colors.textOnStrong, fontWeight: "700", fontSize: 14 },
    itemCard: {
      flexDirection: "row",
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      overflow: "hidden",
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.borderDefault
    },
    itemImage: { width: 96, height: 96 },
    imagePlaceholder: {
      width: 96,
      height: 96,
      backgroundColor: colors.bgChip,
      alignItems: "center",
      justifyContent: "center"
    },
    imagePlaceholderText: { fontSize: 28, color: colors.textSubtle },
    itemBody: { flex: 1, padding: 12, justifyContent: "space-between" },
    itemTopRow: { flexDirection: "row", alignItems: "flex-start" },
    itemName: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
    itemCategory: { marginTop: 2, fontSize: 12, color: colors.textSubtle },
    qtyBadge: {
      backgroundColor: colors.bgChip,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4
    },
    qtyBadgeLow: { backgroundColor: colors.roseSoft },
    qtyBadgeText: { color: colors.textSecondary, fontSize: 12, fontWeight: "700" },
    qtyBadgeTextLow: { color: colors.roseOnSoft },
    itemMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
    expiryPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    expiryPillText: { fontSize: 11, fontWeight: "600" },
    locationPill: { backgroundColor: colors.bgChip, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    locationPillText: { fontSize: 11, fontWeight: "600", color: colors.textMuted },
    deleteBtn: {
      paddingHorizontal: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.bgCard
    },
    deleteBtnPressed: { backgroundColor: colors.roseSoft },
    deleteBtnText: { fontSize: 18 }
  });
