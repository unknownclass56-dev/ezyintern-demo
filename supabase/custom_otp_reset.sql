-- 1. Create a table to store custom OTPs
CREATE TABLE IF NOT EXISTS public.password_resets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  otp TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + interval '15 minutes'
);

-- Enable RLS
ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to insert (so the app can generate OTPs)
DROP POLICY IF EXISTS "Anyone can request password reset" ON public.password_resets;
CREATE POLICY "Anyone can request password reset" ON public.password_resets FOR INSERT WITH CHECK (true);

-- Policy: No one can select/update/delete directly (only the RPC can check)
DROP POLICY IF EXISTS "Public cannot view OTPs" ON public.password_resets;
CREATE POLICY "Public cannot view OTPs" ON public.password_resets FOR SELECT USING (false);

-- 2. Create the RPC function to reset password securely
-- This function runs as the database owner (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.reset_user_password(p_email TEXT, p_otp TEXT, p_new_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS and update auth.users
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_otp_valid BOOLEAN;
BEGIN
  -- Check if a valid, non-expired OTP exists for this email
  SELECT TRUE INTO v_otp_valid
  FROM public.password_resets
  WHERE email = p_email 
    AND otp = p_otp 
    AND expires_at > now()
  ORDER BY created_at DESC 
  LIMIT 1;

  IF v_otp_valid IS NULL THEN
    -- OTP is incorrect or expired
    RETURN FALSE;
  END IF;

  -- Get the user ID from auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;

  IF v_user_id IS NULL THEN
    -- User doesn't exist
    RETURN FALSE;
  END IF;

  -- Update the user's password in auth.users
  -- Supabase uses bcrypt for password hashing
  UPDATE auth.users 
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')) 
  WHERE id = v_user_id;

  -- Clean up: Delete all reset requests for this email
  DELETE FROM public.password_resets WHERE email = p_email;

  RETURN TRUE;
END;
$$;

-- Grant access to the RPC function
GRANT EXECUTE ON FUNCTION public.reset_user_password TO anon, authenticated;
