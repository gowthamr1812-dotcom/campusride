import React, { useState, useEffect } from 'react';
import { 
  AlertOctagon, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Phone, 
  Bus as BusIcon, 
  MapPin, 
  Clock, 
  RefreshCw, 
  Plus, 
  X, 
  Send, 
  LifeBuoy, 
  Search, 
  Filter,
  User,
  Radio,
  FileText
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

export default function Emergency() {
  const { user, hasRole } = useAuth();
  const isAdminOrManager = hasRole(['ADMIN', 'TRANSPORT_MANAGER']);
  const isDriverOrIncharge = hasRole(['DRIVER', 'BUS_INCHARGE']);

  const [incidents, setIncidents] = useState([]);
  const [buses, setBuses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);

  // Trigger SOS Modal State
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [triggerSubmitting, setTriggerSubmitting] = useState(false);
  const [triggerForm, setTriggerForm] = useState({
    bus_id: '',
    incident_type: 'Breakdown / Mechanical',
    severity: 'High',
    location_name: '',
    description: ''
  });

  // Dispatch / Resolve Modal State
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionForm, setActionForm] = useState({
    status: 'Dispatched',
    rescue_bus_id: '',
    resolution_notes: ''
  });

  const fetchData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      let url = '/emergency?';
      if (statusFilter !== 'ALL') url += `status=${statusFilter}&`;

      const [incRes, busesRes, sumRes] = await Promise.all([
        api.get(url),
        api.get('/buses'),
        api.get('/emergency/summary')
      ]);

      setIncidents(incRes.items || []);
      setBuses(busesRes.items || []);
      setSummary(sumRes);

      if (busesRes.items?.length > 0 && !triggerForm.bus_id) {
        setTriggerForm(prev => ({ ...prev, bus_id: busesRes.items[0].id }));
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load emergency incident radar.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleTriggerSOS = async (e) => {
    e.preventDefault();
    setTriggerSubmitting(true);
    try {
      await api.post('/emergency', {
        ...triggerForm,
        bus_id: Number(triggerForm.bus_id)
      });
      setShowTriggerModal(false);
      setTriggerForm({
        bus_id: buses[0]?.id || '',
        incident_type: 'Breakdown / Mechanical',
        severity: 'High',
        location_name: '',
        description: ''
      });
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to broadcast Emergency SOS.');
    } finally {
      setTriggerSubmitting(false);
    }
  };

  const handleUpdateIncident = async (e) => {
    e.preventDefault();
    if (!selectedIncident) return;
    setActionSubmitting(true);
    try {
      await api.put(`/emergency/${selectedIncident.id}`, {
        status: actionForm.status,
        resolution_notes: actionForm.resolution_notes,
        rescue_bus_id: actionForm.rescue_bus_id ? Number(actionForm.rescue_bus_id) : null
      });
      setShowActionModal(false);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to update emergency incident.');
    } finally {
      setActionSubmitting(false);
    }
  };

  const openActionModal = (inc, initialStatus) => {
    setSelectedIncident(inc);
    setActionForm({
      status: initialStatus,
      rescue_bus_id: inc.rescue_bus_id ? String(inc.rescue_bus_id) : (buses[0]?.id || ''),
      resolution_notes: inc.resolution_notes || ''
    });
    setShowActionModal(true);
  };

  const filteredIncidents = incidents.filter(i => {
    const term = search.toLowerCase();
    return (
      i.incident_code.toLowerCase().includes(term) ||
      (i.bus_number && i.bus_number.toLowerCase().includes(term)) ||
      i.incident_type.toLowerCase().includes(term) ||
      (i.location_name && i.location_name.toLowerCase().includes(term)) ||
      (i.driver_name && i.driver_name.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <AlertOctagon className="w-7 h-7 text-rose-600 animate-pulse" />
            Emergency SOS & Dispatch Radar
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time critical incident triage, emergency broadcast dispatch, and rescue fleet coordination
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="neu-button px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 transition flex items-center gap-2 text-xs font-semibold"
            title="Refresh radar"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Sync
          </button>

          {/* Trigger Emergency SOS Button */}
          <button
            onClick={() => setShowTriggerModal(true)}
            className="bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-600/20 transition-transform active:scale-95"
          >
            <AlertOctagon className="w-4 h-4" />
            Trigger Emergency SOS
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="neu-panel p-5 rounded-2xl flex items-center gap-4 border-l-4 border-rose-500">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertOctagon className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Active SOS Alerts</span>
            <div className="text-2xl font-extrabold text-rose-600 mt-0.5">
              {summary?.active_sos_count ?? 0} Critical
            </div>
            <span className="text-[11px] text-rose-500 font-semibold block mt-0.5">
              Command team standing by
            </span>
          </div>
        </div>

        <div className="neu-panel p-5 rounded-2xl flex items-center gap-4 border-l-4 border-amber-500">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <LifeBuoy className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Units Dispatched</span>
            <div className="text-2xl font-extrabold text-amber-600 mt-0.5">
              {summary?.dispatched_count ?? 0} En Route
            </div>
            <span className="text-[11px] text-amber-600 font-medium block mt-0.5">
              Rescue buses on site
            </span>
          </div>
        </div>

        <div className="neu-panel p-5 rounded-2xl flex items-center gap-4 border-l-4 border-emerald-500">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Resolved Incidents</span>
            <div className="text-2xl font-extrabold text-emerald-700 mt-0.5">
              {summary?.resolved_count ?? 0} Cleared
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold block mt-0.5">
              Normal operations restored
            </span>
          </div>
        </div>

        <div className="neu-panel p-5 rounded-2xl flex items-center gap-4 border-l-4 border-blue-500">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Incidents</span>
            <div className="text-2xl font-extrabold text-slate-800 mt-0.5">
              {summary?.total_incidents ?? incidents.length} Logged
            </div>
            <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
              Statutory safety register
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="neu-panel p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search incident code, bus, location, or driver..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="neu-panel-inset w-full pl-9 pr-4 py-2 text-xs text-slate-800 rounded-xl placeholder-slate-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          {['ALL', 'Triggered / Active', 'Dispatched', 'Resolved'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'neu-button text-slate-600 hover:text-slate-900'
              }`}
            >
              {st}
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

      {/* Incident Cards Grid */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="neu-panel p-5 rounded-2xl animate-pulse space-y-3">
              <div className="h-4 bg-slate-200 rounded w-1/4"></div>
              <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : filteredIncidents.length === 0 ? (
        <div className="neu-panel p-12 rounded-2xl text-center text-slate-400">
          <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-2" />
          <h3 className="text-base font-bold text-slate-700">All Corridors Clear</h3>
          <p className="text-xs text-slate-400 mt-1">No emergency incidents matching the selected filter criteria.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredIncidents.map((inc) => {
            const isActive = inc.status === 'Triggered / Active';
            const isDispatched = inc.status === 'Dispatched';

            return (
              <div 
                key={inc.id}
                className={`neu-panel p-5 rounded-2xl border transition-all ${
                  isActive 
                    ? 'border-rose-400/80 bg-rose-50/20 shadow-md' 
                    : isDispatched 
                    ? 'border-amber-400/80 bg-amber-50/20' 
                    : 'border-white/60'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0 ${
                      isActive ? 'bg-rose-600 animate-pulse' : isDispatched ? 'bg-amber-500' : 'bg-slate-600'
                    }`}>
                      <AlertOctagon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-sm text-slate-800">{inc.incident_code}</span>
                        <StatusBadge status={inc.status} />
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          inc.severity === 'Critical' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                          inc.severity === 'High' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                          'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}>
                          {inc.severity} Severity
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-rose-600 mt-0.5 block">
                        {inc.incident_type}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(inc.reported_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {inc.driver_phone && (
                      <a 
                        href={`tel:${inc.driver_phone}`}
                        className="neu-button px-2.5 py-1 rounded-xl text-emerald-600 font-bold flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        Call Driver
                      </a>
                    )}
                  </div>
                </div>

                {/* Details Body */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                  <div className="md:col-span-2 space-y-2">
                    <div className="text-xs text-slate-700">
                      <span className="font-bold text-slate-800">Situation Report: </span>
                      {inc.description}
                    </div>

                    <div className="text-xs text-slate-600 flex items-center gap-1.5 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>{inc.location_name || 'Transit Corridor'}</span>
                    </div>

                    {inc.rescue_bus_number && (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                        <LifeBuoy className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Rescue Vehicle Dispatched: <strong>{inc.rescue_bus_number}</strong></span>
                      </div>
                    )}

                    {inc.resolution_notes && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                        <strong>Resolution Action: </strong> {inc.resolution_notes}
                      </div>
                    )}
                  </div>

                  {/* Metadata and Quick Actions */}
                  <div className="neu-panel-inset p-3 rounded-xl flex flex-col justify-between space-y-2 text-xs">
                    <div>
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                        <span className="text-[11px] text-slate-400 font-bold">BUS NUMBER</span>
                        <span className="font-extrabold text-blue-700 flex items-center gap-1">
                          <BusIcon className="w-3 h-3" />
                          {inc.bus_number}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1.5 border-b border-slate-200">
                        <span className="text-[11px] text-slate-400 font-bold">ROUTE</span>
                        <span className="font-semibold text-slate-700">{inc.route_name || 'Assigned Route'}</span>
                      </div>

                      <div className="flex items-center justify-between pt-1.5">
                        <span className="text-[11px] text-slate-400 font-bold">OPERATOR</span>
                        <span className="font-semibold text-slate-700">{inc.driver_name || 'Driver'}</span>
                      </div>
                    </div>

                    {/* Action Buttons for Admins & Managers */}
                    {isAdminOrManager && (isActive || isDispatched) && (
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                        {isActive && (
                          <button
                            onClick={() => openActionModal(inc, 'Dispatched')}
                            className="neu-button flex-1 py-1.5 rounded-lg text-xs font-bold text-amber-700 hover:text-amber-900"
                          >
                            Dispatch Rescue
                          </button>
                        )}
                        <button
                          onClick={() => openActionModal(inc, 'Resolved')}
                          className="neu-button-primary flex-1 py-1.5 rounded-lg text-xs font-bold"
                        >
                          Mark Resolved
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Trigger SOS Modal */}
      {showTriggerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="neu-panel bg-[#E8EDF3] rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-white/60">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center">
                  <AlertOctagon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Trigger Emergency SOS Alert</h3>
                  <p className="text-[11px] text-slate-500">Instant high-priority broadcast to command center and students</p>
                </div>
              </div>
              <button 
                onClick={() => setShowTriggerModal(false)}
                className="neu-button p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleTriggerSOS} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Impacted Bus</label>
                  <select
                    value={triggerForm.bus_id}
                    onChange={(e) => setTriggerForm({...triggerForm, bus_id: e.target.value})}
                    required
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl font-bold"
                  >
                    {buses.map(b => (
                      <option key={b.id} value={b.id}>{b.bus_number} ({b.registration_number})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Severity Level</label>
                  <select
                    value={triggerForm.severity}
                    onChange={(e) => setTriggerForm({...triggerForm, severity: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl font-bold text-rose-600"
                  >
                    <option value="Critical">Critical (Immediate Stop)</option>
                    <option value="High">High (Transit Hazard)</option>
                    <option value="Medium">Medium (Delayed)</option>
                    <option value="Low">Low (Informative)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Incident Type</label>
                <select
                  value={triggerForm.incident_type}
                  onChange={(e) => setTriggerForm({...triggerForm, incident_type: e.target.value})}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                >
                  <option value="Breakdown / Mechanical">Breakdown / Mechanical (Engine/Brake)</option>
                  <option value="Medical Emergency">Medical Emergency (Student/Crew)</option>
                  <option value="Road Accident / Collision">Road Accident / Collision</option>
                  <option value="Severe Traffic Gridlock">Severe Traffic Gridlock / Bottleneck</option>
                  <option value="Route Deviation">Route Deviation / Detour</option>
                  <option value="Student Safety Concern">Student Safety Concern</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Location / Landmark Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GST Road near Perungalathur Flyover"
                  value={triggerForm.location_name}
                  onChange={(e) => setTriggerForm({...triggerForm, location_name: e.target.value})}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Situation Report & Remarks</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Detail observed hazard, passenger count on board, and immediate requirements..."
                  value={triggerForm.description}
                  onChange={(e) => setTriggerForm({...triggerForm, description: e.target.value})}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowTriggerModal(false)}
                  className="neu-button px-4 py-2 rounded-xl text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={triggerSubmitting}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-600/20"
                >
                  <AlertOctagon className="w-4 h-4" />
                  {triggerSubmitting ? 'Transmitting...' : 'Transmit SOS Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Action / Dispatch / Resolve Modal */}
      {showActionModal && selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="neu-panel bg-[#E8EDF3] rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-white/60">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <LifeBuoy className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Incident Response: {selectedIncident.incident_code}
                  </h3>
                  <p className="text-[11px] text-slate-500">Dispatch rescue assets or mark incident cleared</p>
                </div>
              </div>
              <button 
                onClick={() => setShowActionModal(false)}
                className="neu-button p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateIncident} className="space-y-4 mt-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Target Action Status</label>
                <select
                  value={actionForm.status}
                  onChange={(e) => setActionForm({...actionForm, status: e.target.value})}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl font-bold"
                >
                  <option value="Dispatched">Dispatched (Rescue Bus En Route)</option>
                  <option value="Resolved">Resolved (Safe & Operational)</option>
                  <option value="False Alarm">False Alarm / Cleared</option>
                </select>
              </div>

              {actionForm.status === 'Dispatched' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Select Rescue / Replacement Bus</label>
                  <select
                    value={actionForm.rescue_bus_id}
                    onChange={(e) => setActionForm({...actionForm, rescue_bus_id: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl font-bold"
                  >
                    <option value="">No Vehicle Assigned</option>
                    {buses
                      .filter(b => b.id !== selectedIncident.bus_id)
                      .map(b => (
                        <option key={b.id} value={b.id}>
                          {b.bus_number} ({b.registration_number}) - Capacity {b.capacity}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Action Notes / Resolution Report</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Detail rescue deployment or technician fix executed..."
                  value={actionForm.resolution_notes}
                  onChange={(e) => setActionForm({...actionForm, resolution_notes: e.target.value})}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowActionModal(false)}
                  className="neu-button px-4 py-2 rounded-xl text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionSubmitting}
                  className="neu-button-primary px-5 py-2 rounded-xl text-xs font-bold"
                >
                  {actionSubmitting ? 'Saving...' : 'Update Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
