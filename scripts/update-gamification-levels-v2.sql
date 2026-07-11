-- Gamification v2: 10 levels, challenges, referrals, updated point defaults
-- Run once in SQL Editor after add-student-gamification.sql

INSERT INTO "GamificationPointRule" (event_type, points, updated_at) VALUES
  ('CHALLENGE_COMPLETE', 5, NOW()),
  ('REFERRAL_APPROVED', 3, NOW())
ON CONFLICT (event_type) DO NOTHING;

CREATE TABLE IF NOT EXISTS "Challenge" (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  title_en TEXT,
  description TEXT,
  description_en TEXT,
  question_type TEXT NOT NULL DEFAULT 'MULTIPLE_CHOICE',
  options JSONB,
  correct_answer TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "Challenge_is_active_idx" ON "Challenge"(is_active, sort_order);

CREATE TABLE IF NOT EXISTS "ChallengeSubmission" (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  challenge_id TEXT NOT NULL REFERENCES "Challenge"(id) ON DELETE CASCADE,
  answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT challenge_submission_unique_user_challenge UNIQUE (user_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS "ChallengeSubmission_user_id_idx" ON "ChallengeSubmission"(user_id);

CREATE TABLE IF NOT EXISTS "ReferralRequest" (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_mobile TEXT NOT NULL,
  student_email TEXT NOT NULL,
  referrer_name TEXT NOT NULL,
  referrer_mobile TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  matched_referrer_user_id TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  reviewed_by TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT referral_request_unique_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS "ReferralRequest_status_idx" ON "ReferralRequest"(status, created_at DESC);

-- Recalculate wizard_level: 10 levels, 10 XP per level (max level 10 at 90+ XP)
UPDATE "User"
SET wizard_level = LEAST(10, GREATEST(1, FLOOR(experience_points / 10) + 1)),
    updated_at = NOW()
WHERE role = 'STUDENT';
