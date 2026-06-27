-- Harden RLS on loan_installments to also require that the parent loan
-- belongs to the same authenticated user. Prevents inserting/updating
-- installments against another user's loan even when user_id matches.

DROP POLICY IF EXISTS "own installments insert" ON public.loan_installments;
DROP POLICY IF EXISTS "own installments update" ON public.loan_installments;
DROP POLICY IF EXISTS "own installments select" ON public.loan_installments;
DROP POLICY IF EXISTS "own installments delete" ON public.loan_installments;

CREATE POLICY "own installments select" ON public.loan_installments
  FOR SELECT USING (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.loans l WHERE l.id = loan_id AND l.user_id = auth.uid())
  );

CREATE POLICY "own installments insert" ON public.loan_installments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.loans l WHERE l.id = loan_id AND l.user_id = auth.uid())
  );

CREATE POLICY "own installments update" ON public.loan_installments
  FOR UPDATE USING (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.loans l WHERE l.id = loan_id AND l.user_id = auth.uid())
  ) WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.loans l WHERE l.id = loan_id AND l.user_id = auth.uid())
  );

CREATE POLICY "own installments delete" ON public.loan_installments
  FOR DELETE USING (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.loans l WHERE l.id = loan_id AND l.user_id = auth.uid())
  );