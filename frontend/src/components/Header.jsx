import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  Search, 
  Bell, 
  ShieldCheck, 
  AlertCircle, 
  User, 
  ChevronDown 
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { healthApi } from '../services/api';

export default function Header() {
  const { toggleSidebar } = useTheme();
  const [healthStatus, setHealthStatus] = useState({ status: 'checking', text: 'Checking...' });

  useEffect(() => {
    let isMounted = true;
    const fetchHealth = async () => {
      try {
        const res = await healthApi.getHealth();
        if (isMounted) {
          if (res.status === 'healthy') {
            setHealthStatus({ status: 'healthy', text: 'System Online' });
          } else {
            setHealthStatus({ status: 'degraded', text: 'Degraded' });
          }
        }
      } catch (err) {
        if (isMounted) {
          setHealthStatus({ status: 'offline', text: 'Backend Offline' });
        }
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="h-16 px-6 flex items-center justify-between border-b border-slate-200/80 bg-[#E8EDF3]/90 backdrop-blur-md sticky top-0 z-30">
      {/* Left controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          aria-label="Toggle navigation menu"
          className="neu-button p-2 rounded-xl text-slate-700 hover:text-blue-600 focus:outline-none"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative hidden md:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search buses, routes, students... (Ctrl+K)"
            className="neu-panel-inset pl-9 pr-4 py-1.5 text-xs text-slate-700 w-72 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-4">
        {/* System Health Probe */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full neu-panel text-xs font-medium">
          {healthStatus.status === 'healthy' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-emerald-700">{healthStatus.text}</span>
            </>
          ) : healthStatus.status === 'degraded' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="text-amber-700">{healthStatus.text}</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span className="text-rose-700">{healthStatus.text}</span>
            </>
          )}
        </div>

        {/* Notifications */}
        <button 
          aria-label="Notifications"
          className="neu-button p-2 rounded-xl text-slate-700 relative hover:text-blue-600 focus:outline-none"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-[#E8EDF3]"></span>
        </button>

        {/* User Profile Pill */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-300">
          <div className="neu-button p-1.5 rounded-xl bg-blue-600/10 text-blue-600">
            <User className="w-5 h-5" />
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-bold text-slate-800 leading-tight">Admin Console</div>
            <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Super Administrator</div>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 hidden lg:block" />
        </div>
      </div>
    </header>
  );
}
