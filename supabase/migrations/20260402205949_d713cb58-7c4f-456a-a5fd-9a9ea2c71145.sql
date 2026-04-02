
CREATE TABLE public.email_captures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'pricing_modal',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(email)
);

ALTER TABLE public.email_captures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert email captures"
ON public.email_captures
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "No one can read email captures"
ON public.email_captures
FOR SELECT
USING (false);
