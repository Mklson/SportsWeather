import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/db/client";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership before deleting
  const { data: route } = await supabaseAdmin
    .from("routes")
    .select("user_id")
    .eq("id", params.id)
    .single();

  if (!route || route.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await supabaseAdmin.from("routes").delete().eq("id", params.id);

  return new NextResponse(null, { status: 204 });
}
