import { parseStringPromise } from "xml2js";
import type { Coordinate } from "@/types";

export async function parseTcx(xml: string): Promise<Coordinate[]> {
  const doc = await parseStringPromise(xml, {
    explicitArray: true,
    ignoreAttrs: false,
    mergeAttrs: true,
  });

  const coords: Coordinate[] = [];

  // TCX structure: TrainingCenterDatabase > Activities > Activity > Lap > Track > Trackpoint
  const root =
    doc.TrainingCenterDatabase ??
    doc["ns2:TrainingCenterDatabase"] ??
    doc;

  const activities =
    root?.Activities?.[0]?.Activity ??
    root?.Courses?.[0]?.Course ??
    [];

  for (const activity of activities) {
    const laps = activity.Lap ?? activity.Track ?? [];
    for (const lap of laps) {
      const tracks = lap.Track ?? [lap];
      for (const track of tracks) {
        const trackpoints = track.Trackpoint ?? [];
        for (const tp of trackpoints) {
          const pos = tp.Position?.[0];
          if (!pos) continue;
          const lat = parseFloat(pos.LatitudeDegrees?.[0]);
          const lon = parseFloat(pos.LongitudeDegrees?.[0]);
          if (isNaN(lat) || isNaN(lon)) continue;
          const eleRaw = tp.AltitudeMeters?.[0];
          const ele = eleRaw ? parseFloat(eleRaw) : undefined;
          coords.push({ lat, lon, ele: isNaN(ele as number) ? undefined : ele });
        }
      }
    }
  }

  if (coords.length === 0) {
    throw new Error("No coordinates found in TCX file");
  }

  return coords;
}
