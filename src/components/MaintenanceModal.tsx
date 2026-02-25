import React, { useState } from 'react';
import { useFleet, Veiculo } from '@/contexts/FleetContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface MaintenanceModalProps {
  veiculo: Veiculo | null;
  open: boolean;
  onClose: () => void;
}

const MaintenanceModal: React.FC<MaintenanceModalProps> = ({ veiculo, open, onClose }) => {
  const { servicos, addManutencao } = useFleet();
  const [tipo, setTipo] = useState<'preventiva' | 'corretiva'>('preventiva');
  const [selectedServicos, setSelectedServicos] = useState<string[]>([]);
  const [kmAtual, setKmAtual] = useState('');
  const [solicitante, setSolicitante] = useState('');
  const [fornecedores, setFornecedores] = useState('');
  const [dataParada, setDataParada] = useState('');
  const [previsaoRetorno, setPrevisaoRetorno] = useState('');
  const [observacoes, setObservacoes] = useState('');

  React.useEffect(() => {
    if (veiculo && open) {
      setKmAtual(String(veiculo.km_atual));
      setTipo('preventiva');
      setSelectedServicos([]);
      setSolicitante('');
      setFornecedores('');
      setDataParada(new Date().toISOString().slice(0, 16));
      setPrevisaoRetorno('');
      setObservacoes('');
    }
  }, [veiculo, open]);

  const filteredServicos = servicos.filter(s => s.tipo === tipo);

  const toggleServico = (nome: string) => {
    setSelectedServicos(prev => prev.includes(nome) ? prev.filter(s => s !== nome) : [...prev, nome]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!veiculo) return;
    if (selectedServicos.length === 0) { toast.error('Selecione pelo menos um serviço'); return; }
    if (!solicitante.trim()) { toast.error('Informe o solicitante'); return; }

    await addManutencao({
      veiculo_id: veiculo.id,
      tipo_manutencao: tipo,
      grupo_servicos: selectedServicos,
      km_registrado: Number(kmAtual),
      solicitante: solicitante.trim(),
      fornecedores: fornecedores.trim(),
      data_inicio: dataParada || new Date().toISOString(),
      observacoes: observacoes.trim(),
      status: 'aberta',
      previsao_retorno: previsaoRetorno || undefined,
    });

    toast.success(`Manutenção registrada para ${veiculo.placa}`);
    onClose();
  };

  if (!veiculo) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Registrar Manutenção — <span className="text-accent font-mono">{veiculo.placa}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Tipo de Manutenção</Label>
            <Select value={tipo} onValueChange={(v) => { setTipo(v as 'preventiva' | 'corretiva'); setSelectedServicos([]); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="preventiva">Preventiva</SelectItem>
                <SelectItem value="corretiva">Corretiva</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Serviços</Label>
            <div className="mt-2 space-y-2 max-h-36 overflow-y-auto border rounded-md p-3">
              {filteredServicos.map(s => (
                <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={selectedServicos.includes(s.nome)} onCheckedChange={() => toggleServico(s.nome)} />
                  {s.nome}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><Label>KM Atual</Label><Input type="number" value={kmAtual} onChange={e => setKmAtual(e.target.value)} required /></div>
            <div><Label>Solicitante</Label><Input value={solicitante} onChange={e => setSolicitante(e.target.value)} required /></div>
          </div>

          <div><Label>Fornecedor(es)</Label><Input value={fornecedores} onChange={e => setFornecedores(e.target.value)} placeholder="Separados por vírgula" /></div>

          <div className="grid grid-cols-2 gap-4">
            <div><Label>Data/Hora Parada</Label><Input type="datetime-local" value={dataParada} onChange={e => setDataParada(e.target.value)} required /></div>
            <div><Label>Previsão Retorno</Label><Input type="datetime-local" value={previsaoRetorno} onChange={e => setPrevisaoRetorno(e.target.value)} /></div>
          </div>

          <div><Label>Observações</Label><Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={3} /></div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Registrar Manutenção</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MaintenanceModal;
