import axios from "axios";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, AuthResponse } from "../api";
import { useAuth } from "../context/AuthContext";

export default function AuthScreen() {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password || (!isLogin && !name)) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const response = await api.post<AuthResponse>("/auth/login", { email, password });
        await login(response.data);
      } else {
        const response = await api.post<AuthResponse>("/auth/signup", { email, password, name });
        await login(response.data);
      }
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message ?? "Authentication failed."
        : "Authentication failed.";
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
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
            <Text style={styles.title}>{isLogin ? "Welcome Back" : "Create Account"}</Text>
            <Text style={styles.subtitle}>
              {isLogin ? "Sign in to access your inventory" : "Register to start organizing"}
            </Text>
          </View>

          <View style={styles.card}>
            {!isLogin && (
              <>
                <Text style={styles.label}>Display Name</Text>
                <TextInput
                  placeholder="John Doe"
                  placeholderTextColor="#64748b"
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                />
              </>
            )}

            <Text style={styles.label}>Email Address</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor="#64748b"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor="#64748b"
              style={styles.input}
              value={password}
              onChangeText={setPassword}
            />

            <Pressable
              style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
              disabled={loading}
              onPress={handleSubmit}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>{isLogin ? "Sign In" : "Sign Up"}</Text>
              )}
            </Pressable>

            <Pressable onPress={() => setIsLogin(!isLogin)} style={styles.switchButton}>
              <Text style={styles.switchButtonText}>
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0f172a"
  },
  flex: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20
  },
  headerCard: {
    alignItems: "center",
    marginBottom: 32
  },
  title: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "700"
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: 15,
    marginTop: 8
  },
  card: {
    borderRadius: 24,
    backgroundColor: "#ffffff",
    padding: 24,
    shadowColor: "#0f172a",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#334155"
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 16,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#0f172a",
    fontSize: 15,
    marginBottom: 16
  },
  primaryButton: {
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: "#fbbf24",
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16
  },
  primaryButtonDisabled: {
    opacity: 0.7
  },
  primaryButtonText: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "700"
  },
  switchButton: {
    alignItems: "center",
    paddingVertical: 8
  },
  switchButtonText: {
    color: "#64748b",
    fontSize: 14,
    fontWeight: "600"
  }
});
