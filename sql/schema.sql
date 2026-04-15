-- ============================================================
-- France Classification System — Supabase Database Schema
-- Run this entire script in your Supabase SQL Editor
-- (Dashboard → SQL Editor → New Query → Paste → Run)
-- ============================================================

-- 1. CREATE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.players (
  id              BIGSERIAL PRIMARY KEY,

  -- Identity
  identification  TEXT,
  last_name       TEXT    NOT NULL,
  first_name      TEXT    NOT NULL,
  birth_date      DATE,
  nationality     TEXT,
  gender          TEXT    CHECK (gender IN ('M', 'F')),

  -- Classification
  classification  TEXT,
  class_status    TEXT    DEFAULT 'Confirmed'
                  CHECK (class_status IN ('Confirmed', 'Under Review', 'Provisional')),
  handicap        TEXT,
  colour          TEXT,

  -- Dates
  register_date   DATE,
  expire_date     DATE,

  -- Junior
  junior_player   BOOLEAN DEFAULT FALSE,
  junior_until    DATE,

  -- Classifier & Notes
  classifier      TEXT,
  notes_1         TEXT,
  notes_2         TEXT,

  -- Photo (optional, stored in Supabase Storage)
  photo_url       TEXT,

  -- Timestamps
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. USEFUL INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_players_last_name      ON public.players (last_name);
CREATE INDEX IF NOT EXISTS idx_players_identification ON public.players (identification);
CREATE INDEX IF NOT EXISTS idx_players_classification ON public.players (classification);
CREATE INDEX IF NOT EXISTS idx_players_expire_date    ON public.players (expire_date);
CREATE INDEX IF NOT EXISTS idx_players_junior         ON public.players (junior_player);

-- 3. AUTO-UPDATE updated_at ON EVERY ROW CHANGE
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_players_updated_at ON public.players;
CREATE TRIGGER trg_players_updated_at
  BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 4. ROW LEVEL SECURITY (RLS) — CRITICAL FOR PUBLIC GITHUB REPOS
-- ============================================================
-- Enable RLS — this blocks ALL access by default
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Only authenticated users (logged-in admins) can read data
CREATE POLICY "Authenticated users can select"
  ON public.players FOR SELECT
  TO authenticated
  USING (true);

-- Only authenticated users can insert data
CREATE POLICY "Authenticated users can insert"
  ON public.players FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only authenticated users can update data
CREATE POLICY "Authenticated users can update"
  ON public.players FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Only authenticated users can delete data
CREATE POLICY "Authenticated users can delete"
  ON public.players FOR DELETE
  TO authenticated
  USING (true);

-- RESULT: Anonymous (unauthenticated) users have ZERO access.
-- Your anon key alone cannot read or write any player data.
-- This makes the anon key safe to include in your public GitHub repo.

-- 5. OPTIONAL — STORAGE BUCKET FOR PLAYER PHOTOS
-- ============================================================
-- Run in Supabase Dashboard → Storage → New Bucket
-- Bucket name: "player-photos"
-- Public: NO (keep private)
-- Then add this policy manually in Storage → player-photos → Policies:
--   Authenticated users can upload / read from this bucket.

-- ============================================================
-- HOW TO CREATE AN ADMIN USER:
-- Supabase Dashboard → Authentication → Users → Invite User
-- Enter the admin email address.
-- The user receives an email to set their password.
-- ============================================================
