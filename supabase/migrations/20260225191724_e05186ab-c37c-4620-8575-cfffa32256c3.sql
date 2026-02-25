
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', ''));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Filiais
CREATE TABLE public.filiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cidade TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'SP',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.filiais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read filiais" ON public.filiais FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert filiais" ON public.filiais FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update filiais" ON public.filiais FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete filiais" ON public.filiais FOR DELETE TO authenticated USING (true);

-- Motoristas
CREATE TABLE public.motoristas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  filial_id UUID REFERENCES public.filiais(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.motoristas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read motoristas" ON public.motoristas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert motoristas" ON public.motoristas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update motoristas" ON public.motoristas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete motoristas" ON public.motoristas FOR DELETE TO authenticated USING (true);

-- Servicos
CREATE TABLE public.servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'preventiva' CHECK (tipo IN ('preventiva', 'corretiva')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read servicos" ON public.servicos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert servicos" ON public.servicos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete servicos" ON public.servicos FOR DELETE TO authenticated USING (true);

-- Frota Status Atual (Veículos)
CREATE TABLE public.frota_status_atual (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placa TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL DEFAULT '',
  filial_id UUID REFERENCES public.filiais(id) ON DELETE SET NULL,
  motorista_id UUID REFERENCES public.motoristas(id) ON DELETE SET NULL,
  km_atual INTEGER NOT NULL DEFAULT 0,
  km_proxima_preventiva INTEGER NOT NULL DEFAULT 30000,
  intervalo_preventiva INTEGER NOT NULL DEFAULT 30000,
  status TEXT NOT NULL DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'em_ocorrencia', 'finalizada')),
  manutencao_ativa_id UUID,
  data_parada TIMESTAMPTZ,
  previsao_retorno TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.frota_status_atual ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read frota" ON public.frota_status_atual FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert frota" ON public.frota_status_atual FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update frota" ON public.frota_status_atual FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete frota" ON public.frota_status_atual FOR DELETE TO authenticated USING (true);

-- Manutencoes (Histórico)
CREATE TABLE public.manutencoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id UUID NOT NULL REFERENCES public.frota_status_atual(id) ON DELETE CASCADE,
  tipo_manutencao TEXT NOT NULL DEFAULT 'corretiva' CHECK (tipo_manutencao IN ('preventiva', 'corretiva')),
  grupo_servicos TEXT[] NOT NULL DEFAULT '{}',
  km_registrado INTEGER NOT NULL DEFAULT 0,
  solicitante TEXT NOT NULL DEFAULT '',
  fornecedores TEXT NOT NULL DEFAULT '',
  data_inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_fim TIMESTAMPTZ,
  tempo_parado_horas NUMERIC,
  observacoes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'finalizada')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.manutencoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read manutencoes" ON public.manutencoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert manutencoes" ON public.manutencoes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update manutencoes" ON public.manutencoes FOR UPDATE TO authenticated USING (true);
