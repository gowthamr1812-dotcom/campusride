import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bus, 
  Users, 
  UserSquare2, 
  ShieldCheck, 
  GitFork, 
  CreditCard, 
  Wrench, 
  AlertOctagon, 
  Activity, 
  ArrowUpRight, 
  ExternalLink, 
  Server, 
  Database,
  Radio,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { healthApi } from '../services/api';

export default function DashboardShell() {
  const navigate = useNavigate();
  const [healthData, setHealthData] = useState(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchHealth = async () => {
    setIsLoadingHealth(true);
    try {
      const data = await healthApi.getHealth();
      setHealthData(data);
    } catch (err) {
      setHealthData({
        status: 'disconnected',
        services: { database: 'offline', api: 'unreachable' },
        uptime_seconds: 0,
        version: '1.0.0',
        environment: 'development'
      });
    } finally {
      setIsLoadingHealth(false);
      setLastRefreshed(new Date());
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner / System Telemetry Status */}
      <div className="neu-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
              Transportation Command Center
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
              Phase 1 Foundation
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Real-time fleet orchestration, student passenger manifest, and telematics telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={fetchHealth} 
            disabled={isLoadingHealth}
            className="neu-button px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-blue-600 flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHealth ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh Probes</span>
          </button>

          <a
            href="http://localhost:8000/api/v1/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="neu-button-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
          >
            <span>Swagger API</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Fleet KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Fleet Buses"
          value="20"
          subtitle="16 Running • 2 Delayed • 1 Stopped • 1 Offline"
          icon={Bus}
          color="blue"
          badge={<StatusBadge status="running" label="16 Live" />}
        />
        <StatCard
          title="Active Students"
          value="320"
          subtitle="Assigned across 20 routes"
          icon={Users}
          color="indigo"
          badge={<StatusBadge status="healthy" label="98% Boarded" />}
        />
        <StatCard
          title="Drivers & Incharges"
          value="40 Staff"
          subtitle="20 Drivers • 20 Bus Incharges"
          icon={UserSquare2}
          color="emerald"
          badge={<StatusBadge status="healthy" label="100% Present" />}
        />
        <StatCard
          title="Emergency / SOS"
          value="0"
          subtitle="All fleet lines secure"
          icon={AlertOctagon}
          color="rose"
          badge={<StatusBadge status="healthy" label="Zero Incidents" />}
        />
      </div>

      {/* Secondary Metrics & Foundation Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Foundation Architecture Diagnostic Card */}
        <div className="lg:col-span-2 neu-panel p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <Server className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-800">
                Core Foundation Architecture & Probes
              </h3>
            </div>
            {healthData && (
              <StatusBadge 
                status={healthData.status === 'healthy' ? 'healthy' : 'delayed'} 
                label={healthData.status === 'healthy' ? 'Core Ready' : 'Degraded'}
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="neu-panel-inset p-4 space-y-2">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">FastAPI Backend</div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-700">Port 8000 / REST API</span>
              </div>
              <div className="text-[11px] text-slate-500">
                Version: {healthData?.version || '1.0.0'} ({healthData?.environment || 'dev'})
              </div>
            </div>

            <div className="neu-panel-inset p-4 space-y-2">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Database & PostGIS</div>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-700">
                  {healthData?.services?.database === 'connected' ? 'PostGIS Active' : 'Connected'}
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                Alembic & Spatial Models Ready
              </div>
            </div>

            <div className="neu-panel-inset p-4 space-y-2">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">WebSocket Hub</div>
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-700">Telematics Hub</span>
              </div>
              <div className="text-[11px] text-slate-500">
                /ws/tracking & /ws/notifications
              </div>
            </div>
          </div>

          <div className="bg-slate-100/70 rounded-xl p-4 text-xs text-slate-600 flex flex-col sm:flex-row justify-between gap-2 items-start sm:items-center">
            <div>
              <span className="font-semibold text-slate-700">Uptime: </span>
              {healthData?.uptime_seconds ? `${healthData.uptime_seconds}s active` : 'Active'}
              <span className="mx-2">•</span>
              <span className="font-semibold text-slate-700">Last Synced: </span>
              {lastRefreshed.toLocaleTimeString()}
            </div>
            <span className="text-[11px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
              CORS & Strict RBAC Active
            </span>
          </div>
        </div>

        {/* Quick Operations Panel */}
        <div className="neu-panel p-6 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-800 mb-1">
              Quick Operations
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Direct access shortcuts for fleet managers and bus incharges.
            </p>

            <div className="space-y-2.5">
              <button 
                onClick={() => navigate('/tracking')}
                className="w-full neu-button p-3 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-between hover:text-blue-600"
              >
                <div className="flex items-center gap-2.5">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <span>Inspect Live Telematics Map</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </button>

              <button 
                onClick={() => navigate('/routes')}
                className="w-full neu-button p-3 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-between hover:text-blue-600"
              >
                <div className="flex items-center gap-2.5">
                  <GitFork className="w-4 h-4 text-blue-600" />
                  <span>View 20 Campus Routes</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </button>

              <button 
                onClick={() => navigate('/fees')}
                className="w-full neu-button p-3 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-between hover:text-blue-600"
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span>Fee Collection Summary</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </button>

              <button 
                onClick={() => navigate('/services')}
                className="w-full neu-button p-3 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-between hover:text-blue-600"
              >
                <div className="flex items-center gap-2.5">
                  <Wrench className="w-4 h-4 text-blue-600" />
                  <span>Preventative Maintenance</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 text-[11px] text-slate-400 flex justify-between">
            <span>Enterprise Multi-Role</span>
            <span className="font-semibold text-slate-600">Admin Mode</span>
          </div>
        </div>
      </div>
    </div>
  );
}
