import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { to, subject, html } = await request.json();

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, html" },
        { status: 400 }
      );
    }

    const data = await resend.emails.send({
      from: "noreply@bibble-ai.com", // Remplacez par votre domaine vérifié Resend
      to: to,
      subject: subject,
      html: html,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error sending test email:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
