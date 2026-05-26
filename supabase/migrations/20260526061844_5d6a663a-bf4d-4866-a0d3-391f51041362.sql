DROP POLICY IF EXISTS "own clients update" ON public.clients;
CREATE POLICY "own clients update" ON public.clients
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own loans update" ON public.loans;
CREATE POLICY "own loans update" ON public.loans
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);