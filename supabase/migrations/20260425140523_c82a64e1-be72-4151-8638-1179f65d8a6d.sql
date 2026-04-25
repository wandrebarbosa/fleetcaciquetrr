ALTER TABLE public.frota_status_atual ADD COLUMN IF NOT EXISTS codigo text NOT NULL DEFAULT '';
ALTER TABLE public.filiais ADD COLUMN IF NOT EXISTS codigo text NOT NULL DEFAULT '';
ALTER TABLE public.motoristas ADD COLUMN IF NOT EXISTS codigo text NOT NULL DEFAULT '';
ALTER TABLE public.servicos ADD COLUMN IF NOT EXISTS codigo text NOT NULL DEFAULT '';