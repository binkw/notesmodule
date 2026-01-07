export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-16">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Privacy
        </p>
        <h1 className="text-3xl font-semibold text-foreground">Kort statement</h1>
        <p className="text-sm text-muted">
          Deze app is privé en bedoeld voor één admin account. Data blijft binnen Supabase
          project en wordt niet gedeeld.
        </p>
      </div>
      <ul className="space-y-3 text-sm text-foreground">
        <li className="rounded-[12px] border border-border bg-surface px-4 py-3">
          Geen analytics, geen tracking. Alleen noodzakelijke sessie data.
        </li>
        <li className="rounded-[12px] border border-border bg-surface px-4 py-3">
          Notities en mindmap data staan in Supabase (Postgres).
        </li>
        <li className="rounded-[12px] border border-border bg-surface px-4 py-3">
          Alleen ADMIN_EMAIL kan inloggen; anderen worden geweigerd.
        </li>
      </ul>
    </div>
  );
}

