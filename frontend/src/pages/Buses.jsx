import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bus as BusIcon, 
  Search, 
  Plus, 
  MapPin, 
  UserSquare2, 
  ShieldCheck, 
  Fuel, 
  Gauge, 
  ArrowRight, 
  RefreshCw,
  Armchair,
  AlertCircle,
  X
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

export default function Buses() {
  const { hasRole } = useAuth();
  const canManage = hasRole(['ADMIN', 'TRANSPORT_MANAGER']);

  const [buses, setBuses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const [formData, setFormData] = useState({
    bus_number: '',
    registration_number: '',
    capacity: 50,
    gps_device_id: '',
    status: 'Running'
  });

  const fetchData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      let url = '/buses?';
      if (search) url += `search=${encodeURIComponent(search)}&`;
      if (statusFilter !== 'ALL') url += `status=${encodeURIComponent(statusFilter)}&`;

      const [busesRes, summaryRes] = await Promise.all([
        api.get(url),
        api.get('/buses/summary')
      ]);

      setBuses(busesRes.items || []);
      setSummary(summaryRes);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load fleet data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, statusFilter]);

  const handleCreateBus = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      await api.post('/buses', formData);
      setShowAddModal(false);
      setFormData({
        bus_number: '',
        registration_number: '',
        capacity: 50,
        gps_device_id: '',
        status: 'Running'
      });
      fetchData();
    } catch (err) {
      alert(err.message || 'Error creating bus record');
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
              College Bus Fleet Registry
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
              {summary?.total_buses || buses.length} Total Vehicles
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Real-time status, driver & incharge allocations, fuel telemetry, and passenger occupancy.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
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
              <span>Register Bus</span>
            </button>
          )}
        </div>
      </div>

      {/* Fleet KPI Quick Strip */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="neu-panel p-3.5 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Running</span>
            <div className="text-lg font-black text-emerald-600">{summary.running}</div>
          </div>
          <div className="neu-panel p-3.5 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Delayed</span>
            <div className="text-lg font-black text-amber-600">{summary.delayed}</div>
          </div>
          <div className="neu-panel p-3.5 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Stopped</span>
            <div className="text-lg font-black text-rose-600">{summary.stopped}</div>
          </div>
          <div className="neu-panel p-3.5 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Offline</span>
            <div className="text-lg font-black text-slate-600">{summary.offline}</div>
          </div>
          <div className="neu-panel p-3.5 text-center col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Maintenance</span>
            <div className="text-lg font-black text-orange-600">{summary.maintenance}</div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="neu-panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bus number (BUS-01), registration, or GPS ID..."
            className="neu-panel-inset w-full pl-9 pr-4 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'Running', 'Delayed', 'Stopped', 'Offline', 'Maintenance'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
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

      {/* Bus Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="neu-panel p-5 h-56 rounded-xl bg-slate-200/50"></div>
          ))}
        </div>
      ) : buses.length === 0 ? (
        <div className="neu-panel p-12 text-center text-slate-500 text-xs">
          No fleet buses found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {buses.map((b) => (
            <div key={b.id} className="neu-panel p-5 space-y-4 hover:translate-y-[-2px] transition-transform">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl neu-panel flex items-center justify-center text-blue-600 font-black text-sm">
                    <BusIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base text-slate-900 leading-tight">
                      {b.bus_number}
                    </h4>
                    <span className="text-[11px] font-mono text-slate-500 font-medium">
                      {b.registration_number}
                    </span>
                  </div>
                </div>
                <StatusBadge status={b.status} />
              </div>

              {/* Route & Personnel Details */}
              <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Route:</span>
                  <span className="font-bold text-slate-800 truncate max-w-[170px]">
                    {b.route?.name || 'Unassigned'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Driver:</span>
                  <span className="font-medium text-slate-700 flex items-center gap-1 truncate max-w-[170px]">
                    <UserSquare2 className="w-3.5 h-3.5 text-blue-600" />
                    {b.driver?.name || 'Unassigned'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Bus Incharge:</span>
                  <span className="font-medium text-slate-700 flex items-center gap-1 truncate max-w-[170px]">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    {b.incharge?.name || 'Unassigned'}
                  </span>
                </div>
              </div>

              {/* Occupancy and Fuel bar */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Occupancy:</span>
                    <span className="font-bold text-slate-800">
                      {b.occupancy_count} / {b.capacity} seats ({b.occupancy_percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        b.occupancy_percentage > 90 ? 'bg-amber-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${Math.min(100, b.occupancy_percentage)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span className="flex items-center gap-1">
                    <Fuel className="w-3.5 h-3.5 text-slate-400" />
                    Fuel: <strong className="text-slate-700">{b.fuel_level_percent}%</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5 text-slate-400" />
                    Speed: <strong className="text-slate-700">{b.speed} km/h</strong>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <Link
                  to={`/buses/${b.bus_number}`}
                  className="neu-button px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:text-blue-600 flex items-center gap-1"
                >
                  <span>Vehicle Profile</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <Link
                  to={`/seats?bus=${b.id}`}
                  className="neu-button px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-blue-600 flex items-center gap-1"
                >
                  <Armchair className="w-3.5 h-3.5 text-blue-600" />
                  <span>Seats</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Bus Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="neu-panel max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-800">
                Register New Fleet Bus
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="neu-button p-1.5 rounded-lg text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBus} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Bus Number</label>
                  <input
                    type="text"
                    required
                    placeholder="BUS-21"
                    value={formData.bus_number}
                    onChange={(e) => setFormData({...formData, bus_number: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Registration No</label>
                  <input
                    type="text"
                    required
                    placeholder="TN 01 AB 1021"
                    value={formData.registration_number}
                    onChange={(e) => setFormData({...formData, registration_number: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Capacity</label>
                  <select
                    value={formData.capacity}
                    onChange={(e) => setFormData({...formData, capacity: Number(e.target.value)})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  >
                    <option value={48}>48 Passengers</option>
                    <option value={50}>50 Passengers</option>
                    <option value={52}>52 Passengers</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  >
                    <option value="Running">Running</option>
                    <option value="Delayed">Delayed</option>
                    <option value="Stopped">Stopped</option>
                    <option value="Offline">Offline</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">GPS Hardware ID</label>
                <input
                  type="text"
                  placeholder="GPS-DEV-021"
                  value={formData.gps_device_id}
                  onChange={(e) => setFormData({...formData, gps_device_id: e.target.value})}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                />
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
                  {formSubmitting ? 'Registering...' : 'Save Bus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
