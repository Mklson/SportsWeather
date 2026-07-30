#!/bin/sh
set -e

mkdir -p /data

# Fetch the Norway extract once into the persistent volume — re-downloading
# on every deploy would be slow and pointless since the file rarely changes.
if [ ! -f /data/norway-latest.osm.pbf ]; then
  echo "Downloading Norway OSM extract..."
  curl -L -o /data/norway-latest.osm.pbf "https://download.geofabrik.de/europe/norway-latest.osm.pbf"
fi

# Explicit heap size for the 3gb container. 1536m was tried first and OOM'd
# while concurrently loading landmark data for all 4 profiles at boot —
# loading pre-built landmarks needs more headroom than the final graph size
# alone would suggest. Leaves ~700MB for the OS/off-heap.
exec java -Xmx2400m \
  -Ddw.graphhopper.datareader.file=/data/norway-latest.osm.pbf \
  -jar /gh/graphhopper.jar server /gh/config.yml
