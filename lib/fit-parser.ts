import FitParser from "fit-file-parser";
import type { Coordinate } from "@/types";

export async function parseFit(buffer: ArrayBuffer): Promise<Coordinate[]> {
  const parser = new FitParser({
    mode: "list",
    lengthUnit: "m",
    speedUnit: "m/s",
    elapsedRecordField: false,
  });

  const data = await parser.parseAsync(buffer);
  const records = (data.records ?? []) as Array<{
    position_lat?: number;
    position_long?: number;
    altitude?: number;
  }>;

  const coords: Coordinate[] = [];
  for (const r of records) {
    if (r.position_lat == null || r.position_long == null) continue;
    coords.push({ lat: r.position_lat, lon: r.position_long, ele: r.altitude });
  }

  if (coords.length === 0) {
    throw new Error("No coordinates found in FIT file");
  }

  return coords;
}
