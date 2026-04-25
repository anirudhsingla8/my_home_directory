import axios from "axios";
import { useState } from "react";
import { api, AuthResponse } from "../api";
import { useAuth } from "../context/AuthContext";

export function AuthScreen() {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md rounded-[28px] bg-slate-900 p-8 shadow-2xl ring-1 ring-white/10">
        <h2 className="text-center text-3xl font-bold tracking-tight text-white">
          {isLogin ? "Welcome Back" : "Create Account"}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          {isLogin ? "Sign in to your Home Inventory" : "Register to start organizing"}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            {!isLogin && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Display Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  placeholder="John Doe"
                />
              </div>
            )}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-amber-400 px-4 py-3 font-semibold text-slate-900 transition hover:bg-amber-300 focus:outline-none disabled:opacity-50"
          >
            {loading ? "Please wait..." : isLogin ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-slate-400 hover:text-white"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
