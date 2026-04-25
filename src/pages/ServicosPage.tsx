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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';

const ServicosPage: React.FC = () => {
  const { servicos, addServico, deleteServico, updateServico } = useFleet();
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ codigo: '', nome: '', tipo: 'preventiva' as 'preventiva' | 'corretiva' });

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ codigo: '', nome: '', tipo: 'preventiva' as 'preventiva' | 'corretiva' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) { toast.error('Informe o nome do serviço'); return; }
    await addServico({ nome: form.nome.trim(), codigo: form.codigo.trim(), tipo: form.tipo });
    toast.success('Serviço cadastrado');
    setShowModal(false);
    setForm({ codigo: '', nome: '', tipo: 'preventiva' });
  };

  const openEdit = (s: typeof servicos[0]) => {
    setEditId(s.id);
    setEditForm({ codigo: s.codigo || '', nome: s.nome, tipo: s.tipo });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId || !editForm.nome.trim()) { toast.error('Informe o nome do serviço'); return; }
    await updateServico(editId, {
      codigo: editForm.codigo.trim(),
      nome: editForm.nome.trim(),
      tipo: editForm.tipo,
    });
    toast.success('Serviço atualizado');
    setEditId(null);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Serviços</h1>
            <p className="text-sm text-muted-foreground">Tipos de serviço de manutenção</p>
          </div>
          <Button onClick={() => setShowModal(true)}><Plus className="w-4 h-4 mr-2" />Novo Serviço</Button>
        </div>

        <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servicos.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-sm">{s.codigo || '—'}</TableCell>
                  <TableCell className="font-medium">{s.nome}</TableCell>
                  <TableCell>
                    <Badge variant={s.tipo === 'preventiva' ? 'default' : 'destructive'} className="capitalize">{s.tipo}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteId(s.id)}>
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

      {/* New Servico Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Serviço</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Código</Label><Input value={form.codigo} onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))} placeholder="cod_servico" /></div>
              <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} required /></div>
            </div>
            <div><Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v as 'preventiva' | 'corretiva' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="preventiva">Preventiva</SelectItem>
                  <SelectItem value="corretiva">Corretiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button type="submit">Cadastrar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Servico Modal */}
      <Dialog open={!!editId} onOpenChange={(open) => { if (!open) setEditId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Serviço</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Código</Label><Input value={editForm.codigo} onChange={e => setEditForm(p => ({ ...p, codigo: e.target.value }))} placeholder="cod_servico" /></div>
              <div><Label>Nome *</Label><Input value={editForm.nome} onChange={e => setEditForm(p => ({ ...p, nome: e.target.value }))} required /></div>
            </div>
            <div><Label>Tipo</Label>
              <Select value={editForm.tipo} onValueChange={v => setEditForm(p => ({ ...p, tipo: v as 'preventiva' | 'corretiva' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="preventiva">Preventiva</SelectItem>
                  <SelectItem value="corretiva">Corretiva</SelectItem>
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

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={async () => { if (deleteId) { await deleteServico(deleteId); toast.success('Serviço removido'); setDeleteId(null); } }}
        description="Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita."
      />
    </AppLayout>
  );
};

export default ServicosPage;
