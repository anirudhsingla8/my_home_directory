import axios from "axios";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  Platform.select({
    android: "http://10.0.2.2:3000",
    ios: "http://localhost:3000",
    default: "http://localhost:3000"
  })!;

export const api = axios.create({
  baseURL: API_BASE_URL + "/api",
  headers: { Accept: "application/json" },
  timeout: 15000
});

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error("Failed to read auth token", e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      try {
        const hadToken = await AsyncStorage.getItem("auth_token");
        if (hadToken) {
          await AsyncStorage.removeItem("auth_token");
          await AsyncStorage.removeItem("auth_user");
        }
      } catch (e) {
        console.error("Failed to clear auth on 401", e);
      }
    }
    return Promise.reject(error);
  }
);

// ─── Types ───────────────────────────────────────────────────────────

export type Gender = "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "USER";
  gender?: Gender | null;
  dateOfBirth?: string | null;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface UpdateProfilePayload {
  name?: string | null;
  gender?: Gender | null;
  dateOfBirth?: string | null;
}

export const fetchMe = async (): Promise<AuthUser> => {
  const response = await api.get<{ user: AuthUser }>("/auth/me");
  return response.data.user;
};

export const updateProfile = async (payload: UpdateProfilePayload): Promise<AuthUser> => {
  const response = await api.patch<{ user: AuthUser }>("/auth/profile", payload);
  return response.data.user;
};

export const updatePassword = async (
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  await api.patch("/auth/password", { currentPassword, newPassword });
};

export interface ForgotPasswordResponse {
  message: string;
  resendAvailableAt: string;
}

export const requestPasswordReset = async (
  email: string
): Promise<ForgotPasswordResponse> => {
  const response = await api.post<ForgotPasswordResponse>("/auth/forgot-password", { email });
  return response.data;
};

export const resetPasswordWithOtp = async (
  email: string,
  otp: string,
  newPassword: string
): Promise<void> => {
  await api.post("/auth/reset-password", { email, otp, newPassword });
};

export type CategoryNode = {
  id: string;
  name: string;
  parentCategoryId: string | null;
  children: CategoryNode[];
};

export type CategoryOption = {
  id: string;
  name: string;
  label: string;
  depth: number;
  isLeaf: boolean;
};

export type Item = {
  id: string;
  name: string;
  quantity: number;
  minQuantity: number;
  unit: string;
  imageUrl: string | null;
  expiryDate: string | null;
  warrantyExpiry?: string | null;
  notes?: string | null;
  category?: { id: string; name: string };
  location?: { id: string; name: string };
};

export interface PaginatedItems {
  items: Item[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type ItemQueryParams = {
  categoryId?: string;
  locationId?: string;
  search?: string;
  page?: number;
};

export interface Location {
  id: string;
  name: string;
  userId: string;
}

export interface CreateItemPayload {
  name: string;
  quantity: number;
  minQuantity?: number;
  unit: string;
  categoryId: string;
  locationId: string;
  expiryDate?: string;
}

export interface CreateCategoryPayload {
  name: string;
  parentCategoryId?: string | null;
}

// ─── API Functions ───────────────────────────────────────────────────

export const fetchItems = async (params: ItemQueryParams): Promise<PaginatedItems> => {
  const response = await api.get<PaginatedItems>("/items", { params });
  return response.data;
};

export const fetchAlertItems = async (): Promise<Item[]> => {
  const response = await api.get<Item[]>("/items/alerts");
  return response.data;
};

export const deleteItem = async (itemId: string): Promise<void> => {
  await api.delete(`/items/${itemId}`);
};

export const fetchLocations = async (): Promise<Location[]> => {
  const response = await api.get<Location[]>("/locations");
  return response.data;
};

export const createLocationApi = async (name: string): Promise<Location> => {
  const response = await api.post<Location>("/locations", { name });
  return response.data;
};

export const flattenCategoryTree = (
  nodes: CategoryNode[],
  depth = 0,
  parentPath = ""
): CategoryOption[] => {
  const flattened: CategoryOption[] = [];

  for (const node of nodes) {
    const nextPath = parentPath ? `${parentPath} / ${node.name}` : node.name;
    const isLeaf = node.children.length === 0;

    flattened.push({ id: node.id, name: node.name, label: nextPath, depth, isLeaf });

    if (!isLeaf) {
      flattened.push(...flattenCategoryTree(node.children, depth + 1, nextPath));
    }
  }

  return flattened;
};

export const createCategory = async (payload: CreateCategoryPayload): Promise<CategoryNode> => {
  const response = await api.post<CategoryNode>("/categories", payload);
  return response.data;
};

export const renameCategory = async (id: string, name: string): Promise<CategoryNode> => {
  const response = await api.patch<CategoryNode>(`/categories/${id}`, { name });
  return response.data;
};

export const deleteCategory = async (id: string): Promise<void> => {
  await api.delete(`/categories/${id}`);
};

export const seedDefaultCategories = async (): Promise<{ created: number }> => {
  const response = await api.post<{ created: number; message: string }>(
    "/categories/seed-defaults"
  );
  return { created: response.data.created };
};

export const fetchCategoryTree = async (): Promise<CategoryNode[]> => {
  const response = await api.get<CategoryNode[]>("/categories/tree");
  return response.data;
};

// ─── Shopping List ───────────────────────────────────────────────────

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  unit: string | null;
  notes: string | null;
  completed: boolean;
  completedAt: string | null;
  createdFromItemId: string | null;
  createdAt: string;
  updatedAt: string;
}

export const fetchShoppingList = async (): Promise<ShoppingListItem[]> => {
  const response = await api.get<ShoppingListItem[]>("/shopping-list");
  return response.data;
};

export const addShoppingItem = async (payload: {
  name: string;
  quantity?: number;
  unit?: string | null;
}): Promise<ShoppingListItem> => {
  const response = await api.post<ShoppingListItem>("/shopping-list", payload);
  return response.data;
};

export const addShoppingFromItem = async (itemId: string): Promise<ShoppingListItem> => {
  const response = await api.post<ShoppingListItem>(`/shopping-list/from-item/${itemId}`);
  return response.data;
};

export const updateShoppingItem = async (
  id: string,
  patch: Partial<{ name: string; quantity: number; unit: string | null; completed: boolean }>
): Promise<ShoppingListItem> => {
  const response = await api.patch<ShoppingListItem>(`/shopping-list/${id}`, patch);
  return response.data;
};

export const deleteShoppingItem = async (id: string): Promise<void> => {
  await api.delete(`/shopping-list/${id}`);
};

export const clearCompletedShoppingItems = async (): Promise<{ deleted: number }> => {
  const response = await api.post<{ deleted: number }>("/shopping-list/clear-completed");
  return response.data;
};
