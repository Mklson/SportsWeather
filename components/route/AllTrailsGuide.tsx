"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";

const ALLTRAILS_URL = "https://www.alltrails.com";

const STEPS = [
  "Open the trail on alltrails.com or in the AllTrails app.",
  "On the app: tap the ••• menu on the trail page, choose “Export route file”, then pick GPX. On the website: use the Download button near the map.",
  "Exporting a file requires an AllTrails+ subscription — free accounts can view trails but can't download them.",
  "Save the file, then come back here, pick the matching activity, and drop the GPX into the upload box above.",
];

export function AllTrailsGuide() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl text-xs font-medium transition-colors shadow-sm text-center
                   bg-white hover:bg-gray-50 text-gray-700 border border-gray-300"
      >
        <span className="text-lg leading-none">🏔️</span>
        AllTrails
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="🏔️ Import from AllTrails">
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            AllTrails doesn't offer a one-click connect, but exporting a trail as GPX only takes a minute.
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
            href={ALLTRAILS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center bg-brand-navy hover:bg-brand-navy-dark text-white font-medium text-sm px-4 py-2.5 rounded-xl transition-colors"
          >
            Open AllTrails ↗
          </a>
        </div>
      </Modal>
    </>
  );
}
