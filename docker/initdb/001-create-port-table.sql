create extension if not exists pgcrypto;

create table if not exists "Port" (
  "id" text primary key,
  "portName" text not null,
  "locode" text not null unique,
  "latitude" double precision not null,
  "longitude" double precision not null,
  "timezoneOlson" text,
  "countryIso" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

