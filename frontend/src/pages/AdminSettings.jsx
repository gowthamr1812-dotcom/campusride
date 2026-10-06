import React, { useState, useEffect } from 'react';
import { 
  SlidersHorizontal, 
  School, 
  Clock, 
  MapPin, 
  ShieldAlert, 
  Bot, 
  Save, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Building,
  Mail,
  Phone,
  Calendar,
  Radio,
  Lock
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AdminSettings() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [settings, setSettings] = useState({
    college_name: 'Apollo Institute of Technology',
    academic_year: '2025-2026',
    contact_email: 'transport@campusride.edu',
    contact_phone: '+91 98401 11000',
    morning_departure_time: '07:15 AM',
    evening_departure_time: '04:45 PM',
    campus_geofence_radius_meters: 500,
    gps_ping_interval_seconds: 10,
    max_failed_logins: 5,
    ai_assistant_enabled: true
  });

  const fetchSettings = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await api.get('/settings/system');
      if (res && res.settings) {
        setSettings(prev => ({
          ...prev,
          ...res.settings
        }));
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to load system settings from server.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Only administrators have permission to modify system settings.');
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      const payload = {
        settings: {
          ...settings,
          campus_geofence_radius_meters: Number(settings.campus_geofence_radius_meters),
          gps_ping_interval_seconds: Number(settings.gps_ping_interval_seconds),
          max_failed_logins: Number(settings.max_failed_logins),
          ai_assistant_enabled: Boolean(settings.ai_assistant_enabled)
        }
      };

      const res = await api.put('/settings/system', payload);
      if (res && res.settings) {
        setSettings(prev => ({ ...prev, ...res.settings }));
      }
      setFeedback({
        type: 'success',
        message: 'Institutional system settings updated successfully.'
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to update system settings.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <SlidersHorizontal className="w-7 h-7 text-blue-600" />
            Institutional System Configuration
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Global fleet parameters, campus geofence coordinates, schedule timings, and AI controls
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchSettings}
            disabled={isLoading || isSaving}
            className="neu-button px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 transition flex items-center gap-2 text-xs font-semibold"
            title="Reload Settings"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Sync
          </button>

          {isAdmin && (
            <button
              onClick={handleSave}
              disabled={isLoading || isSaving}
              className="neu-button-primary px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving Changes...' : 'Save Configuration'}
            </button>
          )}
        </div>
      </div>

      {/* Non-admin read-only warning */}
      {!isAdmin && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600" />
          <span>
            You have read-only access to system configuration. Only accounts with the <strong className="font-bold">ADMIN</strong> role can edit global settings.
          </span>
        </div>
      )}

      {/* Feedback Banner */}
      {feedback && (
        <div className={`p-4 rounded-xl text-xs flex items-center gap-3 border ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Institution Branding */}
        <div className="neu-panel p-6 rounded-2xl">
          <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-200/80">
            <Building className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-800">Campus Identity & Primary Contacts</h2>
              <p className="text-xs text-slate-400">Institutional branding used in student transport passes and receipts</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <School className="w-3.5 h-3.5 text-slate-400" />
                College / Institution Name
              </label>
              <input
                type="text"
                disabled={!isAdmin || isLoading}
                value={settings.college_name}
                onChange={(e) => handleChange('college_name', e.target.value)}
                className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl disabled:opacity-60"
                placeholder="e.g. Apollo Institute of Technology"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Active Academic Year
              </label>
              <input
                type="text"
                disabled={!isAdmin || isLoading}
                value={settings.academic_year}
                onChange={(e) => handleChange('academic_year', e.target.value)}
                className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl font-mono disabled:opacity-60"
                placeholder="e.g. 2025-2026"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                Transport Helpdesk Email
              </label>
              <input
                type="email"
                disabled={!isAdmin || isLoading}
                value={settings.contact_email}
                onChange={(e) => handleChange('contact_email', e.target.value)}
                className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl disabled:opacity-60"
                placeholder="transport@campusride.edu"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Emergency Transport Helpline
              </label>
              <input
                type="text"
                disabled={!isAdmin || isLoading}
                value={settings.contact_phone}
                onChange={(e) => handleChange('contact_phone', e.target.value)}
                className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl font-mono disabled:opacity-60"
                placeholder="+91 98401 11000"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Schedules & Timetable */}
        <div className="neu-panel p-6 rounded-2xl">
          <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-200/80">
            <Clock className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-800">Operational Schedules & Departure Window</h2>
              <p className="text-xs text-slate-400">Standard departure time benchmarks for trip tracking and notification triggers</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Standard Morning Inward Departure
              </label>
              <input
                type="text"
                disabled={!isAdmin || isLoading}
                value={settings.morning_departure_time}
                onChange={(e) => handleChange('morning_departure_time', e.target.value)}
                className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl font-mono disabled:opacity-60"
                placeholder="07:15 AM"
              />
              <p className="text-[11px] text-slate-400 mt-1">Default start time for morning inbound campus routes</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Standard Evening Outward Departure
              </label>
              <input
                type="text"
                disabled={!isAdmin || isLoading}
                value={settings.evening_departure_time}
                onChange={(e) => handleChange('evening_departure_time', e.target.value)}
                className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl font-mono disabled:opacity-60"
                placeholder="04:45 PM"
              />
              <p className="text-[11px] text-slate-400 mt-1">Standard departure time for outbound evening trips</p>
            </div>
          </div>
        </div>

        {/* Section 3: Telematics & Geofencing */}
        <div className="neu-panel p-6 rounded-2xl">
          <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-200/80">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-800">Telematics & GPS Coordinates</h2>
              <p className="text-xs text-slate-400">Real-time bus tracking refresh rates and boundary proximity settings</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Campus Geofence Radius (Meters)
              </label>
              <input
                type="number"
                min="50"
                max="5000"
                disabled={!isAdmin || isLoading}
                value={settings.campus_geofence_radius_meters}
                onChange={(e) => handleChange('campus_geofence_radius_meters', e.target.value)}
                className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl font-mono disabled:opacity-60"
              />
              <p className="text-[11px] text-slate-400 mt-1">Radius around campus gates within which buses are marked 'Arrived'</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-slate-400" />
                GPS Telematics Ping Interval (Seconds)
              </label>
              <input
                type="number"
                min="3"
                max="60"
                disabled={!isAdmin || isLoading}
                value={settings.gps_ping_interval_seconds}
                onChange={(e) => handleChange('gps_ping_interval_seconds', e.target.value)}
                className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl font-mono disabled:opacity-60"
              />
              <p className="text-[11px] text-slate-400 mt-1">Frequency of simulated/hardware GPS telemetry broadcasts</p>
            </div>
          </div>
        </div>

        {/* Section 4: Security & Access Control */}
        <div className="neu-panel p-6 rounded-2xl">
          <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-200/80">
            <Lock className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-800">Security & Authentication Thresholds</h2>
              <p className="text-xs text-slate-400">Account lockout triggers and failed login rate limits</p>
            </div>
          </div>

          <div className="max-w-md">
            <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              Maximum Failed Login Attempts
            </label>
            <input
              type="number"
              min="3"
              max="15"
              disabled={!isAdmin || isLoading}
              value={settings.max_failed_logins}
              onChange={(e) => handleChange('max_failed_logins', e.target.value)}
              className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl font-mono disabled:opacity-60"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Account locks out automatically after this many consecutive incorrect password entries
            </p>
          </div>
        </div>

        {/* Section 5: AI Assistant Controls */}
        <div className="neu-panel p-6 rounded-2xl">
          <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-200/80">
            <Bot className="w-5 h-5 text-purple-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-800">AI Assistant & Autonomous Features</h2>
              <p className="text-xs text-slate-400">Enable or disable natural language routing query assistant</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl neu-panel-inset">
            <div>
              <span className="text-xs font-bold text-slate-800 block">AI Campus Transit Copilot</span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Permits students and staff to ask natural questions regarding routes, delays, and schedule predictions
              </span>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                disabled={!isAdmin || isLoading}
                checked={settings.ai_assistant_enabled}
                onChange={(e) => handleChange('ai_assistant_enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
        </div>

        {/* Submit Bar */}
        {isAdmin && (
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isLoading || isSaving}
              className="neu-button-primary px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Updating System...' : 'Save Configuration Changes'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
