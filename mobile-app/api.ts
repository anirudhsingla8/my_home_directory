import axios from "axios";
import { Platform } from "react-native";

// Replace this with your LAN IP on a physical device.
// If your backend is mounted under /api or runs on a different port, update it here.
export const API_BASE_URL =
  Platform.select({
    android: "http://10.0.2.2:3000",
    ios: "http://localhost:3000",
    default: "http://localhost:3000"
  }) ?? process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

import AsyncStorage from "@react-native-async-storage/async-storage";

export const api = axios.create({
  baseURL: API_BASE_URL + "/api",
  headers: {
    Accept: "application/json"
  },
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

// Response interceptor — auto-logout on 401 (expired token)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      try {
        const hadToken = await AsyncStorage.getItem("auth_token");
        if (hadToken) {
          await AsyncStorage.removeItem("auth_token");
          await AsyncStorage.removeItem("auth_user");
          // The AuthContext will pick up the missing token and show the login screen
        }
      } catch (e) {
        console.error("Failed to clear auth on 401", e);
      }
    }
    return Promise.reject(error);
  }
);

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

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
};

export type Item = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  imageUrl: string | null;
  expiryDate: string | null;
};

export type ItemQueryParams = {
  userId?: string;
  categoryId?: string;
  locationId?: string;
  search?: string;
};

export const fetchItems = async (params: ItemQueryParams): Promise<Item[]> => {
  const response = await api.get<Item[]>("/items", { params });
  return response.data;
};

export const fetchAlertItems = async (userId: string): Promise<Item[]> => {
  const response = await api.get<Item[]>("/items/alerts", {
    params: { userId }
  });
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

    flattened.push({
      id: node.id,
      name: node.name,
      label: nextPath,
      depth
    });

    if (node.children.length > 0) {
      flattened.push(...flattenCategoryTree(node.children, depth + 1, nextPath));
    }
  }

  return flattened;
};

export interface CreateItemPayload {
  name: string;
  quantity: number;
  unit: string;
  categoryId: string;
  userId: string;
  locationId: string;
  expiryDate?: string;
}

export interface CreateCategoryPayload {
  name: string;
  userId: string;
  parentCategoryId?: string | null;
}

// React Native expects you to manage FormData carefully if passing files.
// For bare strings payload:
export const updateItem = async (itemId: string, payload: Partial<CreateItemPayload>, file?: any): Promise<Item> => {
  const formData = new FormData();

  if (payload.name) formData.append("name", payload.name);
  if (payload.quantity) formData.append("quantity", String(payload.quantity));
  if (payload.unit) formData.append("unit", payload.unit);
  if (payload.categoryId) formData.append("categoryId", payload.categoryId);
  if (payload.userId) formData.append("userId", payload.userId);
  if (payload.locationId) formData.append("locationId", payload.locationId);
  if (payload.expiryDate) formData.append("expiryDate", payload.expiryDate);
  if (file) formData.append("image", file);

  const response = await api.put<Item>(`/items/${itemId}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });

  return response.data;
};

export const deleteItem = async (itemId: string): Promise<void> => {
  await api.delete(`/items/${itemId}`);
};

export const createCategory = async (payload: CreateCategoryPayload): Promise<CategoryNode> => {
  const response = await api.post<CategoryNode>("/categories", payload);
  return response.data;
};

