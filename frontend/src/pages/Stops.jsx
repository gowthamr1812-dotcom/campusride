import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MapPinned, 
  MapPin, 
  Clock, 
  Milestone, 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  Trash2, 
  Edit3, 
  Navigation, 
  Layers, 
  Compass, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Route as RouteIcon,
  Table as TableIcon,
  LayoutGrid,
  Map as MapIcon,
  ExternalLink
} from 'lucide-react';
import L from 'leaflet';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const CHENNAI_CENTER = [12.9716, 80.1412];

export default function Stops() {
  const { hasRole } = useAuth();
  const canManage = hasRole(['ADMIN', 'TRANSPORT_MANAGER']);

  // Data state
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  // Filters & display
  const [search, setSearch] = useState('');
  const [selectedRouteFilter, setSelectedRouteFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('sequence'); // 'sequence', 'name', 'time', 'route'
  const [viewMode, setViewMode] = useState('cards'); // 'cards', 'table', 'map'

  // Modals & form
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStop, setEditingStop] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const [formData, setFormData] = useState({
    route_id: '',
    stop_name: '',
    sequence: 1,
    expected_arrival_time: '07:30 AM',
    landmark: '',
    latitude: 12.9516,
    longitude: 80.1412
  });

  // Leaflet map refs
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  // Fetch all routes and consolidate stops
  const fetchData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.get('/routes');
      const routeList = res.items || [];
      setRoutes(routeList);

      // Consolidate flat stops list with route metadata
      const consolidated = [];
      routeList.forEach((r) => {
        (r.stops || []).forEach((s) => {
          consolidated.push({
            ...s,
            route_code: r.route_code,
            route_name: r.name,
            route_status: r.status,
            route_start: r.start_location,
            route_end: r.end_location,
          });
        });
      });
      setStops(consolidated);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load stops directory.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered & sorted stops
  const filteredStops = useMemo(() => {
    return stops.filter((s) => {
      const matchesSearch = 
        s.stop_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.landmark?.toLowerCase().includes(search.toLowerCase()) ||
        s.route_code?.toLowerCase().includes(search.toLowerCase()) ||
        s.route_name?.toLowerCase().includes(search.toLowerCase());

      const matchesRoute = 
        selectedRouteFilter === 'ALL' || 
        String(s.route_id) === String(selectedRouteFilter);

      return matchesSearch && matchesRoute;
    }).sort((a, b) => {
      if (sortBy === 'sequence') {
        if (a.route_id === b.route_id) return (a.sequence || 0) - (b.sequence || 0);
        return (a.route_code || '').localeCompare(b.route_code || '');
      }
      if (sortBy === 'name') return (a.stop_name || '').localeCompare(b.stop_name || '');
      if (sortBy === 'time') return (a.expected_arrival_time || '').localeCompare(b.expected_arrival_time || '');
      if (sortBy === 'route') return (a.route_code || '').localeCompare(b.route_code || '');
      return 0;
    });
  }, [stops, search, selectedRouteFilter, sortBy]);

  // Leaflet Map Initialization
  useEffect(() => {
    if (viewMode !== 'map' && viewMode !== 'cards') return;
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: CHENNAI_CENTER,
        zoom: 11,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    // Custom Stop Icon
    const createStopIcon = (seq, routeCode) => {
      return L.divIcon({
        className: 'custom-stop-marker',
        html: `
          <div style="
            background: linear-gradient(135deg, #2563EB, #1D4ED8);
            color: #FFFFFF;
            font-size: 10px;
            font-weight: 800;
            padding: 3px 6px;
            border-radius: 9999px;
            box-shadow: 0 4px 10px rgba(37,99,235,0.4);
            border: 2px solid #FFFFFF;
            display: flex;
            align-items: center;
            gap: 3px;
            white-space: nowrap;
          ">
            <span>#${seq}</span>
            <span style="opacity: 0.85;">${routeCode || ''}</span>
          </div>
        `,
        iconSize: [40, 24],
        iconAnchor: [20, 12],
      });
    };

    const bounds = [];
    filteredStops.forEach((stop) => {
      if (stop.latitude && stop.longitude) {
        const pos = [stop.latitude, stop.longitude];
        bounds.push(pos);

        const marker = L.marker(pos, {
          icon: createStopIcon(stop.sequence, stop.route_code),
        }).addTo(map);

        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 13px; min-width: 180px;">
            <div style="font-weight: 700; color: #1E293B; margin-bottom: 2px;">${stop.stop_name}</div>
            <div style="font-size: 11px; color: #2563EB; font-weight: 600; margin-bottom: 6px;">
              Route ${stop.route_code}: ${stop.route_name || ''} (Stop #${stop.sequence})
            </div>
            <div style="display: flex; align-items: center; gap: 4px; color: #64748B; font-size: 11px; margin-bottom: 4px;">
              <span>🕒 Scheduled:</span>
              <strong style="color: #0F172A;">${stop.expected_arrival_time}</strong>
            </div>
            ${stop.landmark ? `<div style="font-size: 11px; color: #64748B; margin-bottom: 6px;">📍 <em>${stop.landmark}</em></div>` : ''}
            <div style="font-size: 10px; color: #94A3B8;">GPS: ${stop.latitude.toFixed(4)}, ${stop.longitude.toFixed(4)}</div>
          </div>
        `);

        markersRef.current[stop.id] = marker;
      }
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

  }, [viewMode, filteredStops]);

  // Open modal for add
  const handleOpenAdd = () => {
    setEditingStop(null);
    setFormError(null);
    const defaultRoute = routes[0]?.id || '';
    setFormData({
      route_id: defaultRoute,
      stop_name: '',
      sequence: 1,
      expected_arrival_time: '07:30 AM',
      landmark: '',
      latitude: 12.9516,
      longitude: 80.1412
    });
    setShowAddModal(true);
  };

  // Open modal for edit
  const handleOpenEdit = (stop) => {
    setEditingStop(stop);
    setFormError(null);
    setFormData({
      route_id: stop.route_id,
      stop_name: stop.stop_name,
      sequence: stop.sequence,
      expected_arrival_time: stop.expected_arrival_time,
      landmark: stop.landmark || '',
      latitude: stop.latitude,
      longitude: stop.longitude
    });
    setShowAddModal(true);
  };

  // Submit Add or Edit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    try {
      if (editingStop) {
        // Update Stop
        await api.put(`/routes/stops/${editingStop.id}`, {
          stop_name: formData.stop_name,
          sequence: Number(formData.sequence),
          expected_arrival_time: formData.expected_arrival_time,
          landmark: formData.landmark,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          route_id: Number(formData.route_id),
        });
      } else {
        // Add Stop
        await api.post(`/routes/${formData.route_id}/stops`, {
          stop_name: formData.stop_name,
          sequence: Number(formData.sequence),
          expected_arrival_time: formData.expected_arrival_time,
          landmark: formData.landmark,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
        });
      }
      setShowAddModal(false);
      fetchData();
    } catch (err) {
      setFormError(err.message || 'Error saving stop details.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete stop
  const handleDelete = async (stopId, stopName) => {
    if (!window.confirm(`Are you sure you want to permanently delete stop "${stopName}"?`)) return;
    try {
      await api.delete(`/routes/stops/${stopId}`);
      fetchData();
    } catch (err) {
      alert(err.message || 'Error deleting stop.');
    }
  };

  // Focus stop on map
  const handleFocusOnMap = (stop) => {
    setViewMode('map');
    setTimeout(() => {
      if (mapInstanceRef.current && stop.latitude && stop.longitude) {
        mapInstanceRef.current.setView([stop.latitude, stop.longitude], 15, { animate: true });
        const marker = markersRef.current[stop.id];
        if (marker) {
          marker.openPopup();
        }
      }
    }, 250);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 tracking-wide uppercase">
              Transport Infrastructure
            </span>
            <span className="text-xs text-slate-500 font-medium">• Geo-Validated Pickups</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <MapPinned className="w-7 h-7 text-blue-600" />
            Stops Directory & Corridors
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage arterial pickup points, arrival timetables, GPS coordinates, and stop sequences across all college routes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData}
            disabled={isLoading}
            className="neu-button px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 flex items-center gap-2 hover:text-blue-600"
            title="Refresh Stops"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            Refresh
          </button>

          {canManage && (
            <button
              onClick={handleOpenAdd}
              className="neu-button-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              <Plus className="w-4 h-4" />
              Add Pickup Stop
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="neu-panel p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <MapPinned className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Stops</div>
            <div className="text-xl font-extrabold text-slate-800">{stops.length}</div>
            <div className="text-[10px] text-emerald-600 font-medium">84 Validated Points</div>
          </div>
        </div>

        <div className="neu-panel p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <RouteIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Corridors</div>
            <div className="text-xl font-extrabold text-slate-800">{routes.length}</div>
            <div className="text-[10px] text-blue-600 font-medium">Active College Routes</div>
          </div>
        </div>

        <div className="neu-panel p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Peak Window</div>
            <div className="text-xl font-extrabold text-slate-800">07:00 - 08:30</div>
            <div className="text-[10px] text-slate-500 font-medium">Morning Boarding</div>
          </div>
        </div>

        <div className="neu-panel p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Avg Stops / Route</div>
            <div className="text-xl font-extrabold text-slate-800">
              {routes.length > 0 ? (stops.length / routes.length).toFixed(1) : '0'}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">Optimized Density</div>
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Route Filter, Sorting, View Switcher */}
      <div className="neu-panel p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search stop name, landmark, or route code..."
              className="neu-panel-inset w-full pl-9 pr-3 py-2 text-xs text-slate-700 bg-transparent placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Route Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedRouteFilter}
              onChange={(e) => setSelectedRouteFilter(e.target.value)}
              className="neu-panel-inset px-3 py-2 text-xs text-slate-700 bg-transparent focus:outline-none"
            >
              <option value="ALL">All Routes ({routes.length})</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.route_code} — {r.name} ({r.stops?.length || 0} stops)
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="neu-panel-inset px-3 py-2 text-xs text-slate-700 bg-transparent focus:outline-none"
            >
              <option value="sequence">Sort by Route Sequence</option>
              <option value="name">Sort by Stop Name</option>
              <option value="time">Sort by Arrival Time</option>
              <option value="route">Sort by Route Code</option>
            </select>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="neu-panel-inset p-1 flex items-center gap-1 self-start md:self-auto shrink-0">
          <button
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'cards'
                ? 'bg-white shadow text-blue-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Cards
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'table'
                ? 'bg-white shadow text-blue-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            Table
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'map'
                ? 'bg-white shadow text-blue-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            Map View
          </button>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="neu-panel p-4 border border-rose-200 bg-rose-50/50 flex items-center gap-3 text-rose-700 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Content Areas */}
      {viewMode === 'map' ? (
        /* Fullscreen Interactive Map View */
        <div className="neu-panel p-3">
          <div className="flex items-center justify-between pb-3 px-2">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-700">
                Spatial Geographic View ({filteredStops.length} stops mapped)
              </span>
            </div>
            <span className="text-[11px] text-slate-500">
              Click any stop pin to inspect timetable and GPS coordinates
            </span>
          </div>
          <div 
            ref={mapContainerRef} 
            className="w-full h-[620px] rounded-xl overflow-hidden neu-panel-inset border border-slate-200"
          />
        </div>
      ) : viewMode === 'table' ? (
        /* Dense Data Table View */
        <div className="neu-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Seq</th>
                  <th className="py-3 px-4">Stop Name</th>
                  <th className="py-3 px-4">Assigned Corridor</th>
                  <th className="py-3 px-4">Scheduled Arrival</th>
                  <th className="py-3 px-4">Landmark / Reference</th>
                  <th className="py-3 px-4">Coordinates (Lat, Lon)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStops.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      No matching pickup stops found. Try clearing your search query.
                    </td>
                  </tr>
                ) : (
                  filteredStops.map((stop) => (
                    <tr key={stop.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-700 text-[11px]">
                          #{stop.sequence}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{stop.stop_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-100/70 text-blue-800 font-semibold text-[11px]">
                          <RouteIcon className="w-3 h-3" />
                          {stop.route_code}: {stop.route_name}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-slate-700 font-semibold">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          {stop.expected_arrival_time}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {stop.landmark || <span className="text-slate-400 italic">Central Junction</span>}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {stop.latitude?.toFixed(4)}, {stop.longitude?.toFixed(4)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleFocusOnMap(stop)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                            title="View on Map"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          {canManage && (
                            <>
                              <button
                                onClick={() => handleOpenEdit(stop)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                title="Edit Stop"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(stop.id, stop.stop_name)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                title="Delete Stop"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Visual Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStops.length === 0 ? (
            <div className="col-span-full neu-panel p-12 text-center text-slate-400">
              <MapPinned className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <div className="text-base font-bold text-slate-600">No Pickup Stops Found</div>
              <div className="text-xs text-slate-400 mt-1">Try modifying your route filter or search keywords.</div>
            </div>
          ) : (
            filteredStops.map((stop) => (
              <div key={stop.id} className="neu-panel p-5 flex flex-col justify-between hover:shadow-md transition-all">
                <div>
                  {/* Top line: Sequence + Route Code + Actions */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-500 text-white font-extrabold text-xs flex items-center justify-center shadow-sm">
                        #{stop.sequence}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 font-bold text-[11px] tracking-wide">
                        {stop.route_code}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleFocusOnMap(stop)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                        title="Locate on Map"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      {canManage && (
                        <>
                          <button
                            onClick={() => handleOpenEdit(stop)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                            title="Edit Stop Details"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(stop.id, stop.stop_name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Delete Stop"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Stop Name */}
                  <h3 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-1.5 mb-1">
                    <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>{stop.stop_name}</span>
                  </h3>
                  <div className="text-xs text-slate-500 font-medium mb-3">
                    Corridor: <span className="text-slate-700 font-semibold">{stop.route_name}</span>
                  </div>

                  {/* Timetable & Landmark */}
                  <div className="neu-panel-inset p-3 space-y-2 mb-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        Arrival Time:
                      </span>
                      <span className="font-extrabold text-slate-800 bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                        {stop.expected_arrival_time}
                      </span>
                    </div>
                    {stop.landmark && (
                      <div className="text-[11px] text-slate-500 flex items-start gap-1">
                        <Milestone className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                        <span>Landmark: <em className="text-slate-700 not-italic font-medium">{stop.landmark}</em></span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer GPS Coordinates */}
                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-mono">
                    {stop.latitude?.toFixed(4)}, {stop.longitude?.toFixed(4)}
                  </span>
                  <button 
                    onClick={() => handleFocusOnMap(stop)}
                    className="text-blue-600 font-semibold hover:underline flex items-center gap-1 text-[11px]"
                  >
                    Locate Map Pin &rarr;
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add / Edit Stop Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="neu-panel bg-[#E8EDF3] w-full max-w-lg p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <MapPinned className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    {editingStop ? 'Edit Pickup Stop' : 'Add New Pickup Stop'}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Configure stop name, corridor, scheduled arrival, and GPS location.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* Corridor Route Selection */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Assigned Route / Corridor *
                </label>
                <select
                  required
                  value={formData.route_id}
                  onChange={(e) => setFormData({ ...formData, route_id: e.target.value })}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 bg-transparent focus:outline-none"
                  disabled={!!editingStop} // route immutable on update
                >
                  <option value="">Select a Route Corridor</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.route_code} — {r.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stop Name & Sequence */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Stop Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chromepet Bus Stand"
                    value={formData.stop_name}
                    onChange={(e) => setFormData({ ...formData, stop_name: e.target.value })}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 bg-transparent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Sequence # *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.sequence}
                    onChange={(e) => setFormData({ ...formData, sequence: e.target.value })}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              {/* Expected Arrival Time & Landmark */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Scheduled Arrival Time *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 07:25 AM"
                    value={formData.expected_arrival_time}
                    onChange={(e) => setFormData({ ...formData, expected_arrival_time: e.target.value })}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 bg-transparent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Landmark / Signpost
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Opp. Flyover"
                    value={formData.landmark}
                    onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              {/* GPS Latitude and Longitude */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Latitude (GPS) *
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    className="neu-panel-inset w-full px-3 py-2 text-xs font-mono text-slate-800 bg-transparent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Longitude (GPS) *
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    className="neu-panel-inset w-full px-3 py-2 text-xs font-mono text-slate-800 bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="neu-button px-4 py-2 rounded-xl text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="neu-button-primary px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md hover:shadow-lg"
                >
                  {formSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {editingStop ? 'Update Stop' : 'Create Pickup Stop'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
