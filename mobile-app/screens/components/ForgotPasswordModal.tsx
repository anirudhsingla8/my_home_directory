import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  ForgotPasswordResponse,
  requestPasswordReset,
  resetPasswordWithOtp
} from "../../api";
import { ThemeColors, useTheme } from "../../context/ThemeContext";
import { isPasswordValid, passwordRules } from "../../lib/passwordPolicy";

type Step = "request" | "verify" | "done";

type Props = {
  visible: boolean;
  initialEmail?: string;
  onClose: () => void;
};

function useCountdown(targetIso: string | null): number {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!targetIso) {
      setSeconds(0);
      return;
    }
    const tick = () => {
      const ms = new Date(targetIso).getTime() - Date.now();
      setSeconds(Math.max(0, Math.ceil(ms / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  return seconds;
}

const formatCountdown = (totalSeconds: number): string => {
  if (totalSeconds <= 0) return "";
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export default function ForgotPasswordModal({ visible, initialEmail = "", onClose }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [resendAvailableAt, setResendAvailableAt] = useState<string | null>(null);
  const initializedEmailRef = useRef(false);

  useEffect(() => {
    if (visible && !initializedEmailRef.current) {
      setEmail(initialEmail);
      initializedEmailRef.current = true;
    }
    if (!visible) initializedEmailRef.current = false;
  }, [visible, initialEmail]);

  const ruleResults = useMemo(
    () => passwordRules.map((r) => ({ ...r, pass: r.test(newPassword) })),
    [newPassword]
  );
  const passwordOk = isPasswordValid(newPassword);
  const cooldownSeconds = useCountdown(step === "verify" ? resendAvailableAt : null);

  const reset = () => {
    setStep("request");
    setOtp("");
    setNewPassword("");
    setError(null);
    setInfo(null);
    setSubmitting(false);
    setResending(false);
    setResendAvailableAt(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const sendCode = async (mode: "initial" | "resend") => {
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }
    if (mode === "initial") setSubmitting(true);
    else setResending(true);

    try {
      const result = await requestPasswordReset(email.trim());
      setResendAvailableAt(result.resendAvailableAt);
      if (mode === "initial") {
        setStep("verify");
      } else {
        setOtp("");
        setInfo("New code sent.");
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as Partial<ForgotPasswordResponse> | undefined;
        if (data?.resendAvailableAt) {
          setResendAvailableAt(data.resendAvailableAt);
          if (mode === "resend") {
            setError(data.message ?? "Please wait before requesting another code.");
          } else {
            setStep("verify");
            setInfo(data.message ?? "A recent code is still active — check your email.");
          }
          return;
        }
        setError(err.response?.data?.message ?? "Could not send reset code.");
      } else {
        setError("Could not send reset code.");
      }
    } finally {
      setSubmitting(false);
      setResending(false);
    }
  };

  const handleReset = async () => {
    setError(null);
    if (!/^\d{6}$/.test(otp.trim())) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    if (!passwordOk) {
      setError("New password doesn't meet all requirements yet.");
      return;
    }
    setSubmitting(true);
    try {
      await resetPasswordWithOtp(email.trim(), otp.trim(), newPassword);
      setStep("done");
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.message ?? "Could not reset password."
        : "Could not reset password.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {step === "done" ? "Password reset" : "Reset your password"}
            </Text>
            <Pressable onPress={handleClose} hitSlop={8} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            {step === "request" && (
              <View style={{ gap: 14 }}>
                <Text style={styles.body}>
                  Enter the email associated with your account. We'll send you a 6-digit code that expires in 5 minutes.
                </Text>

                <Text style={styles.label}>Email</Text>
                <TextInput
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  style={styles.input}
                />

                {error && <Text style={styles.error}>{error}</Text>}

                <Pressable
                  onPress={() => sendCode("initial")}
                  disabled={submitting}
                  style={[styles.primaryBtn, submitting && { opacity: 0.5 }]}
                >
                  {submitting ? (
                    <ActivityIndicator color={colors.textOnStrong} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Send code</Text>
                  )}
                </Pressable>
              </View>
            )}

            {step === "verify" && (
              <View style={{ gap: 14 }}>
                <Text style={styles.body}>
                  We sent a 6-digit code to{" "}
                  <Text style={{ fontWeight: "700", color: colors.textPrimary }}>{email}</Text>.
                  It expires in 5 minutes.
                </Text>

                <Text style={styles.label}>6-digit code</Text>
                <TextInput
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  maxLength={6}
                  placeholder="123456"
                  placeholderTextColor={colors.textMuted}
                  value={otp}
                  onChangeText={(v) => setOtp(v.replace(/\D/g, ""))}
                  style={[styles.input, styles.otpInput]}
                />

                <View style={styles.resendRow}>
                  <Text style={styles.resendHint}>Didn't get it?</Text>
                  {cooldownSeconds > 0 ? (
                    <Text style={styles.resendCountdown}>Resend in {formatCountdown(cooldownSeconds)}</Text>
                  ) : (
                    <Pressable onPress={() => sendCode("resend")} disabled={resending} hitSlop={6}>
                      <Text style={styles.resendBtn}>{resending ? "Resending..." : "Resend code"}</Text>
                    </Pressable>
                  )}
                </View>

                {info && <Text style={styles.info}>{info}</Text>}

                <Text style={styles.label}>New password</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    secureTextEntry={!showPassword}
                    placeholder="Strong password"
                    placeholderTextColor={colors.textMuted}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    style={[styles.input, { paddingRight: 44 }]}
                  />
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    style={styles.eyeBtn}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={colors.textMuted}
                    />
                  </Pressable>
                </View>

                {newPassword.length > 0 && (
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

                {error && <Text style={styles.error}>{error}</Text>}

                <Pressable
                  onPress={handleReset}
                  disabled={submitting || !passwordOk || otp.length !== 6}
                  style={[styles.primaryBtn, (submitting || !passwordOk || otp.length !== 6) && { opacity: 0.4 }]}
                >
                  {submitting ? (
                    <ActivityIndicator color={colors.textOnStrong} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Reset password</Text>
                  )}
                </Pressable>

                <Pressable onPress={() => { setStep("request"); setError(null); setInfo(null); }} style={{ paddingVertical: 8, alignItems: "center" }}>
                  <Text style={styles.linkText}>← Use a different email</Text>
                </Pressable>
              </View>
            )}

            {step === "done" && (
              <View style={{ gap: 14, alignItems: "center" }}>
                <View style={[styles.successCircle, { backgroundColor: colors.emeraldSoft }]}>
                  <Text style={{ fontSize: 22, color: colors.emerald, fontWeight: "700" }}>✓</Text>
                </View>
                <Text style={[styles.body, { textAlign: "center" }]}>
                  Your password has been reset. You can sign in with your new password now.
                </Text>
                <Pressable onPress={handleClose} style={styles.primaryBtn}>
                  <Text style={styles.primaryBtnText}>Back to sign in</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "flex-end"
    },
    card: {
      backgroundColor: colors.bgCard,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: "92%"
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle
    },
    title: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },
    closeBtn: { padding: 4 },
    closeText: { fontSize: 18, color: colors.textMuted },
    body: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
    label: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
    input: {
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: 12,
      backgroundColor: colors.bgInput,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.textPrimary,
      fontSize: 15
    },
    otpInput: {
      textAlign: "center",
      fontSize: 22,
      letterSpacing: 8,
      fontWeight: "700"
    },
    inputWrapper: { position: "relative" },
    eyeBtn: { position: "absolute", right: 12, top: 0, bottom: 0, justifyContent: "center" },
    resendRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: -6
    },
    resendHint: { color: colors.textMuted, fontSize: 12 },
    resendCountdown: { color: colors.textSubtle, fontSize: 12, fontWeight: "600" },
    resendBtn: { color: colors.amber, fontSize: 13, fontWeight: "700" },
    primaryBtn: {
      marginTop: 4,
      borderRadius: 999,
      backgroundColor: colors.bgStrong,
      minHeight: 50,
      alignItems: "center",
      justifyContent: "center"
    },
    primaryBtnText: { color: colors.textOnStrong, fontSize: 15, fontWeight: "700" },
    error: {
      backgroundColor: colors.roseSoft,
      color: colors.roseOnSoft,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      fontSize: 13
    },
    info: {
      backgroundColor: colors.emeraldSoft,
      color: colors.emeraldOnSoft,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      fontSize: 13
    },
    linkText: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
    rulesBox: {
      backgroundColor: colors.bgInput,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 4
    },
    ruleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    ruleIcon: { fontSize: 14, width: 14 },
    ruleText: { fontSize: 12 },
    successCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center"
    }
  });
