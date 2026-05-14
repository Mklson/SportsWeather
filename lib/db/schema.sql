-- Supabase schema for Sykkelvær
-- Run in Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── Routes ────────────────────────────────────────────────────────────────

create table if not exists routes (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete cascade,
  name          text not null,
  source        text not null check (source in ('strava','garmin','gpx','tcx')),
  coordinates   jsonb not null,   -- Coordinate[]
  distance_km   numeric(8,2) not null,
  elevation_gain_m numeric(8,1),
  external_id   text,             -- Strava/Garmin activity id
  sport         text check (sport in ('cycling', 'skiing', 'running')),
  created_at    timestamptz not null default now()
);

create index routes_user_id_idx on routes(user_id);
create index routes_created_at_idx on routes(created_at desc);

-- ─── Weather cache ─────────────────────────────────────────────────────────

create table if not exists weather_cache (
  id          uuid primary key default uuid_generate_v4(),
  route_id    uuid not null references routes(id) on delete cascade,
  start_time  timestamptz not null,
  segments    jsonb not null,    -- WeatherSegment[]
  fetched_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);

-- One cache entry per (route, start_time) – app always rounds to nearest hour
create unique index weather_cache_route_time_idx
  on weather_cache (route_id, start_time);

create index weather_cache_expires_idx on weather_cache(expires_at);

-- Row-level security
alter table routes enable row level security;
alter table weather_cache enable row level security;

create policy "Users see own routes"
  on routes for select using (auth.uid() = user_id or user_id is null);

create policy "Users insert own routes"
  on routes for insert with check (auth.uid() = user_id or user_id is null);

create policy "Anyone reads weather cache"
  on weather_cache for select using (true);

create policy "Service role writes weather cache"
  on weather_cache for insert with check (true);
