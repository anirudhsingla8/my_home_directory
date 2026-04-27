import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  ShoppingListItem,
  addShoppingItem,
  clearCompletedShoppingItems,
  deleteShoppingItem,
  fetchShoppingList,
  updateShoppingItem
} from "../api";
import { ThemeColors, useTheme } from "../context/ThemeContext";

export default function ShoppingListScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reload = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await fetchShoppingList();
      setItems(data);
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.message ?? "Failed to load list."
        : "Failed to load list.";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const item = await addShoppingItem({
        name: name.trim(),
        quantity: quantity ? Number(quantity) : 1,
        unit: unit.trim() || null
      });
      setItems((prev) => [item, ...prev]);
      setName("");
      setQuantity("1");
      setUnit("");
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.message ?? "Failed to add item."
        : "Failed to add item.";
      Alert.alert("Error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (item: ShoppingListItem) => {
    const next = !item.completed;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, completed: next } : i)));
    try {
      await updateShoppingItem(item.id, { completed: next });
    } catch {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, completed: item.completed } : i)));
      Alert.alert("Error", "Failed to update item.");
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert("Remove?", "Remove this item from the list?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          const prev = items;
          setItems((curr) => curr.filter((i) => i.id !== id));
          try {
            await deleteShoppingItem(id);
          } catch {
            setItems(prev);
            Alert.alert("Error", "Failed to delete.");
          }
        }
      }
    ]);
  };

  const handleClearCompleted = () => {
    Alert.alert("Clear all completed?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          try {
            await clearCompletedShoppingItems();
            setItems((prev) => prev.filter((i) => !i.completed));
          } catch {
            Alert.alert("Error", "Failed to clear.");
          }
        }
      }
    ]);
  };

  const pending = items.filter((i) => !i.completed);
  const completed = items.filter((i) => i.completed);

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload(true)} tintColor={colors.textPrimary} />}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Shopping list</Text>
            <Text style={styles.subtitle}>{pending.length} pending · {completed.length} done</Text>
          </View>

          <View style={styles.addCard}>
            <TextInput
              placeholder="Item name"
              placeholderTextColor={colors.textMuted}
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
            />
            <View style={styles.row}>
              <TextInput
                keyboardType="decimal-pad"
                placeholder="Qty"
                placeholderTextColor={colors.textMuted}
                style={[styles.smallInput, { flex: 1 }]}
                value={quantity}
                onChangeText={setQuantity}
              />
              <TextInput
                placeholder="Unit"
                placeholderTextColor={colors.textMuted}
                style={[styles.smallInput, { flex: 1 }]}
                value={unit}
                onChangeText={setUnit}
              />
              <Pressable
                onPress={handleAdd}
                disabled={submitting || !name.trim()}
                style={[styles.addBtn, (!name.trim() || submitting) && { opacity: 0.4 }]}
              >
                <Text style={styles.addBtnText}>{submitting ? "..." : "Add"}</Text>
              </Pressable>
            </View>
          </View>

          {loading && <ActivityIndicator color={colors.textPrimary} />}

          {!loading && items.length === 0 && (
            <Text style={styles.empty}>Your shopping list is empty.</Text>
          )}

          {pending.length > 0 && (
            <View style={{ gap: 8 }}>
              {pending.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <Pressable onPress={() => handleToggle(item)} style={styles.checkbox} hitSlop={8}>
                    <View style={styles.checkboxBox} />
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemMeta}>
                      {item.quantity}{item.unit ? ` ${item.unit}` : ""}
                    </Text>
                  </View>
                  <Pressable onPress={() => handleDelete(item.id)} hitSlop={8}>
                    <Text style={styles.deleteIcon}>🗑</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {completed.length > 0 && (
            <View>
              <View style={styles.completedHeader}>
                <Text style={styles.completedHeaderText}>COMPLETED</Text>
                <Pressable onPress={handleClearCompleted} hitSlop={8}>
                  <Text style={styles.clearLink}>Clear all</Text>
                </Pressable>
              </View>
              <View style={{ gap: 8 }}>
                {completed.map((item) => (
                  <View key={item.id} style={[styles.itemRow, styles.itemRowDone]}>
                    <Pressable onPress={() => handleToggle(item)} style={styles.checkbox} hitSlop={8}>
                      <View style={[styles.checkboxBox, styles.checkboxBoxDone]}>
                        <Text style={styles.checkmark}>✓</Text>
                      </View>
                    </Pressable>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemName, styles.itemNameDone]}>{item.name}</Text>
                      <Text style={styles.itemMeta}>
                        {item.quantity}{item.unit ? ` ${item.unit}` : ""}
                      </Text>
                    </View>
                    <Pressable onPress={() => handleDelete(item.id)} hitSlop={8}>
                      <Text style={styles.deleteIcon}>🗑</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bgPage },
    scrollContent: { padding: 20, gap: 14 },
    header: { gap: 4 },
    title: { fontSize: 24, fontWeight: "700", color: colors.textPrimary },
    subtitle: { fontSize: 13, color: colors.textMuted },
    addCard: {
      borderRadius: 18,
      backgroundColor: colors.bgCard,
      padding: 14,
      gap: 10,
      borderWidth: 1,
      borderColor: colors.borderDefault
    },
    row: { flexDirection: "row", gap: 8, alignItems: "center" },
    nameInput: {
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: 12,
      backgroundColor: colors.bgInput,
      paddingHorizontal: 12,
      paddingVertical: 12,
      color: colors.textPrimary,
      fontSize: 15
    },
    smallInput: {
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: 12,
      backgroundColor: colors.bgInput,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.textPrimary,
      fontSize: 14
    },
    addBtn: {
      backgroundColor: colors.bgStrong,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12
    },
    addBtnText: { color: colors.textOnStrong, fontWeight: "700", fontSize: 14 },
    empty: { textAlign: "center", color: colors.textMuted, paddingVertical: 24 },
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderRadius: 14,
      backgroundColor: colors.bgCard,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.borderDefault
    },
    itemRowDone: { opacity: 0.7 },
    checkbox: { padding: 2 },
    checkboxBox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.borderStrong
    },
    checkboxBoxDone: {
      backgroundColor: colors.amber,
      borderColor: colors.amber,
      alignItems: "center",
      justifyContent: "center"
    },
    checkmark: { color: "#0f172a", fontWeight: "700", fontSize: 14, lineHeight: 16 },
    itemName: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
    itemNameDone: { textDecorationLine: "line-through", color: colors.textMuted },
    itemMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    deleteIcon: { fontSize: 18 },
    completedHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 16,
      marginBottom: 8
    },
    completedHeaderText: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5, color: colors.textSubtle },
    clearLink: { fontSize: 12, fontWeight: "700", color: colors.rose }
  });
