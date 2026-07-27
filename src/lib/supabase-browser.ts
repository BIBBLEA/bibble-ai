import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/types/database";

let supabase: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function getSupabaseBrowserClient() {
  if (!supabase) {
    if (typeof window === 'undefined') {
      // During server-side rendering or build, return a dummy client to prevent errors
      // The actual client will be initialized on the browser
      return {} as ReturnType<typeof createBrowserClient<Database>>;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Supabase environment variables are missing!");
      throw new Error("Supabase environment variables are not set.");
    }

    supabase = createBrowserClient<Database>(
      supabaseUrl,
      supabaseAnonKey
    );
  }
  return supabase;
}
