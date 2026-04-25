import React, { useState } from 'react';
import { useFleet } from '@/contexts/FleetContext';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Pencil } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { toast } from 'sonner';
import { formatPlaca } from '@/lib/formatPlaca';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';

const tiposVeiculo = ['Carreta', 'Bitruck', 'Bitrem', 'Rodotrem', 'Toco', '3/4', 'VUC', 'Cavalo Mecânico'];

const VeiculosPage: React.FC = () => {
  const { veiculos, filiais, motoristas, addVeiculo, deleteVeiculo, updateVeiculo } = useFleet();
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ codigo: '', placa: '', tipo: 'Carreta', filialId: '', motoristaId: '', kmAtual: '', kmProximaPreventiva: '', intervaloPreventiva: '30000' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ codigo: '', tipo: '', filialId: '', motoristaId: '', kmUltimaPreventiva: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.placa.trim() || !form.filialId) { toast.error('Preencha os campos obrigatórios'); return; }
    if (veiculos.some(v => v.placa === form.placa.trim().toUpperCase())) { toast.error('Placa já cadastrada'); return; }
    const km = Number(form.kmAtual) || 0;
    const intervalo = Number(form.intervaloPreventiva) || 30000;
    const kmUltimaPreventiva = Number(form.kmProximaPreventiva) || 0; // field reused as "última preventiva"
    await addVeiculo({
      placa: form.placa.trim().toUpperCase(),
      codigo: form.codigo.trim(),
      tipo: form.tipo,
      filial_id: form.filialId,
      motorista_id: form.motoristaId || null,
      km_atual: km,
      km_ultima_preventiva: kmUltimaPreventiva,
      km_proxima_preventiva: kmUltimaPreventiva > 0 ? kmUltimaPreventiva + intervalo : km + intervalo,
      intervalo_preventiva: intervalo,
      status: 'disponivel',
    } as any);
    toast.success('Veículo cadastrado');
    setShowModal(false);
    setForm({ codigo: '', placa: '', tipo: 'Carreta', filialId: '', motoristaId: '', kmAtual: '', kmProximaPreventiva: '', intervaloPreventiva: '30000' });
  };

  const openEdit = (v: typeof veiculos[0]) => {
    setEditId(v.id);
    setEditForm({ codigo: v.codigo || '', tipo: v.tipo, filialId: v.filial_id || '', motoristaId: v.motorista_id || '', kmUltimaPreventiva: String(v.km_ultima_preventiva || 0) });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId || !editForm.filialId) { toast.error('Preencha os campos obrigatórios'); return; }

    // If motorista changed, clear old vehicle's motorista_id
    const oldVeiculo = veiculos.find(v => v.id === editId);
    if (oldVeiculo?.motorista_id && oldVeiculo.motorista_id !== editForm.motoristaId) {
      // old motorista is freed automatically since we're updating this vehicle
    }
    // If new motorista is already on another vehicle, clear that
    if (editForm.motoristaId) {
      const otherVeiculo = veiculos.find(v => v.motorista_id === editForm.motoristaId && v.id !== editId);
      if (otherVeiculo) {
        await updateVeiculo(otherVeiculo.id, { motorista_id: null } as any);
      }
    }

    const kmUltima = Number(editForm.kmUltimaPreventiva) || 0;
    const veiculo = veiculos.find(v => v.id === editId);
    const intervalo = veiculo?.intervalo_preventiva || 30000;
    await updateVeiculo(editId, {
      codigo: editForm.codigo.trim(),
      tipo: editForm.tipo,
      filial_id: editForm.filialId,
      motorista_id: editForm.motoristaId || null,
      km_ultima_preventiva: kmUltima,
      km_proxima_preventiva: kmUltima + intervalo,
    } as any);
    toast.success('Veículo atualizado');
    setEditId(null);
  };

  // Motoristas available for the edit form (current + unlinked)
  const availableMotoristasForEdit = motoristas.filter(m =>
    m.id === editForm.motoristaId || !veiculos.some(v => v.motorista_id === m.id && v.id !== editId)
  );

  // Motoristas not yet linked to a vehicle (for new vehicle)
  const availableMotoristas = motoristas.filter(m => !veiculos.some(v => v.motorista_id === m.id));

  // Pagination
  const totalPages = Math.max(1, Math.ceil(veiculos.length / pageSize));
  const paginatedVeiculos = veiculos.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Reset page if out of bounds
  React.useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [veiculos.length, pageSize, currentPage, totalPages]);

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
                <TableHead>Código</TableHead>
                <TableHead>Placa</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead>Motorista</TableHead>
                <TableHead className="text-right">KM Atual</TableHead>
                <TableHead className="text-right">Últ. Preventiva</TableHead>
                <TableHead className="text-right">Próx. Preventiva</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedVeiculos.map(v => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono text-sm">{v.codigo || '—'}</TableCell>
                  <TableCell className="font-mono font-semibold">{formatPlaca(v.placa)}</TableCell>
                  <TableCell>{v.tipo}</TableCell>
                  <TableCell>{filiais.find(f => f.id === v.filial_id)?.nome ?? '—'}</TableCell>
                  <TableCell>{motoristas.find(m => m.id === v.motorista_id)?.nome ?? '—'}</TableCell>
                  <TableCell className="text-right font-mono">{v.km_atual.toLocaleString('pt-BR')}</TableCell>
                  <TableCell className="text-right font-mono">{(v.km_ultima_preventiva || 0).toLocaleString('pt-BR')}</TableCell>
                  <TableCell className="text-right font-mono">{v.km_proxima_preventiva.toLocaleString('pt-BR')}</TableCell>
                  <TableCell><StatusBadge status={v.status} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(v)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteId(v.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Exibir</span>
            <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setCurrentPage(1); }}>
              <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span>de {veiculos.length} veículos</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Anterior</Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .reduce<(number | 'ellipsis')[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('ellipsis');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === 'ellipsis' ? (
                  <span key={`e${i}`} className="px-2 text-muted-foreground">…</span>
                ) : (
                  <Button key={p} variant={p === currentPage ? 'default' : 'outline'} size="sm" className="w-8 h-8 p-0" onClick={() => setCurrentPage(p as number)}>{p}</Button>
                )
              )}
            <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Próximo</Button>
          </div>
        </div>
      </div>

      {/* New Vehicle Modal */}
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
              <div><Label>Últ. Preventiva (km)</Label><Input type="number" value={form.kmProximaPreventiva} onChange={e => setForm(p => ({ ...p, kmProximaPreventiva: e.target.value }))} /></div>
              <div><Label>Intervalo (km)</Label><Input type="number" value={form.intervaloPreventiva} onChange={e => setForm(p => ({ ...p, intervaloPreventiva: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button type="submit">Cadastrar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Vehicle Modal */}
      <Dialog open={!!editId} onOpenChange={(open) => { if (!open) setEditId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Veículo</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div><Label>Tipo</Label>
              <Select value={editForm.tipo} onValueChange={v => setEditForm(p => ({ ...p, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{tiposVeiculo.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Filial *</Label>
              <Select value={editForm.filialId} onValueChange={v => setEditForm(p => ({ ...p, filialId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{filiais.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Motorista</Label>
              <Select value={editForm.motoristaId} onValueChange={v => setEditForm(p => ({ ...p, motoristaId: v }))}>
                <SelectTrigger><SelectValue placeholder="Sem motorista" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem motorista</SelectItem>
                  {availableMotoristasForEdit.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Últ. Preventiva Realizada (km)</Label>
              <Input type="number" value={editForm.kmUltimaPreventiva} onChange={e => setEditForm(p => ({ ...p, kmUltimaPreventiva: e.target.value }))} />
              <p className="text-xs text-muted-foreground mt-1">Próx. preventiva será calculada automaticamente (últ. preventiva + intervalo)</p>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setEditId(null)}>Cancelar</Button>
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={async () => { if (deleteId) { await deleteVeiculo(deleteId); toast.success('Veículo removido'); setDeleteId(null); } }}
        description="Tem certeza que deseja excluir este veículo? Esta ação não pode ser desfeita."
      />
    </AppLayout>
  );
};

export default VeiculosPage;
