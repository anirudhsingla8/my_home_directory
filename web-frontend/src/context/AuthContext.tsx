import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { AuthResponse, AuthUser } from "../api";

interface AuthContextType {
  token: string | null;
  user: AuthUser | null;
  login: (authData: AuthResponse) => void;
  logout: () => void;
  updateUser: (user: AuthUser) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem("auth_token");
    const savedUser = localStorage.getItem("auth_user");

    if (savedToken && savedUser) {
      setToken(savedToken);
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse user from local storage", e);
      }
    }
  }, []);

  const login = (authData: AuthResponse) => {
    setToken(authData.token);
    setUser(authData.user);
    localStorage.setItem("auth_token", authData.token);
    localStorage.setItem("auth_user", JSON.stringify(authData.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
  };

  const updateUser = (next: AuthUser) => {
    setUser(next);
    localStorage.setItem("auth_user", JSON.stringify(next));
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        login,
        logout,
        updateUser,
        isAuthenticated: !!token
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
