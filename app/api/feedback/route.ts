import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_MESSAGE_LENGTH = 4000;

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message } = await request.json();

  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }

  const trimmed = message.trim().slice(0, MAX_MESSAGE_LENGTH);

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: "AEROUTE Feedback <onboarding@resend.dev>",
    to: process.env.ADMIN_EMAIL!,
    replyTo: user.email,
    subject: "New AEROUTE feedback",
    text: `From: ${user.email}\n\n${trimmed}`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
