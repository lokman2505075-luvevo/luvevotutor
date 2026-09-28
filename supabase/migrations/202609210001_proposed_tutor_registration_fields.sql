-- PROPOSED ONLY: do not execute until the owner confirms the data model.
-- Current Tutor Hub collects these values locally but drops them before signup:
-- qualification, experience years, and expected monthly fee.
-- This migration adds private profile fields for a later persistence flow.

alter table public.profiles
  add column if not exists qualification text,
  add column if not exists experience_years integer,
  add column if not exists expected_fee numeric;

alter table public.profiles
  drop constraint if exists profiles_experience_years_check;

alter table public.profiles
  add constraint profiles_experience_years_check
  check (experience_years is null or experience_years >= 0);

-- Keep these fields out of public_tutors and do not expose phone or fee in public queries.
-- A future authenticated tutor update flow should validate and write these columns explicitly.
