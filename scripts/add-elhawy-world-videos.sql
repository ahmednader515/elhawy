-- عالم الحاوي: فيديوهات يوتيوب يديرها الأدمن
CREATE TABLE IF NOT EXISTS "ElhawyWorldVideo" (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  title_en TEXT,
  description TEXT,
  description_en TEXT,
  youtube_url TEXT NOT NULL,
  cover_image_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "ElhawyWorldVideo_published_sort_idx"
  ON "ElhawyWorldVideo"(is_published, sort_order ASC, created_at DESC);
