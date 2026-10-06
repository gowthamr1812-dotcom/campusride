import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Bus, 
  MapPin, 
  GitFork, 
  MapPinned, 
  Armchair, 
  Navigation, 
  Users, 
  UserSquare2, 
  ShieldCheck, 
  ClipboardCheck, 
  DollarSign, 
  CreditCard, 
  Receipt, 
  Wrench, 
  Fuel, 
  FileText, 
  AlertOctagon, 
  Bell, 
  BookOpen, 
  Bot, 
  BarChart3, 
  User, 
  Settings, 
  Shield, 
  SlidersHorizontal 
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const NAV_SECTIONS = [
  {
    title: 'OVERVIEW',
    items: [
      { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    ]
  },
  {
    title: 'TRANSPORT',
    items: [
      { name: 'Buses', path: '/buses', icon: Bus },
      { name: 'Live Tracking', path: '/tracking', icon: MapPin },
      { name: 'Routes', path: '/routes', icon: GitFork },
      { name: 'Stops', path: '/stops', icon: MapPinned },
      { name: 'Seats', path: '/seats', icon: Armchair },
      { name: 'Trips', path: '/trips', icon: Navigation },
    ]
  },
  {
    title: 'PEOPLE',
    items: [
      { name: 'Students', path: '/students', icon: Users },
      { name: 'Drivers', path: '/drivers', icon: UserSquare2 },
      { name: 'Bus Incharges', path: '/incharges', icon: ShieldCheck },
      { name: 'Attendance', path: '/attendance', icon: ClipboardCheck },
    ]
  },
  {
    title: 'FINANCE',
    items: [
      { name: 'Fee Structure', path: '/fees', icon: DollarSign },
      { name: 'Payments', path: '/payments', icon: CreditCard },
      { name: 'Receipts', path: '/receipts', icon: Receipt },
    ]
  },
  {
    title: 'FLEET',
    items: [
      { name: 'Service & Maintenance', path: '/services', icon: Wrench },
      { name: 'Diesel / Fuel', path: '/fuel', icon: Fuel },
      { name: 'Vehicle Documents', path: '/documents', icon: FileText },
    ]
  },
  {
    title: 'SAFETY & AI',
    items: [
      { name: 'Emergency / SOS', path: '/emergency', icon: AlertOctagon, alert: true },
      { name: 'Notifications', path: '/notifications', icon: Bell },
      { name: 'Travel Instructions', path: '/instructions', icon: BookOpen },
      { name: 'AI Assistant', path: '/ai', icon: Bot },
    ]
  },
  {
    title: 'ANALYTICS',
    items: [
      { name: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
    ]
  },
  {
    title: 'ACCOUNT & ADMIN',
    items: [
      { name: 'Profile', path: '/profile', icon: User },
      { name: 'Settings', path: '/settings', icon: Settings },
      { name: 'Users & Roles', path: '/admin/users', icon: Shield },
      { name: 'System Settings', path: '/admin/settings', icon: SlidersHorizontal },
    ]
  }
];

export default function Sidebar() {
  const { sidebarCollapsed } = useTheme();

  return (
    <aside 
      className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 border-r border-slate-200/80 bg-[#E8EDF3] flex flex-col ${
        sidebarCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-200/80">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white flex items-center justify-center font-extrabold text-lg shadow-md shrink-0">
          <Bus className="w-6 h-6" />
        </div>
        {!sidebarCollapsed && (
          <div className="overflow-hidden whitespace-nowrap">
            <h1 className="font-extrabold text-base tracking-tight text-slate-800">
              Campus<span className="text-blue-600">Ride</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">
              Transport Management
            </p>
          </div>
        )}
      </div>

      {/* Navigation Scrollable Area */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAV_SECTIONS.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {!sidebarCollapsed && (
              <div className="px-3 text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1.5">
                {section.title}
              </div>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  title={sidebarCollapsed ? item.name : undefined}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'neu-panel-inset text-blue-600 font-bold bg-white/40'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`
                  }
                >
                  <Icon className={`w-4 h-4 shrink-0 ${item.alert ? 'text-rose-600 animate-pulse' : ''}`} />
                  {!sidebarCollapsed && (
                    <span className="truncate flex-1">{item.name}</span>
                  )}
                  {!sidebarCollapsed && item.alert && (
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer Info */}
      {!sidebarCollapsed && (
        <div className="p-4 border-t border-slate-200/80 text-[11px] text-slate-400 text-center">
          CampusRide Enterprise &copy; 2026
        </div>
      )}
    </aside>
  );
}
