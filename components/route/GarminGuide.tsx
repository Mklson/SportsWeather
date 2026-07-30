"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";

const GARMIN_CONNECT_URL = "https://connect.garmin.com/modern/courses";

const STEPS = [
  "Open Garmin Connect and find the activity or course you want to import.",
  "Open it, then look for the ⋯ menu (or Export button) and choose “Export to GPX”.",
  "If GPX export isn't offered for that item (some course types only offer FIT), use “Export Original” instead — it downloads a .fit file, which works here too.",
  "Save the file, then come back here, pick the matching activity, and drop it into the upload box above.",
];

export function GarminGuide() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl text-xs font-medium transition-colors shadow-sm text-center
                   bg-white hover:bg-gray-50 text-gray-700 border border-gray-300"
      >
        <span className="text-lg leading-none">⌚</span>
        Garmin
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="⌚ Import from Garmin Connect">
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Garmin doesn't offer a one-click connect like Strava, but exporting a route only takes a minute.
          </p>

          <ol className="space-y-2.5">
            {STEPS.map((step, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-gray-600">
                <span className="shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold flex items-center justify-center">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          <a
            href={GARMIN_CONNECT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center bg-blue-900 hover:bg-blue-800 text-white font-medium text-sm px-4 py-2.5 rounded-xl transition-colors"
          >
            Open Garmin Connect ↗
          </a>
        </div>
      </Modal>
    </>
  );
}
