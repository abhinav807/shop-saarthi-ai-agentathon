
CREATE TABLE public.shop_profile (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_name TEXT NOT NULL,
  shop_name TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  business_category TEXT NOT NULL DEFAULT 'Other',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_profile TO anon, authenticated;
GRANT ALL ON public.shop_profile TO service_role;
ALTER TABLE public.shop_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shop_profile open access" ON public.shop_profile FOR ALL USING (true) WITH CHECK (true);

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
CREATE POLICY "customer_dues open access" ON public.customer_dues FOR ALL USING (true) WITH CHECK (true);
