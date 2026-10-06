import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  Key,
  Bus,
  GitFork,
  MapPin,
  Armchair,
  Sliders,
  Mail,
  Phone,
  Clock,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Save,
  Globe,
  Sun,
  Moon,
  Bell,
  Volume2,
  Lock
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('profile'); // profile, transit, security, preferences
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [preferences, setPreferences] = useState({
    language: 'en',
    theme: 'light',
    email_alerts: true,
    sms_alerts: true,
    push_alerts: true,
    sound_effects: true
  });

  // Profile Edit State
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState(null);

  // Password Change State
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState(null);

  // Preference Change State
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [preferencesFeedback, setPreferencesFeedback] = useState(null);

  const fetchProfileAndPrefs = async () => {
    setLoading(true);
    try {
      const [profileRes, prefsRes] = await Promise.all([
        api.get('/profile'),
        api.get('/settings/preferences')
      ]);

      setProfileData(profileRes);
      setProfileForm({
        full_name: profileRes.full_name || '',
        phone: profileRes.phone || ''
      });

      if (prefsRes) {
        setPreferences({
          language: prefsRes.language || 'en',
          theme: prefsRes.theme || 'light',
          email_alerts: prefsRes.email_alerts !== false,
          sms_alerts: prefsRes.sms_alerts !== false,
          push_alerts: prefsRes.push_alerts !== false,
          sound_effects: prefsRes.sound_effects !== false
        });
      }
    } catch (err) {
      console.error('Failed to load profile data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndPrefs();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileFeedback(null);
    try {
      const res = await api.put('/profile', {
        full_name: profileForm.full_name,
        phone: profileForm.phone
      });
      setProfileData(res);
      setProfileFeedback({
        type: 'success',
        message: 'Personal profile details updated successfully.'
      });
    } catch (err) {
      setProfileFeedback({
        type: 'error',
        message: err.message || 'Failed to update profile.'
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordFeedback({
        type: 'error',
        message: 'New password and confirmation do not match.'
      });
      return;
    }

    if (passwordForm.new_password.length < 6) {
      setPasswordFeedback({
        type: 'error',
        message: 'New password must contain at least 6 characters.'
      });
      return;
    }

    setSavingPassword(true);
    try {
      await api.post('/profile/change-password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });

      setPasswordFeedback({
        type: 'success',
        message: 'Your account password was updated successfully.'
      });
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (err) {
      setPasswordFeedback({
        type: 'error',
        message: err.message || 'Failed to change password. Please verify your current password.'
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    setSavingPreferences(true);
    setPreferencesFeedback(null);
    try {
      const res = await api.put('/settings/preferences', preferences);
      setPreferences(res);
      setPreferencesFeedback({
        type: 'success',
        message: 'User interface preferences and notification settings saved.'
      });
    } catch (err) {
      setPreferencesFeedback({
        type: 'error',
        message: err.message || 'Failed to update preferences.'
      });
    } finally {
      setSavingPreferences(false);
    }
  };

  const getRoleBadgeClass = (r) => {
    switch (r) {
      case 'ADMIN': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'TRANSPORT_MANAGER': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'BUS_INCHARGE': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'DRIVER': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'STUDENT': return 'bg-teal-100 text-teal-700 border-teal-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Identity Summary */}
      <div className="neu-panel p-6 rounded-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white flex items-center justify-center font-extrabold text-2xl shadow-md">
              {profileData?.full_name ? profileData.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800">
                  {profileData?.full_name || user?.full_name || 'CampusRide Member'}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${getRoleBadgeClass(profileData?.role || user?.role)}`}>
                  {profileData?.role || user?.role}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                @{profileData?.username || user?.username} &bull; {profileData?.email || user?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5 neu-panel-inset px-3 py-1.5 rounded-xl">
              <Laptop className="w-3.5 h-3.5 text-blue-600" />
              <span>{profileData?.active_sessions_count || 1} Active Session(s)</span>
            </div>
            <div className="flex items-center gap-1.5 neu-panel-inset px-3 py-1.5 rounded-xl">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {profileData?.last_login_at 
                  ? new Date(profileData.last_login_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : 'Active Now'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-200/80 overflow-x-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'neu-panel-inset text-blue-600 bg-white/50'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Personal Details
          </button>

          <button
            onClick={() => setActiveTab('transit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'transit'
                ? 'neu-panel-inset text-blue-600 bg-white/50'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bus className="w-3.5 h-3.5" />
            Transit Allocations
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'security'
                ? 'neu-panel-inset text-blue-600 bg-white/50'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            Security & Password
          </button>

          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'preferences'
                ? 'neu-panel-inset text-blue-600 bg-white/50'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Preferences & Alerts
          </button>
        </div>
      </div>

      {/* Tab 1: Personal Details */}
      {activeTab === 'profile' && (
        <div className="neu-panel p-6 rounded-2xl max-w-2xl">
          <div className="pb-4 mb-4 border-b border-slate-200/80">
            <h2 className="text-sm font-bold text-slate-800">Account Profile Details</h2>
            <p className="text-xs text-slate-400">Update your verified legal name and mobile contact phone number</p>
          </div>

          {profileFeedback && (
            <div className={`p-4 rounded-xl text-xs flex items-center gap-3 border mb-4 ${
              profileFeedback.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {profileFeedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
              )}
              <span>{profileFeedback.message}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Full Legal Name</label>
              <input
                type="text"
                required
                value={profileForm.full_name}
                onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Username (Immutable)</label>
                <input
                  type="text"
                  disabled
                  value={profileData?.username || ''}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-500 rounded-xl font-mono bg-slate-100/50 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Email Address (Corporate)</label>
                <input
                  type="email"
                  disabled
                  value={profileData?.email || ''}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-500 rounded-xl bg-slate-100/50 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Contact Phone Number</label>
              <input
                type="text"
                placeholder="+91 98401 00000"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">Used for emergency SMS notifications and trip alerts</p>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={savingProfile}
                className="neu-button-primary px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
              >
                <Save className="w-4 h-4" />
                {savingProfile ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Transit Allocations */}
      {activeTab === 'transit' && (
        <div className="neu-panel p-6 rounded-2xl max-w-3xl">
          <div className="pb-4 mb-4 border-b border-slate-200/80">
            <h2 className="text-sm font-bold text-slate-800">Assigned Transit & Commute Assets</h2>
            <p className="text-xs text-slate-400">Institutional logistics assignment attached to your profile</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="neu-panel-inset p-4 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Bus className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Bus</span>
                <span className="text-sm font-bold text-slate-800">
                  {profileData?.assigned_bus || 'No bus assigned'}
                </span>
              </div>
            </div>

            <div className="neu-panel-inset p-4 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <GitFork className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Route</span>
                <span className="text-sm font-bold text-slate-800">
                  {profileData?.assigned_route || 'No route assigned'}
                </span>
              </div>
            </div>

            <div className="neu-panel-inset p-4 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {profileData?.role === 'DRIVER' ? 'License Number' : profileData?.role === 'BUS_INCHARGE' ? 'Staff Employee ID' : 'Boarding Stop'}
                </span>
                <span className="text-sm font-bold text-slate-800 font-mono">
                  {profileData?.assigned_stop_or_license || 'Not recorded'}
                </span>
              </div>
            </div>

            <div className="neu-panel-inset p-4 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <Armchair className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Seat</span>
                <span className="text-sm font-bold text-slate-800 font-mono">
                  {profileData?.assigned_seat || (profileData?.role === 'STUDENT' ? 'Standard Commuter' : 'Operator')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Security & Password */}
      {activeTab === 'security' && (
        <div className="neu-panel p-6 rounded-2xl max-w-xl">
          <div className="pb-4 mb-4 border-b border-slate-200/80">
            <h2 className="text-sm font-bold text-slate-800">Account Password Security</h2>
            <p className="text-xs text-slate-400">Update your secret credentials to prevent unauthorized account access</p>
          </div>

          {passwordFeedback && (
            <div className={`p-4 rounded-xl text-xs flex items-center gap-3 border mb-4 ${
              passwordFeedback.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {passwordFeedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
              )}
              <span>{passwordFeedback.message}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Current Password</label>
              <input
                type="password"
                required
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                placeholder="Enter current password..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">New Password</label>
              <input
                type="password"
                required
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                placeholder="At least 6 characters..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                placeholder="Re-enter new password..."
              />
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={savingPassword}
                className="neu-button-primary px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
              >
                <Lock className="w-4 h-4" />
                {savingPassword ? 'Updating Password...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 4: Preferences & Alerts */}
      {activeTab === 'preferences' && (
        <div className="neu-panel p-6 rounded-2xl max-w-2xl">
          <div className="pb-4 mb-4 border-b border-slate-200/80">
            <h2 className="text-sm font-bold text-slate-800">Interface & Notification Preferences</h2>
            <p className="text-xs text-slate-400">Configure localization languages and real-time transit alerts</p>
          </div>

          {preferencesFeedback && (
            <div className={`p-4 rounded-xl text-xs flex items-center gap-3 border mb-4 ${
              preferencesFeedback.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {preferencesFeedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
              )}
              <span>{preferencesFeedback.message}</span>
            </div>
          )}

          <form onSubmit={handleSavePreferences} className="space-y-6">
            {/* Language Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-blue-600" />
                Display Language
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'en', label: 'English', desc: 'Default' },
                  { id: 'ta', label: 'தமிழ்', desc: 'Tamil' },
                  { id: 'hi', label: 'हिन्दी', desc: 'Hindi' }
                ].map((lang) => (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => setPreferences({ ...preferences, language: lang.id })}
                    className={`p-3 rounded-xl text-left border transition ${
                      preferences.language === lang.id
                        ? 'neu-panel-inset border-blue-500 bg-blue-50/40 text-blue-700'
                        : 'border-transparent neu-button text-slate-700'
                    }`}
                  >
                    <span className="text-xs font-bold block">{lang.label}</span>
                    <span className="text-[10px] text-slate-400">{lang.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Notification Toggles */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-amber-500" />
                Transit & Emergency Alerts
              </h3>

              <div className="space-y-2">
                <label className="neu-panel-inset p-3 rounded-xl flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Push Notifications</span>
                    <span className="text-[11px] text-slate-400">Receive live bus arrival and departure telematics</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.push_alerts}
                    onChange={(e) => setPreferences({ ...preferences, push_alerts: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                </label>

                <label className="neu-panel-inset p-3 rounded-xl flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Email Notifications</span>
                    <span className="text-[11px] text-slate-400">Receive receipts, pass approvals, and safety directives</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.email_alerts}
                    onChange={(e) => setPreferences({ ...preferences, email_alerts: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                </label>

                <label className="neu-panel-inset p-3 rounded-xl flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">SMS Alerts</span>
                    <span className="text-[11px] text-slate-400">Receive critical emergency SOS and severe weather alerts</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.sms_alerts}
                    onChange={(e) => setPreferences({ ...preferences, sms_alerts: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                </label>

                <label className="neu-panel-inset p-3 rounded-xl flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Sound Effects</span>
                    <span className="text-[11px] text-slate-400">Play audio ping when emergency notifications trigger</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.sound_effects}
                    onChange={(e) => setPreferences({ ...preferences, sound_effects: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={savingPreferences}
                className="neu-button-primary px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
              >
                <Save className="w-4 h-4" />
                {savingPreferences ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
