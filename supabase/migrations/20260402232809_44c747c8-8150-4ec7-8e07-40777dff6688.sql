
-- 1. Add email format constraint to email_captures
ALTER TABLE public.email_captures
  ADD CONSTRAINT email_format CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$');

-- 2. Add DELETE policy for study_sessions so users can delete their own records
CREATE POLICY "Users can delete own sessions"
ON public.study_sessions
FOR DELETE
USING (auth.uid() = user_id);
