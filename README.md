# AI Notes → Mindmap 🗒️🧠

**Next.js**-app met Supabase voor opslag en authenticatie en ingebouwde **AI-features** (transcriptie, suggesties, agent). Deze app ondersteunt meerdere gebruikers — iedereen ziet alleen zijn eigen data (RLS is geconfigureerd).

---

## Inhoud
- ✅ Snelstart
- 🔧 Configuratie (.env)
- 🚀 Ontwikkeling & Deploy
- 🔐 Beveiliging & Geheimen
- 🧪 Tests & Debugging
- 🤝 Contributie

---

## ✅ Snelstart
1. Clone de repo:

```bash
git clone https://github.com/binkw/notesmodule.git
cd notesmodule
```

2. Installeer dependencies:

```bash
npm install
```

3. Maak een environment file:

```bash
cp .env.local.example .env.local
# Vul .env.local met je eigen waarden (zie uitleg hieronder)
```

4. Start de dev-server:

```bash
npm run dev
# Open http://localhost:3000
```

---

## 🔧 Configuratie (.env)
Kopieer `.env.local.example` naar `.env.local` en vul jouw waarden in. **Commit nooit** `.env.local`.

Belangrijke variabelen:

- `NEXT_PUBLIC_SUPABASE_URL` — jouw Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase publishable key (client-safe)
- `OPENAI_API_KEY` — server-side OpenAI API key (houd deze geheim)
- `OPENAI_TRANSCRIBE_MODEL` — standaard `whisper-1`
- `OPENAI_TEXT_MODEL` — standaard `gpt-4o` of `gpt-4o-mini` voor research
- `ADMIN_EMAIL` — optioneel, voor dev/admin gebruik

Voorbeeld (`.env.local.example` bevat placeholders).

---

## 🚀 Database & Deploy
- Nieuwe database: voer uit

```bash
psql "$SUPABASE_DB_URL" -f supabase/schema.sql
```

- Voor migraties:

```bash
psql "$SUPABASE_DB_URL" -f supabase/migrations/001_add_ai_features.sql
```

Deploy tips:
- Zet alle geheime keys in je host (Vercel/Netlify/GitHub Actions secrets), niet in de repo. ✅
- Gebruik `NEXT_PUBLIC_` prefix alleen voor keys die echt client-side mogen (anon keys). Service role keys mogen nooit in de browser komen.

---

## 🔐 Beveiliging & Geheimen
- We voeren een **pre-commit** check uit (lokale hook) die veelvoorkomende sleutelpatronen blokkeert.
- Er is een **Gitleaks** GitHub Action die pushes/PRs scant op secrets.
- Als een key ooit gelekt is: **revoke & rotate** onmiddellijk (OpenAI dashboard / Supabase dashboard) en update je deployment secrets.

Tips:
- Voeg nooit `.env.local` toe aan commits.
- Gebruik `.env.local.example` voor documentatie van vereiste variabelen.

---

## 🧪 Tests & Debugging
- Start dev server: `npm run dev`
- Build: `npm run build`
- Linting / formatting: voeg `npm run lint` of `npm run format` toe (indien gewenst)

Logs en errors:
- API-requests die OpenAI gebruiken loggen errors server-side; controleer server logs als iets faalt.

---

## 🤝 Contributie
- Maak een feature branch: `git checkout -b feat/your-feature`
- Voeg duidelijke commits en tests toe
- Open een pull request naar `main` met beschrijving en eventuele migration steps

Beleid:
- Pre-commit hook voorkomt accidental commits met secrets. Zorg dat je lokale `core.hooksPath` ingesteld is als je lokale hooks gebruikt:

```bash
git config core.hooksPath .githooks
```

---

## Contact & Support
Vragen of problemen? Open een issue in deze repo of mail naar `binkwolters@gmail.com`.

---

## Licentie
MIT © binkw

### Features

#### Notes
- CRUD notes met Markdown-ondersteuning
- Project-organisatie en filtering
- Spraak-naar-tekst transcriptie (Whisper)

#### Notes Agent (General-Purpose)
De agent kan alles wat ChatGPT kan + automatisch opslaan in notes:

**Capabilities:**
- Samenvattingen, bullets, herformuleren, planning, strategie
- Web Research: zoekt online, opent top bronnen, synthese met citaties
- Marktanalyse: gestructureerd rapport met concurrenten, kanalen, pricing

**Controls:**
- **Web search toggle:** aan/uit (persisted)
- **Detail level:** Kort (600+ chars) / Normaal (1200+) / Diep (2200+)
- **Mode:** Algemeen / Research / Marktanalyse (met templates)

**Acties:**
- `append_to_note`: tekst toevoegen (direct uitvoeren)
- `create_note`: nieuwe note voor rapporten/analyses
- `replace_note`: vervangen (na confirm)
- `update_title`, `set_labels`

**Grounding:**
- Agent leest altijd de open note server-side (anti-hallucinatie)
- Client stuurt geen noteContent, alleen noteId
- Bij web=off vraagt agent om toggle aan te zetten voor externe info

#### AI Features
- Automatische labels per note
- Gesprek transcriptie splits (Spreker A/B)
- Samenvattingen genereren

#### Mindmap
- React Flow canvas met drag & drop
- Nodes koppelen aan notes
- Kleuren voor categorisatie
- Automatisch opslaan

### Database schema
- SQL staat in `supabase/schema.sql`
- Migraties in `supabase/migrations/`
- Tabellen: `notes`, `projects`, `ai_suggestions`, `mindmap_nodes`, `mindmap_edges`

### Routes
- Publiek: `/`, `/login`, `/privacy`
- App: `/app/notes`, `/app/mindmap`, `/app/settings`

### API Endpoints
- `POST /api/transcribe` - Whisper audio transcriptie
- `POST /api/ai/agent` - Notes Agent (append, replace, create, labels + web research)
- `POST /api/ai/chat` - Chat over notes
- `POST /api/ai/label-note` - Automatisch labels genereren
- `POST /api/ai/conversation` - Gesprek splits (Spreker A/B) + samenvatting

### Auth & data
- Supabase Auth (email/password) voor login en registratie.
- Multi-user: elke user ziet alleen eigen notes, mindmaps, en AI suggesties.
- RLS policies (auth.uid() = user_id) garanderen data-isolatie.
- OpenAI keys blijven server-side (geen client exposure).
