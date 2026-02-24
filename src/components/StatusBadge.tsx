import React from 'react';
import { StatusVeiculo } from '@/types/fleet';

interface StatusBadgeProps {
  status: StatusVeiculo;
  proximaPreventiva?: boolean;
  preventivaVencida?: boolean;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, proximaPreventiva, preventivaVencida }) => {
  if (status === 'em_ocorrencia') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-destructive text-destructive-foreground">
        <span className="w-1.5 h-1.5 rounded-full bg-destructive-foreground animate-pulse-slow" />
        Em Manutenção
      </span>
    );
  }

  if (preventivaVencida) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-destructive/15 text-destructive border border-destructive/30">
        Preventiva Vencida
      </span>
    );
  }

  if (proximaPreventiva) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-warning/15 text-warning border border-warning/30">
        Preventiva Próxima
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-success/15 text-success border border-success/30">
      <span className="w-1.5 h-1.5 rounded-full bg-success" />
      Disponível
    </span>
  );
};

export default StatusBadge;
