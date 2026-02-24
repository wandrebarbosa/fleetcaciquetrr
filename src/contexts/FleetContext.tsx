import React, { createContext, useContext, useState, useCallback } from 'react';
import { Filial, Motorista, Servico, Veiculo, Manutencao, TipoManutencao } from '@/types/fleet';
import { filiais as mockFiliais, motoristas as mockMotoristas, servicos as mockServicos, veiculos as mockVeiculos, manutencoes as mockManutencoes } from '@/data/mockData';

interface FleetContextType {
  veiculos: Veiculo[];
  manutencoes: Manutencao[];
  filiais: Filial[];
  motoristas: Motorista[];
  servicos: Servico[];
  addVeiculo: (v: Omit<Veiculo, 'id' | 'updatedAt'>) => void;
  updateVeiculo: (id: string, v: Partial<Veiculo>) => void;
  deleteVeiculo: (id: string) => void;
  addManutencao: (m: Omit<Manutencao, 'id' | 'createdAt'>) => void;
  finalizarManutencao: (id: string) => void;
  addFilial: (f: Omit<Filial, 'id'>) => void;
  updateFilial: (id: string, f: Partial<Filial>) => void;
  deleteFilial: (id: string) => void;
  addMotorista: (m: Omit<Motorista, 'id'>) => void;
  updateMotorista: (id: string, m: Partial<Motorista>) => void;
  deleteMotorista: (id: string) => void;
  addServico: (s: Omit<Servico, 'id'>) => void;
  deleteServico: (id: string) => void;
}

const FleetContext = createContext<FleetContextType | null>(null);

let idCounter = 100;
const genId = (prefix: string) => `${prefix}${++idCounter}`;

export const FleetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [veiculos, setVeiculos] = useState<Veiculo[]>(mockVeiculos);
  const [manutencoes, setManutencoes] = useState<Manutencao[]>(mockManutencoes);
  const [filiais, setFiliais] = useState<Filial[]>(mockFiliais);
  const [motoristas, setMotoristas] = useState<Motorista[]>(mockMotoristas);
  const [servicos, setServicos] = useState<Servico[]>(mockServicos);

  const addVeiculo = useCallback((v: Omit<Veiculo, 'id' | 'updatedAt'>) => {
    setVeiculos(prev => [...prev, { ...v, id: genId('v'), updatedAt: new Date().toISOString() }]);
  }, []);

  const updateVeiculo = useCallback((id: string, updates: Partial<Veiculo>) => {
    setVeiculos(prev => prev.map(v => v.id === id ? { ...v, ...updates, updatedAt: new Date().toISOString() } : v));
  }, []);

  const deleteVeiculo = useCallback((id: string) => {
    setVeiculos(prev => prev.filter(v => v.id !== id));
  }, []);

  const addManutencao = useCallback((m: Omit<Manutencao, 'id' | 'createdAt'>) => {
    const id = genId('man');
    const now = new Date().toISOString();
    setManutencoes(prev => [...prev, { ...m, id, createdAt: now }]);
    // Update vehicle status
    setVeiculos(prev => prev.map(v => v.id === m.veiculoId ? {
      ...v,
      status: 'em_ocorrencia' as const,
      manutencaoAtivaId: id,
      kmAtual: m.kmRegistrado,
      dataParada: m.dataInicio,
      previsaoRetorno: undefined,
      updatedAt: now,
    } : v));
  }, []);

  const finalizarManutencao = useCallback((id: string) => {
    const now = new Date();
    setManutencoes(prev => prev.map(m => {
      if (m.id !== id) return m;
      const inicio = new Date(m.dataInicio);
      const horas = Math.round((now.getTime() - inicio.getTime()) / (1000 * 60 * 60) * 10) / 10;
      return { ...m, status: 'finalizada' as const, dataFim: now.toISOString(), tempoParadoHoras: horas };
    }));
    // Find the maintenance to get vehicle id
    setManutencoes(prev => {
      const man = prev.find(m => m.id === id);
      if (man) {
        setVeiculos(vPrev => vPrev.map(v => {
          if (v.id !== man.veiculoId) return v;
          const nextKm = man.tipoManutencao === 'preventiva'
            ? v.kmAtual + v.intervaloPreventiva
            : v.kmProximaPreventiva;
          return {
            ...v,
            status: 'disponivel' as const,
            manutencaoAtivaId: undefined,
            dataParada: undefined,
            previsaoRetorno: undefined,
            kmProximaPreventiva: nextKm,
            updatedAt: now.toISOString(),
          };
        }));
      }
      return prev;
    });
  }, []);

  const addFilial = useCallback((f: Omit<Filial, 'id'>) => {
    setFiliais(prev => [...prev, { ...f, id: genId('f') }]);
  }, []);

  const updateFilial = useCallback((id: string, updates: Partial<Filial>) => {
    setFiliais(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  }, []);

  const deleteFilial = useCallback((id: string) => {
    setFiliais(prev => prev.filter(f => f.id !== id));
  }, []);

  const addMotorista = useCallback((m: Omit<Motorista, 'id'>) => {
    setMotoristas(prev => [...prev, { ...m, id: genId('m') }]);
  }, []);

  const updateMotorista = useCallback((id: string, updates: Partial<Motorista>) => {
    setMotoristas(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  }, []);

  const deleteMotorista = useCallback((id: string) => {
    setMotoristas(prev => prev.filter(m => m.id !== id));
  }, []);

  const addServico = useCallback((s: Omit<Servico, 'id'>) => {
    setServicos(prev => [...prev, { ...s, id: genId('s') }]);
  }, []);

  const deleteServico = useCallback((id: string) => {
    setServicos(prev => prev.filter(s => s.id !== id));
  }, []);

  return (
    <FleetContext.Provider value={{
      veiculos, manutencoes, filiais, motoristas, servicos,
      addVeiculo, updateVeiculo, deleteVeiculo,
      addManutencao, finalizarManutencao,
      addFilial, updateFilial, deleteFilial,
      addMotorista, updateMotorista, deleteMotorista,
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
