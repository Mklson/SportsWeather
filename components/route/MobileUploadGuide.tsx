"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import clsx from "clsx";

type Platform = "iphone" | "android";

const STEPS: Record<Platform, string[]> = {
  iphone: [
    "Open a trail site (like UT.no) or your Strava/Garmin app, and download or export the route as a GPX, TCX, or FIT file.",
    "Safari saves it to your Files app — usually under “On My iPhone → Downloads” or “iCloud Drive → Downloads”.",
    "Come back to this page and tap the box above. In the panel that opens, browse to Files → Downloads and select your route file.",
  ],
  android: [
    "Open a trail site (like UT.no) or your Strava/Garmin app, and download or export the route as a GPX, TCX, or FIT file.",
    "Chrome saves it to your phone's Downloads folder, visible in the Files (or “My Files”) app.",
    "Come back to this page and tap the box above. In the picker that opens, choose Downloads and select your route file.",
  ],
};

export function MobileUploadGuide() {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>("iphone");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
      >
        GPX/TCX/FIT: how to
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Uploading a route file from your phone">
        <div className="space-y-3">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 text-sm border border-gray-200">
            {([
              { id: "iphone", label: "📱 iPhone" },
              { id: "android", label: "🤖 Android" },
            ] as { id: Platform; label: string }[]).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlatform(p.id)}
                className={clsx(
                  "flex-1 py-2 px-2 rounded-lg font-medium transition-all text-xs sm:text-sm",
                  platform === p.id
                    ? "bg-white text-brand-navy shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <ol className="space-y-2.5">
            {STEPS[platform].map((step, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-gray-600">
                <span className="shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold flex items-center justify-center">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </Modal>
    </>
  );
}
