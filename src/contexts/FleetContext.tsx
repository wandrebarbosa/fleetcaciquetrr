import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types matching the DB schema
export interface Filial {
  id: string;
  nome: string;
  cidade: string;
  estado: string;
}

export interface Motorista {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  filial_id: string | null;
}

export interface Servico {
  id: string;
  nome: string;
  tipo: 'preventiva' | 'corretiva';
}

export interface Veiculo {
  id: string;
  placa: string;
  tipo: string;
  filial_id: string | null;
  motorista_id: string | null;
  km_atual: number;
  km_proxima_preventiva: number;
  intervalo_preventiva: number;
  status: 'disponivel' | 'em_ocorrencia' | 'finalizada';
  manutencao_ativa_id: string | null;
  data_parada: string | null;
  previsao_retorno: string | null;
  updated_at: string;
}

export interface Manutencao {
  id: string;
  veiculo_id: string;
  tipo_manutencao: 'preventiva' | 'corretiva';
  grupo_servicos: string[];
  km_registrado: number;
  solicitante: string;
  fornecedores: string;
  data_inicio: string;
  data_fim: string | null;
  tempo_parado_horas: number | null;
  observacoes: string;
  status: 'aberta' | 'finalizada';
  created_at: string;
}

interface FleetContextType {
  veiculos: Veiculo[];
  manutencoes: Manutencao[];
  filiais: Filial[];
  motoristas: Motorista[];
  servicos: Servico[];
  loading: boolean;
  refresh: () => Promise<void>;
  addVeiculo: (v: Partial<Veiculo>) => Promise<void>;
  deleteVeiculo: (id: string) => Promise<void>;
  addManutencao: (m: Partial<Manutencao> & { previsao_retorno?: string }) => Promise<void>;
  finalizarManutencao: (id: string) => Promise<void>;
  addFilial: (f: Partial<Filial>) => Promise<void>;
  deleteFilial: (id: string) => Promise<void>;
  addMotorista: (m: Partial<Motorista>) => Promise<void>;
  deleteMotorista: (id: string) => Promise<void>;
  addServico: (s: Partial<Servico>) => Promise<void>;
  deleteServico: (id: string) => Promise<void>;
}

const FleetContext = createContext<FleetContextType | null>(null);

