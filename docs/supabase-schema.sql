-- THAA Maldives · Reference schema
-- Supabase/Postgres target for the inventory layer.
-- The app currently runs on a versioned static inventory layer
-- (src/inventory/artifacts + client); this file is the forward-compatible
-- reference model so the real database can slot in behind the same client.

-- Domains per the three-domain model:
--   1. Resort Master Data  (CMS: resorts, rooms, meal plans, transfers)
--   2. Rates               (contract rate periods, currency)
--   3. Availability        (per-night inventory, separate from rates)

create type availability_status as enum ('AVAILABLE', 'ON_REQUEST', 'SOLD_OUT', 'STOP_SELL');
create type import_status as enum ('SUCCESS', 'PARTIAL', 'FAILED');

create table resorts (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  atoll         text not null,
  kind          text not null check (kind in ('resort', 'hotel', 'guesthouse')),
  source_type   text not null default 'CMS',          -- CMS | EXCEL | SUPPLIER
  source_id     text,                                  -- external id from supplier
  import_id     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table room_types (
  id           uuid primary key default gen_random_uuid(),
  resort_id    uuid not null references resorts(id),
  code         text not null,
  name         text,
  sort_order   int not null default 0,
  source_type  text not null default 'CMS',
  source_id    text,
  import_id    text,
  unique (resort_id, code)
);

create table meal_plans (
  id            uuid primary key default gen_random_uuid(),
  resort_id     uuid not null references resorts(id),
  code          text not null,
  name          text,
  unique (resort_id, code)
);

-- Rate periods: money per room / meal plan / date window. No availability here.
create table rate_periods (
  id           uuid primary key default gen_random_uuid(),
  resort_id    uuid not null references resorts(id),
  room_id      uuid not null references room_types(id),
  meal_plan_id uuid references meal_plans(id),
  valid_from   date not null,
  valid_to     date not null,
  currency     text not null default 'USD',
  sgl_rate     numeric,
  dbl_rate     numeric,
  tpl_rate     numeric,
  qtrp_rate    numeric,
  extra_adult  numeric,
  child_rate   numeric,
  infant_rate  numeric,
  source_type  text not null default 'EXCEL',
  source_id    text,
  import_id    text,
  constraint valid_window check (valid_from <= valid_to),
  unique (room_id, meal_plan_id, valid_from)
);

-- Per-night inventory: separate from rates.
-- "On Request" must NOT become available_rooms = 0 (see availability_status).
create table daily_availability (
  id             uuid primary key default gen_random_uuid(),
  resort_id      uuid not null references resorts(id),
  room_id        uuid not null references room_types(id),
  date           date not null,
  available_rooms int,
  status         availability_status not null default 'AVAILABLE',
  source_type    text not null default 'EXCEL',
  source_id      text,
  import_id      text,
  updated_at     timestamptz not null default now(),
  unique (room_id, date)
);

create table transfer_rates (
  id           uuid primary key default gen_random_uuid(),
  resort_id    uuid not null references resorts(id),
  adult_rate   numeric not null,
  child_rate   numeric,
  currency     text not null default 'USD',
  source_type  text not null default 'EXCEL',
  source_id    text,
  import_id    text,
  unique (resort_id)
);

create table imports (
  id              text primary key,
  filename        text not null,
  source_type     text not null default 'EXCEL',
  source_id       text,
  status          import_status not null,
  rows_processed  int not null default 0,
  rows_created    int not null default 0,
  rows_updated    int not null default 0,
  rows_unchanged  int not null default 0,
  rows_failed     int not null default 0,
  started_at      timestamptz not null,
  completed_at    timestamptz not null
);

create table import_errors (
  id           bigint generated always as identity primary key,
  import_id    text references imports(id) on delete cascade,
  row_number   int not null,
  field        text,
  message      text not null
);

-- Every row carries source_type / source_id / import_id so it can be
-- traced back to the import job that created it and rolled back by
-- re-importing the previous baseline.