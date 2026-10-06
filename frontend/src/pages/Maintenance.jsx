import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Search, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Bus as BusIcon, 
  RefreshCw, 
  AlertCircle, 
  X, 
  DollarSign, 
  Gauge, 
  ShieldAlert,
  Building2,
  Filter
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

export default function Maintenance() {
  const { user, hasRole } = useAuth();
  const canManage = hasRole(['ADMIN', 'TRANSPORT_MANAGER']);
  const isDriver = user?.role === 'DRIVER';

  const [logs, setLogs] = useState([]);
  const [buses, setBuses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [busFilter, setBusFilter] = useState('ALL');
  const [errorMessage, setErrorMessage] = useState(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    bus_id: '',
    service_type: 'Routine Inspection',
    description: '',
    cost: 3500,
    odometer_reading: 0,
    vendor_name: 'Ashok Leyland Service Center',
    invoice_number: '',
    status: 'Scheduled',
    priority: 'Medium'
  });

  const fetchData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      let url = '/services?';
      if (statusFilter !== 'ALL') url += `status=${statusFilter}&`;
      if (priorityFilter !== 'ALL') url += `priority=${priorityFilter}&`;
      if (busFilter !== 'ALL') url += `bus_id=${busFilter}&`;

      const [logsRes, busesRes, summaryRes] = await Promise.all([
        api.get(url),
        api.get('/buses'),
        api.get('/fleet/summary')
      ]);

      setLogs(logsRes.items || []);
      setBuses(busesRes.items || []);
      setSummary(summaryRes);

      if (busesRes.items?.length > 0 && !formData.bus_id) {
        setFormData(prev => ({ ...prev, bus_id: busesRes.items[0].id }));
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load maintenance records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, priorityFilter, busFilter]);

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      await api.post('/services', {
        ...formData,
        bus_id: Number(formData.bus_id),
        cost: Number(formData.cost),
        odometer_reading: Number(formData.odometer_reading)
      });
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to record maintenance ticket.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleCompleteOrder = async (logId) => {
    try {
      await api.put(`/services/${logId}`, { status: 'Completed' });
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to update ticket status.');
    }
  };

  const filteredLogs = logs.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.service_type?.toLowerCase().includes(q) ||
      l.bus_number?.toLowerCase().includes(q) ||
      l.vendor_name?.toLowerCase().includes(q) ||
      l.description?.toLowerCase().includes(q)
    );
  });

  const activeOrdersCount = logs.filter(l => l.status === 'In Progress' || l.status === 'Scheduled' || l.status === 'Critical').length;
  const criticalOrdersCount = logs.filter(l => l.priority === 'Critical' || l.status === 'Critical').length;
  const totalCost = logs.reduce((acc, l) => acc + (l.cost || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="neu-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
              Fleet Maintenance & Repair Console
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
              {logs.length} Total Work Orders
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Track mechanical servicing, component replacements, preventative schedules, and workshop invoices.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="neu-button p-2.5 rounded-xl text-slate-600 hover:text-blue-600"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="neu-button-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{isDriver ? 'Report Vehicle Issue' : 'Create Work Order'}</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="neu-panel p-4 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Active Work Orders</span>
          <div className="text-xl font-black text-slate-800">{activeOrdersCount}</div>
        </div>
        <div className="neu-panel p-4 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Critical Repairs</span>
          <div className={`text-xl font-black ${criticalOrdersCount > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-800'}`}>
            {criticalOrdersCount}
          </div>
        </div>
        <div className="neu-panel p-4 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Vehicles In Workshop</span>
          <div className="text-xl font-black text-amber-600">{summary?.buses_in_maintenance || 1}</div>
        </div>
        <div className="neu-panel p-4 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Total Expenditure</span>
          <div className="text-xl font-black text-purple-600">₹{totalCost.toLocaleString()}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="neu-panel p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search service type, bus, vendor, or defect description..."
            className="neu-panel-inset w-full pl-9 pr-4 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={busFilter}
            onChange={(e) => setBusFilter(e.target.value)}
            className="neu-panel-inset px-3 py-1.5 text-xs font-semibold text-slate-700 rounded-xl focus:outline-none"
          >
            <option value="ALL">All Fleet Buses</option>
            {buses.map(b => (
              <option key={b.id} value={b.id}>{b.bus_number}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="neu-panel-inset px-3 py-1.5 text-xs font-semibold text-slate-700 rounded-xl focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="In Progress">In Progress</option>
            <option value="Critical">Critical</option>
            <option value="Completed">Completed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="neu-panel-inset px-3 py-1.5 text-xs font-semibold text-slate-700 rounded-xl focus:outline-none"
          >
            <option value="ALL">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Work Orders List */}
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map(n => (
            <div key={n} className="neu-panel p-6 h-28 rounded-2xl bg-slate-200/50"></div>
          ))}
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="neu-panel p-12 text-center text-slate-500 text-xs">
          No maintenance work orders found matching your filters.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLogs.map((log) => {
            const isCompleted = log.status === 'Completed';
            const isCritical = log.priority === 'Critical' || log.status === 'Critical';

            return (
              <div 
                key={log.id} 
                className={`neu-panel p-5 space-y-3.5 transition-all ${
                  isCritical ? 'border border-rose-300 bg-rose-50/20' : ''
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div className={`w-11 h-11 rounded-xl neu-panel flex items-center justify-center font-black shrink-0 ${
                      isCritical ? 'text-rose-600' : 'text-blue-600'
                    }`}>
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-bold text-xs bg-slate-200/80 text-slate-800 px-2 py-0.5 rounded-lg font-mono">
                          {log.bus_number}
                        </span>
                        <h3 className="font-extrabold text-base text-slate-900">
                          {log.service_type}
                        </h3>
                        <StatusBadge status={log.status} />
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.priority === 'Critical' ? 'bg-rose-100 text-rose-800 animate-pulse' :
                          log.priority === 'High' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {log.priority} Priority
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 mt-1">
                        {log.description}
                      </p>
                    </div>
                  </div>

                  {/* Cost & Completion Action */}
                  <div className="flex items-center gap-4 self-end md:self-center">
                    <div className="text-right text-xs">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Cost</span>
                      <span className="font-black text-slate-800 text-base">₹{log.cost.toLocaleString()}</span>
                    </div>

                    {!isCompleted && canManage && (
                      <button
                        onClick={() => handleCompleteOrder(log.id)}
                        className="neu-button px-3.5 py-1.5 rounded-xl text-xs font-bold text-emerald-700 hover:bg-emerald-50 flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Mark Done</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub details footer */}
                <div className="pt-2.5 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Date: <strong className="text-slate-700">{log.service_date}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Gauge className="w-3.5 h-3.5 text-slate-400" />
                      Odometer: <strong className="text-slate-700">{log.odometer_reading?.toLocaleString()} km</strong>
                    </span>
                    {log.vendor_name && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        Vendor: <strong className="text-slate-700">{log.vendor_name}</strong>
                      </span>
                    )}
                  </div>

                  {log.completion_date && (
                    <span className="text-emerald-700 font-bold">
                      Completed on {log.completion_date}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Report Maintenance Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="neu-panel max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-blue-600" />
                <span>{isDriver ? 'Report Vehicle Check Defect' : 'Log Maintenance Work Order'}</span>
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="neu-button p-1.5 rounded-lg text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Select Bus</label>
                  <select
                    required
                    value={formData.bus_id}
                    onChange={(e) => setFormData({...formData, bus_id: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                  >
                    {buses.map(b => (
                      <option key={b.id} value={b.id}>{b.bus_number}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical (Immediate Workshop)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Service Type</label>
                <select
                  value={formData.service_type}
                  onChange={(e) => setFormData({...formData, service_type: e.target.value})}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                >
                  <option value="Routine Inspection">Routine Inspection</option>
                  <option value="Oil & Filter Change">Oil & Filter Change</option>
                  <option value="Brake Service">Brake Service</option>
                  <option value="Tire Replacement">Tire Replacement</option>
                  <option value="Electrical & Lighting">Electrical & Lighting</option>
                  <option value="AC Compressor Servicing">AC Compressor Servicing</option>
                  <option value="Suspension Overhaul">Suspension Overhaul</option>
                  <option value="Engine Diagnostic">Engine Diagnostic</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Defect Description / Work Required</label>
                <textarea
                  rows="2"
                  required
                  placeholder="Detail observed issue or technician checklist notes..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Estimated Cost (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.cost}
                    onChange={(e) => setFormData({...formData, cost: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Workshop / Vendor Name</label>
                <input
                  type="text"
                  placeholder="Ashok Leyland Service Center"
                  value={formData.vendor_name}
                  onChange={(e) => setFormData({...formData, vendor_name: e.target.value})}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                />
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
                  {formSubmitting ? 'Submitting...' : 'Submit Work Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
