import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
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
import { CameraView, useCameraPermissions } from 'expo-camera';

import { CategoryOption, api, flattenCategoryTree } from "../api";
import { useInventory } from "../context/InventoryContext";

type AddItemScreenProps = {
  onCreated?: () => void;
};

type FormState = {
  name: string;
  quantity: string;
  unit: string;
  categoryId: string;
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
  categoryId: ""
};

export default function AddItemScreen({ onCreated }: AddItemScreenProps) {
  const { userId, locationId } = useInventory();
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [selectedImage, setSelectedImage] = useState<PickerAsset>(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!userId.trim()) {
      setCategories([]);
      setFormState((current) => ({
        ...current,
        categoryId: ""
      }));
      return;
    }

    const loadCategories = async () => {
      setLoadingCategories(true);

      try {
        const response = await api.get("/categories/tree", {
          params: {
            userId: userId.trim()
          }
        });

        const flattened = flattenCategoryTree(response.data);

        setCategories(flattened);
        setFormState((current) => ({
          ...current,
          categoryId:
            current.categoryId && flattened.some((category) => category.id === current.categoryId)
              ? current.categoryId
              : (flattened[0]?.id ?? "")
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
  }, [userId]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === formState.categoryId),
    [categories, formState.categoryId]
  );

  const updateField = (field: keyof FormState, value: string) => {
    setFormState((current) => ({
      ...current,
      [field]: value
    }));
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

    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
    }
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

    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
    }
  };

  const buildUploadFile = (asset: ImagePicker.ImagePickerAsset): ReactNativeUploadFile => {
    const fileName =
      asset.fileName ??
      asset.uri.split("/").pop() ??
      `inventory-${Date.now()}.${asset.mimeType?.split("/")[1] ?? "jpg"}`;

    const fileType = asset.mimeType ?? "image/jpeg";

    return {
      uri: asset.uri,
      name: fileName,
      type: fileType
    };
  };

  const submitForm = async () => {
    if (!userId.trim() || !locationId.trim()) {
      Alert.alert("Missing Context", "User ID and Location ID are required for backend submission. Please enter them on the Home screen.");
      return;
    }

    if (!formState.name.trim() || !formState.quantity.trim() || !formState.categoryId) {
      Alert.alert("Missing Fields", "Name, quantity, and category are required.");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();

      formData.append("userId", userId.trim());
      formData.append("locationId", locationId.trim());
      formData.append("name", formState.name.trim());
      formData.append("quantity", formState.quantity.trim());
      formData.append("unit", formState.unit.trim() || "pcs");
      formData.append("categoryId", formState.categoryId);

      if (selectedImage) {
        const uploadFile = buildUploadFile(selectedImage);

        // React Native expects a file-like object here instead of a browser File instance.
        formData.append("image", uploadFile as any);
      }

      await api.post("/items", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      Alert.alert("Success", "Item created successfully.");
      setFormState((current) => ({
        ...initialFormState,
        categoryId: categories[0]?.id ?? ""
      }));
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
            <Text style={styles.title}>Capture item details, attach a photo, and upload to the API.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Item Details</Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.label}>Name</Text>
              <Pressable onPress={() => {
                  if (!cameraPermission?.granted) requestCameraPermission();
                  setScanning(true);
                }}>
                <Text style={{ color: "#fbbf24", fontWeight: "bold", fontSize: 13 }}>[Scan Barcode]</Text>
              </Pressable>
            </View>
            <TextInput
              placeholder="Potato"
              placeholderTextColor="#64748b"
              style={styles.input}
              value={formState.name}
              onChangeText={(value) => updateField("name", value)}
            />

            <Text style={styles.label}>Quantity</Text>
            <TextInput
              keyboardType="decimal-pad"
              placeholder="1"
              placeholderTextColor="#64748b"
              style={styles.input}
              value={formState.quantity}
              onChangeText={(value) => updateField("quantity", value)}
            />

            <Text style={styles.label}>Unit</Text>
            <TextInput
              placeholder="pcs"
              placeholderTextColor="#64748b"
              style={styles.input}
              value={formState.unit}
              onChangeText={(value) => updateField("unit", value)}
            />

            <Text style={styles.label}>Category</Text>
            <Pressable
              style={styles.selector}
              onPress={() => setCategoryModalVisible(true)}
              disabled={loadingCategories || categories.length === 0}
            >
              {loadingCategories ? (
                <View style={styles.selectorLoading}>
                  <ActivityIndicator size="small" color="#0f172a" />
                  <Text style={styles.selectorText}>Loading categories...</Text>
                </View>
              ) : (
                <Text style={selectedCategory ? styles.selectorText : styles.selectorPlaceholder}>
                  {selectedCategory?.label ?? "Load categories by entering a user ID"}
                </Text>
              )}
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
              (submitting || !userId || !locationId || categories.length === 0) && styles.primaryButtonDisabled
            ]}
            disabled={submitting || !userId?.trim() || !locationId?.trim() || categories.length === 0}
            onPress={submitForm}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Submit Item</Text>
            )}
          </Pressable>
        </ScrollView>

        <Modal visible={categoryModalVisible} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Select Category</Text>

              <ScrollView showsVerticalScrollIndicator={false}>
                {categories.map((category) => (
                  <Pressable
                    key={category.id}
                    style={[
                      styles.categoryOption,
                      category.id === formState.categoryId && styles.categoryOptionActive
                    ]}
                    onPress={() => {
                      updateField("categoryId", category.id);
                      setCategoryModalVisible(false);
                    }}
                  >
                    <Text style={styles.categoryOptionText}>
                      {`${"  ".repeat(category.depth)}${category.name}`}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Pressable style={styles.modalCloseButton} onPress={() => setCategoryModalVisible(false)}>
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
        <Modal visible={scanning} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Scan Item Barcode</Text>
              <View style={{ width: '100%', height: 300, borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc"
  },
  flex: {
    flex: 1
  },
  scrollContent: {
    padding: 20,
    gap: 16
  },
  headerCard: {
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
  title: {
    marginTop: 10,
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 32
  },
  card: {
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
  label: {
    marginTop: 10,
    marginBottom: 6,
    fontSize: 14,
    fontWeight: "600",
    color: "#334155"
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
  selector: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 16,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 14,
    paddingVertical: 16,
    minHeight: 56,
    justifyContent: "center"
  },
  selectorLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  selectorText: {
    color: "#0f172a",
    fontSize: 15
  },
  selectorPlaceholder: {
    color: "#64748b",
    fontSize: 15
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap"
  },
  secondaryButton: {
    flexGrow: 1,
    minWidth: 150,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#0f172a",
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: "center"
  },
  secondaryButtonText: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700"
  },
  previewCard: {
    marginTop: 16,
    borderRadius: 20,
    backgroundColor: "#f8fafc",
    overflow: "hidden"
  },
  previewImage: {
    width: "100%",
    height: 220
  },
  previewText: {
    padding: 12,
    color: "#334155",
    fontSize: 13
  },
  emptyPreview: {
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderStyle: "dashed",
    padding: 24,
    alignItems: "center"
  },
  emptyPreviewText: {
    color: "#64748b",
    fontSize: 14
  },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: "#0f172a",
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12
  },
  primaryButtonDisabled: {
    opacity: 0.7
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700"
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end"
  },
  modalCard: {
    maxHeight: "75%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: "#ffffff",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 16
  },
  categoryOption: {
    borderRadius: 16,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10
  },
  categoryOptionActive: {
    backgroundColor: "#fde68a"
  },
  categoryOptionText: {
    color: "#0f172a",
    fontSize: 15
  },
  modalCloseButton: {
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: "#0f172a",
    alignItems: "center",
    paddingVertical: 14
  },
  modalCloseButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700"
  }
});
