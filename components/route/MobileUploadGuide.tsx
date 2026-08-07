"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import clsx from "clsx";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

type Platform = "iphone" | "android";

export function MobileUploadGuide() {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>("iphone");
  const { t } = useLanguage();

  const steps = platform === "iphone" ? t.guides.mobileUpload.stepsIphone : t.guides.mobileUpload.stepsAndroid;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-gray-400 hover:text-gray-600 text-xs font-medium underline transition-colors"
      >
        {t.guides.mobileUpload.linkLabel}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={t.guides.mobileUpload.title}>
        <div className="space-y-3">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 text-sm border border-gray-200">
            {([
              { id: "iphone", label: t.guides.mobileUpload.iphone },
              { id: "android", label: t.guides.mobileUpload.android },
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
            {steps.map((step, i) => (
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
