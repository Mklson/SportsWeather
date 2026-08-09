import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_MESSAGE_LENGTH = 4000;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const URL_PATTERN = /https?:\/\/\S+|www\.\S+/i;

// Module-level, so it resets on cold start — fine for a low-traffic form;
// just needs to blunt basic spam bots, not survive across instances.
const submissionsByIp = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (submissionsByIp.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  submissionsByIp.set(ip, recent);
  return recent.length > RATE_LIMIT_MAX;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { message } = await request.json();

  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }

  const trimmed = message.trim().slice(0, MAX_MESSAGE_LENGTH);
  const from = user?.email ?? "Anonymous (not logged in)";
  const containsLink = URL_PATTERN.test(trimmed);

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: "AEROUTE Feedback <onboarding@resend.dev>",
    to: process.env.ADMIN_EMAIL!,
    replyTo: user?.email,
    subject: containsLink ? "⚠️ New AEROUTE feedback (contains a link)" : "New AEROUTE feedback",
    text: `From: ${from}\n\n${trimmed}`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
