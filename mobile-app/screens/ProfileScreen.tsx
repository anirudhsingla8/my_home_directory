import axios from "axios";
import { useEffect, useMemo, useState } from "react";
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

import { Gender, updatePassword, updateProfile } from "../api";
import { useAuth } from "../context/AuthContext";
import { ThemeColors, useTheme } from "../context/ThemeContext";
import { passwordRules } from "../lib/passwordPolicy";

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" }
];

const formatDateForInput = (raw: string | null | undefined): string => {
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
};

const isValidDateInput = (value: string): boolean => {
  if (!value.trim()) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return false;
  const d = new Date(value.trim());
  return !Number.isNaN(d.getTime());
};

type Tab = "profile" | "password";

type ProfileScreenProps = {
  onBack: () => void;
};

export default function ProfileScreen({ onBack }: ProfileScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user, updateUser } = useAuth();

  const [tab, setTab] = useState<Tab>("profile");

  const [name, setName] = useState(user?.name ?? "");
  const [gender, setGender] = useState<Gender | "">(user?.gender ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(formatDateForInput(user?.dateOfBirth));
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? "");
    setGender(user.gender ?? "");
    setDateOfBirth(formatDateForInput(user.dateOfBirth));
  }, [user]);

  const ruleResults = useMemo(
    () => passwordRules.map((r) => ({ ...r, pass: r.test(newPassword) })),
    [newPassword]
  );
  const allRulesPass = ruleResults.every((r) => r.pass);

  const submitProfile = async () => {
    if (!isValidDateInput(dateOfBirth)) {
      Alert.alert("Invalid date", "Date of birth must be in YYYY-MM-DD format.");
      return;
    }
    setProfileSubmitting(true);
    try {
      const updated = await updateProfile({
        name: name.trim() || null,
        gender: gender === "" ? null : gender,
        dateOfBirth: dateOfBirth || null
      });
      updateUser(updated);
      Alert.alert("Success", "Profile updated.");
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message ?? "Failed to update profile."
        : "Failed to update profile.";
      Alert.alert("Error", message);
    } finally {
      setProfileSubmitting(false);
    }
  };

  const submitPassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Missing fields", "Fill in all password fields.");
      return;
    }
    if (!allRulesPass) {
      Alert.alert("Weak password", "New password doesn't meet all requirements yet.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Mismatch", "New password and confirmation don't match.");
      return;
    }
    if (newPassword === currentPassword) {
      Alert.alert("Same password", "New password must be different from current.");
      return;
    }

    setPasswordSubmitting(true);
    try {
      await updatePassword(currentPassword, newPassword);
      Alert.alert("Success", "Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message ?? "Failed to update password."
        : "Failed to update password.";
      Alert.alert("Error", message);
    } finally {
      setPasswordSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.headerRow}>
            <Pressable onPress={onBack} style={styles.backBtn} hitSlop={6}>
              <Text style={styles.backText}>{"‹  Back"}</Text>
            </Pressable>
            <Text style={styles.title}>Account settings</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={styles.tabs}>
            <Pressable
              style={[styles.tab, tab === "profile" && styles.tabActive]}
              onPress={() => setTab("profile")}
            >
              <Text style={[styles.tabText, tab === "profile" && styles.tabTextActive]}>Profile</Text>
            </Pressable>
            <Pressable
              style={[styles.tab, tab === "password" && styles.tabActive]}
              onPress={() => setTab("password")}
            >
              <Text style={[styles.tabText, tab === "password" && styles.tabTextActive]}>Password</Text>
            </Pressable>
          </View>

          {tab === "profile" ? (
            <View style={styles.card}>
              <Text style={styles.label}>Email</Text>
              <View style={[styles.input, styles.inputDisabled]}>
                <Text style={styles.disabledText}>{user?.email}</Text>
              </View>

              <Text style={styles.label}>Display name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />

              <Text style={styles.label}>Gender</Text>
              <View style={styles.chipRow}>
                <Pressable
                  style={[styles.chip, gender === "" && styles.chipActive]}
                  onPress={() => setGender("")}
                >
                  <Text style={[styles.chipText, gender === "" && styles.chipTextActive]}>
                    Not specified
                  </Text>
                </Pressable>
                {GENDER_OPTIONS.map((g) => (
                  <Pressable
                    key={g.value}
                    style={[styles.chip, gender === g.value && styles.chipActive]}
                    onPress={() => setGender(g.value)}
                  >
                    <Text style={[styles.chipText, gender === g.value && styles.chipTextActive]}>
                      {g.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Date of birth</Text>
              <TextInput
                autoCapitalize="none"
                keyboardType="numbers-and-punctuation"
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />

              <Pressable
                onPress={submitProfile}
                disabled={profileSubmitting}
                style={[styles.primaryBtn, profileSubmitting && styles.primaryBtnDisabled]}
              >
                {profileSubmitting ? (
                  <ActivityIndicator color={colors.textOnStrong} />
                ) : (
                  <Text style={styles.primaryBtnText}>Save changes</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.label}>Current password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  secureTextEntry={!showCurrent}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Current password"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, { paddingRight: 44 }]}
                />
                <Pressable onPress={() => setShowCurrent((v) => !v)} style={styles.eyeBtn} hitSlop={8} accessibilityLabel={showCurrent ? "Hide" : "Show"}>
                  <Ionicons name={showCurrent ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textMuted} />
                </Pressable>
              </View>

              <Text style={styles.label}>New password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  secureTextEntry={!showNew}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="New password"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, { paddingRight: 44 }]}
                />
                <Pressable onPress={() => setShowNew((v) => !v)} style={styles.eyeBtn} hitSlop={8} accessibilityLabel={showNew ? "Hide" : "Show"}>
                  <Ionicons name={showNew ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textMuted} />
                </Pressable>
              </View>

              <Text style={styles.label}>Confirm new password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  secureTextEntry={!showConfirm}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, { paddingRight: 44 }]}
                />
                <Pressable onPress={() => setShowConfirm((v) => !v)} style={styles.eyeBtn} hitSlop={8} accessibilityLabel={showConfirm ? "Hide" : "Show"}>
                  <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textMuted} />
                </Pressable>
              </View>

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

              <Pressable
                onPress={submitPassword}
                disabled={passwordSubmitting || !allRulesPass || !currentPassword || !confirmPassword}
                style={[
                  styles.primaryBtn,
                  (passwordSubmitting || !allRulesPass || !currentPassword || !confirmPassword) &&
                    styles.primaryBtnDisabled
                ]}
              >
                {passwordSubmitting ? (
                  <ActivityIndicator color={colors.textOnStrong} />
                ) : (
                  <Text style={styles.primaryBtnText}>Update password</Text>
                )}
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bgPage },
    scrollContent: { padding: 16, paddingBottom: 48, gap: 16 },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 4
    },
    backBtn: { paddingVertical: 6, paddingRight: 8 },
    backText: { color: colors.textPrimary, fontSize: 14, fontWeight: "600" },
    title: { color: colors.textPrimary, fontSize: 16, fontWeight: "700" },
    tabs: {
      flexDirection: "row",
      backgroundColor: colors.bgChip,
      borderRadius: 10,
      padding: 4
    },
    tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
    tabActive: { backgroundColor: colors.bgCard },
    tabText: { color: colors.textMuted, fontSize: 14, fontWeight: "600" },
    tabTextActive: { color: colors.textPrimary },
    card: {
      borderRadius: 16,
      backgroundColor: colors.bgCard,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      gap: 4
    },
    label: { marginTop: 10, marginBottom: 6, fontSize: 13, fontWeight: "600", color: colors.textSecondary },
    input: {
      borderWidth: 1,
      borderColor: colors.borderDefault,
      borderRadius: 12,
      backgroundColor: colors.bgInput,
      paddingHorizontal: 12,
      paddingVertical: 12,
      color: colors.textPrimary,
      fontSize: 15,
      minHeight: 44
    },
    inputWrapper: { position: "relative" },
    eyeBtn: { position: "absolute", right: 12, top: 0, bottom: 0, justifyContent: "center" },
    inputDisabled: { backgroundColor: colors.bgChip, justifyContent: "center" },
    disabledText: { color: colors.textMuted, fontSize: 15 },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: colors.bgChip,
      borderWidth: 1,
      borderColor: colors.borderDefault
    },
    chipActive: { backgroundColor: colors.bgStrong, borderColor: colors.bgStrong },
    chipText: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
    chipTextActive: { color: colors.textOnStrong },
    rulesBox: {
      marginTop: 8,
      borderRadius: 10,
      backgroundColor: colors.bgChip,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 4
    },
    ruleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    ruleIcon: { fontSize: 13, width: 14, textAlign: "center" },
    ruleText: { fontSize: 12 },
    primaryBtn: {
      marginTop: 16,
      borderRadius: 999,
      backgroundColor: colors.bgStrong,
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center"
    },
    primaryBtnDisabled: { opacity: 0.5 },
    primaryBtnText: { color: colors.textOnStrong, fontSize: 15, fontWeight: "700" }
  });
