-- Create a secure function to check if an email already exists
-- This bypasses RLS to allow unauthenticated users to check email availability
CREATE OR REPLACE FUNCTION public.check_email_exists(check_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE LOWER(email) = LOWER(check_email)
  );
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.check_email_exists TO anon;
GRANT EXECUTE ON FUNCTION public.check_email_exists TO authenticated;