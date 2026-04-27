import axios from "axios";

// ─── Types ───────────────────────────────────────────────────────────

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
  isLeaf: boolean;
}

export interface Item {
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
}

export interface PaginatedItems {
  items: Item[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ItemQueryParams {
  categoryId?: string;
  locationId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateItemPayload {
  name: string;
  quantity: number;
  minQuantity?: number;
  unit: string;
  categoryId: string;
  locationId: string;
  expiryDate?: string;
  imageFile?: File | null;
}

export interface CreateCategoryPayload {
  name: string;
  parentCategoryId?: string | null;
}

export interface Location {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

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
  /** ISO timestamp when the next resend is allowed (drives the countdown). */
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

// ─── Axios Instance ──────────────────────────────────────────────────

export const api = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL || "http://localhost:3000") + "/api",
  headers: { Accept: "application/json" }
});

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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
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

// ─── Toast ───────────────────────────────────────────────────────────

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

// ─── Category API ────────────────────────────────────────────────────

export const fetchCategoryTree = async (): Promise<CategoryNode[]> => {
  const response = await api.get<CategoryNode[]>("/categories/tree");
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

    flattened.push({ id: node.id, name: node.name, depth, label: nextPath, isLeaf });

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

// Admin-only — populates the global default tree. Idempotent.
export const seedDefaultCategories = async (): Promise<{ created: number }> => {
  const response = await api.post<{ created: number; message: string }>(
    "/categories/seed-defaults"
  );
  return { created: response.data.created };
};

// ─── Location API ────────────────────────────────────────────────────

export const fetchLocations = async (): Promise<Location[]> => {
  const response = await api.get<Location[]>("/locations");
  return response.data;
};

export const createLocation = async (name: string): Promise<Location> => {
  const response = await api.post<Location>("/locations", { name });
  return response.data;
};

export const deleteLocation = async (locationId: string): Promise<void> => {
  await api.delete(`/locations/${locationId}`);
};

// ─── Geo / Location detection (no auth, external) ────────────────────

export interface PlaceSuggestion {
  name: string;
  label: string;
}

interface IpWhoIsResponse {
  success?: boolean;
  city?: string;
  region?: string;
  country?: string;
}

export const detectCityFromIP = async (
  signal?: AbortSignal
): Promise<string | null> => {
  // Primary: ask our backend, which honours X-Forwarded-For and avoids any
  // ad-blocker / corporate-firewall blocking ipwho.is from the browser.
  try {
    const res = await api.get<{ city: string | null }>("/locations/detect", { signal });
    const city = res.data?.city?.trim();
    if (city && city.toLowerCase() !== "unknown") return city;
  } catch {
    /* fall through to client-side */
  }

  // Fallback: direct call. Useful in local dev where the server sees a
  // loopback IP and bails out, but the browser's external IP geolocates fine.
  try {
    const res = await fetch("https://ipwho.is/", { signal });
    if (!res.ok) return null;
    const data: IpWhoIsResponse = await res.json();
    if (data.success === false) return null;
    const city = data.city?.trim();
    if (!city || city.toLowerCase() === "unknown") return null;
    return city;
  } catch {
    return null;
  }
};

interface PhotonFeature {
  properties?: {
    name?: string;
    state?: string;
    country?: string;
    city?: string;
  };
}

interface PhotonResponse {
  features?: PhotonFeature[];
}

export const searchPlaces = async (
  query: string,
  signal?: AbortSignal
): Promise<PlaceSuggestion[]> => {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", trimmed);
  url.searchParams.set("limit", "5");
  url.searchParams.append("osm_tag", "place:city");
  url.searchParams.append("osm_tag", "place:town");
  url.searchParams.append("osm_tag", "place:village");
  url.searchParams.append("osm_tag", "place:state");

  try {
    const res = await fetch(url.toString(), { signal });
    if (!res.ok) return [];
    const data: PhotonResponse = await res.json();
    const features = data.features ?? [];

    const seen = new Set<string>();
    const suggestions: PlaceSuggestion[] = [];

    for (const feat of features) {
      const props = feat.properties ?? {};
      const name = props.name?.trim();
      if (!name) continue;
      const region = props.state?.trim() || props.country?.trim() || "";
      const label = region ? `${name}, ${region}` : name;
      if (seen.has(label.toLowerCase())) continue;
      seen.add(label.toLowerCase());
      suggestions.push({ name, label });
    }

    return suggestions;
  } catch {
    return [];
  }
};

// ─── Item API ────────────────────────────────────────────────────────

export const fetchItems = async (params: ItemQueryParams): Promise<PaginatedItems> => {
  const response = await api.get<PaginatedItems>("/items", { params });
  return response.data;
};

export const fetchAlertItems = async (): Promise<Item[]> => {
  const response = await api.get<Item[]>("/items/alerts");
  return response.data;
};

export const createItem = async (payload: CreateItemPayload): Promise<Item> => {
  const formData = new FormData();

  formData.append("name", payload.name);
  formData.append("quantity", String(payload.quantity));
  if (payload.minQuantity !== undefined) {
    formData.append("minQuantity", String(payload.minQuantity));
  }
  formData.append("unit", payload.unit);
  formData.append("categoryId", payload.categoryId);
  formData.append("locationId", payload.locationId);

  if (payload.expiryDate) {
    formData.append("expiryDate", payload.expiryDate);
  }

  if (payload.imageFile) {
    formData.append("image", payload.imageFile);
  }

  const response = await api.post<Item>("/items", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });

  return response.data;
};

export const updateItem = async (itemId: string, payload: Partial<CreateItemPayload>): Promise<Item> => {
  const formData = new FormData();

  if (payload.name) formData.append("name", payload.name);
  if (payload.quantity !== undefined) formData.append("quantity", String(payload.quantity));
  if (payload.minQuantity !== undefined) formData.append("minQuantity", String(payload.minQuantity));
  if (payload.unit) formData.append("unit", payload.unit);
  if (payload.categoryId) formData.append("categoryId", payload.categoryId);
  if (payload.locationId) formData.append("locationId", payload.locationId);
  if (payload.expiryDate) formData.append("expiryDate", payload.expiryDate);
  if (payload.imageFile) formData.append("image", payload.imageFile);

  const response = await api.put<Item>(`/items/${itemId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });

  return response.data;
};

export const deleteItem = async (itemId: string): Promise<void> => {
  await api.delete(`/items/${itemId}`);
};

// ─── Shopping List API ──────────────────────────────────────────────

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
  notes?: string | null;
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
  patch: Partial<{ name: string; quantity: number; unit: string | null; notes: string | null; completed: boolean }>
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
