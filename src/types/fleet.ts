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
  filialId: string;
  veiculoId?: string;
}

export interface Servico {
  id: string;
  nome: string;
  tipo: 'preventiva' | 'corretiva';
}

export type StatusVeiculo = 'disponivel' | 'em_ocorrencia' | 'finalizada';
export type TipoManutencao = 'preventiva' | 'corretiva';
export type StatusManutencao = 'aberta' | 'finalizada';

export interface Veiculo {
  id: string;
  placa: string;
  tipo: string;
  filialId: string;
  motoristaId?: string;
  kmAtual: number;
  kmProximaPreventiva: number;
  intervaloPreventiva: number;
  status: StatusVeiculo;
  manutencaoAtivaId?: string;
  dataParada?: string;
  previsaoRetorno?: string;
  updatedAt: string;
}

export interface Manutencao {
  id: string;
  veiculoId: string;
  tipoManutencao: TipoManutencao;
  grupoServicos: string[];
  kmRegistrado: number;
  solicitante: string;
  fornecedores: string;
  dataInicio: string;
  dataFim?: string;
  tempoParadoHoras?: number;
  observacoes: string;
  status: StatusManutencao;
  createdAt: string;
}
