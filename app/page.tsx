import Image from "next/image";
import { RouteImporter } from "@/components/route/RouteImporter";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-4 bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-4">
          <Image
            src="/weather-icon.png"
            alt="SportsWeather icon"
            width={72}
            height={72}
            priority
            className="drop-shadow-xl"
          />
          <h1 className="text-4xl font-bold tracking-tight text-blue-900">
            SportsWeather
          </h1>
        </div>
        <p className="text-gray-500 text-lg text-center">
          Upload a route and see wind, rain and temperature along the way
        </p>
      </div>

      <RouteImporter />
    </main>
  );
}
