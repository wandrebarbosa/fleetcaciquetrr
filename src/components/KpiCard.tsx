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
  primary: 'from-primary/20 to-primary/5 text-primary ring-primary/20',
  success: 'from-success/20 to-success/5 text-success ring-success/20',
  warning: 'from-warning/20 to-warning/5 text-warning ring-warning/20',
  destructive: 'from-destructive/20 to-destructive/5 text-destructive ring-destructive/20',
  info: 'from-info/20 to-info/5 text-info ring-info/20',
};

const iconBgStyles = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  info: 'bg-info/10 text-info',
};

const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon: Icon, variant, subtitle }) => {
  return (
    <div className={`group relative overflow-hidden rounded-xl border bg-gradient-to-br ${variantStyles[variant]} p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:ring-1`}>
      <div className="flex items-start gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBgStyles[variant]} transition-transform duration-300 group-hover:scale-110`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">{title}</p>
          <p className="text-3xl font-extrabold text-card-foreground mt-1 tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground/70 mt-1 font-medium">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
};

export default KpiCard;
