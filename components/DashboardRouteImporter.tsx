"use client";

import { useRouter } from "next/navigation";
import { RouteImporter } from "@/components/route/RouteImporter";
import { StravaGuide } from "@/components/route/StravaGuide";
import { UTNoGuide } from "@/components/route/UTNoGuide";
import { GarminGuide } from "@/components/route/GarminGuide";
import { AllTrailsGuide } from "@/components/route/AllTrailsGuide";

export function DashboardRouteImporter() {
  const router = useRouter();

  function handleSuccess() {
    router.refresh();
  }

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-md">
      <RouteImporter onSuccess={handleSuccess} />

      <div className="flex flex-col items-center gap-2 w-full">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Or import a route from</p>
        <div className="grid grid-cols-4 gap-1 w-full">
          <StravaGuide />
          <UTNoGuide />
          <GarminGuide />
          <AllTrailsGuide />
        </div>
      </div>
    </div>
  );
}
