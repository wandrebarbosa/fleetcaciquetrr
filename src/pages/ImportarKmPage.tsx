import React, { useState, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Upload, FileSpreadsheet, Check, AlertTriangle, X, RefreshCw, Satellite, ExternalLink } from 'lucide-react';
import { useFleet } from '@/contexts/FleetContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatPlaca } from '@/lib/formatPlaca';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CsvRow {
  placa: string;
  km: number;
  data: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
}

interface AutotracRow {
  vehicleName: string;
  vehicleCode: number;
  hodometerEnd: number | null;
  placa: string;
  status: 'pending' | 'success' | 'error' | 'skipped';
  message?: string;
}

interface AutotracMatchedVehicle {
  vehicleName: string;
  vehicleCode: number;
  placa: string;
}

const AUTOTRAC_FIRST_PASS_BATCH_SIZE = 5;
const AUTOTRAC_FIRST_PASS_TIMEOUT_MS = 12000;
const AUTOTRAC_RETRY_BATCH_SIZE = 1;
const AUTOTRAC_RETRY_TIMEOUT_MS = 25000;
const AUTOTRAC_MAX_RETRIES = 2;

const parseCSV = (text: string): CsvRow[] => {
  const lines = text.trim().split(/\r?\n/);
  const start = lines[0]?.toLowerCase().includes('placa') ? 1 : 0;
  const rows: CsvRow[] = [];

  for (let i = start; i < lines.length; i++) {
    const cols = lines[i].split(/[;,]/).map(c => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 2) continue;

    const placa = cols[0].replace(/[-\s]/g, '').toUpperCase();
    const km = parseInt(cols[1], 10);
    const data = cols[2] || new Date().toISOString().slice(0, 10);

    if (!placa || isNaN(km)) {
      rows.push({ placa: cols[0], km: 0, data, status: 'error', message: 'Dados inválidos' });
      continue;
    }

    rows.push({ placa, km, data, status: 'pending' });
  }

  return rows;
};

const chunkArray = <T,>(items: T[], size: number) => {
  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
};

