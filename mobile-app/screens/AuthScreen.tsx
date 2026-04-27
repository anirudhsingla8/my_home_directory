import axios from "axios";
import { useMemo, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";

import ForgotPasswordModal from "./components/ForgotPasswordModal";

import { api, AuthResponse } from "../api";
import { useAuth } from "../context/AuthContext";
import { ThemeColors, useTheme } from "../context/ThemeContext";
import { isPasswordValid, passwordRules } from "../lib/passwordPolicy";

export default function AuthScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const ruleResults = useMemo(
    () => passwordRules.map((r) => ({ ...r, pass: r.test(password) })),
    [password]
  );
  const passwordOk = isLogin || isPasswordValid(password);

  const handleSubmit = async () => {
    if (!email || !password || (!isLogin && !name)) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    if (!isLogin && !passwordOk) {
      Alert.alert("Weak password", "Password doesn't meet all the requirements yet.");
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
                  placeholderTextColor={colors.textMuted}
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
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                secureTextEntry={!showPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { paddingRight: 44, marginBottom: 0 }]}
                value={password}
                onChangeText={setPassword}
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeBtn}
                hitSlop={8}
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              >
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            {!isLogin && password.length > 0 && (
              <View style={styles.rulesBox}>
                {ruleResults.map((r) => (
                  <View key={r.id} style={styles.ruleRow}>
                    <Text style={[styles.ruleIcon, { color: r.pass ? colors.emerald : colors.textFaint }]}>
                      {r.pass ? "✓" : "○"}
                    </Text>
                    <Text style={[styles.ruleText, { color: r.pass ? colors.textSecondary : colors.textMuted }]}>
                      {r.label}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <Pressable
              style={[styles.primaryButton, (loading || (!isLogin && !passwordOk)) && styles.primaryButtonDisabled]}
              disabled={loading || (!isLogin && !passwordOk)}
              onPress={handleSubmit}
            >
              {loading ? (
                <ActivityIndicator color="#0f172a" />
              ) : (
                <Text style={styles.primaryButtonText}>{isLogin ? "Sign In" : "Sign Up"}</Text>
              )}
            </Pressable>

            {isLogin && (
              <Pressable onPress={() => setForgotOpen(true)} style={styles.forgotButton}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Pressable>
            )}

            <Pressable onPress={() => setIsLogin(!isLogin)} style={styles.switchButton}>
              <Text style={styles.switchButtonText}>
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ForgotPasswordModal
        visible={forgotOpen}
        initialEmail={email}
        onClose={() => setForgotOpen(false)}
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: "#0f172a" },
    flex: { flex: 1 },
    scrollContent: { flexGrow: 1, justifyContent: "center", padding: 20 },
    headerCard: { alignItems: "center", marginBottom: 32 },
    title: { color: "#ffffff", fontSize: 28, fontWeight: "700" },
    subtitle: { color: "#94a3b8", fontSize: 15, marginTop: 8 },
    card: {
      borderRadius: 24,
      backgroundColor: colors.bgCard,
      padding: 24,
      shadowColor: "#000000",
      shadowOpacity: 0.2,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8
    },
    label: { marginBottom: 8, fontSize: 14, fontWeight: "600", color: colors.textSecondary },
    input: {
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: 16,
      backgroundColor: colors.bgInput,
      paddingHorizontal: 16,
      paddingVertical: 14,
      color: colors.textPrimary,
      fontSize: 15,
      marginBottom: 16
    },
    primaryButton: {
      marginTop: 8,
      borderRadius: 999,
      backgroundColor: colors.amber,
      minHeight: 56,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16
    },
    primaryButtonDisabled: { opacity: 0.7 },
    primaryButtonText: { color: "#0f172a", fontSize: 16, fontWeight: "700" },
    inputWrapper: { position: "relative", marginBottom: 16 },
    eyeBtn: { position: "absolute", right: 14, top: 0, bottom: 0, justifyContent: "center" },
    switchButton: { alignItems: "center", paddingVertical: 8 },
    switchButtonText: { color: colors.textMuted, fontSize: 14, fontWeight: "600" },
    forgotButton: { alignItems: "center", paddingVertical: 6, marginTop: -4 },
    forgotText: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
    rulesBox: {
      marginTop: 4,
      marginBottom: 12,
      borderRadius: 12,
      backgroundColor: colors.bgInput,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 4
    },
    ruleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    ruleIcon: { fontSize: 13, width: 14, textAlign: "center" },
    ruleText: { fontSize: 12 }
  });
