import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import AddItemScreen from "./screens/AddItemScreen";
import HomeScreen from "./screens/HomeScreen";
import AuthScreen from "./screens/AuthScreen";
import { InventoryProvider, useInventory } from "./context/InventoryContext";
import { AuthProvider, useAuth } from "./context/AuthContext";

type ScreenKey = "home" | "add";

function AppContent() {
  const [activeScreen, setActiveScreen] = useState<ScreenKey>("home");
  const { triggerRefresh } = useInventory();
  const { isAuthenticated, isLoading, logout, user } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0f172a", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />

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
              Add Item
            </Text>
          </Pressable>
          
          <Pressable
            style={[styles.navButton, { backgroundColor: "#ef4444", borderColor: "#ef4444" }]}
            onPress={logout}
          >
            <Text style={[styles.navText, { color: "#ffffff" }]}>
              Logout
            </Text>
          </Pressable>
        </View>

        <View style={styles.screenContainer}>
          {activeScreen === "home" ? (
            <HomeScreen
              onOpenAdd={() => setActiveScreen("add")}
            />
          ) : (
            <AddItemScreen
              onCreated={() => {
                triggerRefresh();
                setActiveScreen("home");
              }}
            />
          )}
        </View>
      </View>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <InventoryProvider>
        <AppContent />
      </InventoryProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc"
  },
  topBar: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8
  },
  navButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center"
  },
  navButtonActive: {
    backgroundColor: "#0f172a",
    borderColor: "#0f172a"
  },
  navText: {
    color: "#0f172a",
    fontWeight: "700",
    fontSize: 15
  },
  navTextActive: {
    color: "#ffffff"
  },
  screenContainer: {
    flex: 1
  }
});
