
CREATE TABLE public.saved_concepts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question TEXT NOT NULL,
  explanation TEXT NOT NULL,
  whiteboard_data JSONB,
  subject TEXT NOT NULL DEFAULT 'General',
  topic TEXT,
  mastered BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved concepts"
ON public.saved_concepts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved concepts"
ON public.saved_concepts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved concepts"
ON public.saved_concepts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved concepts"
ON public.saved_concepts FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_saved_concepts_updated_at
BEFORE UPDATE ON public.saved_concepts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_saved_concepts_user_id ON public.saved_concepts(user_id);
CREATE INDEX idx_saved_concepts_subject ON public.saved_concepts(subject);
