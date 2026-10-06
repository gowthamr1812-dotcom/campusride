import React, { useState, useEffect } from 'react';
import { 
  UserSquare2, 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  Bus, 
  ShieldCheck, 
  FileCheck, 
  Calendar,
  AlertCircle,
  RefreshCw,
  X
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

export default function Drivers() {
  const { hasRole } = useAuth();
  const canManage = hasRole(['ADMIN', 'TRANSPORT_MANAGER']);

  const [drivers, setDrivers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const [formData, setFormData] = useState({
    driver_id: '',
    name: '',
    phone: '',
    email: '',
    license_number: '',
    license_expiry: '2028-06-30',
    assigned_bus: 'BUS-01',
    assigned_route: 'Tambaram Route',
    emergency_contact: '',
    status: 'Active'
  });

  const fetchDrivers = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      let url = '/drivers?';
      if (search) url += `search=${encodeURIComponent(search)}&`;
      if (statusFilter !== 'ALL') url += `status=${encodeURIComponent(statusFilter)}&`;
      
      const res = await api.get(url);
      setDrivers(res.items || []);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load drivers.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, [search, statusFilter]);

  const handleCreateDriver = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      await api.post('/drivers', formData);
      setShowAddModal(false);
      setFormData({
        driver_id: '',
        name: '',
        phone: '',
        email: '',
        license_number: '',
        license_expiry: '2028-06-30',
        assigned_bus: 'BUS-01',
        assigned_route: 'Tambaram Route',
        emergency_contact: '',
        status: 'Active'
      });
      fetchDrivers();
    } catch (err) {
      alert(err.message || 'Error creating driver');
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
              Driver Roster Management
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
              {drivers.length} Drivers
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Registered transport pilots, commercial licenses, and active vehicle allocations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDrivers}
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
              <span>Register Driver</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="neu-panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search driver name, ID (DRV-001), license, or phone..."
            className="neu-panel-inset w-full pl-9 pr-4 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'Active', 'On Leave', 'Inactive'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === st
                  ? 'neu-panel-inset text-blue-600 font-bold bg-white/50'
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

      {/* Driver Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="neu-panel p-5 h-48 rounded-xl bg-slate-200/50"></div>
          ))}
        </div>
      ) : drivers.length === 0 ? (
        <div className="neu-panel p-12 text-center text-slate-500 text-xs">
          No drivers matching your query.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {drivers.map((drv) => (
            <div key={drv.id} className="neu-panel p-5 space-y-4 hover:translate-y-[-2px] transition-transform">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl neu-panel flex items-center justify-center text-blue-600 font-bold text-sm">
                    <UserSquare2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 leading-tight">
                      {drv.name}
                    </h4>
                    <span className="text-[11px] font-mono text-slate-500">
                      {drv.driver_id}
                    </span>
                  </div>
                </div>
                <StatusBadge 
                  status={drv.status === 'Active' ? 'running' : drv.status === 'On Leave' ? 'delayed' : 'offline'}
                  label={drv.status}
                />
              </div>

              <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Assigned Bus:</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1">
                    <Bus className="w-3.5 h-3.5 text-blue-600" />
                    {drv.assigned_bus || 'Unassigned'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Route:</span>
                  <span className="font-medium text-slate-700 truncate max-w-[180px]">
                    {drv.assigned_route || 'Unassigned'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">License:</span>
                  <span className="font-mono text-[11px] text-slate-700">
                    {drv.license_number}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">License Expiry:</span>
                  <span className="text-slate-700 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {drv.license_expiry}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <a
                  href={`tel:${drv.phone}`}
                  className="neu-button px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 hover:text-blue-600"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{drv.phone}</span>
                </a>
                <span className="text-[10px] text-slate-400">Verified Pilot</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Driver Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="neu-panel max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-800">
                Register New Driver
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="neu-button p-1.5 rounded-lg text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDriver} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Driver ID</label>
                  <input
                    type="text"
                    required
                    placeholder="DRV-021"
                    value={formData.driver_id}
                    onChange={(e) => setFormData({...formData, driver_id: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Selvam K"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98401 22021"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="driver21@campusride.edu"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Commercial License</label>
                  <input
                    type="text"
                    required
                    placeholder="TN-01-2018-0001021"
                    value={formData.license_number}
                    onChange={(e) => setFormData({...formData, license_number: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">License Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={formData.license_expiry}
                    onChange={(e) => setFormData({...formData, license_expiry: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Assigned Bus</label>
                  <input
                    type="text"
                    placeholder="BUS-01"
                    value={formData.assigned_bus}
                    onChange={(e) => setFormData({...formData, assigned_bus: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Assigned Route</label>
                  <input
                    type="text"
                    placeholder="Tambaram Route"
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
                  {formSubmitting ? 'Registering...' : 'Save Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
