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
import { toast } from 'sonner';
import { formatPlaca } from '@/lib/formatPlaca';

const MotoristasPage: React.FC = () => {
  const { motoristas, filiais, veiculos, addMotorista, deleteMotorista } = useFleet();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nome: '', cpf: '', telefone: '', filialId: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.filialId) { toast.error('Preencha os campos obrigatórios'); return; }
    await addMotorista({ nome: form.nome.trim(), cpf: form.cpf.trim(), telefone: form.telefone.trim(), filial_id: form.filialId });
    toast.success('Motorista cadastrado');
    setShowModal(false);
    setForm({ nome: '', cpf: '', telefone: '', filialId: '' });
  };

  const getVeiculoPlaca = (motoristaId: string) => {
    const v = veiculos.find(v => v.motorista_id === motoristaId);
    return v?.placa ? formatPlaca(v.placa) : '—';
  };

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
                  <TableCell className="font-mono">{getVeiculoPlaca(m.id)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={async () => { await deleteMotorista(m.id); toast.success('Motorista removido'); }}>
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
    </AppLayout>
  );
};

export default MotoristasPage;
