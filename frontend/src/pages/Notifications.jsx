import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  AlertOctagon, 
  Clock, 
  DollarSign, 
  CloudRain, 
  CheckCircle2, 
  Send, 
  RefreshCw, 
  Plus, 
  X, 
  Search, 
  Filter,
  Check,
  Megaphone,
  Radio,
  Bus as BusIcon,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Notifications() {
  const { user, hasRole } = useAuth();
  const isAdminOrManager = hasRole(['ADMIN', 'TRANSPORT_MANAGER']);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);

  // Broadcast Modal State
  const [showModal, setShowModal] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    category: 'GENERAL_ANNOUNCEMENT',
    priority: 'NORMAL',
    target_audience: 'ALL'
  });

  const fetchData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      let url = '/notifications?';
      if (categoryFilter !== 'ALL') url += `category=${categoryFilter}&`;

      const res = await api.get(url);
      setNotifications(res.items || []);
      setUnreadCount(res.unread_count || 0);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load notifications stream.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [categoryFilter]);

  const handleMarkAsRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleCreateBroadcast = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      await api.post('/notifications', formData);
      setShowModal(false);
      setFormData({
        title: '',
        message: '',
        category: 'GENERAL_ANNOUNCEMENT',
        priority: 'NORMAL',
        target_audience: 'ALL'
      });
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to publish operational broadcast.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'EMERGENCY_SOS':
        return <AlertOctagon className="w-4 h-4 text-rose-600" />;
      case 'TRIP_DELAY':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'WEATHER_ALERT':
        return <CloudRain className="w-4 h-4 text-blue-600" />;
      case 'FEE_REMINDER':
        return <DollarSign className="w-4 h-4 text-emerald-600" />;
      default:
        return <Megaphone className="w-4 h-4 text-indigo-600" />;
    }
  };

  const filteredNotifs = notifications.filter(n => {
    const term = search.toLowerCase();
    return n.title.toLowerCase().includes(term) || n.message.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Bell className="w-7 h-7 text-blue-600" />
            Operational Notifications & Broadcasts
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time route advisories, severe weather bulletins, and campus transport announcements
          </p>
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="neu-button px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-600 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Mark All as Read ({unreadCount})
            </button>
          )}

          <button
            onClick={fetchData}
            disabled={isLoading}
            className="neu-button px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 transition flex items-center gap-2 text-xs font-semibold"
            title="Refresh stream"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Sync
          </button>

          {isAdminOrManager && (
            <button
              onClick={() => setShowModal(true)}
              className="neu-button-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Broadcast Alert
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="neu-panel p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search notification messages, keywords, or topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="neu-panel-inset w-full pl-9 pr-4 py-2 text-xs text-slate-800 rounded-xl placeholder-slate-400 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'ALL', label: 'All Alerts' },
            { id: 'EMERGENCY_SOS', label: 'Emergency SOS' },
            { id: 'TRIP_DELAY', label: 'Trip Delays' },
            { id: 'WEATHER_ALERT', label: 'Weather Alerts' },
            { id: 'FEE_REMINDER', label: 'Fee Reminders' },
            { id: 'GENERAL_ANNOUNCEMENT', label: 'General' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                categoryFilter === cat.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'neu-button text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
          <button onClick={fetchData} className="ml-auto underline font-bold">Retry</button>
        </div>
      )}

      {/* Notifications Feed */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="neu-panel p-5 rounded-2xl animate-pulse space-y-2">
              <div className="h-4 bg-slate-200 rounded w-1/3"></div>
              <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : filteredNotifs.length === 0 ? (
        <div className="neu-panel p-12 rounded-2xl text-center text-slate-400">
          <Bell className="w-12 h-12 mx-auto text-slate-300 mb-2" />
          <h3 className="text-base font-bold text-slate-700">Inbox Zero</h3>
          <p className="text-xs text-slate-400 mt-1">No notifications matching your category filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifs.map((item) => (
            <div 
              key={item.id}
              onClick={() => !item.is_read && handleMarkAsRead(item.id)}
              className={`neu-panel p-4 rounded-2xl transition-all cursor-pointer hover:shadow-md border ${
                !item.is_read ? 'border-blue-300 bg-blue-50/15' : 'border-white/60 opacity-90'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                    {getCategoryIcon(item.category)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      {!item.is_read && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>
                      )}
                      <h4 className="text-sm font-bold text-slate-800">{item.title}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                        item.priority === 'URGENT' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                        item.priority === 'HIGH' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {item.priority}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {item.message}
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400 font-medium">
                      <span>{new Date(item.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      {item.target_bus_number && (
                        <span className="text-blue-600 font-bold flex items-center gap-1">
                          <BusIcon className="w-3 h-3" />
                          Target: {item.target_bus_number}
                        </span>
                      )}
                      <span className="uppercase text-[10px] tracking-wider text-slate-400 font-semibold">
                        Audience: {item.target_audience}
                      </span>
                    </div>
                  </div>
                </div>

                {!item.is_read ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsRead(item.id);
                    }}
                    className="neu-button px-2.5 py-1 rounded-lg text-[10px] font-bold text-blue-600 shrink-0"
                  >
                    Mark Read
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-400 font-semibold shrink-0 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Read
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Broadcast Alert Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="neu-panel bg-[#E8EDF3] rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-white/60">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Broadcast Operational Alert</h3>
                  <p className="text-[11px] text-slate-500">Publish instant announcements across portal and push streams</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="neu-button p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBroadcast} className="space-y-4 mt-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Headline Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monsoon Advisory: Bus Speeds Regulated"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl font-semibold"
                  >
                    <option value="GENERAL_ANNOUNCEMENT">General Announcement</option>
                    <option value="TRIP_DELAY">Trip Delay Notice</option>
                    <option value="WEATHER_ALERT">Severe Weather Alert</option>
                    <option value="FEE_REMINDER">Fee Due Reminder</option>
                    <option value="EMERGENCY_SOS">Emergency SOS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl font-bold"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent (Flash Alert)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Target Audience</label>
                <select
                  value={formData.target_audience}
                  onChange={(e) => setFormData({...formData, target_audience: e.target.value})}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl font-semibold"
                >
                  <option value="ALL">Entire Campus Community (All Roles)</option>
                  <option value="STUDENTS">Students Only</option>
                  <option value="DRIVERS">Bus Drivers Only</option>
                  <option value="INCHARGES">Bus Incharges Only</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Broadcast Message Body</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Detail schedule changes, route detours, or safety advisories..."
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="neu-button px-4 py-2 rounded-xl text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="neu-button-primary px-5 py-2 rounded-xl text-xs font-bold"
                >
                  {formSubmitting ? 'Transmitting...' : 'Publish Broadcast'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
