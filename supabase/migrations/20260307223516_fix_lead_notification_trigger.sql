/*
  # Fix Lead Notification Trigger

  1. Changes
    - Recreate the `notify_new_lead` trigger function using the correct `net.http_post` API from pg_net
    - pg_net's `net.http_post` is async and non-blocking

  2. Notes
    - The previous migration used the wrong schema prefix for http_post
    - This corrects it to use `net.http_post` which accepts (url, body, content_type, headers)
*/

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

  PERFORM net.http_post(
    url := edge_function_url,
    body := payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_new_lead trigger error: %', SQLERRM;
  RETURN NEW;
END;
$$;
