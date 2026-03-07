/*
  # Add Lead Notification Trigger

  1. Changes
    - Enable `pg_net` extension for async HTTP calls from the database
    - Create a trigger function `notify_new_lead` that fires on INSERT into `contact_leads`
    - The function calls the `notify-new-lead` Edge Function with the new lead's data

  2. How it works
    - When a new row is inserted into `contact_leads`, the trigger fires automatically
    - It makes an async HTTP POST to the Supabase Edge Function using pg_net
    - This replaces the client-side fetch call, making notifications server-side and reliable

  3. Notes
    - pg_net calls are non-blocking and won't slow down the insert
    - The trigger uses the Supabase service role key stored in vault or a hardcoded anon key
    - Edge function URL is derived from the Supabase project URL
*/

CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

CREATE OR REPLACE FUNCTION notify_new_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payload jsonb;
  edge_function_url text;
  anon_key text;
BEGIN
  payload := jsonb_build_object(
    'name', NEW.name,
    'email', NEW.email,
    'phone', NEW.phone,
    'company', NEW.company,
    'message', NEW.message,
    'source', NEW.source,
    'language', NEW.language
  );

  edge_function_url := 'https://sgwgvgsistjjoqknqwqv.supabase.co/functions/v1/notify-new-lead';
  anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnd2d2Z3Npc3Rqam9xa25xd3F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5ODAyODUsImV4cCI6MjA4MTU1NjI4NX0.93op0ThBsZHvMMEUCPAT-VgByfNmDNTJOWtEanNHYvA';

  PERFORM extensions.http_post(
    edge_function_url,
    payload::text,
    'application/json'
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_new_lead trigger error: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_lead_notify ON contact_leads;

CREATE TRIGGER on_new_lead_notify
  AFTER INSERT ON contact_leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_lead();
