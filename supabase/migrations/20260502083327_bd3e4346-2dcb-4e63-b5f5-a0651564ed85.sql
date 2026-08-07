CREATE TABLE public.custom_scripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  placement TEXT NOT NULL CHECK (placement IN ('head', 'body')),
  content TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Custom scripts are publicly readable"
ON public.custom_scripts FOR SELECT USING (enabled = true);

CREATE POLICY "Admins can view all custom scripts"
ON public.custom_scripts FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert custom scripts"
ON public.custom_scripts FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update custom scripts"
ON public.custom_scripts FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete custom scripts"
ON public.custom_scripts FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_custom_scripts_updated_at
BEFORE UPDATE ON public.custom_scripts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_custom_scripts_placement ON public.custom_scripts(placement, position) WHERE enabled = true;