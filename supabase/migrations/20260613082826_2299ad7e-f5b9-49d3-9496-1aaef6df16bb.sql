
CREATE TABLE public.loan_installments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  sequence int NOT NULL,
  due_date date NOT NULL,
  amount_kwacha numeric NOT NULL,
  paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (loan_id, sequence)
);

CREATE INDEX loan_installments_loan_id_idx ON public.loan_installments(loan_id);
CREATE INDEX loan_installments_user_id_idx ON public.loan_installments(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.loan_installments TO authenticated;
GRANT ALL ON public.loan_installments TO service_role;

ALTER TABLE public.loan_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own installments select" ON public.loan_installments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own installments insert" ON public.loan_installments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own installments update" ON public.loan_installments
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own installments delete" ON public.loan_installments
  FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.sync_loan_paid_from_installments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loan_id uuid;
  v_total int;
  v_paid int;
BEGIN
  v_loan_id := COALESCE(NEW.loan_id, OLD.loan_id);
  SELECT COUNT(*), COUNT(*) FILTER (WHERE paid)
    INTO v_total, v_paid
    FROM public.loan_installments
   WHERE loan_id = v_loan_id;

  IF v_total > 0 AND v_paid = v_total THEN
    UPDATE public.loans
       SET paid = true, paid_at = COALESCE(paid_at, now())
     WHERE id = v_loan_id AND paid = false;
  ELSE
    UPDATE public.loans
       SET paid = false, paid_at = NULL
     WHERE id = v_loan_id AND paid = true;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER loan_installments_sync_paid
AFTER INSERT OR UPDATE OF paid OR DELETE ON public.loan_installments
FOR EACH ROW EXECUTE FUNCTION public.sync_loan_paid_from_installments();
