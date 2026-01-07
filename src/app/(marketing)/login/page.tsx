import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-md rounded-[12px] border border-border bg-surface p-8 shadow-[var(--shadow-soft)]">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Welkom
          </p>
          <h1 className="text-2xl font-semibold text-foreground">
            Aan de slag
          </h1>
          <p className="text-sm text-muted">
            Log in of maak een account aan om je notes en mindmaps te beheren.
          </p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}

