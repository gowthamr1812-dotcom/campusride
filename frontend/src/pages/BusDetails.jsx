import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Bus as BusIcon, 
  ArrowLeft, 
  MapPin, 
  UserSquare2, 
  ShieldCheck, 
  Fuel, 
  Gauge, 
  Armchair, 
  Edit3, 
  Clock, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Navigation,
  RefreshCw,
  Hash
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

export default function BusDetails() {
  const { busIdentifier } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canManage = hasRole(['ADMIN', 'TRANSPORT_MANAGER']);

  const [bus, setBus] = useState(null);
  const [seats, setSeats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    registration_number: '',
    capacity: 50,
    status: 'Running',
    gps_device_id: '',
    fuel_level_percent: 85,
    speed: 0
  });

  const fetchBusData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [busData, seatsData] = await Promise.all([
        api.get(`/buses/${busIdentifier}`),
        api.get(`/buses/${busIdentifier}/seats`)
      ]);
      setBus(busData);
      setSeats(seatsData || []);
      setEditForm({
        registration_number: busData.registration_number || '',
        capacity: busData.capacity || 50,
        status: busData.status || 'Running',
        gps_device_id: busData.gps_device_id || '',
        fuel_level_percent: busData.fuel_level_percent || 80,
        speed: busData.speed || 0
      });
    } catch (err) {
      setErrorMessage(err.message || 'Failed to retrieve bus details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (busIdentifier) {
      fetchBusData();
    }
  }, [busIdentifier]);

  const handleUpdateBus = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      const updated = await api.put(`/buses/${busIdentifier}`, editForm);
      setBus(updated);
      setShowEditModal(false);
    } catch (err) {
      alert(err.message || 'Error updating vehicle details');
    } finally {
      setFormSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="neu-panel p-6 h-28 bg-slate-200/50 rounded-2xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="neu-panel p-6 h-64 bg-slate-200/50 rounded-2xl"></div>
          <div className="neu-panel p-6 h-64 bg-slate-200/50 rounded-2xl"></div>
          <div className="neu-panel p-6 h-64 bg-slate-200/50 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (errorMessage || !bus) {
    return (
      <div className="neu-panel p-10 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">Vehicle Not Found</h3>
        <p className="text-xs text-slate-500">{errorMessage || `No bus registered with identifier ${busIdentifier}`}</p>
        <button
          onClick={() => navigate('/buses')}
          className="neu-button px-4 py-2 rounded-xl text-xs font-bold text-blue-600 inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Fleet Registry</span>
        </button>
      </div>
    );
  }

  // Seat stats
  const assignedCount = seats.filter(s => s.status === 'Assigned').length;
  const availableCount = seats.filter(s => s.status === 'Available').length;
  const reservedCount = seats.filter(s => s.status === 'Reserved').length;
  const blockedCount = seats.filter(s => s.status === 'Blocked' || s.status === 'Maintenance').length;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="neu-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/buses')}
            className="neu-button p-2.5 rounded-xl text-slate-600 hover:text-blue-600"
            title="Back to Fleet"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                {bus.bus_number}
              </h2>
              <StatusBadge status={bus.status} />
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
              <span className="font-mono font-bold text-slate-700">{bus.registration_number}</span>
              <span>&bull;</span>
              <span>Capacity: <strong>{bus.capacity} seats</strong></span>
              <span>&bull;</span>
              <span>GPS ID: <code className="bg-slate-200/70 px-1.5 py-0.5 rounded text-[11px]">{bus.gps_device_id || 'N/A'}</code></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchBusData}
            className="neu-button px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-blue-600 flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <Link
            to={`/seats?bus=${bus.id}`}
            className="neu-button px-3.5 py-2 rounded-xl text-xs font-bold text-blue-600 flex items-center gap-1.5"
          >
            <Armchair className="w-4 h-4" />
            <span>Seat Manager</span>
          </Link>

          {canManage && (
            <button
              onClick={() => setShowEditModal(true)}
              className="neu-button-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Vehicle</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of Diagnostics & Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Telematics & Health */}
        <div className="neu-panel p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <Gauge className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-800">Telematics & Status</h3>
          </div>

          <div className="space-y-3.5">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500 flex items-center gap-1">
                  <Fuel className="w-3.5 h-3.5 text-slate-400" /> Fuel Reserve
                </span>
                <span className="font-bold text-slate-800">{bus.fuel_level_percent}%</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${bus.fuel_level_percent < 25 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                  style={{ width: `${bus.fuel_level_percent}%` }}
                ></div>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-100">
              <span className="text-slate-500">Current Velocity:</span>
              <span className="font-mono font-extrabold text-blue-600 text-sm">
                {bus.speed} km/h
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Odometer:</span>
              <span className="font-mono font-semibold text-slate-700">
                {bus.odometer?.toLocaleString() || '12,480'} km
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Last Coordinates:</span>
              <span className="font-mono text-[11px] text-slate-600">
                {bus.latitude?.toFixed(4)}, {bus.longitude?.toFixed(4)}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-100">
              <span className="text-slate-500">Hardware Status:</span>
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                GPS Telematics Online
              </span>
            </div>
          </div>
        </div>

        {/* Assigned Route */}
        <div className="neu-panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-800">Assigned Route</h3>
            </div>
            {bus.route && (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                {bus.route.route_code}
              </span>
            )}
          </div>

          {bus.route ? (
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Route Name</span>
                <span className="font-extrabold text-slate-800 text-sm">{bus.route.name}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="neu-panel-inset p-2 rounded-lg">
                  <span className="text-[10px] text-slate-400 block font-semibold">Origin</span>
                  <span className="font-bold text-slate-700 truncate block">{bus.route.start_location}</span>
                </div>
                <div className="neu-panel-inset p-2 rounded-lg">
                  <span className="text-[10px] text-slate-400 block font-semibold">Destination</span>
                  <span className="font-bold text-slate-700 truncate block">{bus.route.end_location}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <span className="text-slate-500">Total Run Distance:</span>
                <span className="font-bold text-slate-700">{bus.route.total_distance_km} km</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Est Duration:</span>
                <span className="font-bold text-slate-700">{bus.route.estimated_duration_minutes} mins</span>
              </div>

              <div className="pt-2">
                <Link
                  to="/routes"
                  className="text-blue-600 font-bold hover:underline text-[11px] flex items-center gap-1"
                >
                  <span>View all scheduled stops</span>
                  <Navigation className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-slate-400">
              No route assigned to this vehicle currently.
            </div>
          )}
        </div>

        {/* Operating Crew */}
        <div className="neu-panel p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <h3 className="font-bold text-sm text-slate-800">Assigned Crew</h3>
          </div>

          <div className="space-y-4 text-xs">
            {/* Driver */}
            <div className="p-3 neu-panel-inset rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                  <UserSquare2 className="w-3.5 h-3.5" /> Primary Driver
                </span>
                <span className="text-[11px] font-mono font-semibold text-slate-500">
                  {bus.driver?.driver_id || 'N/A'}
                </span>
              </div>
              <div>
                <span className="font-bold text-sm text-slate-800 block">
                  {bus.driver?.name || 'Unassigned'}
                </span>
                {bus.driver?.phone_number && (
                  <span className="text-slate-500 flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {bus.driver.phone_number}
                  </span>
                )}
              </div>
            </div>

            {/* Incharge */}
            <div className="p-3 neu-panel-inset rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Bus Incharge
                </span>
                <span className="text-[11px] font-mono font-semibold text-slate-500">
                  {bus.incharge?.incharge_id || 'N/A'}
                </span>
              </div>
              <div>
                <span className="font-bold text-sm text-slate-800 block">
                  {bus.incharge?.name || 'Unassigned'}
                </span>
                {bus.incharge?.department && (
                  <span className="text-slate-500 block text-[11px]">
                    Dept: {bus.incharge.department}
                  </span>
                )}
                {bus.incharge?.phone_number && (
                  <span className="text-slate-500 flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {bus.incharge.phone_number}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seat Occupancy & Layout Section */}
      <div className="neu-panel p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Armchair className="w-5 h-5 text-blue-600" />
              <h3 className="font-extrabold text-base text-slate-800">
                Seat Distribution & Cabin Preview
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Current passenger occupancy: <strong>{bus.occupancy_count} / {bus.capacity} seats ({bus.occupancy_percentage}%)</strong>
            </p>
          </div>

          {/* Seat breakdown pill counters */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="neu-panel px-3 py-1 rounded-xl font-medium text-blue-700 bg-blue-50/50">
              Assigned: <strong>{assignedCount}</strong>
            </span>
            <span className="neu-panel px-3 py-1 rounded-xl font-medium text-emerald-700 bg-emerald-50/50">
              Available: <strong>{availableCount}</strong>
            </span>
            <span className="neu-panel px-3 py-1 rounded-xl font-medium text-purple-700 bg-purple-50/50">
              Reserved: <strong>{reservedCount}</strong>
            </span>
            <span className="neu-panel px-3 py-1 rounded-xl font-medium text-rose-700 bg-rose-50/50">
              Blocked: <strong>{blockedCount}</strong>
            </span>
          </div>
        </div>

        {/* Visual Seating Cabin Preview */}
        {seats.length > 0 ? (
          <div className="space-y-4">
            <div className="neu-panel-inset p-5 rounded-2xl max-w-3xl mx-auto overflow-x-auto">
              <div className="text-center font-bold text-xs text-slate-400 uppercase tracking-widest pb-3 border-b border-slate-200 mb-4">
                Bus Front &bull; Driver Cabin
              </div>

              {/* Grid 4 columns representing 2x2 with central aisle gap */}
              <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
                {seats.map((st) => {
                  let badgeColor = 'bg-white text-slate-700 border-slate-200 hover:border-blue-400';
                  if (st.status === 'Assigned') badgeColor = 'bg-blue-600 text-white border-blue-700';
                  else if (st.status === 'Reserved') badgeColor = 'bg-purple-600 text-white border-purple-700';
                  else if (st.status === 'Blocked' || st.status === 'Maintenance') badgeColor = 'bg-rose-600 text-white border-rose-700';
                  else badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-300';

                  return (
                    <div
                      key={st.id}
                      title={`Seat ${st.seat_number} - ${st.status}${st.student ? ` (${st.student.name})` : ''}`}
                      className={`p-2 rounded-xl text-center text-xs font-bold border transition-all cursor-pointer shadow-sm flex flex-col items-center justify-center ${badgeColor}`}
                    >
                      <Armchair className="w-4 h-4 mb-0.5 opacity-90" />
                      <span>{st.seat_number}</span>
                      <span className="text-[9px] font-normal truncate max-w-full">
                        {st.status === 'Assigned' ? (st.student?.name?.split(' ')[0] || 'Booked') : st.status}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="text-center font-bold text-xs text-slate-400 uppercase tracking-widest pt-4 border-t border-slate-200 mt-4">
                Bus Rear
              </div>
            </div>

            <div className="text-center">
              <Link
                to={`/seats?bus=${bus.id}`}
                className="neu-button-primary px-6 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2"
              >
                <Armchair className="w-4 h-4" />
                <span>Open Interactive Seat Manager & Student Assign</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-slate-400">
            No seat grid initialized for this bus yet.
          </div>
        )}
      </div>

      {/* Edit Bus Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="neu-panel max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-800">
                Edit Vehicle Details ({bus.bus_number})
              </h3>
              <button 
                onClick={() => setShowEditModal(false)}
                className="neu-button p-1.5 rounded-lg text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateBus} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Registration Number</label>
                <input
                  type="text"
                  required
                  value={editForm.registration_number}
                  onChange={(e) => setEditForm({...editForm, registration_number: e.target.value})}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Capacity</label>
                  <select
                    value={editForm.capacity}
                    onChange={(e) => setEditForm({...editForm, capacity: Number(e.target.value)})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  >
                    <option value={48}>48 Seats</option>
                    <option value={50}>50 Seats</option>
                    <option value={52}>52 Seats</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({...editForm, status: e.target.value})}
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
                  value={editForm.gps_device_id}
                  onChange={(e) => setEditForm({...editForm, gps_device_id: e.target.value})}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Fuel Level (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={editForm.fuel_level_percent}
                    onChange={(e) => setEditForm({...editForm, fuel_level_percent: Number(e.target.value)})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Speed (km/h)</label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={editForm.speed}
                    onChange={(e) => setEditForm({...editForm, speed: Number(e.target.value)})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="neu-button px-4 py-2 rounded-xl text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="neu-button-primary px-5 py-2 rounded-xl text-xs font-bold"
                >
                  {formSubmitting ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
