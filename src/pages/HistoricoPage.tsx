import React, { useState, useMemo } from 'react';
import { useFleet } from '@/contexts/FleetContext';
import AppLayout from '@/components/AppLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, History, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const HistoricoPage: React.FC = () => {
  const { manutencoes, veiculos } = useFleet();

  const [filterVeiculo, setFilterVeiculo] = useState<string>('todos');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const filtered = useMemo(() => {
    return manutencoes.filter(m => {
      if (filterVeiculo !== 'todos' && m.veiculo_id !== filterVeiculo) return false;
      if (filterTipo !== 'todos' && m.tipo_manutencao !== filterTipo) return false;
      if (filterStatus !== 'todos' && m.status !== filterStatus) return false;
      if (dateFrom) {
        const inicio = new Date(m.data_inicio);
        if (inicio < dateFrom) return false;
      }
      if (dateTo) {
        const inicio = new Date(m.data_inicio);
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        if (inicio > endOfDay) return false;
      }
      return true;
    });
  }, [manutencoes, filterVeiculo, filterTipo, filterStatus, dateFrom, dateTo]);

  const getPlaca = (veiculoId: string) => veiculos.find(v => v.id === veiculoId)?.placa ?? '—';

  const clearFilters = () => {
    setFilterVeiculo('todos');
    setFilterTipo('todos');
    setFilterStatus('todos');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasFilters = filterVeiculo !== 'todos' || filterTipo !== 'todos' || filterStatus !== 'todos' || dateFrom || dateTo;

  const formatDate = (d?: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <History className="w-6 h-6" />
            Histórico de Manutenções
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Registro completo de todas as manutenções realizadas — {filtered.length} registro(s)
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
            <Filter className="w-4 h-4" /> Filtros
          </div>

          <Select value={filterVeiculo} onValueChange={setFilterVeiculo}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Veículo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Veículos</SelectItem>
              {veiculos.map(v => (
                <SelectItem key={v.id} value={v.id}>{v.placa} — {v.tipo}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Tipos</SelectItem>
              <SelectItem value="preventiva">Preventiva</SelectItem>
              <SelectItem value="corretiva">Corretiva</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="aberta">Aberta</SelectItem>
              <SelectItem value="finalizada">Finalizada</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-40 justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, 'dd/MM/yy') : 'Data início'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} locale={ptBR} className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-40 justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, 'dd/MM/yy') : 'Data fim'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={setDateTo} locale={ptBR} className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
              <X className="w-4 h-4 mr-1" /> Limpar
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Placa</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Serviços</TableHead>
                <TableHead className="text-right">KM</TableHead>
                <TableHead>Solicitante</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Fim</TableHead>
                <TableHead className="text-right">Horas Parado</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    Nenhuma manutenção encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(m => (
                  <TableRow key={m.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono font-semibold">{getPlaca(m.veiculo_id)}</TableCell>
                    <TableCell>
                      <Badge variant={m.tipo_manutencao === 'preventiva' ? 'secondary' : 'destructive'} className="capitalize">
                        {m.tipo_manutencao}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">
                      {m.grupo_servicos?.join(', ') || '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono">{m.km_registrado.toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-sm">{m.solicitante || '—'}</TableCell>
                    <TableCell className="text-sm">{m.fornecedores || '—'}</TableCell>
                    <TableCell className="text-sm">{formatDate(m.data_inicio)}</TableCell>
                    <TableCell className="text-sm">{formatDate(m.data_fim)}</TableCell>
                    <TableCell className="text-right font-mono">
                      {m.tempo_parado_horas != null ? `${m.tempo_parado_horas}h` : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.status === 'finalizada' ? 'outline' : 'default'} className="capitalize">
                        {m.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
};

export default HistoricoPage;
