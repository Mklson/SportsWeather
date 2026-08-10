"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Modal } from "@/components/Modal";

const DISMISS_KEY = "aeroute-install-prompt-dismissed";

// Not in lib.dom.d.ts — Chrome/Edge/Samsung Internet fire this on Android when
// the manifest + icons make the site installable.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIos(): boolean {
  // iPadOS 13+ identifies as "Macintosh" but, unlike a real Mac, has touch support.
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// Mobile-only nudge to install the PWA: on Android/Chrome it captures the
// browser's native install prompt and triggers it directly; iOS has no such
// API, so it instead walks through the manual Share-sheet steps. Hidden once
// dismissed (localStorage) or once the site is already running standalone.
export function InstallPrompt() {
  const { t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISS_KEY)) return;

    if (isIos()) {
      setIos(true);
      setVisible(true);
      return;
    }

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  async function handleInstallClick() {
    if (ios) {
      setShowIosHelp(true);
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  }

  if (!visible) return null;

  return (
    <>
      <div className="md:hidden flex items-center gap-2 w-full max-w-md rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5">
        <span className="text-xl leading-none shrink-0">📲</span>
        <p className="flex-1 text-xs font-medium text-gray-600 min-w-0">{t.install.bannerText}</p>
        <button
          onClick={handleInstallClick}
          className="shrink-0 text-xs font-semibold text-white bg-brand-navy hover:bg-brand-navy-dark px-3 py-1.5 rounded-lg transition-colors"
        >
          {t.install.install}
        </button>
        <button
          onClick={dismiss}
          aria-label={t.common.close}
          className="shrink-0 text-gray-400 hover:text-gray-700 text-lg leading-none px-0.5"
        >
          ×
        </button>
      </div>

      <Modal
        open={showIosHelp}
        onClose={() => {
          setShowIosHelp(false);
          dismiss();
        }}
        title={t.install.iosTitle}
      >
        <ol className="space-y-2.5">
          {[t.install.iosStep1, t.install.iosStep2, t.install.iosStep3].map((step, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-gray-600">
              <span className="shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold flex items-center justify-center">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </Modal>
    </>
  );
}
