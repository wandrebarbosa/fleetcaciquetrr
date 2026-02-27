import React, { useState, useMemo } from 'react';
import { useFleet, Veiculo } from '@/contexts/FleetContext';
import { formatPlaca } from '@/lib/formatPlaca';
import AppLayout from '@/components/AppLayout';
import KpiCard from '@/components/KpiCard';
import StatusBadge from '@/components/StatusBadge';
import MaintenanceModal from '@/components/MaintenanceModal';
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
    const preventivaVencida = veiculos.filter(v => v.status !== 'em_ocorrencia' && v.km_atual >= v.km_proxima_preventiva).length;
    const proximaPreventiva = veiculos.filter(v => {
      const diff = v.km_proxima_preventiva - v.km_atual;
      return v.status !== 'em_ocorrencia' && diff > 0 && diff <= PREVENTIVA_THRESHOLD;
    }).length;
    return { total, emManutencao, disponibilidade, preventivaVencida, proximaPreventiva };
  }, [veiculos]);

  const filteredVeiculos = useMemo(() => {
    return veiculos.filter(v => {
      if (searchPlaca && !v.placa.toLowerCase().includes(searchPlaca.toLowerCase())) return false;
      if (filterStatus !== 'todos' && v.status !== filterStatus) return false;
      if (filterFilial !== 'todas' && v.filial_id !== filterFilial) return false;
      return true;
    });
  }, [veiculos, searchPlaca, filterStatus, filterFilial]);

  const getFilialNome = (id: string | null) => filiais.find(f => f.id === id)?.nome ?? '—';

  const getManutencaoAtiva = (id?: string | null) => {
    if (!id) return null;
    return manutencoes.find(m => m.id === id);
  };

  const getDiff = (v: Veiculo) => v.km_proxima_preventiva - v.km_atual;
  const isProxima = (v: Veiculo) => { const d = getDiff(v); return v.status !== 'em_ocorrencia' && d > 0 && d <= PREVENTIVA_THRESHOLD; };
  const isVencida = (v: Veiculo) => v.status !== 'em_ocorrencia' && v.km_atual >= v.km_proxima_preventiva;

  const handleFinalizar = (veiculoId: string) => {
    const man = manutencoes.find(m => m.veiculo_id === veiculoId && m.status === 'aberta');
    if (man) {
      finalizarManutencao(man.id);
      toast.success('Manutenção finalizada com sucesso');
    }
  };

  const formatDate = (d?: string | null) => {
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard title="Total de Veículos" value={stats.total} icon={Truck} variant="primary" />
          <KpiCard title="Em Manutenção" value={stats.emManutencao} icon={Clock} variant="destructive" subtitle="Ocorrências abertas" />
          <KpiCard title="Disponibilidade" value={`${stats.disponibilidade}%`} icon={CheckCircle} variant="success" />
          <KpiCard title="Preventiva Vencida" value={stats.preventivaVencida} icon={AlertTriangle} variant="destructive" subtitle="KM ultrapassado" />
          <KpiCard title="Próx. Preventiva" value={stats.proximaPreventiva} icon={Gauge} variant="warning" subtitle="< 5.000 km" />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Input placeholder="Buscar por placa..." value={searchPlaca} onChange={e => setSearchPlaca(e.target.value)} className="w-48" />
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
              {filiais.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => { setSearchPlaca(''); setFilterStatus('todos'); setFilterFilial('todas'); }}>Limpar Filtros</Button>
        </div>

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
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Nenhum veículo encontrado</TableCell>
                </TableRow>
              ) : (
                filteredVeiculos.map(v => {
                  const man = getManutencaoAtiva(v.manutencao_ativa_id);
                  const diff = getDiff(v);
                  return (
                    <TableRow key={v.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono font-semibold">{formatPlaca(v.placa)}</TableCell>
                      <TableCell>{v.tipo}</TableCell>
                      <TableCell className="text-sm">{getFilialNome(v.filial_id)}</TableCell>
                      <TableCell className="text-right font-mono">{v.km_atual.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-right font-mono">{v.km_proxima_preventiva.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className={`text-right font-mono font-semibold ${diff <= 0 ? 'text-destructive' : diff <= PREVENTIVA_THRESHOLD ? 'text-warning' : ''}`}>
                        {diff.toLocaleString('pt-BR')} km
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={v.status} proximaPreventiva={isProxima(v)} preventivaVencida={isVencida(v)} />
                      </TableCell>
                      <TableCell className="text-sm">
                        {man ? <span className="capitalize">{man.tipo_manutencao}</span> : '—'}
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(v.data_parada)}</TableCell>
                      <TableCell className="text-sm">{formatDate(v.previsao_retorno)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {v.status === 'disponivel' ? (
                            <Button size="sm" onClick={() => setModalVeiculo(v)}>+ Serviço</Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => handleFinalizar(v.id)}>Finalizar</Button>
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

      <MaintenanceModal veiculo={modalVeiculo} open={!!modalVeiculo} onClose={() => setModalVeiculo(null)} />
    </AppLayout>
  );
};

export default Dashboard;
