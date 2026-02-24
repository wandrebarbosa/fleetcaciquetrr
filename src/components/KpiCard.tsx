import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant: 'primary' | 'success' | 'warning' | 'destructive' | 'info';
  subtitle?: string;
}

const variantStyles = {
  primary: 'bg-primary text-primary-foreground',
  success: 'bg-success text-success-foreground',
  warning: 'bg-warning text-warning-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
  info: 'bg-info text-info-foreground',
};

const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon: Icon, variant, subtitle }) => {
  return (
    <div className="bg-card rounded-lg border p-5 flex items-start gap-4 shadow-sm">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${variantStyles[variant]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <p className="text-2xl font-bold text-card-foreground mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>
    </div>
  );
};

export default KpiCard;
