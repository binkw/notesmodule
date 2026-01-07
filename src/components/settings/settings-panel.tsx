"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

type SettingsPanelProps = {
  userEmail: string;
};

export function SettingsPanel({ userEmail }: SettingsPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleLogout() {
    setLoading(true);
    setStatus(null);
    const supabase = getBrowserSupabaseClient();
    const { error } = await supabase.auth.signOut();
    setLoading(false);

    if (error) {
      setStatus("Uitloggen mislukt.");
      return;
    }

    router.push("/login");
  }

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-lg font-semibold text-foreground">Instellingen</h1>

      <div className="rounded-[12px] border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <p className="text-xs font-medium text-muted">Account</p>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">E-mail</p>
              <p className="mt-0.5 text-xs text-muted">{userEmail}</p>
            </div>
            <button
              className="rounded-[8px] border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-surface disabled:opacity-50"
              onClick={handleLogout}
              disabled={loading}
            >
              {loading ? "..." : "Uitloggen"}
            </button>
          </div>
          {status && <p className="mt-3 text-xs text-red-600">{status}</p>}
        </div>
      </div>
    </div>
  );
}

