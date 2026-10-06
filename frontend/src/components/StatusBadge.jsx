import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  WifiOff, 
  ShieldAlert,
  Activity
} from 'lucide-react';

const STATUS_CONFIG = {
  running: {
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: Activity,
    label: 'Running'
  },
  healthy: {
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
    label: 'Healthy'
  },
  connected: {
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
    label: 'Connected'
  },
  delayed: {
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Clock,
    label: 'Delayed'
  },
  stopped: {
    bg: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: XCircle,
    label: 'Stopped'
  },
  offline: {
    bg: 'bg-slate-100 text-slate-700 border-slate-300',
    icon: WifiOff,
    label: 'Offline'
  },
  maintenance: {
    bg: 'bg-orange-50 text-orange-700 border-orange-200',
    icon: AlertTriangle,
    label: 'Maintenance'
  },
  emergency: {
    bg: 'bg-red-50 text-red-700 border-red-300 animate-pulse',
    icon: ShieldAlert,
    label: 'Emergency'
  },
  active: {
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
    label: 'Active'
  },
  inactive: {
    bg: 'bg-slate-100 text-slate-600 border-slate-300',
    icon: XCircle,
    label: 'Inactive'
  },
  scheduled: {
    bg: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Clock,
    label: 'Scheduled'
  },
  ready: {
    bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: CheckCircle2,
    label: 'Ready'
  },
  started: {
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: Activity,
    label: 'In Progress'
  },
  completed: {
    bg: 'bg-slate-100 text-slate-700 border-slate-300',
    icon: CheckCircle2,
    label: 'Completed'
  },
  cancelled: {
    bg: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: XCircle,
    label: 'Cancelled'
  },
  available: {
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
    label: 'Available'
  },
  assigned: {
    bg: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: CheckCircle2,
    label: 'Assigned'
  },
  reserved: {
    bg: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: Clock,
    label: 'Reserved'
  },
  blocked: {
    bg: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: XCircle,
    label: 'Blocked'
  }
};

export default function StatusBadge({ status = 'running', label, size = 'sm' }) {
  const normalizedKey = String(status).toLowerCase();
  const config = STATUS_CONFIG[normalizedKey] || {
    bg: 'bg-slate-100 text-slate-700 border-slate-300',
    icon: Activity,
    label: status
  };

  const IconComponent = config.icon;
  const displayLabel = label || config.label;

  const sizeClasses = size === 'sm' 
    ? 'text-xs px-2.5 py-1 gap-1.5' 
    : 'text-sm px-3.5 py-1.5 gap-2';

  return (
    <span className={`inline-flex items-center font-medium border rounded-full transition-colors ${config.bg} ${sizeClasses}`}>
      <IconComponent className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      <span>{displayLabel}</span>
    </span>
  );
}
