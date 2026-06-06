"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { addFeaturedRoute, removeFeaturedRoute } from "@/lib/db/client";

async function requireAdmin() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect("/dashboard");
}

export async function addFeaturedRouteAction(formData: FormData) {
  await requireAdmin();
  const routeId = formData.get("routeId") as string;
  await addFeaturedRoute(routeId);
  revalidatePath("/admin/featured");
  revalidatePath("/");
}

export async function removeFeaturedRouteAction(formData: FormData) {
  await requireAdmin();
  const routeId = formData.get("routeId") as string;
  await removeFeaturedRoute(routeId);
  revalidatePath("/admin/featured");
  revalidatePath("/");
}
