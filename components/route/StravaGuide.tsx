"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { StravaIcon } from "@/components/route/RouteImporter";

const STRAVA_DASHBOARD_URL = "https://www.strava.com/dashboard";

const MANUAL_STEPS = [
  "Open the activity on strava.com (or the app) and open its ••• (more options) menu.",
  "Choose “Export GPX”.",
  "Save the file, then come back here, pick the matching activity, and drop the GPX into the upload box above.",
];

export function StravaGuide() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center w-full h-full rounded-xl"
        aria-label="Strava"
      >
        {/* Orange fill lives on this fixed-size badge, not the button itself —
            matching how the other guides' color comes from a small logo graphic
            with transparent space around it, not a full-width colored button. */}
        <span className="flex items-center justify-center w-10 h-10 rounded-[7px] transition-colors bg-[#FC4C02] hover:bg-[#e04300] text-white">
          <StravaIcon />
        </span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="🟠 Import from Strava">
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Direct Strava connect is in beta and currently limited to 10 users while our app awaits full API approval.
          </p>

          <a
            href="/api/strava/auth"
            className="block text-center bg-[#FC4C02] hover:bg-[#e04300] text-white font-medium text-sm px-4 py-2.5 rounded-xl transition-colors"
          >
            Connect with Strava ↗
          </a>

          <div className="flex items-center gap-2 pt-1">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400">Not one of the 10? Export manually</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <ol className="space-y-2.5">
            {MANUAL_STEPS.map((step, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-gray-600">
                <span className="shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold flex items-center justify-center">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          <a
            href={STRAVA_DASHBOARD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center bg-brand-navy hover:bg-brand-navy-dark text-white font-medium text-sm px-4 py-2.5 rounded-xl transition-colors"
          >
            Open Strava dashboard ↗
          </a>
        </div>
      </Modal>
    </>
  );
}
