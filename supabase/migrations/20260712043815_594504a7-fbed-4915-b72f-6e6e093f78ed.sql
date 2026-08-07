
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birthday date,
  ADD COLUMN IF NOT EXISTS reading_goal_minutes integer NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS spiritual_intention text;
