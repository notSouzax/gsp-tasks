-- Migration: Calendar Events Table
-- Created: 2024-12-21
-- Description: Table for storing calendar events (Google Calendar-style)
-- Create calendar_events table
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    all_day BOOLEAN DEFAULT false,
    color TEXT DEFAULT 'blue',
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_user ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_date ON calendar_events(user_id, date);
-- Enable RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
-- RLS Policies
-- Users can only see their own events
CREATE POLICY "Users can view own events" ON calendar_events FOR
SELECT USING (auth.uid() = user_id);
-- Users can create their own events
CREATE POLICY "Users can create own events" ON calendar_events FOR
INSERT WITH CHECK (auth.uid() = user_id);
-- Users can update their own events
CREATE POLICY "Users can update own events" ON calendar_events FOR
UPDATE USING (auth.uid() = user_id);
-- Users can delete their own events
CREATE POLICY "Users can delete own events" ON calendar_events FOR DELETE USING (auth.uid() = user_id);
-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_calendar_events_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER trigger_calendar_events_updated_at BEFORE
UPDATE ON calendar_events FOR EACH ROW EXECUTE FUNCTION update_calendar_events_updated_at();