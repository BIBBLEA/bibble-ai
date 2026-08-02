import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

const resend = new Resend(RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "L'adresse e-mail est requise." }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: email.toLowerCase().trim(),
      options: {
        redirectTo: "https://www.bibble-ai.com/reset-password",
      },
    });

    if (error) {
      console.error("Supabase generateLink error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }



    const resetLink = data.properties?.action_link;
    
    if (!resetLink) {
      return NextResponse.json({ error: "Lien de réinitialisation non généré." }, { status: 500 });
    }

    await resend.emails.send({
      from: "Bibble AI <onboarding@resend.dev>", // Remplacez par votre domaine vérifié Resend
      to: email,
      subject: "Réinitialisation de votre mot de passe Bibble AI",
      html: `
        <p>Bonjour,</p>
        <p>Vous avez demandé à réinitialiser votre mot de passe pour votre compte Bibble AI.</p>
        <p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe :</p>
        <p><a href="${resetLink}">Réinitialiser mon mot de passe</a></p>
        <p>Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet e-mail.</p>
        <p>L'équipe Bibble AI</p>
      `,
    });

    return NextResponse.json({ message: "Un lien de réinitialisation a été envoyé à votre adresse e-mail." });
  } catch (error) {
    console.error("Unexpected error in /api/auth/forgot-password:", error);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}
