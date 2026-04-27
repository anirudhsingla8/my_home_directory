import axios from "axios";
import { FormEvent, useEffect, useMemo, useState } from "react";

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

import { Gender, showToast, updatePassword, updateProfile } from "../api";
import { useAuth } from "../context/AuthContext";
import { passwordRules } from "../lib/passwordPolicy";

type ProfileModalProps = {
  open: boolean;
  onClose: () => void;
};

type Tab = "profile" | "password";

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

function CheckIcon({ pass }: { pass: boolean }) {
  return pass ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-300" viewBox="0 0 20 20" fill="currentColor">
      <circle cx="10" cy="10" r="4" />
    </svg>
  );
}

export function ProfileModal({ open, onClose }: ProfileModalProps) {
  const { user, updateUser } = useAuth();
  const [tab, setTab] = useState<Tab>("profile");

  // Profile fields
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setName(user.name ?? "");
    setGender(user.gender ?? "");
    setDateOfBirth(formatDateForInput(user.dateOfBirth));
    setProfileError(null);
    setPasswordError(null);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setTab("profile");
  }, [open, user]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const ruleResults = useMemo(
    () => passwordRules.map((rule) => ({ ...rule, pass: rule.test(newPassword) })),
    [newPassword]
  );
  const allRulesPass = ruleResults.every((r) => r.pass);

  const submitProfile = async (event: FormEvent) => {
    event.preventDefault();
    setProfileSubmitting(true);
    setProfileError(null);
    try {
      const updated = await updateProfile({
        name: name.trim() || null,
        gender: gender === "" ? null : gender,
        dateOfBirth: dateOfBirth || null
      });
      updateUser(updated);
      showToast("Profile updated", "success");
      onClose();
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message ?? "Failed to update profile."
        : "Failed to update profile.";
      setProfileError(message);
    } finally {
      setProfileSubmitting(false);
    }
  };

  const submitPassword = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordError(null);

    if (!allRulesPass) {
      setPasswordError("Your new password doesn't meet all the requirements yet.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation don't match.");
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError("New password must be different from the current one.");
      return;
    }

    setPasswordSubmitting(true);
    try {
      await updatePassword(currentPassword, newPassword);
      showToast("Password updated", "success");
      onClose();
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message ?? "Failed to update password."
        : "Failed to update password.";
      setPasswordError(message);
    } finally {
      setPasswordSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 backdrop-blur-sm p-3 sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 id="profile-modal-title" className="text-base font-semibold text-slate-900">
            Account settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="flex border-b border-slate-200 px-3">
          <button
            type="button"
            onClick={() => setTab("profile")}
            className={`relative px-4 py-3 text-sm font-medium transition ${
              tab === "profile" ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Profile
            {tab === "profile" && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-amber-400" />}
          </button>
          <button
            type="button"
            onClick={() => setTab("password")}
            className={`relative px-4 py-3 text-sm font-medium transition ${
              tab === "password" ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Password
            {tab === "password" && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-amber-400" />}
          </button>
        </div>

        {tab === "profile" ? (
          <form className="space-y-4 p-5" onSubmit={submitProfile}>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-500">Email</span>
              <input
                type="text"
                value={user?.email ?? ""}
                disabled
                className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-500">Display name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition focus:border-amber-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-300"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-500">Gender</span>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender | "")}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition focus:border-amber-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-300"
              >
                <option value="">Not specified</option>
                {GENDER_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-500">Date of birth</span>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition focus:border-amber-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-300"
              />
            </label>

            {profileError && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{profileError}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={profileSubmitting}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40"
              >
                {profileSubmitting ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        ) : (
          <form className="space-y-4 p-5" onSubmit={submitPassword}>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-500">Current password</span>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 pr-9 text-sm text-slate-900 transition focus:border-amber-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-300"
                />
                <button type="button" onClick={() => setShowCurrent((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600" aria-label={showCurrent ? "Hide" : "Show"}>
                  {showCurrent ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-500">New password</span>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 pr-9 text-sm text-slate-900 transition focus:border-amber-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-300"
                />
                <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600" aria-label={showNew ? "Hide" : "Show"}>
                  {showNew ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-500">Confirm new password</span>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 pr-9 text-sm text-slate-900 transition focus:border-amber-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-300"
                />
                <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600" aria-label={showConfirm ? "Hide" : "Show"}>
                  {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </label>

            <ul className="space-y-1 rounded-lg bg-slate-50 px-3 py-2.5">
              {ruleResults.map((r) => (
                <li key={r.id} className="flex items-center gap-2 text-xs">
                  <CheckIcon pass={r.pass} />
                  <span className={r.pass ? "text-slate-700" : "text-slate-500"}>{r.label}</span>
                </li>
              ))}
            </ul>

            {passwordError && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{passwordError}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={passwordSubmitting || !allRulesPass || !currentPassword || !confirmPassword}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40"
              >
                {passwordSubmitting ? "Updating..." : "Update password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
