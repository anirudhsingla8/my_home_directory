import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import { CategoryNode, Item, fetchCategoryTree } from "../../api";
import { useInventory } from "../../context/InventoryContext";
import { ThemeColors, useTheme } from "../../context/ThemeContext";

type FilterDrawerProps = {
  visible: boolean;
  onClose: () => void;
};

type CategoryRowProps = {
  node: CategoryNode;
  expandedIds: Set<string>;
  selectedId?: string;
  toggleNode: (id: string) => void;
  onSelect: (node: CategoryNode) => void;
  depth: number;
};

const ChevronGlyph = ({ open, color }: { open: boolean; color: string }) => (
  <Text style={[{ color, fontSize: 18, lineHeight: 18, fontWeight: "700" }, open && { transform: [{ rotate: "90deg" }] }]}>
    {"›"}
  </Text>
);

function CategoryRow({ node, expandedIds, selectedId, toggleNode, onSelect, depth }: CategoryRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isExpanded = expandedIds.has(node.id);
  const hasChildren = node.children.length > 0;
  const isSelected = node.id === selectedId;

  return (
    <View>
      <View style={[styles.row, { paddingLeft: 8 + depth * 14 }]}>
        {hasChildren ? (
          <Pressable
            style={styles.chevronBtn}
            onPress={() => toggleNode(node.id)}
            hitSlop={6}
          >
            <ChevronGlyph open={isExpanded} color={colors.textSubtle} />
          </Pressable>
        ) : (
          <View style={styles.dotWrap}>
            <View style={styles.dot} />
          </View>
        )}
        <Pressable
          style={[styles.nameBtn, isSelected && styles.nameBtnActive]}
          onPress={() => onSelect(node)}
        >
          <Text style={[styles.nameText, isSelected && styles.nameTextActive]} numberOfLines={1}>
            {node.name}
          </Text>
          {hasChildren && (
            <Text style={[styles.countBadge, isSelected && styles.countBadgeActive]}>
              {node.children.length}
            </Text>
          )}
        </Pressable>
      </View>
      {hasChildren && isExpanded && (
        <View>
          {node.children.map((child) => (
            <CategoryRow
              key={child.id}
              node={child}
              expandedIds={expandedIds}
              selectedId={selectedId}
              toggleNode={toggleNode}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function LocationSelector() {
  const { locations, selectedLocationId, setSelectedLocationId } = useInventory();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>Location</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        <Pressable
          style={[styles.chip, !selectedLocationId && styles.chipActive]}
          onPress={() => setSelectedLocationId("")}
        >
          <Text style={[styles.chipText, !selectedLocationId && styles.chipTextActive]}>
            All
          </Text>
        </Pressable>
        {locations.map((loc) => {
          const active = loc.id === selectedLocationId;
          return (
            <Pressable
              key={loc.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setSelectedLocationId(loc.id)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                {loc.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function AlertsList({ alerts }: { alerts: Item[] }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  if (alerts.length === 0) return null;
  return (
    <View style={styles.alertCard}>
      <Text style={styles.alertHeader}>Needs Attention ({alerts.length})</Text>
      <View style={{ gap: 8 }}>
        {alerts.slice(0, 6).map((item) => {
          const isLowStock = item.quantity <= 1;
          return (
            <View key={item.id} style={styles.alertRow}>
              <View style={[styles.alertDot, { backgroundColor: isLowStock ? colors.rose : colors.amber }]} />
              <Text style={styles.alertName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.alertMeta}>
                {item.quantity} {item.unit}
              </Text>
              <View style={[styles.alertPill, { backgroundColor: isLowStock ? colors.roseSoft : colors.amberSoft }]}>
                <Text style={[styles.alertPillText, { color: isLowStock ? colors.roseOnSoft : colors.amberOnSoft }]}>
                  {isLowStock ? "Low" : "Expiring"}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function FilterDrawer({ visible, onClose }: FilterDrawerProps) {
  const { selectedCategory, setSelectedCategory, alerts } = useInventory();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || tree.length > 0) return;
    setLoading(true);
    fetchCategoryTree()
      .then((nodes) => setTree(nodes))
      .catch((err) => console.error("Failed to load category tree", err))
      .finally(() => setLoading(false));
  }, [visible]);

  const toggleNode = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelect = (node: CategoryNode) => {
    if (node.id === selectedCategory?.id) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(node);
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handleBar} />

          <View style={styles.header}>
            <Text style={styles.headerTitle}>Filters</Text>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <Text style={styles.closeText}>{"×"}</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            <LocationSelector />

            {selectedCategory && (
              <View style={styles.section}>
                <View style={styles.activeFilterChip}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activeFilterEyebrow}>Filtering by</Text>
                    <Text style={styles.activeFilterName} numberOfLines={1}>{selectedCategory.name}</Text>
                  </View>
                  <Pressable onPress={() => { setSelectedCategory(null); onClose(); }} hitSlop={8}>
                    <Text style={styles.activeFilterClear}>{"×"}</Text>
                  </Pressable>
                </View>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Categories</Text>
              {loading ? (
                <View style={{ paddingVertical: 16, alignItems: "center" }}>
                  <ActivityIndicator color={colors.amber} />
                </View>
              ) : tree.length === 0 ? (
                <Text style={styles.emptyText}>No categories yet.</Text>
              ) : (
                <View style={styles.treeWrap}>
                  {tree.map((node) => (
                    <CategoryRow
                      key={node.id}
                      node={node}
                      expandedIds={expandedIds}
                      selectedId={selectedCategory?.id}
                      toggleNode={toggleNode}
                      onSelect={handleSelect}
                      depth={0}
                    />
                  ))}
                </View>
              )}
            </View>

            {alerts.length > 0 && (
              <View style={styles.section}>
                <AlertsList alerts={alerts} />
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
    sheet: {
      maxHeight: "88%",
      minHeight: "65%",
      backgroundColor: colors.bgCard,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12
    },
    handleBar: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.borderStrong,
      alignSelf: "center",
      marginBottom: 8
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 4,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
      marginBottom: 8
    },
    headerTitle: { fontSize: 17, fontWeight: "700", color: colors.textPrimary },
    closeBtn: { padding: 4 },
    closeText: { fontSize: 24, color: colors.textMuted, lineHeight: 24 },
    section: { paddingTop: 12 },
    sectionLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.textSubtle,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 8,
      paddingHorizontal: 4
    },
    chipRow: { gap: 8, paddingHorizontal: 4, paddingRight: 16 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.bgChip,
      borderWidth: 1,
      borderColor: colors.borderDefault
    },
    chipActive: { backgroundColor: colors.bgStrong, borderColor: colors.bgStrong },
    chipText: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
    chipTextActive: { color: colors.textOnStrong },
    treeWrap: { gap: 2 },
    row: { flexDirection: "row", alignItems: "center", paddingVertical: 2 },
    chevronBtn: {
      width: 24,
      height: 24,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 6
    },
    dotWrap: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
    dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.textFaint },
    nameBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 9,
      borderRadius: 10
    },
    nameBtnActive: { backgroundColor: colors.amberSoft },
    nameText: { color: colors.textSecondary, fontSize: 14, flex: 1 },
    nameTextActive: { color: colors.amberOnSoft, fontWeight: "700" },
    countBadge: {
      color: colors.textSubtle,
      fontSize: 11,
      marginLeft: 6,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 6
    },
    countBadgeActive: { color: colors.amberOnSoft },
    emptyText: { color: colors.textSubtle, fontSize: 13, textAlign: "center", paddingVertical: 16 },
    activeFilterChip: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.amberSoft,
      borderColor: colors.amberSoftBorder,
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 8
    },
    activeFilterEyebrow: { color: colors.amberOnSoft, fontSize: 11, fontWeight: "700" },
    activeFilterName: { color: colors.textPrimary, fontSize: 15, fontWeight: "700", marginTop: 2 },
    activeFilterClear: { color: colors.amberOnSoft, fontSize: 22, lineHeight: 22, paddingHorizontal: 4 },
    alertCard: {
      backgroundColor: colors.amberSoft,
      borderColor: colors.amberSoftBorder,
      borderWidth: 1,
      borderRadius: 14,
      padding: 12
    },
    alertHeader: { color: colors.amberOnSoft, fontSize: 13, fontWeight: "700", marginBottom: 8 },
    alertRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.bgCard,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 8
    },
    alertDot: { width: 8, height: 8, borderRadius: 4 },
    alertName: { flex: 1, color: colors.textPrimary, fontSize: 13, fontWeight: "600" },
    alertMeta: { color: colors.textSubtle, fontSize: 11 },
    alertPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    alertPillText: { fontSize: 11, fontWeight: "700" }
  });
