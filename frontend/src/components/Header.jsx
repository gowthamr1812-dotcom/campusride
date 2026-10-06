import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Menu, 
  Search, 
  Bell, 
  User, 
  ChevronDown, 
  LogOut, 
  Settings as SettingsIcon, 
  Shield 
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { healthApi } from '../services/api';

export default function Header() {
  const { toggleSidebar } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [healthStatus, setHealthStatus] = useState({ status: 'checking', text: 'Checking...' });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

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

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/login');
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'ADMIN': return 'bg-blue-100 text-blue-700';
      case 'TRANSPORT_MANAGER': return 'bg-indigo-100 text-indigo-700';
      case 'BUS_INCHARGE': return 'bg-emerald-100 text-emerald-700';
      case 'DRIVER': return 'bg-amber-100 text-amber-700';
      case 'STUDENT': return 'bg-purple-100 text-purple-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

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

        {/* User Profile Pill & Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-3 pl-2 border-l border-slate-300 focus:outline-none"
          >
            <div className="neu-button p-1.5 rounded-xl bg-blue-600/10 text-blue-600">
              <User className="w-5 h-5" />
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-bold text-slate-800 leading-tight">
                {user?.full_name || 'Authenticated User'}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${getRoleBadgeColor(user?.role)}`}>
                  {user?.role || 'USER'}
                </span>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 hidden lg:block" />
          </button>

          {/* Profile Dropdown Menu */}
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 neu-panel p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2 border-b border-slate-200/80 mb-1">
                <p className="text-xs font-bold text-slate-800 truncate">{user?.full_name}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
              </div>

              <div className="space-y-0.5">
                <button
                  onClick={() => { setMenuOpen(false); navigate('/profile'); }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-200/50 rounded-lg flex items-center gap-2"
                >
                  <User className="w-4 h-4 text-slate-500" />
                  <span>My Profile</span>
                </button>
                <button
                  onClick={() => { setMenuOpen(false); navigate('/settings'); }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-200/50 rounded-lg flex items-center gap-2"
                >
                  <SettingsIcon className="w-4 h-4 text-slate-500" />
                  <span>Settings</span>
                </button>
              </div>

              <div className="pt-1 mt-1 border-t border-slate-200/80">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 font-medium"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
