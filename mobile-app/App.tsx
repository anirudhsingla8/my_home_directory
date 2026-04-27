import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import AddItemScreen from "./screens/AddItemScreen";
import HomeScreen from "./screens/HomeScreen";
import AuthScreen from "./screens/AuthScreen";
import ProfileScreen from "./screens/ProfileScreen";
import ShoppingListScreen from "./screens/ShoppingListScreen";
import { InventoryProvider, useInventory } from "./context/InventoryContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeColors, ThemeName, ThemeProvider, useTheme } from "./context/ThemeContext";

type ScreenKey = "home" | "add" | "shopping" | "profile";

const themeIcon: Record<ThemeName, string> = {
  light: "☀",
  dark: "☾",
  grey: "◐"
};

function ThemeToggle() {
  const { theme, cycleTheme, colors } = useTheme();
  return (
    <Pressable
      onPress={cycleTheme}
      style={{
        width: 46,
        height: 46,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.borderStrong,
        backgroundColor: colors.bgCard,
        alignItems: "center",
        justifyContent: "center"
      }}
      accessibilityLabel={`Theme: ${theme}`}
    >
      <Text style={{ fontSize: 18, color: colors.textPrimary }}>{themeIcon[theme]}</Text>
    </Pressable>
  );
}

function AppContent() {
  const [activeScreen, setActiveScreen] = useState<ScreenKey>("home");
  const { triggerRefresh } = useInventory();
  const { isAuthenticated, isLoading, logout } = useAuth();
  const { colors, theme } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgPage, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.textPrimary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={theme === "light" ? "dark" : "light"} />

      <View style={styles.container}>
        <View style={styles.topBar}>
          <Pressable
            style={[styles.navButton, activeScreen === "home" && styles.navButtonActive]}
            onPress={() => setActiveScreen("home")}
          >
            <Text style={[styles.navText, activeScreen === "home" && styles.navTextActive]}>
              Home
            </Text>
          </Pressable>

          <Pressable
            style={[styles.navButton, activeScreen === "add" && styles.navButtonActive]}
            onPress={() => setActiveScreen("add")}
          >
            <Text style={[styles.navText, activeScreen === "add" && styles.navTextActive]}>
              Add
            </Text>
          </Pressable>

          <Pressable
            style={[styles.iconButton, activeScreen === "shopping" && styles.iconButtonActive]}
            onPress={() => setActiveScreen("shopping")}
            accessibilityLabel="Shopping list"
          >
            <Text style={[styles.iconText, activeScreen === "shopping" && styles.iconTextActive]}>🛒</Text>
          </Pressable>

          <Pressable
            style={[styles.iconButton, activeScreen === "profile" && styles.iconButtonActive]}
            onPress={() => setActiveScreen("profile")}
            accessibilityLabel="Account settings"
          >
            <Text style={[styles.iconText, activeScreen === "profile" && styles.iconTextActive]}>👤</Text>
          </Pressable>

          <ThemeToggle />

          <Pressable
            style={styles.logoutButton}
            onPress={logout}
          >
            <Text style={styles.logoutText}>
              Logout
            </Text>
          </Pressable>
        </View>

        <View style={styles.screenContainer}>
          {activeScreen === "home" && (
            <HomeScreen onOpenAdd={() => setActiveScreen("add")} />
          )}
          {activeScreen === "add" && (
            <AddItemScreen
              onCreated={() => {
                triggerRefresh();
                setActiveScreen("home");
              }}
            />
          )}
          {activeScreen === "shopping" && (
            <ShoppingListScreen />
          )}
          {activeScreen === "profile" && (
            <ProfileScreen onBack={() => setActiveScreen("home")} />
          )}
        </View>
      </View>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <InventoryProvider>
          <AppContent />
        </InventoryProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPage },
    topBar: {
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
      alignItems: "center"
    },
    navButton: {
      flex: 1,
      minHeight: 46,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.bgCard,
      alignItems: "center",
      justifyContent: "center"
    },
    navButtonActive: {
      backgroundColor: colors.bgStrong,
      borderColor: colors.bgStrong
    },
    navText: { color: colors.textPrimary, fontWeight: "700", fontSize: 14 },
    navTextActive: { color: colors.textOnStrong },
    iconButton: {
      width: 46,
      height: 46,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.bgCard,
      alignItems: "center",
      justifyContent: "center"
    },
    iconButtonActive: {
      backgroundColor: colors.bgStrong,
      borderColor: colors.bgStrong
    },
    iconText: { fontSize: 18 },
    iconTextActive: { color: colors.textOnStrong },
    logoutButton: {
      minHeight: 46,
      paddingHorizontal: 14,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "#ef4444",
      backgroundColor: "#ef4444",
      alignItems: "center",
      justifyContent: "center"
    },
    logoutText: { color: "#ffffff", fontWeight: "700", fontSize: 14 },
    screenContainer: { flex: 1 }
  });
