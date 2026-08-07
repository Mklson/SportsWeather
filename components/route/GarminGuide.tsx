"use client";

import { useState } from "react";
import Image from "next/image";
import { Modal } from "@/components/Modal";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const GARMIN_CONNECT_URL = "https://connect.garmin.com/modern/courses";

// Garmin's own dynamically-updated "gc-app-tile" asset (developer.garmin.com/brand-guidelines/connect/) —
// their guidelines ask third parties to hotlink this URL rather than download/self-host a copy.
const GARMIN_TILE_URL = "https://static.garmincdn.com/com.garmin.connect/content/images/developer/gc-app-tile/xhdpi/gc-app-tile_@240.png";

export function GarminGuide() {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center w-full h-full rounded-xl transition-transform hover:scale-[1.03]"
        aria-label={t.guides.garmin.ariaLabel}
      >
        {/* Fixed square size, not stretched/cropped to the button's shape — the button is
            wider than it is tall (grid column), and covering that cropped the icon's top/bottom off. */}
        <Image src={GARMIN_TILE_URL} alt="" width={40} height={40} className="rounded-[7px]" unoptimized />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={t.guides.garmin.title}>
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            {t.guides.garmin.intro}
          </p>

          <ol className="space-y-2.5">
            {t.guides.garmin.steps.map((step, i) => (
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
            className="block text-center bg-brand-navy hover:bg-brand-navy-dark text-white font-medium text-sm px-4 py-2.5 rounded-xl transition-colors"
          >
            {t.guides.garmin.openConnect}
          </a>
        </div>
      </Modal>
    </>
  );
}