const ImportarKmPage: React.FC = () => {
  const { veiculos, refresh } = useFleet();
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [autotracRows, setAutotracRows] = useState<AutotracRow[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0, phase: '' });
  const [importingAutotrac, setImportingAutotrac] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      const updated = parsed.map(row => {
        if (row.status === 'error') return row;
        const found = veiculos.find(v => formatPlaca(v.placa) === row.placa);
        if (!found) return { ...row, status: 'error' as const, message: 'Placa não encontrada' };
        return row;
      });
      setRows(updated);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImport = async () => {
    setImporting(true);
    let successCount = 0;
    const updatedRows = [...rows];

    for (let i = 0; i < updatedRows.length; i++) {
      const row = updatedRows[i];
      if (row.status === 'error') continue;

      const veiculo = veiculos.find(v => formatPlaca(v.placa) === row.placa);
      if (!veiculo) {
        updatedRows[i] = { ...row, status: 'error', message: 'Placa não encontrada' };
        continue;
      }

      const { error } = await supabase.from('frota_status_atual').update({
        km_atual: row.km,
        updated_at: new Date().toISOString(),
      }).eq('id', veiculo.id);

      if (error) {
        updatedRows[i] = { ...row, status: 'error', message: error.message };
      } else {
        updatedRows[i] = { ...row, status: 'success' };
        successCount++;
      }
    }

    setRows(updatedRows);
    await refresh();
    setImporting(false);
    toast.success(`${successCount} veículo(s) atualizado(s) com sucesso`);
  };

  const handleAutotracSync = async () => {
    setSyncing(true);
    setAutotracRows([]);
    setSyncProgress({ current: 0, total: 0, phase: 'Buscando contas Autotrac...' });

    try {
      const { data: accountsData, error: accErr } = await supabase.functions.invoke('autotrac-sync', {
        body: { action: 'accounts' },
      });

      if (accErr) throw new Error(accErr.message);

      const accounts = Array.isArray(accountsData) ? accountsData : [];
      if (accounts.length === 0) {
        toast.error('Nenhuma conta Autotrac encontrada');
        return;
      }

      const accountCode = Number(accounts[0].Code);
      const fleetPlacas = veiculos.map(v => formatPlaca(v.placa));

      setSyncProgress({ current: 0, total: fleetPlacas.length, phase: 'Localizando veículos autorizados...' });

      const { data: matchedData, error: matchedErr } = await supabase.functions.invoke('autotrac-sync', {
        body: { action: 'matched-vehicles', accountCode, fleetPlacas },
      });

      if (matchedErr) throw new Error(matchedErr.message);

      const matchedVehicles: AutotracMatchedVehicle[] = Array.isArray(matchedData) ? matchedData : [];
      if (matchedVehicles.length === 0) {
        toast.info('Nenhum veículo da frota foi localizado na Autotrac');
        return;
      }

      const chunks = chunkArray(matchedVehicles, AUTOTRAC_FRONTEND_BATCH_SIZE);
      const results: Array<{
        vehicleName: string;
        vehicleCode: number;
        hodometerEnd: number | null;
        placa?: string;
        error?: string;
      }> = [];

      setSyncProgress({ current: 0, total: matchedVehicles.length, phase: 'Buscando telemetria dos veículos...' });

      for (let i = 0; i < chunks.length; i++) {
        const batch = chunks[i];
        const { data: batchData, error: batchErr } = await supabase.functions.invoke('autotrac-sync', {
          body: { action: 'sync-batch', accountCode, vehicles: batch },
        });

        if (batchErr) {
          results.push(
            ...batch.map(vehicle => ({
              vehicleName: vehicle.vehicleName,
              vehicleCode: vehicle.vehicleCode,
              hodometerEnd: null,
              placa: vehicle.placa,
              error: batchErr.message,
            }))
          );
        } else {
          results.push(...(Array.isArray(batchData) ? batchData : []));
        }

        setSyncProgress({
          current: Math.min((i + 1) * AUTOTRAC_FRONTEND_BATCH_SIZE, matchedVehicles.length),
          total: matchedVehicles.length,
          phase: 'Buscando telemetria dos veículos...',
        });
      }

      setSyncProgress({ current: matchedVehicles.length, total: matchedVehicles.length, phase: 'Processando resultados...' });

      const mapped: AutotracRow[] = results.map((result: any) => {
        const extractedPlaca = typeof result.placa === 'string' && result.placa
          ? result.placa.replace(/[-\s]/g, '').toUpperCase()
          : ((result.vehicleName || '').toUpperCase().match(/[A-Z]{3}\d[A-Z0-9]\d{2}/)?.[0] || (result.vehicleName || '').replace(/[-\s]/g, ''));

        const veiculo = veiculos.find(v => formatPlaca(v.placa) === extractedPlaca);

        if (result.error) {
          return {
            vehicleName: result.vehicleName || '',
            vehicleCode: result.vehicleCode,
            hodometerEnd: null,
            placa: extractedPlaca,
            status: 'error',
            message: result.error,
          };
        }

        if (!result.hodometerEnd && result.hodometerEnd !== 0) {
          return {
            vehicleName: result.vehicleName || '',
            vehicleCode: result.vehicleCode,
            hodometerEnd: null,
            placa: extractedPlaca,
            status: 'skipped',
            message: 'Sem dados de hodômetro',
          };
        }

        if (!veiculo) {
          return {
            vehicleName: result.vehicleName || '',
            vehicleCode: result.vehicleCode,
            hodometerEnd: result.hodometerEnd,
            placa: extractedPlaca,
            status: 'skipped',
            message: 'Placa não encontrada na frota',
          };
        }

        const kmAutotrac = Math.round(result.hodometerEnd);
        if (kmAutotrac <= veiculo.km_atual) {
          return {
            vehicleName: result.vehicleName || '',
            vehicleCode: result.vehicleCode,
            hodometerEnd: kmAutotrac,
            placa: extractedPlaca,
            status: 'skipped',
            message: `KM atual (${veiculo.km_atual.toLocaleString('pt-BR')}) ≥ telemetria`,
          };
        }

        return {
          vehicleName: result.vehicleName || '',
          vehicleCode: result.vehicleCode,
          hodometerEnd: kmAutotrac,
          placa: extractedPlaca,
          status: 'pending',
        };
      });

      setAutotracRows(mapped);

      const pendentes = mapped.filter(row => row.status === 'pending').length;
      const erros = mapped.filter(row => row.status === 'error').length;

      if (erros > 0) {
        toast.error(`${erros} veículo(s) retornaram erro na consulta da Autotrac`);
      }

      toast.info(`${matchedVehicles.length} veículos consultados, ${pendentes} com KM para atualizar`);
    } catch (err: any) {
      console.error('Autotrac sync error:', err);
      toast.error(`Erro ao sincronizar: ${err.message}`);
    } finally {
      setSyncing(false);
      setSyncProgress({ current: 0, total: 0, phase: '' });
    }
  };

  const handleAutotracImport = async () => {
    setImportingAutotrac(true);
    let successCount = 0;
    const updated = [...autotracRows];

    for (let i = 0; i < updated.length; i++) {
      const row = updated[i];
      if (row.status !== 'pending' || !row.hodometerEnd) continue;

      const veiculo = veiculos.find(v => formatPlaca(v.placa) === row.placa);
      if (!veiculo) {
        updated[i] = { ...row, status: 'error', message: 'Placa não encontrada' };
        continue;
      }

      const { error } = await supabase.from('frota_status_atual').update({
        km_atual: row.hodometerEnd,
        updated_at: new Date().toISOString(),
      }).eq('id', veiculo.id);

      if (error) {
        updated[i] = { ...row, status: 'error', message: error.message };
      } else {
        updated[i] = { ...row, status: 'success' };
        successCount++;
      }
    }

    setAutotracRows(updated);
    await refresh();
    setImportingAutotrac(false);
    toast.success(`${successCount} veículo(s) atualizado(s) via Autotrac`);
  };

  const handleExportJson = () => {
    const exportData = autotracRows.map(row => ({
      placa: row.placa,
      veiculo_autotrac: row.vehicleName,
      km_telemetria: row.hodometerEnd,
      status: row.status,
      observacao: row.message || null,
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `autotrac-sync-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('JSON exportado com sucesso');
  };

  const pendingCount = rows.filter(r => r.status === 'pending').length;
  const errorCount = rows.filter(r => r.status === 'error').length;
  const successCount = rows.filter(r => r.status === 'success').length;

  const autotracPending = autotracRows.filter(r => r.status === 'pending').length;
  const autotracSuccess = autotracRows.filter(r => r.status === 'success').length;
  const autotracSkipped = autotracRows.filter(r => r.status === 'skipped').length;
  const autotracError = autotracRows.filter(r => r.status === 'error').length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Importar KM</h1>
          <p className="text-sm text-muted-foreground">
            Atualize a quilometragem dos veículos via planilha CSV ou sincronize com a Autotrac
          </p>
        </div>

        <Tabs defaultValue="csv" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="csv" className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" /> Planilha CSV
            </TabsTrigger>
            <TabsTrigger value="autotrac" className="flex items-center gap-2">
              <Satellite className="w-4 h-4" /> Autotrac
            </TabsTrigger>
          </TabsList>

          <TabsContent value="csv" className="space-y-4 mt-4">
            <div className="bg-card rounded-lg border shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-4">
                <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
                <Button variant="outline" onClick={() => fileRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" /> Selecionar CSV
                </Button>
                {rows.length > 0 && (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><FileSpreadsheet className="w-4 h-4" />{rows.length} linhas</span>
                    {pendingCount > 0 && <span className="text-primary">{pendingCount} pendentes</span>}
                    {successCount > 0 && <span className="text-primary">{successCount} atualizados</span>}
                    {errorCount > 0 && <span className="text-destructive">{errorCount} erros</span>}
                  </div>
                )}
              </div>
              <div className="bg-muted/50 rounded-md p-3 text-xs text-muted-foreground">
                <strong>Formato esperado:</strong> arquivo CSV com colunas separadas por vírgula ou ponto-e-vírgula.
                <br />Exemplo: <code className="bg-muted px-1 rounded">ABC1D23, 185000, 2026-03-01</code>
              </div>
            </div>

            {rows.length > 0 && (
              <>
                <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Status</TableHead>
                        <TableHead>Placa</TableHead>
                        <TableHead className="text-right">KM</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Observação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            {row.status === 'pending' && <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />}
                            {row.status === 'success' && <Check className="w-4 h-4 text-primary" />}
                            {row.status === 'error' && <AlertTriangle className="w-4 h-4 text-destructive" />}
                          </TableCell>
                          <TableCell className="font-mono font-semibold">{row.placa}</TableCell>
                          <TableCell className="text-right font-mono">{row.km.toLocaleString('pt-BR')}</TableCell>
                          <TableCell>{row.data}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{row.message || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setRows([])}>
                    <X className="w-4 h-4 mr-2" />Limpar
                  </Button>
                  <Button onClick={handleImport} disabled={importing || pendingCount === 0}>
                    <Check className="w-4 h-4 mr-2" />
                    {importing ? 'Importando...' : `Importar ${pendingCount} registro(s)`}
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="autotrac" className="space-y-4 mt-4">
            <div className="bg-card rounded-lg border shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-4">
                <Button onClick={handleAutotracSync} disabled={syncing}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Buscando dados...' : 'Sincronizar com Autotrac'}
                </Button>
                {syncing && syncProgress.phase && (
                  <div className="flex-1 max-w-xs space-y-1">
                    <p className="text-xs text-muted-foreground">{syncProgress.phase}</p>
                    <Progress
                      value={syncProgress.total > 0 ? (syncProgress.current / syncProgress.total) * 100 : undefined}
                      className="h-2"
                    />
                    {syncProgress.total > 0 && (
                      <p className="text-xs text-muted-foreground text-right">
                        {syncProgress.current}/{syncProgress.total} veículos
                      </p>
                    )}
                  </div>
                )}
                {autotracRows.length > 0 && (
                  <Button variant="outline" onClick={handleExportJson}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar JSON
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fleet-api`;
                    window.open(url, '_blank');
                    toast.info('Lembre-se de adicionar ?apikey=SUA_CHAVE na URL');
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-2" /> API Endpoint
                </Button>
                {autotracRows.length > 0 && (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{autotracRows.length} veículos</span>
                    {autotracPending > 0 && <span className="text-primary">{autotracPending} pendentes</span>}
                    {autotracSuccess > 0 && <span className="text-primary">{autotracSuccess} atualizados</span>}
                    {autotracSkipped > 0 && <span className="text-muted-foreground">{autotracSkipped} ignorados</span>}
                    {autotracError > 0 && <span className="text-destructive">{autotracError} erros</span>}
                  </div>
                )}
              </div>
              <div className="bg-muted/50 rounded-md p-3 text-xs text-muted-foreground">
                <strong>Como funciona:</strong> O sistema busca o hodômetro mais recente de cada veículo autorizado na Autotrac
                e compara com o KM atual cadastrado. Apenas veículos com KM maior serão atualizados.
              </div>
            </div>

            {autotracRows.length > 0 && (
              <>
                <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Status</TableHead>
                        <TableHead>Veículo (Autotrac)</TableHead>
                        <TableHead>Placa</TableHead>
                        <TableHead className="text-right">KM Telemetria</TableHead>
                        <TableHead>Observação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {autotracRows.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            {row.status === 'pending' && <RefreshCw className="w-4 h-4 text-primary" />}
                            {row.status === 'success' && <Check className="w-4 h-4 text-primary" />}
                            {row.status === 'error' && <AlertTriangle className="w-4 h-4 text-destructive" />}
                            {row.status === 'skipped' && <X className="w-4 h-4 text-muted-foreground" />}
                          </TableCell>
                          <TableCell className="text-sm">{row.vehicleName}</TableCell>
                          <TableCell className="font-mono font-semibold">{row.placa}</TableCell>
                          <TableCell className="text-right font-mono">
                            {row.hodometerEnd != null ? row.hodometerEnd.toLocaleString('pt-BR') : '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{row.message || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setAutotracRows([])}>
                    <X className="w-4 h-4 mr-2" />Limpar
                  </Button>
                  <Button onClick={handleAutotracImport} disabled={importingAutotrac || autotracPending === 0}>
                    <Check className="w-4 h-4 mr-2" />
                    {importingAutotrac ? 'Atualizando...' : `Atualizar ${autotracPending} veículo(s)`}
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default ImportarKmPage;
