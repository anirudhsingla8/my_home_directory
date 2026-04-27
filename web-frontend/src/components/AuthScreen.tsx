import axios from "axios";
import { useMemo, useState } from "react";
import { api, AuthResponse } from "../api";
import { useAuth } from "../context/AuthContext";
import { isPasswordValid, passwordRules } from "../lib/passwordPolicy";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { ForgotPasswordModal } from "./ForgotPasswordModal";

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

export function AuthScreen() {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const ruleResults = useMemo(
    () => passwordRules.map((r) => ({ ...r, pass: r.test(password) })),
    [password]
  );
  const passwordOk = isLogin || isPasswordValid(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isLogin && !passwordOk) {
      setError("Password doesn't meet all the requirements yet.");
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const response = await api.post<AuthResponse>("/auth/login", { email, password });
        login(response.data);
      } else {
        const response = await api.post<AuthResponse>("/auth/signup", { email, password, name });
        login(response.data);
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] flex-col justify-between bg-slate-950 p-10">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-900" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-white">Home Inventory</span>
          </div>
        </div>

        <div>
          <h1 className="text-4xl font-bold leading-tight text-white">
            Everything in your home,<br />
            <span className="text-amber-400">organized.</span>
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-400">
            Track groceries, gadgets, medicines and more. Get alerts before things expire or run low. Never buy duplicates again.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4">
            {[
              { label: "Track Expiry", desc: "30-day alerts" },
              { label: "Categories", desc: "Nested hierarchy" },
              { label: "Photo Upload", desc: "Visual inventory" },
              { label: "Multi-location", desc: "Room by room" }
            ].map((f) => (
              <div key={f.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">{f.label}</p>
                <p className="text-xs text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-600">Home Inventory Management System</p>
      </div>

      {/* Right form panel */}
      <div className="relative flex flex-1 items-center justify-center bg-white px-6 py-12">
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <ThemeSwitcher />
        </div>
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-900" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-slate-900">Home Inventory</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900">
            {isLogin ? "Welcome back" : "Create your account"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {isLogin ? "Sign in to manage your inventory" : "Get started for free"}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {!isLogin && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Display Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 transition focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                  placeholder="John Doe"
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 transition focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-slate-900 placeholder-slate-400 transition focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                  placeholder={isLogin ? "Enter your password" : "Create a strong password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {!isLogin && password.length > 0 && (
                <ul className="mt-2 space-y-1 rounded-lg bg-slate-50 px-3 py-2.5">
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
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-rose-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (!isLogin && !passwordOk)}
              className="w-full rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
            </button>

            {isLogin && (
              <div className="-mt-2 text-right">
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="text-xs font-medium text-slate-500 transition hover:text-amber-600"
                >
                  Forgot password?
                </button>
              </div>
            )}
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              className="text-sm text-slate-500 transition hover:text-slate-900"
            >
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <span className="font-semibold text-amber-600">{isLogin ? "Sign up" : "Sign in"}</span>
            </button>
          </div>
        </div>
      </div>

      <ForgotPasswordModal
        open={forgotOpen}
        initialEmail={email}
        onClose={() => setForgotOpen(false)}
      />
    </div>
  );
}
