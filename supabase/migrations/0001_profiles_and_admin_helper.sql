-- ============================================================
-- 0001: Profiles table + admin helper + auto-create trigger
-- ============================================================
-- AUDIT-TRAIL ONLY. Applied direct-to-DB on 2026-04-25 (before
-- supabase/migrations/ existed in the repo). SUPERSEDED BY 0002 —
-- the Supabase-Auth identity model below is incompatible with our
-- Clerk-JWT integration (auth.users stays empty when sign-in is
-- via Clerk). 0002 drops every artifact this file created.
-- Committed verbatim to preserve drift visibility per REF-DB-schema.md.
-- ============================================================

CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text,
    name text,
    country text,
    preferred_language text DEFAULT 'en',
    role text NOT NULL DEFAULT 'worker' CHECK (role IN ('worker', 'admin')),
    employer_name text,
    employer_abn text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'Extends auth.users with PayChecker-specific fields. One row per user.';

-- Helper: is the current authenticated user an admin?
-- SECURITY DEFINER + STABLE so it can be safely used in RLS policies without recursion.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
$$;

COMMENT ON FUNCTION public.is_admin() IS 'Returns true if current auth user has role = admin. Use in RLS policies.';

-- Auto-create profile when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated-at trigger (reusable across tables)
-- Note: SET search_path = public was added in 0002 to silence the
-- function_search_path_mutable advisor; preserved here for replay parity.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS — policies added in migration 05
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
