import React, { useState, useEffect } from 'react';
import { 
  GitFork, 
  Search, 
  Plus, 
  MapPin, 
  Clock, 
  Milestone, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw, 
  AlertCircle, 
  X, 
  Trash2, 
  CheckCircle2,
  Navigation
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

export default function RoutesPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole(['ADMIN', 'TRANSPORT_MANAGER']);

  const [routes, setRoutes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [errorMessage, setErrorMessage] = useState(null);
  const [expandedRouteId, setExpandedRouteId] = useState(null);

  // Modals
  const [showAddRouteModal, setShowAddRouteModal] = useState(false);
  const [showAddStopModal, setShowAddStopModal] = useState(false);
  const [targetRouteForStop, setTargetRouteForStop] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Route Form
  const [routeForm, setRouteForm] = useState({
    route_code: '',
    name: '',
    start_location: '',
    end_location: 'Campus Main Gate',
    total_distance_km: 25,
    estimated_duration_minutes: 45,
    status: 'Active'
  });

  // Stop Form
  const [stopForm, setStopForm] = useState({
    stop_name: '',
    sequence: 1,
    expected_arrival_time: '07:30 AM',
    landmark: '',
    latitude: 13.0827,
    longitude: 80.2707
  });

  const fetchRoutes = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      let url = '/routes?';
      if (search) url += `search=${encodeURIComponent(search)}&`;
      if (statusFilter !== 'ALL') url += `status=${encodeURIComponent(statusFilter)}&`;

      const res = await api.get(url);
      setRoutes(res.items || []);
      // If none expanded, expand the first route automatically for quick insight
      if (res.items && res.items.length > 0 && !expandedRouteId) {
        setExpandedRouteId(res.items[0].id);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to retrieve transportation routes.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, [search, statusFilter]);

  const handleCreateRoute = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      await api.post('/routes', routeForm);
      setShowAddRouteModal(false);
      setRouteForm({
        route_code: '',
        name: '',
        start_location: '',
        end_location: 'Campus Main Gate',
        total_distance_km: 25,
        estimated_duration_minutes: 45,
        status: 'Active'
      });
      fetchRoutes();
    } catch (err) {
      alert(err.message || 'Error creating route');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleOpenAddStop = (route) => {
    setTargetRouteForStop(route);
    const nextSeq = (route.stops?.length || 0) + 1;
    setStopForm({
      stop_name: '',
      sequence: nextSeq,
      expected_arrival_time: '07:45 AM',
      landmark: '',
      latitude: 13.0827,
      longitude: 80.2707
    });
    setShowAddStopModal(true);
  };

  const handleCreateStop = async (e) => {
    e.preventDefault();
    if (!targetRouteForStop) return;
    setFormSubmitting(true);
    try {
      await api.post(`/routes/${targetRouteForStop.id}/stops`, stopForm);
      setShowAddStopModal(false);
      fetchRoutes();
    } catch (err) {
      alert(err.message || 'Error adding stop to route');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteStop = async (stopId) => {
    if (!window.confirm('Are you sure you want to remove this stop from the route?')) return;
    try {
      await api.delete(`/routes/stops/${stopId}`);
      fetchRoutes();
    } catch (err) {
      alert(err.message || 'Error removing stop');
    }
  };

  const totalDistance = routes.reduce((acc, r) => acc + (r.total_distance_km || 0), 0);
  const avgDistance = routes.length > 0 ? (totalDistance / routes.length).toFixed(1) : 0;
  const activeRoutesCount = routes.filter(r => r.status === 'Active').length;

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="neu-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
              Transit Routes & Timetable
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
              {routes.length} Active Corridors
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Define arterial routes, intermediate pickup stops, landmarks, sequences, and scheduled arrival times.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchRoutes}
            className="neu-button px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-blue-600 flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh</span>
          </button>

          {canManage && (
            <button
              onClick={() => setShowAddRouteModal(true)}
              className="neu-button-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>New Route</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="neu-panel p-4 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Total Routes</span>
          <div className="text-xl font-black text-slate-800">{routes.length}</div>
        </div>
        <div className="neu-panel p-4 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Active Status</span>
          <div className="text-xl font-black text-emerald-600">{activeRoutesCount}</div>
        </div>
        <div className="neu-panel p-4 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Average Distance</span>
          <div className="text-xl font-black text-blue-600">{avgDistance} km</div>
        </div>
        <div className="neu-panel p-4 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Total Network Span</span>
          <div className="text-xl font-black text-purple-600">{totalDistance.toFixed(0)} km</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="neu-panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search route code (R-01), name, or endpoint..."
            className="neu-panel-inset w-full pl-9 pr-4 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {['ALL', 'Active', 'Inactive'].map((st) => (
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

      {/* Routes List */}
      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((n) => (
            <div key={n} className="neu-panel p-6 h-36 rounded-2xl bg-slate-200/50"></div>
          ))}
        </div>
      ) : routes.length === 0 ? (
        <div className="neu-panel p-12 text-center text-slate-500 text-xs">
          No transportation routes found matching your criteria.
        </div>
      ) : (
        <div className="space-y-4">
          {routes.map((route) => {
            const isExpanded = expandedRouteId === route.id;
            const stops = route.stops || [];

            return (
              <div 
                key={route.id}
                className="neu-panel p-5 space-y-4 transition-all"
              >
                {/* Main Route Header Row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl neu-panel flex items-center justify-center text-blue-600 font-black text-sm shrink-0">
                      <GitFork className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                          {route.route_code}
                        </span>
                        <h3 className="font-extrabold text-base text-slate-900">
                          {route.name}
                        </h3>
                        <StatusBadge status={route.status} />
                      </div>

                      {/* Origin -> Destination Breadcrumbs */}
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-blue-500" />
                          {route.start_location}
                        </span>
                        <span>&rarr;</span>
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                          {route.end_location}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Distance, Duration, Stops and Expand CTA */}
                  <div className="flex items-center gap-4 self-end md:self-center">
                    <div className="text-right text-xs">
                      <div className="font-extrabold text-slate-800">
                        {route.total_distance_km} km &bull; {route.estimated_duration_minutes} min
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        {stops.length} Scheduled Stops
                      </div>
                    </div>

                    <button
                      onClick={() => setExpandedRouteId(isExpanded ? null : route.id)}
                      className="neu-button p-2.5 rounded-xl text-slate-600 hover:text-blue-600 flex items-center gap-1.5 text-xs font-bold"
                    >
                      <span>{isExpanded ? 'Collapse' : 'View Stops'}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Stops Accordion */}
                {isExpanded && (
                  <div className="pt-4 border-t border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Milestone className="w-4 h-4 text-blue-600" />
                        <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                          Intermediate Stops Sequence & Timetable
                        </h4>
                      </div>

                      {canManage && (
                        <button
                          onClick={() => handleOpenAddStop(route)}
                          className="neu-button px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Stop</span>
                        </button>
                      )}
                    </div>

                    {stops.length === 0 ? (
                      <div className="neu-panel-inset p-6 text-center text-xs text-slate-400 rounded-xl">
                        No intermediate stops defined for this corridor yet.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-700 border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase font-bold">
                              <th className="py-2.5 px-3">Seq</th>
                              <th className="py-2.5 px-3">Stop Name</th>
                              <th className="py-2.5 px-3">Landmark</th>
                              <th className="py-2.5 px-3">Arrival Time</th>
                              <th className="py-2.5 px-3">Coordinates</th>
                              {canManage && <th className="py-2.5 px-3 text-right">Action</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {stops.map((stop) => (
                              <tr key={stop.id} className="hover:bg-slate-200/30 transition-colors">
                                <td className="py-2.5 px-3 font-mono font-bold text-blue-600">
                                  #{stop.sequence}
                                </td>
                                <td className="py-2.5 px-3 font-extrabold text-slate-800">
                                  {stop.stop_name}
                                </td>
                                <td className="py-2.5 px-3 text-slate-500">
                                  {stop.landmark || '—'}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                                    {stop.expected_arrival_time || '—'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                                  {stop.latitude?.toFixed(4)}, {stop.longitude?.toFixed(4)}
                                </td>
                                {canManage && (
                                  <td className="py-2.5 px-3 text-right">
                                    <button
                                      onClick={() => handleDeleteStop(stop.id)}
                                      className="neu-button p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                                      title="Remove Stop"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Route Modal */}
      {showAddRouteModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="neu-panel max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-800">
                Create New Transit Corridor
              </h3>
              <button 
                onClick={() => setShowAddRouteModal(false)}
                className="neu-button p-1.5 rounded-lg text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRoute} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Route Code</label>
                  <input
                    type="text"
                    required
                    placeholder="R-21"
                    value={routeForm.route_code}
                    onChange={(e) => setRouteForm({...routeForm, route_code: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Status</label>
                  <select
                    value={routeForm.status}
                    onChange={(e) => setRouteForm({...routeForm, status: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Route Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Marina Beach to College Campus"
                  value={routeForm.name}
                  onChange={(e) => setRouteForm({...routeForm, name: e.target.value})}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Start Location</label>
                  <input
                    type="text"
                    required
                    placeholder="Marina Light House"
                    value={routeForm.start_location}
                    onChange={(e) => setRouteForm({...routeForm, start_location: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">End Location</label>
                  <input
                    type="text"
                    required
                    value={routeForm.end_location}
                    onChange={(e) => setRouteForm({...routeForm, end_location: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Distance (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={routeForm.total_distance_km}
                    onChange={(e) => setRouteForm({...routeForm, total_distance_km: Number(e.target.value)})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Duration (mins)</label>
                  <input
                    type="number"
                    min="5"
                    value={routeForm.estimated_duration_minutes}
                    onChange={(e) => setRouteForm({...routeForm, estimated_duration_minutes: Number(e.target.value)})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddRouteModal(false)}
                  className="neu-button px-4 py-2 rounded-xl text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="neu-button-primary px-5 py-2 rounded-xl text-xs font-bold"
                >
                  {formSubmitting ? 'Creating...' : 'Save Corridor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Stop Modal */}
      {showAddStopModal && targetRouteForStop && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="neu-panel max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Add Stop to {targetRouteForStop.route_code}
                </h3>
                <p className="text-[11px] text-slate-500">{targetRouteForStop.name}</p>
              </div>
              <button 
                onClick={() => setShowAddStopModal(false)}
                className="neu-button p-1.5 rounded-lg text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStop} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Stop Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. T. Nagar Bus Terminus"
                  value={stopForm.stop_name}
                  onChange={(e) => setStopForm({...stopForm, stop_name: e.target.value})}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Stop Sequence #</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={stopForm.sequence}
                    onChange={(e) => setStopForm({...stopForm, sequence: Number(e.target.value)})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Scheduled Time</label>
                  <input
                    type="text"
                    placeholder="07:40 AM"
                    value={stopForm.expected_arrival_time}
                    onChange={(e) => setStopForm({...stopForm, expected_arrival_time: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Landmark</label>
                <input
                  type="text"
                  placeholder="Opposite Metro Station Pillar 104"
                  value={stopForm.landmark}
                  onChange={(e) => setStopForm({...stopForm, landmark: e.target.value})}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={stopForm.latitude}
                    onChange={(e) => setStopForm({...stopForm, latitude: Number(e.target.value)})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={stopForm.longitude}
                    onChange={(e) => setStopForm({...stopForm, longitude: Number(e.target.value)})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddStopModal(false)}
                  className="neu-button px-4 py-2 rounded-xl text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="neu-button-primary px-5 py-2 rounded-xl text-xs font-bold"
                >
                  {formSubmitting ? 'Adding...' : 'Save Stop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
