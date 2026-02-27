import React, { useState } from 'react';
import { useFleet } from '@/contexts/FleetContext';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { toast } from 'sonner';
import { formatPlaca } from '@/lib/formatPlaca';

const tiposVeiculo = ['Carreta', 'Bitruck', 'Toco', '3/4', 'VUC', 'Cavalo Mecânico'];

const VeiculosPage: React.FC = () => {
  const { veiculos, filiais, motoristas, addVeiculo, deleteVeiculo } = useFleet();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ placa: '', tipo: 'Carreta', filialId: '', motoristaId: '', kmAtual: '', kmProximaPreventiva: '', intervaloPreventiva: '30000' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.placa.trim() || !form.filialId) { toast.error('Preencha os campos obrigatórios'); return; }
    if (veiculos.some(v => v.placa === form.placa.trim().toUpperCase())) { toast.error('Placa já cadastrada'); return; }
    const km = Number(form.kmAtual) || 0;
    const intervalo = Number(form.intervaloPreventiva) || 30000;
    await addVeiculo({
      placa: form.placa.trim().toUpperCase(),
      tipo: form.tipo,
      filial_id: form.filialId,
      motorista_id: form.motoristaId || null,
      km_atual: km,
      km_proxima_preventiva: Number(form.kmProximaPreventiva) || (km + intervalo),
      intervalo_preventiva: intervalo,
      status: 'disponivel',
    });
    toast.success('Veículo cadastrado');
    setShowModal(false);
    setForm({ placa: '', tipo: 'Carreta', filialId: '', motoristaId: '', kmAtual: '', kmProximaPreventiva: '', intervaloPreventiva: '30000' });
  };

  // Motoristas not yet linked to a vehicle
  const availableMotoristas = motoristas.filter(m => !veiculos.some(v => v.motorista_id === m.id));

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Veículos</h1>
            <p className="text-sm text-muted-foreground">Cadastro e gerenciamento da frota</p>
          </div>
          <Button onClick={() => setShowModal(true)}><Plus className="w-4 h-4 mr-2" />Novo Veículo</Button>
        </div>

        <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Placa</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead>Motorista</TableHead>
                <TableHead className="text-right">KM Atual</TableHead>
                <TableHead className="text-right">Próx. Preventiva</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {veiculos.map(v => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono font-semibold">{formatPlaca(v.placa)}</TableCell>
                  <TableCell>{v.tipo}</TableCell>
                  <TableCell>{filiais.find(f => f.id === v.filial_id)?.nome ?? '—'}</TableCell>
                  <TableCell>{motoristas.find(m => m.id === v.motorista_id)?.nome ?? '—'}</TableCell>
                  <TableCell className="text-right font-mono">{v.km_atual.toLocaleString('pt-BR')}</TableCell>
                  <TableCell className="text-right font-mono">{v.km_proxima_preventiva.toLocaleString('pt-BR')}</TableCell>
                  <TableCell><StatusBadge status={v.status} /></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={async () => { await deleteVeiculo(v.id); toast.success('Veículo removido'); }}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Veículo</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Placa *</Label><Input value={form.placa} onChange={e => setForm(p => ({ ...p, placa: e.target.value }))} placeholder="ABC1D23" required /></div>
              <div><Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{tiposVeiculo.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Filial *</Label>
                <Select value={form.filialId} onValueChange={v => setForm(p => ({ ...p, filialId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{filiais.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Motorista</Label>
                <Select value={form.motoristaId} onValueChange={v => setForm(p => ({ ...p, motoristaId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>{availableMotoristas.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>KM Atual</Label><Input type="number" value={form.kmAtual} onChange={e => setForm(p => ({ ...p, kmAtual: e.target.value }))} /></div>
              <div><Label>Próx. Preventiva</Label><Input type="number" value={form.kmProximaPreventiva} onChange={e => setForm(p => ({ ...p, kmProximaPreventiva: e.target.value }))} /></div>
              <div><Label>Intervalo (km)</Label><Input type="number" value={form.intervaloPreventiva} onChange={e => setForm(p => ({ ...p, intervaloPreventiva: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button type="submit">Cadastrar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default VeiculosPage;
