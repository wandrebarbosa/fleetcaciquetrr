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
import { toast } from 'sonner';
import { formatPlaca } from '@/lib/formatPlaca';

const MotoristasPage: React.FC = () => {
  const { motoristas, filiais, veiculos, addMotorista, deleteMotorista, updateMotorista, updateVeiculo } = useFleet();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nome: '', cpf: '', telefone: '', filialId: '' });

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ telefone: '', filialId: '', veiculoId: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.filialId) { toast.error('Preencha os campos obrigatórios'); return; }
    await addMotorista({ nome: form.nome.trim(), cpf: form.cpf.trim(), telefone: form.telefone.trim(), filial_id: form.filialId });
    toast.success('Motorista cadastrado');
    setShowModal(false);
    setForm({ nome: '', cpf: '', telefone: '', filialId: '' });
  };

  const getVeiculoForMotorista = (motoristaId: string) => {
    return veiculos.find(v => v.motorista_id === motoristaId);
  };

  const openEdit = (m: typeof motoristas[0]) => {
    const veiculo = getVeiculoForMotorista(m.id);
    setEditId(m.id);
    setEditForm({ telefone: m.telefone, filialId: m.filial_id || '', veiculoId: veiculo?.id || '' });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;

    // Update motorista fields
    await updateMotorista(editId, {
      telefone: editForm.telefone,
      filial_id: editForm.filialId || null,
    } as any);

    // Handle vehicle assignment
    const currentVeiculo = getVeiculoForMotorista(editId);
    const newVeiculoId = editForm.veiculoId === 'none' ? '' : editForm.veiculoId;

    if (currentVeiculo?.id !== newVeiculoId) {
      // Remove from old vehicle
      if (currentVeiculo) {
        await updateVeiculo(currentVeiculo.id, { motorista_id: null } as any);
      }
      // Assign to new vehicle
      if (newVeiculoId) {
        // Clear any existing motorista on the new vehicle
        const targetVeiculo = veiculos.find(v => v.id === newVeiculoId);
        if (targetVeiculo?.motorista_id && targetVeiculo.motorista_id !== editId) {
          // Another motorista is on this vehicle - we'll replace
        }
        await updateVeiculo(newVeiculoId, { motorista_id: editId } as any);
      }
    }

    toast.success('Motorista atualizado');
    setEditId(null);
  };

  // Vehicles available for edit (current + unlinked)
  const availableVeiculosForEdit = veiculos.filter(v =>
    (getVeiculoForMotorista(editId || '')?.id === v.id) || !v.motorista_id
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Motoristas</h1>
            <p className="text-sm text-muted-foreground">Cadastro de motoristas da frota</p>
          </div>
          <Button onClick={() => setShowModal(true)}><Plus className="w-4 h-4 mr-2" />Novo Motorista</Button>
        </div>

        <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead>Veículo</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {motoristas.map(m => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.nome}</TableCell>
                  <TableCell className="font-mono text-sm">{m.cpf}</TableCell>
                  <TableCell>{m.telefone}</TableCell>
                  <TableCell>{filiais.find(f => f.id === m.filial_id)?.nome ?? '—'}</TableCell>
                  <TableCell className="font-mono">{getVeiculoForMotorista(m.id)?.placa ? formatPlaca(getVeiculoForMotorista(m.id)!.placa) : '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(m)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={async () => { await deleteMotorista(m.id); toast.success('Motorista removido'); }}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* New Motorista Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Motorista</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>CPF</Label><Input value={form.cpf} onChange={e => setForm(p => ({ ...p, cpf: e.target.value }))} placeholder="000.000.000-00" /></div>
              <div><Label>Telefone</Label><Input value={form.telefone} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))} placeholder="(11) 99999-0000" /></div>
            </div>
            <div><Label>Filial *</Label>
              <Select value={form.filialId} onValueChange={v => setForm(p => ({ ...p, filialId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{filiais.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button type="submit">Cadastrar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Motorista Modal */}
      <Dialog open={!!editId} onOpenChange={(open) => { if (!open) setEditId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Motorista</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div><Label>Telefone</Label>
              <Input value={editForm.telefone} onChange={e => setEditForm(p => ({ ...p, telefone: e.target.value }))} placeholder="(11) 99999-0000" />
            </div>
            <div><Label>Filial</Label>
              <Select value={editForm.filialId} onValueChange={v => setEditForm(p => ({ ...p, filialId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{filiais.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Veículo alocado</Label>
              <Select value={editForm.veiculoId} onValueChange={v => setEditForm(p => ({ ...p, veiculoId: v }))}>
                <SelectTrigger><SelectValue placeholder="Sem veículo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem veículo</SelectItem>
                  {availableVeiculosForEdit.map(v => <SelectItem key={v.id} value={v.id}>{formatPlaca(v.placa)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setEditId(null)}>Cancelar</Button>
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default MotoristasPage;
