-- Add MFA columns to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS mfa_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS mfa_grace_period_start timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS mfa_grace_period_days integer DEFAULT 7,
ADD COLUMN IF NOT EXISTS mfa_recovery_codes_generated_at timestamp with time zone DEFAULT NULL;

-- Create recovery codes table
CREATE TABLE IF NOT EXISTS public.mfa_recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code_hash text NOT NULL,
  used_at timestamp with time zone DEFAULT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on recovery codes table
ALTER TABLE public.mfa_recovery_codes ENABLE ROW LEVEL SECURITY;

-- Policy for users to manage their own recovery codes
CREATE POLICY "Users can manage their own recovery codes"
ON public.mfa_recovery_codes FOR ALL
USING (user_id = auth.uid());

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_mfa_recovery_codes_user_id 
ON public.mfa_recovery_codes(user_id);