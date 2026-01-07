export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8 lg:px-10">
        <div className="text-lg font-semibold tracking-tight">AI Notes → Mindmap</div>
        <a
          href="/login"
          className="rounded-[14px] bg-accent px-4 py-2 text-sm font-semibold text-white shadow transition hover:opacity-90"
        >
          Inloggen
        </a>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 pb-20 lg:flex-row lg:items-center lg:gap-20 lg:px-10">
        <div className="flex-1 space-y-8">
          <p className="inline-flex rounded-full border border-border px-3 py-1 text-xs font-medium text-muted">
            Privé workspace — minimalistisch en snel
          </p>
          <div className="space-y-6">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
              Dump gedachten. Orden. Zie het geheel als mindmap.
            </h1>
            <p className="max-w-2xl text-lg text-muted">
              Eén admin account, geen ruis. Notes, structuur en een canvas dat verbonden blijft met je notities.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/login"
              className="rounded-[14px] bg-accent px-5 py-3 text-sm font-semibold text-white shadow transition hover:opacity-90"
            >
              Inloggen
            </a>
            <a
              href="/privacy"
              className="text-sm font-semibold text-foreground underline-offset-4 hover:underline"
            >
              Privacy
            </a>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                title: "Notes",
                text: "Snel dumpen, sorteren op nieuw, eenvoudige editor.",
              },
              {
                title: "Structuur",
                text: "Koppel notities aan nodes zonder de flow te breken.",
              },
              {
                title: "Mindmap",
                text: "Drag, zoom, edges opslaan. Zie relaties direct.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[12px] border border-border bg-surface px-4 py-5 shadow-sm"
              >
                <div className="text-sm font-semibold text-foreground">{item.title}</div>
                <p className="mt-2 text-sm text-muted">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1">
          <div className="rounded-[12px] border border-border bg-surface p-6 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Notes → Mindmap</p>
                <p className="text-xs text-muted">Eén admin. Geen afleiding.</p>
              </div>
              <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                Privé
              </span>
            </div>
            <div className="mt-5 space-y-4 text-sm text-muted">
              <div className="rounded-[10px] border border-border bg-background px-4 py-3">
                “Schrijf een gedachte…” → slaat direct op
              </div>
              <div className="rounded-[10px] border border-border bg-background px-4 py-3">
                Node gekoppeld aan note-id — klik opent editor
              </div>
              <div className="rounded-[10px] border border-border bg-background px-4 py-3">
                Zoom, drag, edges bewaard na refresh
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 text-sm text-muted lg:px-10">
          <span>AI Notes → Mindmap</span>
          <a className="hover:text-foreground" href="/login">
            Admin login
          </a>
        </div>
      </footer>
    </div>
  );
}
