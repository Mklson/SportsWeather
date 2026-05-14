import type {
  Coordinate,
  PointWeather,
  WeatherSegment,
  WindStrength,
} from "@/types";
import { classifyWind, windClassColor } from "./wind-classifier";
import { sampleRoute, SamplePoint, estimateSegmentTimes } from "./route-sampler";
import { windStrengthFromMs } from "@/types";
import type { SportType } from "@/types";

const MET_BASE = "https://api.met.no/weatherapi/locationforecast/2.0/compact";
const USER_AGENT = "SportsWeather/1.0 github.com/your-org/sportsweather";

interface MetTimeseries {
  time: string;
  data: {
    instant: {
      details: {
        air_temperature?: number;
        wind_speed?: number;
        wind_from_direction?: number;
        relative_humidity?: number;
        cloud_area_fraction?: number;
      };
    };
    next_1_hours?: {
      summary: { symbol_code: string };
      details: { precipitation_amount?: number };
    };
    next_6_hours?: {
      summary: { symbol_code: string };
      details: { precipitation_amount?: number };
    };
  };
}

interface MetResponse {
  properties: {
    timeseries: MetTimeseries[];
  };
}

async function fetchMet(lat: number, lon: number, alt?: number): Promise<MetResponse> {
  const altParam = alt !== undefined ? `&altitude=${Math.round(alt)}` : "";
  const url = `${MET_BASE}?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}${altParam}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
    // Cache 1 hour on Vercel CDN
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`MET API error ${res.status} for (${lat},${lon})`);
  }
  return res.json() as Promise<MetResponse>;
}

/** Find the timeseries entry closest to targetTime without going past it. */
function findClosestTimeseries(
  ts: MetTimeseries[],
  targetTime: Date
): MetTimeseries | null {
  let best: MetTimeseries | null = null;
  let bestDiff = Infinity;

  for (const entry of ts) {
    const t = new Date(entry.time).getTime();
    const diff = Math.abs(targetTime.getTime() - t);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = entry;
    }
  }
  return best;
}

function parseTimeseries(ts: MetTimeseries): PointWeather {
  const d = ts.data.instant.details;
  const next1 = ts.data.next_1_hours;
  const next6 = ts.data.next_6_hours;

  const symbolCode =
    next1?.summary.symbol_code ??
    next6?.summary.symbol_code ??
    "cloudy";

  const precipitation =
    (next1?.details.precipitation_amount ?? next6?.details.precipitation_amount ?? 0);

  const windSpeed = d.wind_speed ?? 0;
  const temperature = d.air_temperature ?? 0;

  return {
    temperature,
    windSpeed,
    windDirection: d.wind_from_direction ?? 0,
    precipitation,
    cloudCover: d.cloud_area_fraction ?? 0,
    symbolCode,
    humidity: d.relative_humidity,
    // Simple feels-like: wind chill below 10°C
    feelsLike:
      temperature <= 10
        ? Math.round(
            13.12 +
              0.6215 * temperature -
              11.37 * Math.pow(windSpeed, 0.16) +
              0.3965 * temperature * Math.pow(windSpeed, 0.16)
          )
        : temperature,
  };
}

/**
 * Fetch weather for every sample point along the route and return
 * classified segments. Requests are batched with concurrency limit to
 * avoid hammering MET API.
 */
export async function fetchRouteWeather(
  coords: Coordinate[],
  startTime: Date,
  intervalM = 500,
  concurrency = 4,
  speedKmh?: number,
  sport?: SportType
): Promise<WeatherSegment[]> {
  const samples = sampleRoute(coords, intervalM);

  // Per-sample arrival times when speed is given; otherwise all use startTime
  const arrivalTimes = speedKmh && speedKmh > 0
    ? estimateSegmentTimes(samples, startTime, speedKmh, sport ?? "cycling")
    : null;

  // Fetch in batches
  const segments: WeatherSegment[] = [];

  for (let i = 0; i < samples.length; i += concurrency) {
    const batch = samples.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map((pt) => fetchMet(pt.coordinate.lat, pt.coordinate.lon, pt.coordinate.ele))
    );

    for (let j = 0; j < batch.length; j++) {
      const sample = batch[j];
      const result = results[j];
      const sampleTime = arrivalTimes ? arrivalTimes[i + j] : startTime;

      let weather: PointWeather;
      if (result.status === "fulfilled") {
        const closest = findClosestTimeseries(
          result.value.properties.timeseries,
          sampleTime
        );
        weather = closest
          ? parseTimeseries(closest)
          : fallbackWeather();
      } else {
        weather = fallbackWeather();
      }

      const { windClass, relativeAngle } = classifyWind(
        sample.bearing,
        weather.windDirection
      );

      const globalIndex = i + j;
      const prevSample: SamplePoint | undefined = globalIndex > 0
        ? (i + j > 0 ? samples[i + j - 1] : undefined)
        : undefined;

      segments.push({
        index: globalIndex,
        startKm: (prevSample?.distanceM ?? 0) / 1000,
        endKm: sample.distanceM / 1000,
        coordinate: sample.coordinate,
        bearing: sample.bearing,
        weather,
        windClass,
        windRelativeAngle: relativeAngle,
        windStrength: windStrengthFromMs(weather.windSpeed) as WindStrength,
        color: windClassColor(windClass),
      });
    }
  }

  return segments;
}

function fallbackWeather(): PointWeather {
  return {
    temperature: 0,
    windSpeed: 0,
    windDirection: 0,
    precipitation: 0,
    cloudCover: 0,
    symbolCode: "cloudy",
  };
}
