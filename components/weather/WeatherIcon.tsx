interface Props {
  symbolCode: string;
  size?: number;
  className?: string;
}

const SYMBOL_EMOJI: Record<string, string> = {
  clearsky_day: "☀️",
  clearsky_night: "🌙",
  fair_day: "🌤️",
  fair_night: "🌤️",
  partlycloudy_day: "⛅",
  partlycloudy_night: "⛅",
  cloudy: "☁️",
  fog: "🌫️",
  lightrain: "🌦️",
  rain: "🌧️",
  heavyrain: "⛈️",
  rainandthunder: "⛈️",
  lightsnow: "🌨️",
  snow: "❄️",
  heavysnow: "🌨️",
  sleet: "🌧️",
  lightsleet: "🌧️",
};

function resolveEmoji(code: string): string {
  // Strip _day/_night suffix for lookup
  const base = code.replace(/_day$|_night$/, "");
  return SYMBOL_EMOJI[code] ?? SYMBOL_EMOJI[base] ?? "🌡️";
}

export function WeatherIcon({ symbolCode, size = 20, className = "" }: Props) {
  const emoji = resolveEmoji(symbolCode);
  return (
    <span
      role="img"
      aria-label={symbolCode}
      style={{ fontSize: size }}
      className={className}
    >
      {emoji}
    </span>
  );
}
