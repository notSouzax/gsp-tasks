-- Migration 008: Calendar Tagging System
-- Create calendar_tags table
CREATE TABLE IF NOT EXISTS public.calendar_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, name)
);
-- Enable RLS
ALTER TABLE public.calendar_tags ENABLE ROW LEVEL SECURITY;
-- RLS Policies for calendar_tags
CREATE POLICY "Users can manage their own tags" ON public.calendar_tags FOR ALL USING (auth.uid() = user_id);
-- Add tag_id to calendar_events
ALTER TABLE public.calendar_events
ADD COLUMN IF NOT EXISTS tag_id UUID REFERENCES public.calendar_tags(id) ON DELETE
SET NULL;
-- Index for performance
CREATE INDEX IF NOT EXISTS calendar_events_tag_id_idx ON public.calendar_events(tag_id);