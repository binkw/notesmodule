"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

type AuthMode = "login" | "register";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/app/notes";

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const supabase = getBrowserSupabaseClient();

    if (mode === "register") {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setLoading(false);
        setError(signUpError.message || "Registratie mislukt.");
        return;
      }

      setLoading(false);
      setSuccess("Account aangemaakt! Controleer je e-mail voor verificatie, of log direct in.");
      setMode("login");
      return;
    }

    // Login
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setLoading(false);
      setError(signInError.message || "Inloggen mislukt.");
      return;
    }

    router.push(redirectTo);
  }

  return (
    <div className="mt-8">
      {/* Tabs */}
      <div className="mb-6 flex rounded-[12px] border border-border bg-surface p-1">
        <button
          type="button"
          onClick={() => { setMode("login"); setError(null); setSuccess(null); }}
          className={`flex-1 rounded-[10px] px-4 py-2 text-sm font-medium transition ${
            mode === "login"
              ? "bg-accent text-white"
              : "text-muted hover:text-foreground"
          }`}
        >
          Inloggen
        </button>
        <button
          type="button"
          onClick={() => { setMode("register"); setError(null); setSuccess(null); }}
          className={`flex-1 rounded-[10px] px-4 py-2 text-sm font-medium transition ${
            mode === "register"
              ? "bg-accent text-white"
              : "text-muted hover:text-foreground"
          }`}
        >
          Registreren
        </button>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">E-mail</label>
          <input
            type="email"
            required
            className="w-full rounded-[12px] border border-border bg-background px-4 py-3 text-sm outline-none focus:border-accent"
            placeholder="jouw@email.nl"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Wachtwoord</label>
          <input
            type="password"
            required
            minLength={6}
            className="w-full rounded-[12px] border border-border bg-background px-4 py-3 text-sm outline-none focus:border-accent"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mode === "register" && (
            <p className="text-xs text-muted">Minimaal 6 tekens</p>
          )}
        </div>

        {error && (
          <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-[10px] border border-green-200 bg-green-50 px-4 py-3 text-xs text-green-700">
            {success}
          </div>
        )}

        <button
          className="w-full rounded-[14px] bg-accent px-4 py-3 text-sm font-semibold text-white shadow transition hover:opacity-90 disabled:opacity-70"
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Bezig..."
            : mode === "login"
            ? "Inloggen"
            : "Account aanmaken"}
        </button>
      </form>
    </div>
  );
}

