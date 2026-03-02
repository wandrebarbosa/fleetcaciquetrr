import React, { useState, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileSpreadsheet, Check, AlertTriangle, X } from 'lucide-react';
import { useFleet } from '@/contexts/FleetContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatPlaca } from '@/lib/formatPlaca';

interface CsvRow {
  placa: string;
  km: number;
  data: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
}

const parseCSV = (text: string): CsvRow[] => {
  const lines = text.trim().split(/\r?\n/);
  // skip header if present
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

const ImportarKmPage: React.FC = () => {
  const { veiculos, refresh } = useFleet();
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      // validate plates against existing vehicles
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

  const pendingCount = rows.filter(r => r.status === 'pending').length;
  const errorCount = rows.filter(r => r.status === 'error').length;
  const successCount = rows.filter(r => r.status === 'success').length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Importar KM</h1>
          <p className="text-sm text-muted-foreground">
            Atualize a quilometragem dos veículos via planilha CSV (colunas: placa, km, data)
          </p>
        </div>

        <div className="bg-card rounded-lg border shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-4">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFile}
              className="hidden"
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Selecionar CSV
            </Button>

            {rows.length > 0 && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><FileSpreadsheet className="w-4 h-4" />{rows.length} linhas</span>
                {pendingCount > 0 && <span className="text-primary">{pendingCount} pendentes</span>}
                {successCount > 0 && <span className="text-green-600">{successCount} atualizados</span>}
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
                        {row.status === 'success' && <Check className="w-4 h-4 text-green-600" />}
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
      </div>
    </AppLayout>
  );
};

export default ImportarKmPage;
