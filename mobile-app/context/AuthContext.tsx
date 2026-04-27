import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { AuthResponse, AuthUser } from "../api";

interface AuthContextType {
  token: string | null;
  user: AuthUser | null;
  login: (authData: AuthResponse) => void;
  logout: () => void;
  updateUser: (user: AuthUser) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const savedToken = await AsyncStorage.getItem("auth_token");
        const savedUser = await AsyncStorage.getItem("auth_user");

        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        }
      } catch (e) {
        console.error("Failed to load auth state", e);
      } finally {
        setIsLoading(false);
      }
    };
    void loadAuth();
  }, []);

  const login = async (authData: AuthResponse) => {
    setToken(authData.token);
    setUser(authData.user);
    await AsyncStorage.setItem("auth_token", authData.token);
    await AsyncStorage.setItem("auth_user", JSON.stringify(authData.user));
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await AsyncStorage.removeItem("auth_token");
    await AsyncStorage.removeItem("auth_user");
  };

  const updateUser = (next: AuthUser) => {
    setUser(next);
    void AsyncStorage.setItem("auth_user", JSON.stringify(next)).catch(() => {});
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        login,
        logout,
        updateUser,
        isAuthenticated: !!token,
        isLoading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
