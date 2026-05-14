"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { UploadResponse, SportType } from "@/types";
import { OsmTrailSearch } from "@/components/trail/OsmTrailSearch";
import { SportTypeSelector } from "@/components/SportTypeSelector";
import clsx from "clsx";

type Tab = "upload" | "strava" | "ski";

export function RouteImporter() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("upload");
  const [sport, setSport] = useState<SportType>("cycling");

  const handleSportChange = useCallback((s: SportType) => {
    setSport(s);
    if (s !== "skiing" && tab === "ski") setTab("upload");
  }, [tab]);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      setStatus("uploading");
      setErrorMsg(null);
      const form = new FormData();
      form.append("file", file);
      try {
        const res = await fetch("/api/routes/upload", { method: "POST", body: form });
        if (!res.ok) {
          const { error } = await res.json();
          throw new Error(error ?? `HTTP ${res.status}`);
        }
        const { route } = (await res.json()) as UploadResponse;
        router.push(`/route/${route.id}?sport=${sport}`);
      } catch (err) {
        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : "Ukjent feil");
      }
    },
    [router, sport]
  );

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !["gpx", "tcx"].includes(ext)) {
        setStatus("error");
        setErrorMsg("Kun GPX og TCX-filer støttes");
        return;
      }
      uploadFile(file);
    },
    [uploadFile]
  );

  return (
    <div className="w-full max-w-md space-y-5">
      {/* Sport type selector */}
      <div className="space-y-1.5">
        <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Sport</p>
        <SportTypeSelectorLight value={sport} onChange={handleSportChange} />
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 text-sm border border-gray-200">
        {([
          { id: "upload", label: "📁 Last opp GPX/TCX", skiOnly: false },
          { id: "strava", label: "🟠 Strava",           skiOnly: false },
          { id: "ski",    label: "⛷️ Skiløyper",        skiOnly: true  },
        ] as { id: Tab; label: string; skiOnly: boolean }[]).map((t) => {
          const disabled = t.skiOnly && sport !== "skiing";
          return (
            <button
              key={t.id}
              disabled={disabled}
              onClick={() => { if (!disabled) setTab(t.id); }}
              className={clsx(
                "flex-1 py-2 px-2 rounded-lg font-medium transition-all text-xs sm:text-sm",
                tab === t.id && !disabled
                  ? "bg-white text-blue-900 shadow-sm"
                  : disabled
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-500 hover:text-gray-700"
              )}
              title={disabled ? "Velg Langrenn for å søke skiløyper" : undefined}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Upload tab ──────────────────────────────────────────────── */}
      {tab === "upload" && (
        <div className="space-y-3">
          <label
            className={clsx(
              "flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed",
              "cursor-pointer transition-colors",
              isDragging
                ? "border-blue-400 bg-blue-50"
                : "border-gray-300 hover:border-blue-300 bg-gray-50"
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]); }}
          >
            <span className="text-4xl">📁</span>
            <div className="text-center">
              <p className="text-gray-800 font-medium">Slipp GPX eller TCX her</p>
              <p className="text-gray-400 text-sm mt-1">eller klikk for å velge fil</p>
            </div>
            <input
              type="file"
              accept=".gpx,.tcx"
              className="sr-only"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>

          {/* Sporet.no guide */}
          <details className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm">
            <summary className="cursor-pointer text-blue-700 font-medium select-none">
              ⛷️ Importer fra Sporet.no
            </summary>
            <ol className="mt-3 space-y-2 text-gray-600 list-decimal list-inside">
              <li>Åpne <strong>Sporet-appen</strong> på mobilen</li>
              <li>Finn løypen du vil bruke</li>
              <li>Trykk på løypen → <strong>Del</strong> → <strong>Eksporter GPX</strong></li>
              <li>Send GPX-filen til deg selv (e-post, AirDrop, o.l.)</li>
              <li>Last den opp her</li>
            </ol>
            <p className="mt-3 text-gray-400 text-xs">
              Sporet.no har ingen åpen API, men GPX-eksport fungerer fint.
            </p>
          </details>
        </div>
      )}

      {/* ── Strava tab ──────────────────────────────────────────────── */}
      {tab === "strava" && (
        <a
          href={`/api/strava/auth?sport=${sport}`}
          className="flex items-center justify-center gap-3 w-full py-4 px-4
                     bg-[#FC4C02] hover:bg-[#e04300] rounded-xl font-medium
                     text-white transition-colors shadow-sm"
        >
          <StravaIcon />
          Koble til Strava og velg aktivitet
        </a>
      )}

      {/* ── Ski trails tab ──────────────────────────────────────────── */}
      {tab === "ski" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Søk blant tusenvis av merkede skiløyper fra OpenStreetMap.
          </p>
          <OsmTrailSearchLight />
        </div>
      )}

      {status === "uploading" && (
        <p className="text-center text-blue-600 text-sm animate-pulse">
          Laster opp og parser fil…
        </p>
      )}
      {status === "error" && errorMsg && (
        <p className="text-center text-red-500 text-sm">{errorMsg}</p>
      )}
    </div>
  );
}

// Light-themed sport selector for white background
function SportTypeSelectorLight({ value, onChange }: { value: SportType; onChange: (s: SportType) => void }) {
  const sports = [
    { type: "cycling" as SportType, label: "Sykkel", emoji: "🚴" },
    { type: "skiing"  as SportType, label: "Langrenn", emoji: "⛷️" },
    { type: "running" as SportType, label: "Løping", emoji: "🏃" },
  ];
  return (
    <div className="flex gap-1 bg-gray-100 rounded-xl p-1 border border-gray-200">
      {sports.map((s) => (
        <button
          key={s.type}
          onClick={() => onChange(s.type)}
          className={clsx(
            "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg",
            "text-sm font-medium transition-all",
            value === s.type
              ? "bg-blue-900 text-white shadow"
              : "text-gray-500 hover:text-gray-800"
          )}
        >
          <span>{s.emoji}</span>
          <span className="hidden sm:inline">{s.label}</span>
        </button>
      ))}
    </div>
  );
}

// Light-themed OSM search wrapper
function OsmTrailSearchLight() {
  return (
    <div className="[&_input]:bg-white [&_input]:border-gray-300 [&_input]:text-gray-800
                    [&_input::placeholder]:text-gray-400
                    [&_ul_button]:bg-white [&_ul_button]:border-gray-200
                    [&_ul_button]:hover:bg-gray-50 [&_ul_button_p]:text-gray-800
                    [&_ul_button_p:last-child]:text-gray-400 [&_p]:text-gray-500">
      <OsmTrailSearch />
    </div>
  );
}

function StravaIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066z" />
      <path d="M9.693 7.817L6.628 1.688 3.563 7.817H0l6.628-6.628 6.628 6.628z" />
    </svg>
  );
}
