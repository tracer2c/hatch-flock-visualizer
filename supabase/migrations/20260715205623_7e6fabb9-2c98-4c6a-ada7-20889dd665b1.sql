
CREATE TABLE public.user_dashboard_layouts (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  layout JSONB NOT NULL DEFAULT '{}'::jsonb,
  widgets JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_dashboard_layouts TO authenticated;
GRANT ALL ON public.user_dashboard_layouts TO service_role;

ALTER TABLE public.user_dashboard_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own dashboard layout"
  ON public.user_dashboard_layouts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
