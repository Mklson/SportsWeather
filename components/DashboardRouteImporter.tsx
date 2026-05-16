"use client";

import { useRouter } from "next/navigation";
import { RouteImporter } from "@/components/route/RouteImporter";

export function DashboardRouteImporter() {
  const router = useRouter();

  function handleSuccess() {
    router.refresh();
  }

  return <RouteImporter onSuccess={handleSuccess} />;
}
