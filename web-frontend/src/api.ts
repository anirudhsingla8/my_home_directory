import axios from "axios";

export interface CategoryNode {
  id: string;
  name: string;
  userId?: string;
  parentCategoryId: string | null;
  createdAt?: string;
  updatedAt?: string;
  children: CategoryNode[];
}

export interface CategoryOption {
  id: string;
  label: string;
  depth: number;
  name: string;
}

export interface Item {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  imageUrl: string | null;
  expiryDate: string | null;
  warrantyExpiry?: string | null;
  notes?: string | null;
  category?: {
    id: string;
    name: string;
  };
  location?: {
    id: string;
    name: string;
  };
}

export interface ItemQueryParams {
  userId?: string;
  categoryId?: string;
  locationId?: string;
  search?: string;
}

export interface CreateItemPayload {
  name: string;
  quantity: number;
  unit: string;
  categoryId: string;
  userId: string;
  locationId: string;
  expiryDate?: string;
  imageFile?: File | null;
}

export interface CreateCategoryPayload {
  name: string;
  userId: string;
  parentCategoryId?: string | null;
}

export const api = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL || "http://localhost:3000") + "/api",
  headers: {
    Accept: "application/json"
  }
});

// Axios interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Axios response interceptor — auto-logout on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      // Only auto-logout if we had a token (i.e. it expired), not during login/signup
      const hadToken = localStorage.getItem("auth_token");
      if (hadToken) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        showToast("Session expired. Please log in again.", "error");
        window.location.replace("/");
      }
    }
    return Promise.reject(error);
  }
);

// Lightweight toast notification utility (no extra dependency)
export const showToast = (
  message: string,
  variant: "success" | "error" | "info" = "info"
) => {
  const existing = document.getElementById("app-toast");
  if (existing) existing.remove();

  const bgMap = {
    success: "linear-gradient(135deg, #065f46, #047857)",
    error: "linear-gradient(135deg, #881337, #be123c)",
    info: "linear-gradient(135deg, #1e3a5f, #1e40af)"
  };

  const toast = document.createElement("div");
  toast.id = "app-toast";
  toast.textContent = message;
  Object.assign(toast.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    padding: "14px 24px",
    borderRadius: "16px",
    background: bgMap[variant],
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "600",
    fontFamily: "system-ui, sans-serif",
    boxShadow: "0 10px 40px -10px rgba(0,0,0,0.4)",
    zIndex: "9999",
    opacity: "0",
    transform: "translateY(12px)",
    transition: "all 0.3s ease"
  });

  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(12px)";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: "ADMIN" | "USER";
  };
}

export const fetchCategoryTree = async (userId: string): Promise<CategoryNode[]> => {
  const response = await api.get<CategoryNode[]>("/categories/tree", {
    params: {
      userId
    }
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
      depth,
      label: nextPath
    });

    if (node.children.length > 0) {
      flattened.push(...flattenCategoryTree(node.children, depth + 1, nextPath));
    }
  }

  return flattened;
};

export const fetchItems = async (params: ItemQueryParams): Promise<Item[]> => {
  const response = await api.get<Item[]>("/items", {
    params
  });

  return response.data;
};

export const fetchAlertItems = async (userId: string): Promise<Item[]> => {
  const response = await api.get<Item[]>("/items/alerts", {
    params: { userId }
  });

  return response.data;
};

export const createItem = async (payload: CreateItemPayload): Promise<Item> => {
  const formData = new FormData();

  formData.append("name", payload.name);
  formData.append("quantity", String(payload.quantity));
  formData.append("unit", payload.unit);
  formData.append("categoryId", payload.categoryId);
  formData.append("userId", payload.userId);
  formData.append("locationId", payload.locationId);

  if (payload.expiryDate) {
    formData.append("expiryDate", payload.expiryDate);
  }

  if (payload.imageFile) {
    formData.append("image", payload.imageFile);
  }

  const response = await api.post<Item>("/items", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });

  return response.data;
};

export const updateItem = async (itemId: string, payload: Partial<CreateItemPayload>): Promise<Item> => {
  const formData = new FormData();

  if (payload.name) formData.append("name", payload.name);
  if (payload.quantity) formData.append("quantity", String(payload.quantity));
  if (payload.unit) formData.append("unit", payload.unit);
  if (payload.categoryId) formData.append("categoryId", payload.categoryId);
  if (payload.userId) formData.append("userId", payload.userId);
  if (payload.locationId) formData.append("locationId", payload.locationId);
  if (payload.expiryDate) formData.append("expiryDate", payload.expiryDate);
  if (payload.imageFile) formData.append("image", payload.imageFile);

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
