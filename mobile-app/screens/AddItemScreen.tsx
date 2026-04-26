import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
import { ThemeColors, useTheme } from "../context/ThemeContext";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";

import { CategoryOption, Location, api, flattenCategoryTree, fetchLocations, createLocationApi } from "../api";
import { useInventory } from "../context/InventoryContext";

type AddItemScreenProps = {
  onCreated?: () => void;
};

type FormState = {
  name: string;
  quantity: string;
  unit: string;
  categoryId: string;
  expiryDate: string;
};

type PickerAsset = ImagePicker.ImagePickerAsset | null;

type ReactNativeUploadFile = {
  uri: string;
  name: string;
  type: string;
};

const initialFormState: FormState = {
  name: "",
  quantity: "1",
  unit: "pcs",
  categoryId: "",
  expiryDate: ""
};

const isValidExpiryDate = (value: string): boolean => {
  if (!value.trim()) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) && !Number.isNaN(new Date(value.trim()).getTime());
};

export default function AddItemScreen({ onCreated }: AddItemScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { locations, selectedLocationId, setSelectedLocationId, reloadLocations } = useInventory();
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [selectedImage, setSelectedImage] = useState<PickerAsset>(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [categorySearch, setCategorySearch] = useState("");

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      setLoadingCategories(true);
      try {
        const response = await api.get("/categories/tree");
        const flattened = flattenCategoryTree(response.data);
        setCategories(flattened);
        const firstLeaf = flattened.find((c) => c.isLeaf);
        setFormState((current) => ({
          ...current,
          categoryId:
            current.categoryId && flattened.some((c) => c.id === current.categoryId && c.isLeaf)
              ? current.categoryId
              : (firstLeaf?.id ?? "")
        }));
      } catch (error) {
        const message = axios.isAxiosError(error)
          ? error.response?.data?.message ?? "Could not load categories."
          : "Could not load categories.";
        Alert.alert("Category Load Failed", message);
      } finally {
        setLoadingCategories(false);
      }
    };

    void loadCategories();
  }, []);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === formState.categoryId),
    [categories, formState.categoryId]
  );

  const selectedLocation = useMemo(
    () => locations.find((l) => l.id === selectedLocationId),
    [locations, selectedLocationId]
  );

  const updateField = (field: keyof FormState, value: string) => {
    setFormState((current) => ({ ...current, [field]: value }));
  };

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Photo library access is required to choose an image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8
    });
    if (!result.canceled) setSelectedImage(result.assets[0]);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Camera access is required to take a photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8
    });
    if (!result.canceled) setSelectedImage(result.assets[0]);
  };

  const buildUploadFile = (asset: ImagePicker.ImagePickerAsset): ReactNativeUploadFile => {
    const fileName =
      asset.fileName ??
      asset.uri.split("/").pop() ??
      `inventory-${Date.now()}.${asset.mimeType?.split("/")[1] ?? "jpg"}`;
    return { uri: asset.uri, name: fileName, type: asset.mimeType ?? "image/jpeg" };
  };

  const handleCreateLocation = async () => {
    const name = newLocationName.trim();
    if (!name) return;
    try {
      const loc = await createLocationApi(name);
      reloadLocations();
      setSelectedLocationId(loc.id);
      setNewLocationName("");
      setLocationModalVisible(false);
      Alert.alert("Success", `Location "${loc.name}" created.`);
    } catch {
      Alert.alert("Error", "Failed to create location.");
    }
  };

  const submitForm = async () => {
    if (!selectedLocationId) {
      Alert.alert("Missing Location", "Please select or create a location first.");
      return;
    }

    if (!formState.name.trim() || !formState.quantity.trim() || !formState.categoryId) {
      Alert.alert("Missing Fields", "Name, quantity, and category are required.");
      return;
    }

    if (!isValidExpiryDate(formState.expiryDate)) {
      Alert.alert("Invalid Date", "Expiry date must be in YYYY-MM-DD format.");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();

      formData.append("locationId", selectedLocationId);
      formData.append("name", formState.name.trim());
      formData.append("quantity", formState.quantity.trim());
      formData.append("unit", formState.unit.trim() || "pcs");
      formData.append("categoryId", formState.categoryId);

      if (formState.expiryDate.trim()) {
        formData.append("expiryDate", formState.expiryDate.trim());
      }

      if (selectedImage) {
        formData.append("image", buildUploadFile(selectedImage) as any);
      }

      await api.post("/items", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      Alert.alert("Success", "Item created successfully.");
      const firstLeaf = categories.find((c) => c.isLeaf);
      setFormState({ ...initialFormState, categoryId: firstLeaf?.id ?? "" });
      setSelectedImage(null);
      onCreated?.();
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message ?? "Could not create the item."
        : "Could not create the item.";
      Alert.alert("Submit Failed", message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerCard}>
            <Text style={styles.eyebrow}>Add Inventory Item</Text>
            <Text style={styles.title}>Capture item details, attach a photo, and save.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Item Details</Text>

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.label}>Name</Text>
              <Pressable onPress={() => {
                if (!cameraPermission?.granted) requestCameraPermission();
                setScanning(true);
              }}>
                <Text style={{ color: colors.amber, fontWeight: "bold", fontSize: 13 }}>[Scan Barcode]</Text>
              </Pressable>
            </View>
            <TextInput
              placeholder="Potato"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={formState.name}
              onChangeText={(value) => updateField("name", value)}
            />

            <Text style={styles.label}>Quantity</Text>
            <TextInput
              keyboardType="decimal-pad"
              placeholder="1"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={formState.quantity}
              onChangeText={(value) => updateField("quantity", value)}
            />

            <Text style={styles.label}>Unit</Text>
            <TextInput
              placeholder="pcs"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={formState.unit}
              onChangeText={(value) => updateField("unit", value)}
            />

            <Text style={styles.label}>Expiry Date <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={formState.expiryDate}
              onChangeText={(value) => updateField("expiryDate", value)}
            />

            <Text style={styles.label}>Category</Text>
            <Pressable
              style={styles.selector}
              onPress={() => setCategoryModalVisible(true)}
              disabled={loadingCategories || categories.length === 0}
            >
              {loadingCategories ? (
                <View style={styles.selectorLoading}>
                  <ActivityIndicator size="small" color={colors.textPrimary} />
                  <Text style={styles.selectorText}>Loading categories...</Text>
                </View>
              ) : selectedCategory ? (
                <View style={styles.breadcrumbRow}>
                  {selectedCategory.label.split(" / ").map((part, i, arr) => (
                    <View key={i} style={styles.breadcrumbPart}>
                      {i > 0 && <Text style={styles.breadcrumbSep}>{"›"}</Text>}
                      <Text
                        style={[
                          styles.breadcrumbText,
                          i === arr.length - 1 && styles.breadcrumbLeaf
                        ]}
                        numberOfLines={1}
                      >
                        {part}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.selectorPlaceholder}>
                  {categories.length === 0 ? "No categories available" : "Select a subcategory..."}
                </Text>
              )}
            </Pressable>

            <Text style={styles.label}>Location</Text>
            <Pressable
              style={styles.selector}
              onPress={() => setLocationModalVisible(true)}
            >
              <Text style={selectedLocation ? styles.selectorText : styles.selectorPlaceholder}>
                {selectedLocation?.name ?? "Select a location"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Photo</Text>

            <View style={styles.actionRow}>
              <Pressable style={styles.secondaryButton} onPress={takePhoto}>
                <Text style={styles.secondaryButtonText}>Take Photo</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={pickFromGallery}>
                <Text style={styles.secondaryButtonText}>Choose from Gallery</Text>
              </Pressable>
            </View>

            {selectedImage ? (
              <View style={styles.previewCard}>
                <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
                <Text numberOfLines={2} style={styles.previewText}>
                  {selectedImage.fileName ?? selectedImage.uri}
                </Text>
              </View>
            ) : (
              <View style={styles.emptyPreview}>
                <Text style={styles.emptyPreviewText}>No image selected yet.</Text>
              </View>
            )}
          </View>

          <Pressable
            style={[
              styles.primaryButton,
              (submitting || !selectedLocationId || categories.length === 0) && styles.primaryButtonDisabled
            ]}
            disabled={submitting || !selectedLocationId || categories.length === 0}
            onPress={submitForm}
          >
            {submitting ? (
              <ActivityIndicator color={colors.textOnStrong} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {!selectedLocationId ? "Select a Location First" : "Submit Item"}
              </Text>
            )}
          </Pressable>
        </ScrollView>

        {/* Category Modal */}
        <Modal visible={categoryModalVisible} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Select Subcategory</Text>
              <TextInput
                placeholder="Search categories..."
                placeholderTextColor={colors.textSubtle}
                style={[styles.input, { marginBottom: 12 }]}
                value={categorySearch}
                onChangeText={setCategorySearch}
                autoFocus
              />
              <ScrollView showsVerticalScrollIndicator={false}>
                {categories
                  .filter((c) => {
                    if (!categorySearch.trim()) return true;
                    const q = categorySearch.toLowerCase();
                    return c.name.toLowerCase().includes(q) || c.label.toLowerCase().includes(q);
                  })
                  .map((category) => {
                    if (!category.isLeaf) {
                      // Parent category - show as non-selectable header
                      return (
                        <View key={category.id} style={{ paddingLeft: 4 + category.depth * 12, paddingTop: 10, paddingBottom: 4 }}>
                          <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textSubtle, textTransform: "uppercase", letterSpacing: 1 }}>
                            {category.name}
                          </Text>
                        </View>
                      );
                    }
                    // Leaf category - selectable
                    return (
                      <Pressable
                        key={category.id}
                        style={[
                          styles.categoryOption,
                          { marginLeft: category.depth * 12 },
                          category.id === formState.categoryId && styles.categoryOptionActive
                        ]}
                        onPress={() => {
                          updateField("categoryId", category.id);
                          setCategoryModalVisible(false);
                          setCategorySearch("");
                        }}
                      >
                        <Text style={styles.categoryOptionText}>{category.name}</Text>
                        {category.id === formState.categoryId && (
                          <Text style={{ color: colors.amber, fontSize: 16 }}>{"\u2713"}</Text>
                        )}
                      </Pressable>
                    );
                  })}
                {categories.filter((c) => {
                  if (!categorySearch.trim()) return true;
                  const q = categorySearch.toLowerCase();
                  return c.name.toLowerCase().includes(q) || c.label.toLowerCase().includes(q);
                }).length === 0 && (
                  <Text style={{ color: colors.textMuted, textAlign: "center", padding: 20 }}>
                    No categories match "{categorySearch}"
                  </Text>
                )}
              </ScrollView>
              <Pressable style={styles.modalCloseButton} onPress={() => { setCategoryModalVisible(false); setCategorySearch(""); }}>
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Location Modal */}
        <Modal visible={locationModalVisible} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Select Location</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {locations.map((loc) => (
                  <Pressable
                    key={loc.id}
                    style={[styles.categoryOption, loc.id === selectedLocationId && styles.categoryOptionActive]}
                    onPress={() => { setSelectedLocationId(loc.id); setLocationModalVisible(false); }}
                  >
                    <Text style={styles.categoryOptionText}>{loc.name}</Text>
                  </Pressable>
                ))}
                {locations.length === 0 ? (
                  <Text style={{ color: colors.textMuted, textAlign: "center", padding: 16 }}>
                    No locations yet. Create one below.
                  </Text>
                ) : null}
              </ScrollView>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                <TextInput
                  placeholder="New location name..."
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  value={newLocationName}
                  onChangeText={setNewLocationName}
                />
                <Pressable
                  style={[styles.modalCloseButton, { flex: 0, paddingHorizontal: 20 }]}
                  onPress={handleCreateLocation}
                >
                  <Text style={styles.modalCloseButtonText}>Add</Text>
                </Pressable>
              </View>
              <Pressable style={[styles.modalCloseButton, { marginTop: 8 }]} onPress={() => setLocationModalVisible(false)}>
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Barcode Scanner Modal */}
        <Modal visible={scanning} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Scan Item Barcode</Text>
              <View style={{ width: "100%", height: 300, borderRadius: 16, overflow: "hidden", marginBottom: 20 }}>
                {scanning && (
                  <CameraView
                    style={{ flex: 1 }}
                    onBarcodeScanned={({ data }) => {
                      updateField("name", data);
                      setScanning(false);
                      Alert.alert("Barcode Scanned", `Populated name field with: ${data}`);
                    }}
                  />
                )}
              </View>
              <Pressable style={styles.modalCloseButton} onPress={() => setScanning(false)}>
                <Text style={styles.modalCloseButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bgPage },
    flex: { flex: 1 },
    scrollContent: { padding: 20, gap: 16 },
    headerCard: { borderRadius: 24, backgroundColor: "#0f172a", padding: 20 },
    eyebrow: { color: colors.amber, fontSize: 12, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" },
    title: { marginTop: 10, color: "#ffffff", fontSize: 24, fontWeight: "700", lineHeight: 32 },
    card: {
      borderRadius: 24, backgroundColor: colors.bgCard, padding: 18,
      shadowColor: "#000000", shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3
    },
    sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.textPrimary, marginBottom: 12 },
    label: { marginTop: 10, marginBottom: 6, fontSize: 14, fontWeight: "600", color: colors.textSecondary },
    optional: { fontSize: 12, fontWeight: "400", color: colors.textSubtle },
    breadcrumbRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 4 },
    breadcrumbPart: { flexDirection: "row", alignItems: "center", gap: 4 },
    breadcrumbSep: { color: colors.textFaint, fontSize: 14 },
    breadcrumbText: { color: colors.textMuted, fontSize: 13 },
    breadcrumbLeaf: {
      color: colors.amberOnSoft,
      backgroundColor: colors.amberSoft,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      fontWeight: "700",
      fontSize: 13
    },
    input: {
      borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 16, backgroundColor: colors.bgInput,
      paddingHorizontal: 14, paddingVertical: 14, color: colors.textPrimary, fontSize: 15
    },
    selector: {
      borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 16, backgroundColor: colors.bgInput,
      paddingHorizontal: 14, paddingVertical: 16, minHeight: 56, justifyContent: "center"
    },
    selectorLoading: { flexDirection: "row", alignItems: "center", gap: 10 },
    selectorText: { color: colors.textPrimary, fontSize: 15 },
    selectorPlaceholder: { color: colors.textMuted, fontSize: 15 },
    actionRow: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
    secondaryButton: {
      flexGrow: 1, minWidth: 150, borderRadius: 999, borderWidth: 1, borderColor: colors.bgStrong,
      paddingHorizontal: 18, paddingVertical: 14, alignItems: "center"
    },
    secondaryButtonText: { color: colors.textPrimary, fontSize: 15, fontWeight: "700" },
    previewCard: { marginTop: 16, borderRadius: 20, backgroundColor: colors.bgInput, overflow: "hidden" },
    previewImage: { width: "100%", height: 220 },
    previewText: { padding: 12, color: colors.textSecondary, fontSize: 13 },
    emptyPreview: {
      marginTop: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.borderStrong,
      borderStyle: "dashed", padding: 24, alignItems: "center"
    },
    emptyPreviewText: { color: colors.textMuted, fontSize: 14 },
    primaryButton: {
      borderRadius: 999, backgroundColor: colors.bgStrong, minHeight: 56,
      alignItems: "center", justifyContent: "center", marginBottom: 12
    },
    primaryButtonDisabled: { opacity: 0.7 },
    primaryButtonText: { color: colors.textOnStrong, fontSize: 16, fontWeight: "700" },
    modalBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
    modalCard: {
      maxHeight: "75%", borderTopLeftRadius: 28, borderTopRightRadius: 28,
      backgroundColor: colors.bgCard, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28
    },
    modalTitle: { fontSize: 20, fontWeight: "700", color: colors.textPrimary, marginBottom: 16 },
    categoryOption: { borderRadius: 16, backgroundColor: colors.bgInput, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 10, flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const },
    categoryOptionActive: { backgroundColor: colors.amberSoft },
    categoryOptionText: { color: colors.textPrimary, fontSize: 15 },
    modalCloseButton: { marginTop: 8, borderRadius: 999, backgroundColor: colors.bgStrong, alignItems: "center", paddingVertical: 14 },
    modalCloseButtonText: { color: colors.textOnStrong, fontSize: 15, fontWeight: "700" }
  });
