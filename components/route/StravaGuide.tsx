"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { StravaIcon } from "@/components/route/RouteImporter";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const STRAVA_DASHBOARD_URL = "https://www.strava.com/dashboard";

export function StravaGuide() {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center w-full h-full rounded-xl"
        aria-label={t.guides.strava.ariaLabel}
      >
        {/* Orange fill lives on this fixed-size badge, not the button itself —
            matching how the other guides' color comes from a small logo graphic
            with transparent space around it, not a full-width colored button. */}
        <span className="flex items-center justify-center w-10 h-10 rounded-[7px] transition-colors bg-[#FC4C02] hover:bg-[#e04300] text-white">
          <StravaIcon />
        </span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={t.guides.strava.title}>
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            {t.guides.strava.description}
          </p>

          <p className="text-sm text-gray-500">
            {t.guides.strava.betaNotice}
          </p>

          <a
            href="/api/strava/auth"
            className="block text-center bg-[#FC4C02] hover:bg-[#e04300] text-white font-medium text-sm px-4 py-2.5 rounded-xl transition-colors"
          >
            {t.guides.strava.connect}
          </a>

          <div className="flex items-center gap-2 pt-1">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400">{t.guides.strava.notOneOfTen}</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <ol className="space-y-2.5">
            {t.guides.strava.manualSteps.map((step, i) => (
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
            {t.guides.strava.openDashboard}
          </a>
        </div>
      </Modal>
    </>
  );
}
