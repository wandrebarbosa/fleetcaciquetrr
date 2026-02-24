import { Filial, Motorista, Servico, Veiculo, Manutencao } from '@/types/fleet';

export const filiais: Filial[] = [
  { id: 'f1', nome: 'Matriz São Paulo', cidade: 'São Paulo', estado: 'SP' },
  { id: 'f2', nome: 'Filial Campinas', cidade: 'Campinas', estado: 'SP' },
  { id: 'f3', nome: 'Filial Curitiba', cidade: 'Curitiba', estado: 'PR' },
  { id: 'f4', nome: 'Filial Belo Horizonte', cidade: 'Belo Horizonte', estado: 'MG' },
];

export const motoristas: Motorista[] = [
  { id: 'm1', nome: 'Carlos Silva', cpf: '123.456.789-00', telefone: '(11) 99999-0001', filialId: 'f1', veiculoId: 'v1' },
  { id: 'm2', nome: 'João Souza', cpf: '234.567.890-11', telefone: '(11) 99999-0002', filialId: 'f1', veiculoId: 'v2' },
  { id: 'm3', nome: 'Pedro Santos', cpf: '345.678.901-22', telefone: '(19) 99999-0003', filialId: 'f2', veiculoId: 'v3' },
  { id: 'm4', nome: 'Lucas Oliveira', cpf: '456.789.012-33', telefone: '(41) 99999-0004', filialId: 'f3', veiculoId: 'v4' },
  { id: 'm5', nome: 'Marcos Lima', cpf: '567.890.123-44', telefone: '(31) 99999-0005', filialId: 'f4', veiculoId: 'v5' },
  { id: 'm6', nome: 'André Costa', cpf: '678.901.234-55', telefone: '(11) 99999-0006', filialId: 'f1' },
];

export const servicos: Servico[] = [
  { id: 's1', nome: 'Troca de óleo', tipo: 'preventiva' },
  { id: 's2', nome: 'Alinhamento', tipo: 'preventiva' },
  { id: 's3', nome: 'Balanceamento', tipo: 'preventiva' },
  { id: 's4', nome: 'Revisão de freios', tipo: 'preventiva' },
  { id: 's5', nome: 'Troca de filtros', tipo: 'preventiva' },
  { id: 's6', nome: 'Revisão geral', tipo: 'preventiva' },
  { id: 's7', nome: 'Reparo de embreagem', tipo: 'corretiva' },
  { id: 's8', nome: 'Reparo elétrico', tipo: 'corretiva' },
  { id: 's9', nome: 'Troca de pneus', tipo: 'corretiva' },
  { id: 's10', nome: 'Reparo de suspensão', tipo: 'corretiva' },
];

export const veiculos: Veiculo[] = [
  { id: 'v1', placa: 'ABC-1D23', tipo: 'Carreta', filialId: 'f1', motoristaId: 'm1', kmAtual: 125000, kmProximaPreventiva: 130000, intervaloPreventiva: 30000, status: 'disponivel', updatedAt: '2026-02-24T10:00:00' },
  { id: 'v2', placa: 'DEF-4G56', tipo: 'Bitruck', filialId: 'f1', motoristaId: 'm2', kmAtual: 87000, kmProximaPreventiva: 90000, intervaloPreventiva: 30000, status: 'disponivel', updatedAt: '2026-02-24T08:00:00' },
  { id: 'v3', placa: 'GHI-7H89', tipo: 'Toco', filialId: 'f2', motoristaId: 'm3', kmAtual: 45000, kmProximaPreventiva: 60000, intervaloPreventiva: 30000, status: 'disponivel', updatedAt: '2026-02-24T09:00:00' },
  { id: 'v4', placa: 'JKL-0I12', tipo: '3/4', filialId: 'f3', motoristaId: 'm4', kmAtual: 210000, kmProximaPreventiva: 210000, intervaloPreventiva: 25000, status: 'em_ocorrencia', manutencaoAtivaId: 'man1', dataParada: '2026-02-22T14:00:00', previsaoRetorno: '2026-02-25T18:00:00', updatedAt: '2026-02-22T14:00:00' },
  { id: 'v5', placa: 'MNO-3J45', tipo: 'Carreta', filialId: 'f4', motoristaId: 'm5', kmAtual: 320000, kmProximaPreventiva: 325000, intervaloPreventiva: 30000, status: 'disponivel', updatedAt: '2026-02-23T16:00:00' },
  { id: 'v6', placa: 'PQR-6K78', tipo: 'Bitruck', filialId: 'f2', kmAtual: 155000, kmProximaPreventiva: 150000, intervaloPreventiva: 30000, status: 'disponivel', updatedAt: '2026-02-24T07:00:00' },
  { id: 'v7', placa: 'STU-9L01', tipo: 'Toco', filialId: 'f3', kmAtual: 72000, kmProximaPreventiva: 90000, intervaloPreventiva: 30000, status: 'disponivel', updatedAt: '2026-02-24T11:00:00' },
  { id: 'v8', placa: 'VWX-2M34', tipo: 'Carreta', filialId: 'f1', kmAtual: 198000, kmProximaPreventiva: 200000, intervaloPreventiva: 30000, status: 'em_ocorrencia', manutencaoAtivaId: 'man2', dataParada: '2026-02-23T09:00:00', previsaoRetorno: '2026-02-26T12:00:00', updatedAt: '2026-02-23T09:00:00' },
];

export const manutencoes: Manutencao[] = [
  { id: 'man1', veiculoId: 'v4', tipoManutencao: 'corretiva', grupoServicos: ['Reparo de embreagem', 'Reparo elétrico'], kmRegistrado: 210000, solicitante: 'Lucas Oliveira', fornecedores: 'Mecânica Central, AutoPeças Express', dataInicio: '2026-02-22T14:00:00', observacoes: 'Embreagem patinando, falha no alternador', status: 'aberta', createdAt: '2026-02-22T14:00:00' },
  { id: 'man2', veiculoId: 'v8', tipoManutencao: 'preventiva', grupoServicos: ['Troca de óleo', 'Troca de filtros', 'Revisão de freios'], kmRegistrado: 198000, solicitante: 'Gerente Frota', fornecedores: 'Concessionária Volvo', dataInicio: '2026-02-23T09:00:00', observacoes: 'Revisão preventiva de 200.000 km', status: 'aberta', createdAt: '2026-02-23T09:00:00' },
  { id: 'man3', veiculoId: 'v1', tipoManutencao: 'preventiva', grupoServicos: ['Troca de óleo', 'Alinhamento', 'Balanceamento'], kmRegistrado: 100000, solicitante: 'Carlos Silva', fornecedores: 'Auto Center SP', dataInicio: '2026-01-10T08:00:00', dataFim: '2026-01-11T17:00:00', tempoParadoHoras: 33, observacoes: 'Preventiva 100k km', status: 'finalizada', createdAt: '2026-01-10T08:00:00' },
];
