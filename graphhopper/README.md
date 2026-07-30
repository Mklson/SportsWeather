# GraphHopper route-generation service

Self-hosted GraphHopper instance used by `/api/routes/generate` to produce round-trip
loop routes. Deployed separately from the main Next.js app (which is serverless and
can't run a persistent process).

## Deploy (Fly.io)

```sh
cd graphhopper
fly launch --no-deploy   # creates the app, keep the name or edit fly.toml's `app`
fly volumes create graphhopper_data --size 10 --region arn
fly deploy
```

First boot downloads `norway-latest.osm.pbf` (Geofabrik) into the volume and builds
the routing graph — this can take several minutes; `fly.toml`'s health check has a
15-minute grace period to allow for it. Subsequent deploys reuse the cached extract
and graph unless `config.yml` or the custom models change (bump `graph.location` in
that case to force a rebuild).

## After deploying

Set `GRAPHHOPPER_URL` in the Next.js app's environment (`.env.local` for local dev,
Vercel project settings for Production/Preview) to the Fly app's URL, e.g.
`https://sportsweather-graphhopper.fly.dev`.

## Updating trail-preference weighting

Edit the JSON files in `custom_models/` (see `trail_foot.json` for the shape) and
redeploy — no code change needed in the Next.js app, since it only ever selects a
profile *name*.
