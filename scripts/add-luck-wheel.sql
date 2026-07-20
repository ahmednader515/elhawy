-- عجلة الحظ: تفعيل عام + سجل اللفات (عرض فقط)

ALTER TABLE "HomepageSetting"
  ADD COLUMN IF NOT EXISTS luck_wheel_enabled BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "LuckWheelSpin" (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  result_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "LuckWheelSpin_created_at_idx"
  ON "LuckWheelSpin"(created_at DESC);

CREATE INDEX IF NOT EXISTS "LuckWheelSpin_user_id_created_at_idx"
  ON "LuckWheelSpin"(user_id, created_at DESC);
