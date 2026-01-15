-- Create calendar_integrations table
CREATE TABLE IF NOT EXISTS public.calendar_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT 'purple',
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, slug)
);
-- Enable RLS
ALTER TABLE public.calendar_integrations ENABLE ROW LEVEL SECURITY;
-- Create policies
CREATE POLICY "Users can view their own integrations" ON public.calendar_integrations FOR
SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own integrations" ON public.calendar_integrations FOR
INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own integrations" ON public.calendar_integrations FOR
UPDATE USING (auth.uid() = user_id);
-- Optional: Initial seed (will be done in frontend if missing, but migration is better)
-- However, since this is for all users, we handle it in frontend or a trigger.
-- We'll stay with frontend initialization for simplicity in this dev environment.