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
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Bumped on every clear/successful upload to remount the native file input —
  // an uncontrolled <input type="file"> keeps its old value otherwise, so
  // re-picking the same filename wouldn't fire onChange a second time.
  const [inputKey, setInputKey] = useState(0);

  const resetFile = useCallback(() => {
    setPendingFile(null);
    setStatus("idle");
    setErrorMsg(null);
    setInputKey((k) => k + 1);
  }, []);

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
          setPendingFile(null);
          setInputKey((k) => k + 1);
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

  // Staging a file just holds it locally — the actual upload only fires once
  // the user confirms an activity, so they never have to guess it up front.
  const handleFile = useCallback((file: File | undefined) => {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["gpx", "tcx", "fit"].includes(ext)) {
      setStatus("error");
      setErrorMsg("Only GPX, TCX, and FIT files are supported");
      return;
    }
    setStatus("idle");
    setErrorMsg(null);
    setPendingFile(file);
  }, []);

  return (
    <div className="w-full max-w-md space-y-3">
      <label
        className={clsx(
          "flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border-2 border-dashed",
          "cursor-pointer transition-colors",
          isDragging
            ? "border-brand-green bg-brand-green-soft"
            : "border-brand-green-border bg-brand-green-soft/60 hover:border-brand-green"
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]); }}
      >
        {pendingFile ? (
          <>
            <p className="text-gray-800 font-medium text-xs text-center max-w-xs">
              📄 {pendingFile.name}
            </p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-400">Click or drop to choose a different file</p>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); resetFile(); }}
                className="text-xs text-gray-400 underline hover:text-gray-600"
              >
                Clear
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-gray-800 font-medium text-xs text-center max-w-xs">
              Drop your GPX/TCX/FIT file here to check weather conditions along the way
            </p>
            <div className="flex items-center gap-2 text-base">
              {BOX_SPORT_SYMBOLS.map((emoji) => (
                <span key={emoji}>{emoji}</span>
              ))}
            </div>
          </>
        )}
        <input
          key={inputKey}
          type="file"
          accept=".gpx,.tcx,.fit,application/gpx+xml,application/vnd.garmin.tcx+xml,application/octet-stream"
          className="sr-only"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </label>

      {pendingFile && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 text-center">
            Pick your activity. It adjusts the pace slider and other map features, like weather timing and ski wax tips.
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
                    ? "bg-white text-brand-navy shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <span>{s.emoji}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => uploadFile(pendingFile)}
            disabled={status === "uploading"}
            className="w-full bg-brand-navy hover:bg-brand-navy-dark text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60"
          >
            {status === "uploading" ? "Uploading…" : "Confirm activity →"}
          </button>
        </div>
      )}

      <div className="text-center">
        <MobileUploadGuide />
      </div>

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
    <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current">
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
  );
}
