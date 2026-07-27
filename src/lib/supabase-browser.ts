import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase environment variables are missing!");
  if (!supabaseUrl) console.error("NEXT_PUBLIC_SUPABASE_URL is undefined");
  if (!supabaseAnonKey) console.error("NEXT_PUBLIC_SUPABASE_ANON_KEY is undefined");
}

export const supabase = createBrowserClient<Database>(
  supabaseUrl || "",
  supabaseAnonKey || ""
);
