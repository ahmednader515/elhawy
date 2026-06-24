-- نقاط الطلاب، المستويات، إكمال الحصص/الدورات، وسجل النقاط
-- تشغيله مرة واحدة من لوحة قاعدة البيانات (SQL Editor)

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS experience_points INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS wizard_level INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS "LessonCompletion" (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES "Lesson"(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES "Course"(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lesson_completion_unique_user_lesson UNIQUE (user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS "LessonCompletion_user_id_idx" ON "LessonCompletion"(user_id);
CREATE INDEX IF NOT EXISTS "LessonCompletion_course_id_idx" ON "LessonCompletion"(course_id);

CREATE TABLE IF NOT EXISTS "CourseCompletion" (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES "Course"(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT course_completion_unique_user_course UNIQUE (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS "CourseCompletion_user_id_idx" ON "CourseCompletion"(user_id);
CREATE INDEX IF NOT EXISTS "CourseCompletion_course_id_idx" ON "CourseCompletion"(course_id);

CREATE TABLE IF NOT EXISTS "PointEvent" (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  course_id TEXT REFERENCES "Course"(id) ON DELETE SET NULL,
  points INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT point_event_unique_user_type_ref UNIQUE (user_id, event_type, reference_id)
);

CREATE INDEX IF NOT EXISTS "PointEvent_user_id_idx" ON "PointEvent"(user_id);
CREATE INDEX IF NOT EXISTS "PointEvent_course_id_idx" ON "PointEvent"(course_id);
CREATE INDEX IF NOT EXISTS "PointEvent_created_at_idx" ON "PointEvent"(created_at DESC);

CREATE TABLE IF NOT EXISTS "QuizCompletion" (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  quiz_id TEXT NOT NULL REFERENCES "Quiz"(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES "Course"(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT quiz_completion_unique_user_quiz UNIQUE (user_id, quiz_id)
);

CREATE INDEX IF NOT EXISTS "QuizCompletion_user_id_idx" ON "QuizCompletion"(user_id);
CREATE INDEX IF NOT EXISTS "QuizCompletion_course_id_idx" ON "QuizCompletion"(course_id);

CREATE TABLE IF NOT EXISTS "GamificationPointRule" (
  event_type TEXT PRIMARY KEY,
  points INTEGER NOT NULL CHECK (points >= 0 AND points <= 10000),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO "GamificationPointRule" (event_type, points) VALUES
  ('LESSON_COMPLETE', 25),
  ('QUIZ_PASS', 40),
  ('QUIZ_HIGH_SCORE', 20),
  ('QUIZ_PERFECT', 30),
  ('COURSE_COMPLETE', 150)
ON CONFLICT (event_type) DO NOTHING;
