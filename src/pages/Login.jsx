import React, { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { session, signIn, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  if (!loading && session) {
    const dest = location.state?.from?.pathname || "/dashboard";
    return <Navigate to={dest} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (error) {
      setError(
        error.message?.toLowerCase().includes("invalid")
          ? "Incorrect email or password. Please try again."
          : "Sign in failed. Please try again in a moment.",
      );
      return;
    }
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-signal font-display text-lg font-bold text-white">
            NS
          </div>
          <div className="text-center">
            <h1 className="font-display text-xl font-bold text-white">
              Bank Town PoP
            </h1>
            <p className="text-sm text-white/50">
              ISP Stock &amp; Inventory Portal
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white p-6 shadow-card sm:p-8"
        >
          <h2 className="mb-1 text-lg font-semibold text-ink-900">Sign in</h2>
          <p className="mb-6 text-sm text-ink-700/60">
            Authorized personnel only.
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-danger-light px-3 py-2.5 text-sm text-danger">
              {error}
            </div>
          )}

          <label className="mb-1 block text-sm font-medium text-ink-900">
            Email
          </label>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="focus-ring mb-4 w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm"
            placeholder="you@company.com"
          />

          <label className="mb-1 block text-sm font-medium text-ink-900">
            Password
          </label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="focus-ring mb-6 w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm"
            placeholder="••••••••"
          />

          <button
            type="submit"
            disabled={submitting}
            className="focus-ring w-full rounded-lg bg-signal py-2.5 text-sm font-semibold text-white transition-colors hover:bg-signal-dark disabled:opacity-60"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-white/40">
          Developed by Hos9 for Arham General Store
        </p>
      </div>
    </div>
  );
}
