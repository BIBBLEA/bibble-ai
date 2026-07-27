import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";

function getSupabaseAdmin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader || "" } } }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || user.email !== ADMIN_EMAIL) {
    return null;
  }
  return user;
}

// GET: Fetch site_settings + all profiles (for admin panel)
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { searchParams } = new URL(request.url);
  const resource = searchParams.get("resource");

  if (resource === "settings") {
    const { data, error } = await supabaseAdmin
      .from("site_settings")
      .select("*")
      .order("key");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data });
  }

  if (resource === "users") {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, plan, credits, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data });
  }

  return NextResponse.json({ error: "Resource invalide." }, { status: 400 });
}

// PATCH: Update settings or user credits
export async function PATCH(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const body = await request.json();
  const { action } = body;

  // Update a site_setting
  if (action === "update_setting") {
    const { key, value } = body;
    if (!key || value === undefined) {
      return NextResponse.json({ error: "Clé et valeur requises." }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("site_settings")
      .update({ value })
      .eq("key", key);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  // Adjust user credits (+1 or -1)
  if (action === "adjust_credits") {
    const { userId, delta } = body;
    if (!userId || ![-1, 1].includes(delta)) {
      return NextResponse.json({ error: "userId et delta (+1/-1) requis." }, { status: 400 });
    }

    // Get current credits
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from("profiles")
      .select("credits")
      .eq("id", userId)
      .single();

    if (fetchError || !profile) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    const newCredits = Math.max(0, profile.credits + delta);

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ credits: newCredits })
      .eq("id", userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log the transaction
    await supabaseAdmin.from("credit_transactions").insert({
      user_id: userId,
      type: "manual_credit",
      amount: delta,
      balance_after: newCredits,
      description: `Ajustement manuel par admin (${delta > 0 ? "+" : ""}${delta})`,
    });

    return NextResponse.json({ success: true, credits: newCredits });
  }

  return NextResponse.json({ error: "Action invalide." }, { status: 400 });
}
