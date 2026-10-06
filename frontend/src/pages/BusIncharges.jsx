import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  Bus, 
  BadgeCheck, 
  RefreshCw, 
  AlertCircle,
  X 
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

export default function BusIncharges() {
  const { hasRole } = useAuth();
  const canManage = hasRole(['ADMIN', 'TRANSPORT_MANAGER']);

  const [incharges, setIncharges] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const [formData, setFormData] = useState({
    incharge_id: '',
    employee_id: '',
    name: '',
    phone: '',
    email: '',
    assigned_bus: 'BUS-07',
    assigned_route: 'Perungalathur Route',
    emergency_contact: '',
    status: 'Active'
  });

  const fetchIncharges = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      let url = '/incharges?';
      if (search) url += `search=${encodeURIComponent(search)}&`;
      if (statusFilter !== 'ALL') url += `status=${encodeURIComponent(statusFilter)}&`;

      const res = await api.get(url);
      setIncharges(res.items || []);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load bus incharges.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIncharges();
  }, [search, statusFilter]);

  const handleCreateIncharge = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      await api.post('/incharges', formData);
      setShowAddModal(false);
      setFormData({
        incharge_id: '',
        employee_id: '',
        name: '',
        phone: '',
        email: '',
        assigned_bus: 'BUS-07',
        assigned_route: 'Perungalathur Route',
        emergency_contact: '',
        status: 'Active'
      });
      fetchIncharges();
    } catch (err) {
      alert(err.message || 'Error registering Bus Incharge');
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="neu-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
              Bus Incharge Corps
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700">
              {incharges.length} Officers
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Dedicated faculty and staff custodians responsible for passenger boarding and in-transit safety.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchIncharges}
            className="neu-button px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-blue-600 flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh</span>
          </button>

          {canManage && (
            <button
              onClick={() => setShowAddModal(true)}
              className="neu-button-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Register Incharge</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="neu-panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, incharge ID (INC-001), or employee ID..."
            className="neu-panel-inset w-full pl-9 pr-4 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {['ALL', 'Active', 'On Leave', 'Inactive'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === st
                  ? 'neu-panel-inset text-emerald-700 font-bold bg-white/50'
                  : 'neu-button text-slate-600 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Incharges Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="neu-panel p-5 h-44 rounded-xl bg-slate-200/50"></div>
          ))}
        </div>
      ) : incharges.length === 0 ? (
        <div className="neu-panel p-12 text-center text-slate-500 text-xs">
          No Bus Incharges found matching criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {incharges.map((inc) => (
            <div key={inc.id} className="neu-panel p-5 space-y-4 hover:translate-y-[-2px] transition-transform">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl neu-panel flex items-center justify-center text-emerald-600 font-bold text-sm">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 leading-tight">
                      {inc.name}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                      <span>{inc.incharge_id}</span>
                      <span>•</span>
                      <span>{inc.employee_id}</span>
                    </div>
                  </div>
                </div>
                <StatusBadge 
                  status={inc.status === 'Active' ? 'healthy' : 'delayed'} 
                  label={inc.status}
                />
              </div>

              <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Assigned Bus:</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1">
                    <Bus className="w-3.5 h-3.5 text-emerald-600" />
                    {inc.assigned_bus || 'Unassigned'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Assigned Route:</span>
                  <span className="font-medium text-slate-700 truncate max-w-[180px]">
                    {inc.assigned_route || 'Unassigned'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Institutional Email:</span>
                  <span className="text-slate-700 truncate max-w-[180px]">
                    {inc.email || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <a
                  href={`tel:${inc.phone}`}
                  className="neu-button px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 hover:text-emerald-600"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{inc.phone}</span>
                </a>
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  Safety Custodian
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Incharge Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="neu-panel max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-800">
                Register Bus Incharge
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="neu-button p-1.5 rounded-lg text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateIncharge} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Incharge ID</label>
                  <input
                    type="text"
                    required
                    placeholder="INC-021"
                    value={formData.incharge_id}
                    onChange={(e) => setFormData({...formData, incharge_id: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Employee ID</label>
                  <input
                    type="text"
                    required
                    placeholder="EMP-1021"
                    value={formData.employee_id}
                    onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Dr. Shanthi Mohan"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98403 33021"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="incharge21@campusride.edu"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Assigned Bus</label>
                  <input
                    type="text"
                    placeholder="BUS-07"
                    value={formData.assigned_bus}
                    onChange={(e) => setFormData({...formData, assigned_bus: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Assigned Route</label>
                  <input
                    type="text"
                    placeholder="Perungalathur Route"
                    value={formData.assigned_route}
                    onChange={(e) => setFormData({...formData, assigned_route: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="neu-button px-4 py-2 rounded-xl text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="neu-button-primary px-5 py-2 rounded-xl text-xs font-bold"
                >
                  {formSubmitting ? 'Registering...' : 'Save Incharge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
