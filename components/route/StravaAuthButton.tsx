"use client";

export function StravaAuthButton({ label }: { label: string }) {
  return (
    <button
      onClick={() => { window.location.href = "/api/strava/auth"; }}
      className="px-5 py-2.5 bg-[#FC4C02] hover:bg-[#e04300] text-white rounded-xl font-medium transition-colors"
    >
      {label}
    </button>
  );
}
