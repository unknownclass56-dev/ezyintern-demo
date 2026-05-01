-- Fix RLS for payment_success and payment_cancelled
-- Ensure admins and super_admins can view all transactions

-- 1. payment_success
ALTER TABLE IF EXISTS public.payment_success ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view all successful payments" ON public.payment_success;
CREATE POLICY "Admins view all successful payments" ON public.payment_success 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

DROP POLICY IF EXISTS "Public insert successful payments" ON public.payment_success;
CREATE POLICY "Public insert successful payments" ON public.payment_success 
FOR INSERT WITH CHECK (true);

-- 2. payment_cancelled
ALTER TABLE IF EXISTS public.payment_cancelled ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view all cancelled payments" ON public.payment_cancelled;
CREATE POLICY "Admins view all cancelled payments" ON public.payment_cancelled 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

DROP POLICY IF EXISTS "Public insert cancelled payments" ON public.payment_cancelled;
CREATE POLICY "Public insert cancelled payments" ON public.payment_cancelled 
FOR INSERT WITH CHECK (true);
