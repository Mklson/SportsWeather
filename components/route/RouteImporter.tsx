"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { SportType, UploadResponse } from "@/types";
import { MobileUploadGuide } from "@/components/route/MobileUploadGuide";
import clsx from "clsx";

const UPLOAD_SPORTS: { id: SportType; label: string; emoji: string }[] = [
  { id: "cycling", label: "Cycling", emoji: "🚴" },
  { id: "running", label: "Hiking · Running", emoji: "🥾" },
  { id: "skiing", label: "Cross Country", emoji: "⛷️" },
];

const BOX_SPORT_SYMBOLS = ["🏃", "🚴", "🥾", "⛷️"];

interface Props {
  onSuccess?: (routeId: string) => void;
}

export function RouteImporter({ onSuccess }: Props) {
  const router = useRouter();
  const [sport, setSport] = useState<SportType>("cycling");
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      setStatus("uploading");
      setErrorMsg(null);
      const form = new FormData();
      form.append("file", file);
      form.append("sport", sport);
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
    [router, onSuccess, sport]
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
    <div className="w-full max-w-md space-y-3">
      <label
        className={clsx(
          "flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed",
          "cursor-pointer transition-colors",
          isDragging
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 hover:border-blue-300 bg-gray-50"
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]); }}
      >
        <p className="text-gray-800 font-medium text-sm text-center max-w-xs">
          Drop your GPX/TCX file here to check weather conditions along the way
        </p>
        <div className="flex items-center gap-3 text-xl">
          {BOX_SPORT_SYMBOLS.map((emoji) => (
            <span key={emoji}>{emoji}</span>
          ))}
        </div>
        <input
          type="file"
          accept=".gpx,.tcx"
          className="sr-only"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </label>

      <p className="text-sm text-gray-500 text-center">
        Pick your activity below. It adjusts the pace slider and other map features, like weather timing and ski wax tips.
      </p>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 text-sm border border-gray-200">
        {UPLOAD_SPORTS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSport(s.id)}
            className={clsx(
              "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg font-medium transition-all text-xs sm:text-sm",
              sport === s.id
                ? "bg-white text-blue-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <span>{s.emoji}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      <div className="text-center">
        <MobileUploadGuide />
      </div>

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

export function StravaIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066z" />
      <path d="M9.693 7.817L6.628 1.688 3.563 7.817H0l6.628-6.628 6.628 6.628z" />
    </svg>
  );
}
