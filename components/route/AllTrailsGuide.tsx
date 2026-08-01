"use client";

import { useState } from "react";
import Image from "next/image";
import { Modal } from "@/components/Modal";

const ALLTRAILS_URL = "https://www.alltrails.com";
// AllTrails' own self-hosted app icon — same pattern as UT.no's inline logo,
// a stable asset served straight from their own domain root.
const ALLTRAILS_ICON_URL = "https://www.alltrails.com/app-icon-96.png";

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
        className="flex items-center justify-center w-full h-full rounded-xl transition-transform hover:scale-[1.03]"
        aria-label="AllTrails"
      >
        {/* Fixed square size, not stretched/cropped to the button's shape — the button is
            wider than it is tall (grid column), and covering that cropped the icon's top/bottom off. */}
        <Image src={ALLTRAILS_ICON_URL} alt="" width={40} height={40} className="rounded-[7px]" unoptimized />
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
