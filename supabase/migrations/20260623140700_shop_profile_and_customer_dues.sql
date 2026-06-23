-- Shop Profile: one row per shop (MVP: single-tenant, no auth)
CREATE TABLE public.shop_profile (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_name TEXT NOT NULL,
  shop_name TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  business_category TEXT NOT NULL DEFAULT 'Kirana Store',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_profile TO anon, authenticated;
GRANT ALL ON public.shop_profile TO service_role;
ALTER TABLE public.shop_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can manage shop_profile (MVP)" ON public.shop_profile FOR ALL USING (true) WITH CHECK (true);

-- Customer Dues (KhataBook)
CREATE TABLE public.customer_dues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  due_date TIMESTAMPTZ,
  paid_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_dues TO anon, authenticated;
GRANT ALL ON public.customer_dues TO service_role;
ALTER TABLE public.customer_dues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can manage customer_dues (MVP)" ON public.customer_dues FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_customer_dues_status ON public.customer_dues(status);
CREATE INDEX idx_customer_dues_created ON public.customer_dues(created_at DESC);
