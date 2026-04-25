import React, { useState } from 'react';
import { useFleet } from '@/contexts/FleetContext';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';

const estados = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const FiliaisPage: React.FC = () => {
  const { filiais, veiculos, addFilial, deleteFilial, updateFilial } = useFleet();
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ codigo: '', nome: '', cidade: '', estado: 'SP' });

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ codigo: '', nome: '', cidade: '', estado: 'SP' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) { toast.error('Informe o nome da filial'); return; }
    await addFilial({ nome: form.nome.trim(), codigo: form.codigo.trim(), cidade: form.cidade.trim(), estado: form.estado });
    toast.success('Filial cadastrada');
    setShowModal(false);
    setForm({ codigo: '', nome: '', cidade: '', estado: 'SP' });
  };

  const openEdit = (f: typeof filiais[0]) => {
    setEditId(f.id);
    setEditForm({ codigo: f.codigo || '', nome: f.nome, cidade: f.cidade, estado: f.estado });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId || !editForm.nome.trim()) { toast.error('Informe o nome da filial'); return; }
    await updateFilial(editId, {
      codigo: editForm.codigo.trim(),
      nome: editForm.nome.trim(),
      cidade: editForm.cidade.trim(),
      estado: editForm.estado,
    });
    toast.success('Filial atualizada');
    setEditId(null);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Filiais</h1>
            <p className="text-sm text-muted-foreground">Unidades da empresa</p>
          </div>
          <Button onClick={() => setShowModal(true)}><Plus className="w-4 h-4 mr-2" />Nova Filial</Button>
        </div>

        <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Veículos</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filiais.map(f => (
                <TableRow key={f.id}>
                  <TableCell className="font-mono text-sm">{f.codigo || '—'}</TableCell>
                  <TableCell className="font-medium">{f.nome}</TableCell>
                  <TableCell>{f.cidade}</TableCell>
                  <TableCell>{f.estado}</TableCell>
                  <TableCell className="text-right">{veiculos.filter(v => v.filial_id === f.id).length}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(f)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteId(f.id)}>
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

      {/* New Filial Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Filial</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Código</Label><Input value={form.codigo} onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))} placeholder="cod_filial" /></div>
              <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Cidade</Label><Input value={form.cidade} onChange={e => setForm(p => ({ ...p, cidade: e.target.value }))} /></div>
              <div><Label>Estado</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))}>
                  {estados.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button type="submit">Cadastrar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Filial Modal */}
      <Dialog open={!!editId} onOpenChange={(open) => { if (!open) setEditId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Filial</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Código</Label><Input value={editForm.codigo} onChange={e => setEditForm(p => ({ ...p, codigo: e.target.value }))} placeholder="cod_filial" /></div>
              <div><Label>Nome *</Label><Input value={editForm.nome} onChange={e => setEditForm(p => ({ ...p, nome: e.target.value }))} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Cidade</Label><Input value={editForm.cidade} onChange={e => setEditForm(p => ({ ...p, cidade: e.target.value }))} /></div>
              <div><Label>Estado</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={editForm.estado} onChange={e => setEditForm(p => ({ ...p, estado: e.target.value }))}>
                  {estados.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
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
        onConfirm={async () => { if (deleteId) { await deleteFilial(deleteId); toast.success('Filial removida'); setDeleteId(null); } }}
        description="Tem certeza que deseja excluir esta filial? Esta ação não pode ser desfeita."
      />
    </AppLayout>
  );
};

export default FiliaisPage;
