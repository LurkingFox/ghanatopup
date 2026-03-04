-- Migration for Supabase SQL editor
-- Run this in Supabase Dashboard → SQL editor → New query → Run

-- Ensure UUID generator (pgcrypto) is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enum types
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'network') THEN
    CREATE TYPE network AS ENUM ('MTN','TELECEL','AIRTELTIGO');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
    CREATE TYPE transaction_type AS ENUM ('AIRTIME','DATA');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status') THEN
    CREATE TYPE transaction_status AS ENUM (
      'INITIATED', 'PAYMENT_PENDING', 'PAYMENT_CONFIRMED', 'DELIVERING', 'COMPLETED', 'FAILED'
    );
  END IF;
END$$;

-- updated_at trigger function to keep timestamps in sync
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Users table (id expected to match Supabase Auth UID)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone varchar(20) UNIQUE NOT NULL,
  display_name varchar(100),
  loyalty_points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER users_set_timestamp
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_number varchar(20) NOT NULL,
  network network NOT NULL,
  type transaction_type NOT NULL,
  bundle_id varchar(100),
  amount_ghs numeric(10,2) NOT NULL,
  payment_method varchar(50),
  payment_ref varchar(200),
  delivery_ref varchar(200),
  status transaction_status NOT NULL DEFAULT 'INITIATED',
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TRIGGER transactions_set_timestamp
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Beneficiaries table
CREATE TABLE IF NOT EXISTS public.beneficiaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  phone varchar(20) NOT NULL,
  network network NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Optional indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_user_id ON public.beneficiaries(user_id);

-- Sample seed data (optional)
INSERT INTO public.users (id, phone, display_name)
VALUES (
  gen_random_uuid(),
  '+233201234567',
  'Dev User'
) ON CONFLICT (phone) DO NOTHING;

-- Done

-- Security note: enable Row Level Security (RLS) and create policies to restrict
-- access to rows belonging to authenticated users (recommended for production).
-- Example (do NOT enable without configuring policies):
-- ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can access their transactions" ON public.transactions
--   USING (user_id = auth.uid());
