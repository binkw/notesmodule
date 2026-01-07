import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Logo } from "@/components/logo";
import { AppSidebar } from "@/components/app-sidebar";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Alleen ingelogde users toegang
  if (error || !user) {
    redirect("/login");
  }

  return (
    <div className="h-screen bg-background text-foreground overflow-hidden">
      <div className="flex h-full">
        <AppSidebar />
        <main className="flex flex-1 min-h-0 flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between border-b border-border bg-surface px-6 h-14">
            <Logo />
            <span className="text-[11px] text-muted font-medium">{user.email}</span>
          </div>
          {/* Content - full height for children - min-h-0 enables scroll in children */}
          <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
        </main>
      </div>
    </div>
  );
}

