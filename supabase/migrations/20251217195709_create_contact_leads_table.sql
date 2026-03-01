/*
  # Create Contact Leads Table

  1. New Tables
    - `contact_leads`
      - `id` (uuid, primary key) - Unique identifier for each lead
      - `name` (text, not null) - Contact person's name
      - `email` (text, not null) - Contact email address
      - `phone` (text) - Contact phone number (optional)
      - `company` (text) - Company name (optional)
      - `message` (text) - Message from the contact form
      - `source` (text) - Where the lead came from (e.g., 'contact_form', 'quote_request')
      - `language` (text) - Language preference (da/en)
      - `created_at` (timestamptz) - When the lead was created
      - `status` (text) - Lead status (new, contacted, converted, closed)

  2. Security
    - Enable RLS on `contact_leads` table
    - Add policy for anonymous users to insert new leads (public contact form)
    - No SELECT policy for anonymous users (data is private)

  3. Notes
    - This table stores leads from the contact form on the website
    - Anonymous users can submit leads but cannot read them
    - Admin access should be managed through Supabase dashboard or authenticated roles
*/

CREATE TABLE IF NOT EXISTS contact_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text DEFAULT '',
  company text DEFAULT '',
  message text DEFAULT '',
  source text DEFAULT 'contact_form',
  language text DEFAULT 'da',
  created_at timestamptz DEFAULT now(),
  status text DEFAULT 'new'
);

ALTER TABLE contact_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit contact leads"
  ON contact_leads
  FOR INSERT
  TO anon
  WITH CHECK (true);
