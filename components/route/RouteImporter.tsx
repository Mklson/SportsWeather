"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { UploadResponse } from "@/types";
import { OsmTrailSearch } from "@/components/trail/OsmTrailSearch";
import clsx from "clsx";

type Tab = "upload" | "strava" | "ski";

interface Props {
  onSuccess?: (routeId: string) => void;
}

export function RouteImporter({ onSuccess }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "saved" | "error">("idle");
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
        if (onSuccess) {
          setStatus("saved");
          onSuccess(route.id);
        } else {
          router.push(`/route/${route.id}`);
        }
      } catch (err) {
        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      }
    },
    [router, onSuccess]
  );

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !["gpx", "tcx"].includes(ext)) {
        setStatus("error");
        setErrorMsg("Only GPX and TCX files are supported");
        return;
      }
      uploadFile(file);
    },
    [uploadFile]
  );

  return (
    <div className="w-full max-w-md space-y-5">
      {/* Tab selector */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 text-sm border border-gray-200">
        {([
          { id: "upload", label: "📁 Upload GPX/TCX" },
          { id: "strava", label: "🟠 Strava" },
          { id: "ski",    label: "⛷️ Cross country" },
        ] as { id: Tab; label: string }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              "flex-1 py-2 px-2 rounded-lg font-medium transition-all text-xs sm:text-sm",
              tab === t.id
                ? "bg-white text-blue-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {t.label}
          </button>
        ))}
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
              <p className="text-gray-800 font-medium">Drop GPX or TCX here</p>
              <p className="text-gray-400 text-sm mt-1">or click to select a file</p>
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
              ⛷️ Import from Sporet.no
            </summary>
            <ol className="mt-3 space-y-2 text-gray-600 list-decimal list-inside">
              <li>Open the <strong>Sporet app</strong> on your phone</li>
              <li>Find the trail you want to use</li>
              <li>Tap the trail → <strong>Share</strong> → <strong>Export GPX</strong></li>
              <li>Send the GPX file to yourself (email, AirDrop, etc.)</li>
              <li>Upload it here</li>
            </ol>
            <p className="mt-3 text-gray-400 text-xs">
              Sporet.no has no open API, but GPX export works great.
            </p>
          </details>
        </div>
      )}

      {/* ── Strava tab ──────────────────────────────────────────────── */}
      {tab === "strava" && (
        <a
          href="/api/strava/auth"
          className="flex items-center justify-center gap-3 w-full py-4 px-4
                     bg-[#FC4C02] hover:bg-[#e04300] rounded-xl font-medium
                     text-white transition-colors shadow-sm"
        >
          <StravaIcon />
          Connect to Strava and select an activity
        </a>
      )}

      {/* ── Ski trails tab ──────────────────────────────────────────── */}
      {tab === "ski" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Search thousands of marked cross country trails from OpenStreetMap.
          </p>
          <OsmTrailSearchLight />
        </div>
      )}

      {status === "uploading" && (
        <p className="text-center text-blue-600 text-sm animate-pulse">
          Uploading and parsing file…
        </p>
      )}
      {status === "saved" && (
        <p className="text-center text-green-600 text-sm font-medium">
          Route saved — find it in your saved routes above.
        </p>
      )}
      {status === "error" && errorMsg && (
        <p className="text-center text-red-500 text-sm">{errorMsg}</p>
      )}
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
