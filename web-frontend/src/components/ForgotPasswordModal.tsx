import axios from "axios";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import {
  ForgotPasswordResponse,
  requestPasswordReset,
  resetPasswordWithOtp,
  showToast
} from "../api";
import { isPasswordValid, passwordRules } from "../lib/passwordPolicy";

const EyeIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

type ForgotPasswordModalProps = {
  open: boolean;
  initialEmail?: string;
  onClose: () => void;
};

type Step = "request" | "verify" | "done";

/**
 * Drives a once-a-second countdown to a target ISO timestamp. Returns 0 when
 * the time is reached or the target is null.
 */
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

export function ForgotPasswordModal({ open, initialEmail = "", onClose }: ForgotPasswordModalProps) {
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState(initialEmail);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resendAvailableAt, setResendAvailableAt] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const initializedEmailRef = useRef(false);

  // Sync the prefilled email once when the modal opens.
  useEffect(() => {
    if (open && !initializedEmailRef.current) {
      setEmail(initialEmail);
      initializedEmailRef.current = true;
    }
    if (!open) initializedEmailRef.current = false;
  }, [open, initialEmail]);

  const ruleResults = useMemo(
    () => passwordRules.map((r) => ({ ...r, pass: r.test(newPassword) })),
    [newPassword]
  );
  const passwordOk = isPasswordValid(newPassword);
  const cooldownSeconds = useCountdown(step === "verify" ? resendAvailableAt : null);

  if (!open) return null;

  const handleClose = () => {
    setStep("request");
    setOtp("");
    setNewPassword("");
    setError(null);
    setSubmitting(false);
    setResendAvailableAt(null);
    onClose();
  };

  const sendCode = async (mode: "initial" | "resend") => {
    setError(null);
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
        showToast("New code sent.", "success");
        setOtp("");
      }
    } catch (err) {
      // 429 still ships back resendAvailableAt — pick it up and surface the message.
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as Partial<ForgotPasswordResponse> | undefined;
        if (data?.resendAvailableAt) {
          setResendAvailableAt(data.resendAvailableAt);
          if (mode === "resend") {
            setError(data.message ?? "Please wait before requesting another code.");
          } else {
            // For initial send: 429 means a recent unconsumed code already exists,
            // jump straight to the verify step so they can use it.
            setStep("verify");
            showToast(data.message ?? "A recent code is still active — check your email.", "info");
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

  const handleRequest = (e: FormEvent) => {
    e.preventDefault();
    void sendCode("initial");
  };

  const handleResend = () => {
    if (cooldownSeconds > 0 || resending) return;
    void sendCode("resend");
  };

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
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
      showToast("Password reset. You can sign in now.", "success");
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
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:items-center sm:p-6"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">
            {step === "done" ? "Password reset" : "Reset your password"}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          </button>
        </div>

        {step === "request" && (
          <form onSubmit={handleRequest} className="space-y-4 p-5">
            <p className="text-sm text-slate-600">
              Enter the email associated with your account. We'll send you a 6-digit code that expires in 5 minutes.
            </p>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-500">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition focus:border-amber-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-300"
                placeholder="you@example.com"
                autoFocus
              />
            </label>

            {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40"
              >
                {submitting ? "Sending..." : "Send code"}
              </button>
            </div>
          </form>
        )}

        {step === "verify" && (
          <form onSubmit={handleReset} className="space-y-4 p-5">
            <p className="text-sm text-slate-600">
              We sent a 6-digit code to <span className="font-semibold text-slate-900">{email}</span>.
              It expires in 5 minutes.
            </p>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-500">6-digit code</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-center text-lg font-bold tracking-[0.5em] text-slate-900 transition focus:border-amber-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-300"
                autoFocus
              />
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-xs text-slate-500">
                  Didn't get it?{" "}
                  {cooldownSeconds > 0 ? (
                    <span className="text-slate-400">Resend in {formatCountdown(cooldownSeconds)}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resending}
                      className="font-semibold text-amber-600 transition hover:text-amber-700 disabled:opacity-50"
                    >
                      {resending ? "Resending..." : "Resend code"}
                    </button>
                  )}
                </span>
              </div>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-500">New password</span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 pr-9 text-sm text-slate-900 transition focus:border-amber-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                  aria-label={showPassword ? "Hide" : "Show"}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </label>

            {newPassword.length > 0 && (
              <ul className="space-y-1 rounded-lg bg-slate-50 px-3 py-2.5">
                {ruleResults.map((r) => (
                  <li key={r.id} className="flex items-center gap-2 text-xs">
                    {r.pass ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-300" viewBox="0 0 20 20" fill="currentColor">
                        <circle cx="10" cy="10" r="4" />
                      </svg>
                    )}
                    <span className={r.pass ? "text-slate-700" : "text-slate-500"}>{r.label}</span>
                  </li>
                ))}
              </ul>
            )}

            {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}

            <div className="flex justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setStep("request"); setError(null); }}
                className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
              >
                ← Use a different email
              </button>
              <button
                type="submit"
                disabled={submitting || !passwordOk || otp.length !== 6}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40"
              >
                {submitting ? "Resetting..." : "Reset password"}
              </button>
            </div>
          </form>
        )}

        {step === "done" && (
          <div className="space-y-4 p-5 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-6 w-6 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm text-slate-600">
              Your password has been reset. You can sign in with your new password now.
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
