-- ============================================================
-- GABRIEL ACADEMICS — Full Database Schema
-- Run this in your Supabase SQL Editor
-- Project: https://vgxjikgmttwflqxezbxd.supabase.co
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES TABLE
-- Extends Supabase auth.users with role and display info
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'client', 'consultant')),
  display_name TEXT,
  email TEXT,
  phone TEXT,
  subject_areas TEXT[], -- for consultants
  qualification TEXT,   -- for consultants
  bio TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  masked_id TEXT UNIQUE, -- e.g. CL-001, C-001 — shown cross-party
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- JOBS TABLE — The Mission Board
-- ============================================================
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_ref TEXT UNIQUE NOT NULL, -- e.g. GA-2601
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  level TEXT NOT NULL,
  pages INTEGER NOT NULL DEFAULT 1,
  deadline TIMESTAMPTZ NOT NULL,
  instructions TEXT,
  reference_style TEXT DEFAULT 'APA 7th',
  attachment_url TEXT,

  -- Money
  client_budget NUMERIC(10,2) NOT NULL,
  consultant_rate NUMERIC(5,2) NOT NULL DEFAULT 60.00, -- percentage
  consultant_payout NUMERIC(10,2) GENERATED ALWAYS AS (ROUND(client_budget * consultant_rate / 100, 2)) STORED,
  gabriel_margin NUMERIC(10,2) GENERATED ALWAYS AS (ROUND(client_budget * (100 - consultant_rate) / 100, 2)) STORED,

  -- Parties (admin can see both; parties only see masked_id)
  client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  consultant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Status machine
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','posted','pending','active','submitted','qa_review','qa_failed','delivered','disputed','cancelled')),

  -- Submission
  submission_url TEXT,
  submitted_at TIMESTAMPTZ,

  -- QA
  qa_notes TEXT,
  qa_passed_at TIMESTAMPTZ,
  qa_passed_by UUID REFERENCES public.profiles(id),

  -- Delivery
  delivered_at TIMESTAMPTZ,

  -- Source
  source TEXT DEFAULT 'client_self' CHECK (source IN ('client_self','admin_manual','referred')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-increment job reference
CREATE SEQUENCE IF NOT EXISTS job_ref_seq START 2601;
CREATE OR REPLACE FUNCTION generate_job_ref()
RETURNS TRIGGER AS $$
BEGIN
  NEW.job_ref := 'GA-' || nextval('job_ref_seq');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_job_ref
  BEFORE INSERT ON public.jobs
  FOR EACH ROW
  WHEN (NEW.job_ref IS NULL OR NEW.job_ref = '')
  EXECUTE FUNCTION generate_job_ref();

-- ============================================================
-- PAYMENTS TABLE — Incoming from clients
-- ============================================================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_ref TEXT UNIQUE NOT NULL DEFAULT ('PAY-' || floor(random()*90000+10000)::TEXT),
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  method TEXT DEFAULT 'EFT' CHECK (method IN ('EFT','Card','SnapScan','PayFast','Ozow')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','cleared','failed','refunded')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PAYOUTS TABLE — Outgoing to consultants
-- ============================================================
CREATE TABLE public.payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payout_ref TEXT UNIQUE NOT NULL DEFAULT ('PO-' || floor(random()*90000+10000)::TEXT),
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  consultant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'escrow' CHECK (status IN ('escrow','processing','paid','held')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MESSAGES TABLE — Brokered via Gabriel Academics
-- Clients & consultants never message each other directly
-- ============================================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE, -- admin-only notes
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REVIEWS TABLE — Client rates job (not consultant directly)
-- ============================================================
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID UNIQUE REFERENCES public.jobs(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  consultant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- admin-visible only
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info','success','warning','error')),
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- The anonymisation firewall — enforced at DB level
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper: get current user role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- PROFILES policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR ALL USING (get_my_role() = 'admin');

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- JOBS policies
-- Clients see only their own jobs (no consultant info)
CREATE POLICY "Clients see own jobs" ON public.jobs
  FOR SELECT USING (
    get_my_role() = 'client' AND client_id = auth.uid()
  );

-- Consultants see posted/pending/active jobs (no client info — enforced in app)
CREATE POLICY "Consultants see available and own jobs" ON public.jobs
  FOR SELECT USING (
    get_my_role() = 'consultant' AND
    (status IN ('posted','pending') OR consultant_id = auth.uid())
  );

-- Admins see all
CREATE POLICY "Admins full access to jobs" ON public.jobs
  FOR ALL USING (get_my_role() = 'admin');

-- Clients can insert (create job requests)
CREATE POLICY "Clients can create jobs" ON public.jobs
  FOR INSERT WITH CHECK (
    get_my_role() = 'client' AND client_id = auth.uid()
  );

-- Consultants can update (accept, submit)
CREATE POLICY "Consultants can update assigned jobs" ON public.jobs
  FOR UPDATE USING (
    get_my_role() = 'consultant' AND consultant_id = auth.uid()
  );

-- PAYMENTS policies
CREATE POLICY "Clients see own payments" ON public.payments
  FOR SELECT USING (
    get_my_role() = 'client' AND client_id = auth.uid()
  );
CREATE POLICY "Admins full access to payments" ON public.payments
  FOR ALL USING (get_my_role() = 'admin');

-- PAYOUTS policies
CREATE POLICY "Consultants see own payouts" ON public.payouts
  FOR SELECT USING (
    get_my_role() = 'consultant' AND consultant_id = auth.uid()
  );
CREATE POLICY "Admins full access to payouts" ON public.payouts
  FOR ALL USING (get_my_role() = 'admin');

-- MESSAGES policies
CREATE POLICY "Users see their own messages" ON public.messages
  FOR SELECT USING (
    sender_id = auth.uid() OR recipient_id = auth.uid() OR get_my_role() = 'admin'
  );
CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Admins full access to messages" ON public.messages
  FOR ALL USING (get_my_role() = 'admin');

-- REVIEWS policies
CREATE POLICY "Clients can create reviews for own jobs" ON public.reviews
  FOR INSERT WITH CHECK (
    get_my_role() = 'client' AND client_id = auth.uid()
  );
CREATE POLICY "Admins see all reviews" ON public.reviews
  FOR ALL USING (get_my_role() = 'admin');
-- Consultants see aggregated rating only (no client info) — handled in app

-- NOTIFICATIONS policies
CREATE POLICY "Users see own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can mark own notifications read" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins full access to notifications" ON public.notifications
  FOR ALL USING (get_my_role() = 'admin');

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, masked_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    CASE
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'client') = 'client'
        THEN 'CL-' || LPAD(nextval('client_seq')::TEXT, 3, '0')
      WHEN NEW.raw_user_meta_data->>'role' = 'consultant'
        THEN 'C-' || LPAD(nextval('consultant_seq')::TEXT, 3, '0')
      ELSE 'ADM-001'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE SEQUENCE IF NOT EXISTS client_seq START 1;
CREATE SEQUENCE IF NOT EXISTS consultant_seq START 1;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jobs_updated_at BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SEED DATA — Admin account (run after creating admin user)
-- Replace 'YOUR-ADMIN-UUID' with actual UUID after signup
-- ============================================================

-- INSERT INTO public.profiles (id, role, display_name, email, masked_id, is_verified)
-- VALUES ('YOUR-ADMIN-UUID', 'admin', 'Gabriel', 'admin@gabrielacademics.co.za', 'ADM-001', true);

-- ============================================================
-- DONE — Schema applied successfully
-- Next: Open the app, sign up as admin first, then share
-- the client/consultant portal links with your stakeholders
-- ============================================================
