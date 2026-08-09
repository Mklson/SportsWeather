"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const UT_NO_MAP_URL = "https://ut.no/kart#5.06/61.67/10.63";

function UTNoLogo() {
  // UT.no's own mark, taken verbatim from ut.no's page source (inline SVG, not a hosted asset).
  // Fixed square size, not stretched/cropped to the button's shape — the button is wider than
  // it is tall (grid column), and covering that with a square mark cropped its top/bottom off.
  return (
    <svg width="40" height="40" viewBox="0 0 48 48" aria-hidden="true">
      <path d="M0 8C0 3.58172 3.58172 0 8 0H40C44.4183 0 48 3.58172 48 8V40C48 44.4183 44.4183 48 40 48H8C3.58172 48 0 44.4183 0 40V8Z" fill="#1B7B60" />
      <path d="M13.3101 16H10V26.8547C10 30.5189 12.5867 33 16.6311 33C20.6755 33 23.2512 30.5189 23.2512 26.8547V16H19.9412V26.5216C19.9412 28.6466 18.7465 30.025 16.6311 30.025C14.5157 30.025 13.3101 28.6466 13.3101 26.5216V16Z" fill="#FCFCFC" />
      <path d="M33.2541 32.575V18.8601H38V16H25.1982V18.8601H29.944V32.575H33.2541Z" fill="#FCFCFC" />
    </svg>
  );
}

export function UTNoGuide() {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center w-full h-full rounded-xl transition-transform hover:scale-[1.03]"
        aria-label={t.guides.utNo.ariaLabel}
      >
        <UTNoLogo />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={t.guides.utNo.title}>
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            {t.guides.utNo.description}
          </p>

          <p className="text-sm text-gray-500">
            {t.guides.utNo.intro}
          </p>

          <ol className="space-y-2.5">
            {t.guides.utNo.steps.map((step, i) => (
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
            className="block text-center bg-brand-navy hover:bg-brand-navy-dark text-white font-medium text-sm px-4 py-2.5 rounded-xl transition-colors"
          >
            {t.guides.utNo.openMap}
          </a>
        </div>
      </Modal>
    </>
  );
}
