"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";

const UT_NO_MAP_URL = "https://ut.no/kart#5.06/61.67/10.63";

const STEPS = [
  "Open UT.no's map below and search for a trip near you — try “fottur” for hiking or “skitur” for a ski trip.",
  "Open a trip you like and look for the GPX download button in its info panel.",
  "Save the file, then come back here, pick the matching activity, and drop the GPX into the upload box above.",
];

export function UTNoGuide() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl text-xs font-medium transition-colors shadow-sm text-center
                   bg-white hover:bg-gray-50 text-gray-700 border border-gray-300"
      >
        <span className="text-lg leading-none">🥾</span>
        UT.no
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="🥾 Find a route on UT.no">
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            UT.no has route search built into its own map. Find a trip there, download it as a GPX, then bring it back here.
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
            href={UT_NO_MAP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center bg-blue-900 hover:bg-blue-800 text-white font-medium text-sm px-4 py-2.5 rounded-xl transition-colors"
          >
            Open UT.no map ↗
          </a>
        </div>
      </Modal>
    </>
  );
}
