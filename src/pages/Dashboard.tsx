import React, { useState, useMemo } from 'react';
import { useFleet } from '@/contexts/FleetContext';
import AppLayout from '@/components/AppLayout';
import KpiCard from '@/components/KpiCard';
import StatusBadge from '@/components/StatusBadge';
import MaintenanceModal from '@/components/MaintenanceModal';
import { Veiculo } from '@/types/fleet';
import { Truck, AlertTriangle, CheckCircle, Clock, Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

const PREVENTIVA_THRESHOLD = 5000;

const Dashboard: React.FC = () => {
  const { veiculos, manutencoes, filiais, finalizarManutencao } = useFleet();
  const [searchPlaca, setSearchPlaca] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterFilial, setFilterFilial] = useState<string>('todas');
  const [modalVeiculo, setModalVeiculo] = useState<Veiculo | null>(null);

  const stats = useMemo(() => {
    const total = veiculos.length;
    const emManutencao = veiculos.filter(v => v.status === 'em_ocorrencia').length;
    const disponiveis = total - emManutencao;
    const disponibilidade = total > 0 ? Math.round((disponiveis / total) * 100) : 0;
    const preventivaVencida = veiculos.filter(v => v.status !== 'em_ocorrencia' && v.kmAtual >= v.kmProximaPreventiva).length;
    const proximaPreventiva = veiculos.filter(v => {
      const diff = v.kmProximaPreventiva - v.kmAtual;
      return v.status !== 'em_ocorrencia' && diff > 0 && diff <= PREVENTIVA_THRESHOLD;
    }).length;
    return { total, emManutencao, disponibilidade, preventivaVencida, proximaPreventiva };
  }, [veiculos]);

  const filteredVeiculos = useMemo(() => {
    return veiculos.filter(v => {
      if (searchPlaca && !v.placa.toLowerCase().includes(searchPlaca.toLowerCase())) return false;
      if (filterStatus !== 'todos' && v.status !== filterStatus) return false;
      if (filterFilial !== 'todas' && v.filialId !== filterFilial) return false;
      return true;
    });
  }, [veiculos, searchPlaca, filterStatus, filterFilial]);

  const getFilialNome = (id: string) => filiais.find(f => f.id === id)?.nome ?? id;

  const getManutencaoAtiva = (id?: string) => {
    if (!id) return null;
    return manutencoes.find(m => m.id === id);
  };

  const getDiff = (v: Veiculo) => v.kmProximaPreventiva - v.kmAtual;
  const isProxima = (v: Veiculo) => { const d = getDiff(v); return v.status !== 'em_ocorrencia' && d > 0 && d <= PREVENTIVA_THRESHOLD; };
  const isVencida = (v: Veiculo) => v.status !== 'em_ocorrencia' && v.kmAtual >= v.kmProximaPreventiva;

  const handleFinalizar = (veiculoId: string) => {
    const man = manutencoes.find(m => m.veiculoId === veiculoId && m.status === 'aberta');
    if (man) {
      finalizarManutencao(man.id);
      toast.success('Manutenção finalizada com sucesso');
    }
  };

  const formatDate = (d?: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard da Frota</h1>
          <p className="text-sm text-muted-foreground mt-1">Visão geral e controle de manutenções</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard title="Total de Veículos" value={stats.total} icon={Truck} variant="primary" />
          <KpiCard title="Em Manutenção" value={stats.emManutencao} icon={Clock} variant="destructive" subtitle="Ocorrências abertas" />
          <KpiCard title="Disponibilidade" value={`${stats.disponibilidade}%`} icon={CheckCircle} variant="success" />
          <KpiCard title="Preventiva Vencida" value={stats.preventivaVencida} icon={AlertTriangle} variant="destructive" subtitle="KM ultrapassado" />
          <KpiCard title="Próx. Preventiva" value={stats.proximaPreventiva} icon={Gauge} variant="warning" subtitle="< 5.000 km" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Buscar por placa..."
            value={searchPlaca}
            onChange={e => setSearchPlaca(e.target.value)}
            className="w-48"
          />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="disponivel">Disponível</SelectItem>
              <SelectItem value="em_ocorrencia">Em Ocorrência</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterFilial} onValueChange={setFilterFilial}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Filial" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as Filiais</SelectItem>
              {filiais.map(f => (
                <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => { setSearchPlaca(''); setFilterStatus('todos'); setFilterFilial('todas'); }}>
            Limpar Filtros
          </Button>
        </div>

        {/* Fleet Table */}
        <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Placa</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead className="text-right">KM Atual</TableHead>
                <TableHead className="text-right">Próx. Preventiva</TableHead>
                <TableHead className="text-right">Diferença</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Manutenção</TableHead>
                <TableHead>Data Parada</TableHead>
                <TableHead>Prev. Retorno</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVeiculos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                    Nenhum veículo encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredVeiculos.map(v => {
                  const man = getManutencaoAtiva(v.manutencaoAtivaId);
                  const diff = getDiff(v);
                  return (
                    <TableRow key={v.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono font-semibold">{v.placa}</TableCell>
                      <TableCell>{v.tipo}</TableCell>
                      <TableCell className="text-sm">{getFilialNome(v.filialId)}</TableCell>
                      <TableCell className="text-right font-mono">{v.kmAtual.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-right font-mono">{v.kmProximaPreventiva.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className={`text-right font-mono font-semibold ${diff <= 0 ? 'text-destructive' : diff <= PREVENTIVA_THRESHOLD ? 'text-warning' : ''}`}>
                        {diff.toLocaleString('pt-BR')} km
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={v.status}
                          proximaPreventiva={isProxima(v)}
                          preventivaVencida={isVencida(v)}
                        />
                      </TableCell>
                      <TableCell className="text-sm">
                        {man ? (
                          <span className="capitalize">{man.tipoManutencao}</span>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(v.dataParada)}</TableCell>
                      <TableCell className="text-sm">{formatDate(v.previsaoRetorno)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {v.status === 'disponivel' ? (
                            <Button size="sm" onClick={() => setModalVeiculo(v)}>
                              + Serviço
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => handleFinalizar(v.id)}>
                              Finalizar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <MaintenanceModal
        veiculo={modalVeiculo}
        open={!!modalVeiculo}
        onClose={() => setModalVeiculo(null)}
      />
    </AppLayout>
  );
};

export default Dashboard;
