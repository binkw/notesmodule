type SupabaseConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

// Next.js vereist DIRECTE property access voor NEXT_PUBLIC_* variabelen
// Bracket notation process.env[name] werkt NIET in client-side code
export function getSupabaseConfig(): SupabaseConfig {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "Supabase URL niet gevonden. Zet NEXT_PUBLIC_SUPABASE_URL in .env.local"
    );
  }

  if (!supabaseAnonKey) {
    throw new Error(
      "Supabase Anon Key niet gevonden. Zet NEXT_PUBLIC_SUPABASE_ANON_KEY of NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY in .env.local"
    );
  }

  return { supabaseUrl, supabaseAnonKey };
}

// Optioneel: voor toekomstige admin features
export function getAdminEmail(): string | null {
  return process.env.ADMIN_EMAIL || null;
}

