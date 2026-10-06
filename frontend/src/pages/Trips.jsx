import React, { useState, useEffect } from 'react';
import { 
  Navigation, 
  Search, 
  Plus, 
  Bus as BusIcon, 
  GitFork, 
  UserSquare2, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  Play, 
  CheckSquare, 
  XSquare, 
  RefreshCw, 
  AlertCircle, 
  X,
  Users,
  Calendar
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

export default function Trips() {
  const { hasRole, user } = useAuth();
  const canSchedule = hasRole(['ADMIN', 'TRANSPORT_MANAGER']);
  const canOperate = hasRole(['ADMIN', 'TRANSPORT_MANAGER', 'DRIVER', 'BUS_INCHARGE']);

  const [trips, setTrips] = useState([]);
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [errorMessage, setErrorMessage] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(null);

  // New Trip Modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [newTripForm, setNewTripForm] = useState({
    trip_id: '',
    bus_id: '',
    route_id: '',
    trip_type: 'Morning Pickup',
    scheduled_start_time: '07:30 AM',
    total_expected_passengers: 45
  });

  const fetchTripsData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      let url = '/trips?';
      if (statusFilter !== 'ALL') url += `status=${encodeURIComponent(statusFilter)}&`;

      const [tripsRes, busesRes, routesRes] = await Promise.all([
        api.get(url),
        api.get('/buses'),
        api.get('/routes')
      ]);

      setTrips(tripsRes.items || []);
      setBuses(busesRes.items || []);
      setRoutes(routesRes.items || []);

      if (busesRes.items?.length > 0 && !newTripForm.bus_id) {
        setNewTripForm(prev => ({
          ...prev,
          bus_id: busesRes.items[0].id,
          route_id: routesRes.items?.[0]?.id || ''
        }));
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load daily transportation trips.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTripsData();
  }, [statusFilter]);

  // Operational Actions: Pre-Trip Inspection Checklist
  const handleVehicleCheck = async (tripId) => {
    setActionInProgress(tripId);
    try {
      await api.post(`/trips/${tripId}/check`);
      await fetchTripsData();
    } catch (err) {
      alert(err.message || 'Failed to submit vehicle pre-check.');
    } finally {
      setActionInProgress(null);
    }
  };

  // Operational Action: Start Trip
  const handleStartTrip = async (tripId) => {
    setActionInProgress(tripId);
    try {
      await api.post(`/trips/${tripId}/start`);
      await fetchTripsData();
    } catch (err) {
      alert(err.message || 'Failed to start trip.');
    } finally {
      setActionInProgress(null);
    }
  };

  // Operational Action: End Trip
  const handleEndTrip = async (tripId) => {
    if (!window.confirm('Are you sure you want to conclude this route run?')) return;
    setActionInProgress(tripId);
    try {
      await api.post(`/trips/${tripId}/end`);
      await fetchTripsData();
    } catch (err) {
      alert(err.message || 'Failed to complete trip.');
    } finally {
      setActionInProgress(null);
    }
  };

  // Schedule New Trip
  const handleScheduleTrip = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      await api.post('/trips', {
        ...newTripForm,
        bus_id: Number(newTripForm.bus_id),
        route_id: Number(newTripForm.route_id),
        total_expected_passengers: Number(newTripForm.total_expected_passengers)
      });
      setShowScheduleModal(false);
      fetchTripsData();
    } catch (err) {
      alert(err.message || 'Error scheduling trip.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // KPI counts
  const totalTrips = trips.length;
  const inProgressTrips = trips.filter(t => t.status === 'Started' || t.status === 'In Progress').length;
  const scheduledTrips = trips.filter(t => t.status === 'Scheduled' || t.status === 'Ready').length;
  const completedTrips = trips.filter(t => t.status === 'Completed').length;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="neu-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
              Daily Route Trips & Dispatch Console
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
              {totalTrips} Scheduled Runs
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Coordinate vehicle pre-trip checklists, departure dispatches, live trip monitoring, and run completion.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchTripsData}
            className="neu-button px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-blue-600 flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh</span>
          </button>

          {canSchedule && (
            <button
              onClick={() => {
                const autoCode = `TRIP-${String(trips.length + 1).padStart(3, '0')}`;
                setNewTripForm(prev => ({ ...prev, trip_id: autoCode }));
                setShowScheduleModal(true);
              }}
              className="neu-button-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Trip</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="neu-panel p-4 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Total Runs</span>
          <div className="text-xl font-black text-slate-800">{totalTrips}</div>
        </div>
        <div className="neu-panel p-4 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase">In Progress</span>
          <div className="text-xl font-black text-emerald-600">{inProgressTrips}</div>
        </div>
        <div className="neu-panel p-4 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Scheduled / Ready</span>
          <div className="text-xl font-black text-blue-600">{scheduledTrips}</div>
        </div>
        <div className="neu-panel p-4 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Completed</span>
          <div className="text-xl font-black text-slate-600">{completedTrips}</div>
        </div>
      </div>

      {/* Filter Strip */}
      <div className="neu-panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span className="text-xs font-bold text-slate-700">Filter Trips by Status:</span>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'Scheduled', 'Ready', 'Started', 'Completed'].map((st) => (
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

      {/* Trips Cards / List */}
      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((n) => (
            <div key={n} className="neu-panel p-6 h-36 rounded-2xl bg-slate-200/50"></div>
          ))}
        </div>
      ) : trips.length === 0 ? (
        <div className="neu-panel p-12 text-center text-slate-500 text-xs">
          No transportation trips found matching your filter.
        </div>
      ) : (
        <div className="space-y-4">
          {trips.map((trip) => {
            const isActing = actionInProgress === trip.id || actionInProgress === trip.trip_id;
            const isStarted = trip.status === 'Started' || trip.status === 'In Progress';
            const isReady = trip.status === 'Ready';
            const isScheduled = trip.status === 'Scheduled';
            const isCompleted = trip.status === 'Completed';

            return (
              <div 
                key={trip.id}
                className="neu-panel p-5 space-y-4 hover:translate-y-[-1px] transition-transform"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Code, Route, Bus info */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl neu-panel flex items-center justify-center text-blue-600 font-black text-sm shrink-0">
                      <Navigation className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                          {trip.trip_id}
                        </span>
                        <h3 className="font-extrabold text-base text-slate-900">
                          {trip.route?.name || 'Assigned Transit Corridor'}
                        </h3>
                        <StatusBadge status={trip.status} />
                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          {trip.trip_type}
                        </span>
                      </div>

                      {/* Bus & Crew Badges */}
                      <div className="flex items-center gap-4 text-xs text-slate-600 mt-2 flex-wrap">
                        <span className="flex items-center gap-1 font-bold text-slate-800">
                          <BusIcon className="w-3.5 h-3.5 text-blue-600" />
                          {trip.bus?.bus_number || 'N/A'} ({trip.bus?.registration_number || 'TN AB'})
                        </span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1">
                          <UserSquare2 className="w-3.5 h-3.5 text-blue-500" />
                          Driver: <strong className="text-slate-800">{trip.driver?.name || 'Assigned Driver'}</strong>
                        </span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                          Incharge: <strong className="text-slate-800">{trip.incharge?.name || 'Assigned Incharge'}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Boarding progress & Status Indicators */}
                  <div className="flex items-center gap-4 self-end md:self-center">
                    <div className="text-right text-xs">
                      <div className="font-bold text-slate-700 flex items-center justify-end gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Sched: {trip.scheduled_start_time}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Pass Count: <strong className="text-slate-800">{trip.boarding_count} / {trip.total_expected_passengers}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Checklist Verification & Operational Actions */}
                <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Checklist indicator */}
                  <div className="flex items-center gap-2 text-xs">
                    {trip.vehicle_check_completed ? (
                      <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Vehicle Checklist Verified
                      </span>
                    ) : (
                      <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl font-bold flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-amber-600" />
                        Pre-Trip Safety Inspection Pending
                      </span>
                    )}

                    {trip.actual_start_time && (
                      <span className="text-[11px] text-slate-500">
                        Dispatched at: <strong>{trip.actual_start_time}</strong>
                      </span>
                    )}
                  </div>

                  {/* Action Buttons for Authorized Crew */}
                  {canOperate && !isCompleted && (
                    <div className="flex items-center gap-2">
                      {/* Vehicle Check Action */}
                      {!trip.vehicle_check_completed && (
                        <button
                          onClick={() => handleVehicleCheck(trip.trip_id)}
                          disabled={isActing}
                          className="neu-button px-3 py-1.5 rounded-xl text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1.5"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>Complete Pre-Trip Check</span>
                        </button>
                      )}

                      {/* Start Trip Action */}
                      {!isStarted && (
                        <button
                          onClick={() => handleStartTrip(trip.trip_id)}
                          disabled={isActing}
                          className="neu-button-primary px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Dispatch / Start Trip</span>
                        </button>
                      )}

                      {/* End Trip Action */}
                      {isStarted && (
                        <button
                          onClick={() => handleEndTrip(trip.trip_id)}
                          disabled={isActing}
                          className="neu-button px-4 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 border border-rose-200 flex items-center gap-1.5"
                        >
                          <XSquare className="w-3.5 h-3.5" />
                          <span>End Run & Complete</span>
                        </button>
                      )}
                    </div>
                  )}

                  {isCompleted && (
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Trip Completed Successfully ({trip.actual_end_time || 'On Schedule'})
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Trip Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="neu-panel max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-800">
                Schedule Route Run
              </h3>
              <button 
                onClick={() => setShowScheduleModal(false)}
                className="neu-button p-1.5 rounded-lg text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleScheduleTrip} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Trip Code</label>
                <input
                  type="text"
                  required
                  value={newTripForm.trip_id}
                  onChange={(e) => setNewTripForm({...newTripForm, trip_id: e.target.value})}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Select Bus</label>
                  <select
                    required
                    value={newTripForm.bus_id}
                    onChange={(e) => setNewTripForm({...newTripForm, bus_id: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  >
                    {buses.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.bus_number} ({b.capacity} Seats)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Select Route</label>
                  <select
                    required
                    value={newTripForm.route_id}
                    onChange={(e) => setNewTripForm({...newTripForm, route_id: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  >
                    {routes.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.route_code} - {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Trip Type</label>
                  <select
                    value={newTripForm.trip_type}
                    onChange={(e) => setNewTripForm({...newTripForm, trip_type: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  >
                    <option value="Morning Pickup">Morning Pickup</option>
                    <option value="Evening Drop">Evening Drop</option>
                    <option value="Special Transit">Special Transit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Scheduled Time</label>
                  <input
                    type="text"
                    required
                    placeholder="07:30 AM"
                    value={newTripForm.scheduled_start_time}
                    onChange={(e) => setNewTripForm({...newTripForm, scheduled_start_time: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Expected Passengers</label>
                <input
                  type="number"
                  min="1"
                  max="70"
                  value={newTripForm.total_expected_passengers}
                  onChange={(e) => setNewTripForm({...newTripForm, total_expected_passengers: Number(e.target.value)})}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="neu-button px-4 py-2 rounded-xl text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="neu-button-primary px-5 py-2 rounded-xl text-xs font-bold"
                >
                  {formSubmitting ? 'Scheduling...' : 'Save Run'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