export const FleetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [fRes, mRes, sRes, vRes, manRes] = await Promise.all([
      supabase.from('filiais').select('*'),
      supabase.from('motoristas').select('*'),
      supabase.from('servicos').select('*'),
      supabase.from('frota_status_atual').select('*'),
      supabase.from('manutencoes').select('*').order('created_at', { ascending: false }),
    ]);
    if (fRes.data) setFiliais(fRes.data as Filial[]);
    if (mRes.data) setMotoristas(mRes.data as Motorista[]);
    if (sRes.data) setServicos(sRes.data as Servico[]);
    if (vRes.data) setVeiculos(vRes.data as Veiculo[]);
    if (manRes.data) setManutencoes(manRes.data as Manutencao[]);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const addVeiculo = useCallback(async (v: Partial<Veiculo>) => {
    const { error } = await supabase.from('frota_status_atual').insert({
      placa: v.placa!,
      tipo: v.tipo || '',
      filial_id: v.filial_id || null,
      motorista_id: v.motorista_id || null,
      km_atual: v.km_atual || 0,
      km_proxima_preventiva: v.km_proxima_preventiva || 30000,
      intervalo_preventiva: v.intervalo_preventiva || 30000,
      status: 'disponivel',
    });
    if (error) { toast.error(error.message); return; }
    await refresh();
  }, [refresh]);

  const deleteVeiculo = useCallback(async (id: string) => {
    const { error } = await supabase.from('frota_status_atual').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    await refresh();
  }, [refresh]);

  const addManutencao = useCallback(async (m: Partial<Manutencao> & { previsao_retorno?: string }) => {
    // Insert maintenance record
    const { data, error } = await supabase.from('manutencoes').insert({
      veiculo_id: m.veiculo_id!,
      tipo_manutencao: m.tipo_manutencao || 'corretiva',
      grupo_servicos: m.grupo_servicos || [],
      km_registrado: m.km_registrado || 0,
      solicitante: m.solicitante || '',
      fornecedores: m.fornecedores || '',
      data_inicio: m.data_inicio || new Date().toISOString(),
      observacoes: m.observacoes || '',
      status: 'aberta',
    }).select().single();
    if (error) { toast.error(error.message); return; }

    // Update vehicle status
    await supabase.from('frota_status_atual').update({
      status: 'em_ocorrencia',
      manutencao_ativa_id: data.id,
      km_atual: m.km_registrado || 0,
      data_parada: m.data_inicio || new Date().toISOString(),
      previsao_retorno: m.previsao_retorno || null,
      updated_at: new Date().toISOString(),
    }).eq('id', m.veiculo_id!);

    await refresh();
  }, [refresh]);

  const finalizarManutencao = useCallback(async (id: string) => {
    const man = manutencoes.find(m => m.id === id);
    if (!man) return;
    const now = new Date();
    const inicio = new Date(man.data_inicio);
    const horas = Math.round((now.getTime() - inicio.getTime()) / (1000 * 60 * 60) * 10) / 10;

    await supabase.from('manutencoes').update({
      status: 'finalizada',
      data_fim: now.toISOString(),
      tempo_parado_horas: horas,
    }).eq('id', id);

    // Get vehicle to calculate next preventive
    const veiculo = veiculos.find(v => v.id === man.veiculo_id);
    const nextKm = man.tipo_manutencao === 'preventiva' && veiculo
      ? veiculo.km_atual + veiculo.intervalo_preventiva
      : veiculo?.km_proxima_preventiva || 0;

    await supabase.from('frota_status_atual').update({
      status: 'disponivel',
      manutencao_ativa_id: null,
      data_parada: null,
      previsao_retorno: null,
      km_proxima_preventiva: nextKm,
      updated_at: now.toISOString(),
    }).eq('id', man.veiculo_id);

    await refresh();
  }, [refresh, manutencoes, veiculos]);

  const addFilial = useCallback(async (f: Partial<Filial>) => {
    const { error } = await supabase.from('filiais').insert({ nome: f.nome!, cidade: f.cidade || '', estado: f.estado || 'SP' });
    if (error) { toast.error(error.message); return; }
    await refresh();
  }, [refresh]);

  const deleteFilial = useCallback(async (id: string) => {
    const { error } = await supabase.from('filiais').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    await refresh();
  }, [refresh]);

  const addMotorista = useCallback(async (m: Partial<Motorista>) => {
    const { error } = await supabase.from('motoristas').insert({ nome: m.nome!, cpf: m.cpf || '', telefone: m.telefone || '', filial_id: m.filial_id || null });
    if (error) { toast.error(error.message); return; }
    await refresh();
  }, [refresh]);

  const deleteMotorista = useCallback(async (id: string) => {
    const { error } = await supabase.from('motoristas').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    await refresh();
  }, [refresh]);

  const addServico = useCallback(async (s: Partial<Servico>) => {
    const { error } = await supabase.from('servicos').insert({ nome: s.nome!, tipo: s.tipo || 'preventiva' });
    if (error) { toast.error(error.message); return; }
    await refresh();
  }, [refresh]);

  const deleteServico = useCallback(async (id: string) => {
    const { error } = await supabase.from('servicos').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    await refresh();
  }, [refresh]);

  return (
    <FleetContext.Provider value={{
      veiculos, manutencoes, filiais, motoristas, servicos, loading, refresh,
      addVeiculo, deleteVeiculo,
      addManutencao, finalizarManutencao,
      addFilial, deleteFilial,
      addMotorista, deleteMotorista,
      addServico, deleteServico,
    }}>
      {children}
    </FleetContext.Provider>
  );
};

export const useFleet = () => {
  const ctx = useContext(FleetContext);
  if (!ctx) throw new Error('useFleet must be used within FleetProvider');
  return ctx;
};
