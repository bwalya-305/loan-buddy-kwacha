
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  nrc_number TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.loans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  amount_kwacha NUMERIC(12,2) NOT NULL CHECK (amount_kwacha > 0),
  borrowed_date DATE NOT NULL,
  repay_date DATE NOT NULL,
  paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clients_user ON public.clients(user_id);
CREATE INDEX idx_loans_user ON public.loans(user_id);
CREATE INDEX idx_loans_client ON public.loans(client_id);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own clients select" ON public.clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own clients insert" ON public.clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own clients update" ON public.clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own clients delete" ON public.clients FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "own loans select" ON public.loans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own loans insert" ON public.loans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own loans update" ON public.loans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own loans delete" ON public.loans FOR DELETE USING (auth.uid() = user_id);
