
CREATE TABLE public.inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'units',
  minimum_stock NUMERIC NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'General',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory TO anon, authenticated;
GRANT ALL ON public.inventory TO service_role;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can manage inventory (MVP)" ON public.inventory FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product TEXT NOT NULL,
  quantity_sold NUMERIC NOT NULL DEFAULT 0,
  selling_price NUMERIC NOT NULL DEFAULT 0,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  sale_date TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO anon, authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can manage sales (MVP)" ON public.sales FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.ai_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type TEXT NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_reports TO anon, authenticated;
GRANT ALL ON public.ai_reports TO service_role;
ALTER TABLE public.ai_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can manage ai_reports (MVP)" ON public.ai_reports FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_sales_date ON public.sales(sale_date DESC);
CREATE INDEX idx_inventory_created ON public.inventory(created_at DESC);
CREATE INDEX idx_ai_reports_type_created ON public.ai_reports(report_type, created_at DESC);
