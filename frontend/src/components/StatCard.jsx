import React from 'react';

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'blue',
  trend,
  isLoading = false,
  badge
}) {
  const colorStyles = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  };

  if (isLoading) {
    return (
      <div className="neu-panel p-5 animate-pulse flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 bg-slate-300 rounded w-24"></div>
          <div className="w-10 h-10 bg-slate-300 rounded-xl"></div>
        </div>
        <div className="h-8 bg-slate-300 rounded w-16 mb-2"></div>
        <div className="h-3 bg-slate-200 rounded w-32"></div>
      </div>
    );
  }

  return (
    <div className="neu-panel p-5 relative overflow-hidden group hover:translate-y-[-2px] transition-transform duration-200">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${colorStyles[color] || colorStyles.blue}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between">
        <div className="text-2xl font-bold text-slate-800 tracking-tight">
          {value}
        </div>
        {badge}
      </div>

      {(subtitle || trend) && (
        <div className="mt-2 flex items-center text-xs text-slate-500 gap-1.5">
          {trend && (
            <span className={`font-semibold ${trend.positive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {trend.positive ? '+' : ''}{trend.value}
            </span>
          )}
          <span>{subtitle}</span>
        </div>
      )}
    </div>
  );
}
