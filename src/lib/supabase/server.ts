import { cookies } from "next/headers";
import { createServerClient, type SupabaseClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./env";

export async function createServerSupabaseClient(): Promise<SupabaseClient> {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set(name, value, options) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name, options) {
        cookieStore.delete({ name, ...options });
      },
    },
  });
}

