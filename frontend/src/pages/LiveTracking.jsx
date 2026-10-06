import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Navigation, 
  Bus as BusIcon, 
  Gauge, 
  Fuel, 
  Clock, 
  Compass, 
  Play, 
  Pause, 
  RefreshCw, 
  Radio, 
  Shield, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Phone, 
  User, 
  Users, 
  ChevronRight, 
  X,
  Layers,
  Search,
  Filter
} from 'lucide-react';
import L from 'leaflet';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

// Chennai Campus Coordinates
const CAMPUS_COORDS = [12.8230, 80.0440];

export default function LiveTracking() {
  const { user, hasRole } = useAuth();
  const isAdminOrManager = hasRole(['ADMIN', 'TRANSPORT_MANAGER']);
  const isStudent = user?.role === 'STUDENT';
  const isDriver = user?.role === 'DRIVER';

  const [buses, setBuses] = useState([]);
  const [selectedBusId, setSelectedBusId] = useState(null);
  const [selectedRouteStops, setSelectedRouteStops] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const polylineRef = useRef(null);
  const stopMarkersRef = useRef([]);
  const wsRef = useRef(null);
  const simulationTimerRef = useRef(null);

  // 1. Fetch Initial Tracking Telemetry
  const fetchTelemetry = async () => {
    try {
      const res = await api.get('/tracking/live');
      if (res && res.buses) {
        setBuses(res.buses);
        setSummary({
          total_tracked: res.total_tracked,
          running_count: res.running_count,
          delayed_count: res.delayed_count,
          stopped_count: res.stopped_count,
          offline_count: res.offline_count,
        });

        // If student, automatically focus their assigned bus
        if (isStudent && !selectedBusId) {
          const myBus = res.buses.find(b => b.student_stop_name != null);
          if (myBus) {
            setSelectedBusId(myBus.bus_id);
            setIsDrawerOpen(true);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch telemetry:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Fetch Detailed Route Stop ETAs for Selected Bus
  const fetchStopEtas = async (busId) => {
    try {
      const res = await api.get(`/tracking/bus/${busId}/stops`);
      setSelectedRouteStops(res || []);
    } catch (err) {
      console.error('Failed to fetch stop ETAs:', err);
      setSelectedRouteStops([]);
    }
  };

  // 3. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: CAMPUS_COORDS,
        zoom: 12,
        zoomControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);

      // Add College Campus Master Landmark Pin
      const campusIcon = L.divIcon({
        className: 'custom-campus-marker',
        html: `
          <div class="relative flex items-center justify-center w-10 h-10 bg-blue-700 text-white rounded-2xl shadow-xl border-2 border-white transform hover:scale-110 transition-transform">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5z"/>
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>
            </svg>
            <div class="absolute -bottom-6 bg-slate-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap">
              College Campus
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      L.marker(CAMPUS_COORDS, { icon: campusIcon })
        .addTo(map)
        .bindPopup('<b>Main College Campus</b><br>Central Transportation Terminal & Student Hub');

      mapInstanceRef.current = map;
    }

    fetchTelemetry();

    // 4. Connect WebSocket with Automatic Fallback
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/tracking`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        // Keepalive heartbeat
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'PING' }));
          }
        }, 15000);
        ws.pingInterval = pingInterval;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'BUS_LOCATION_UPDATE' || data.type === 'FLEET_SIMULATION_TICK') {
            fetchTelemetry();
          }
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        if (ws.pingInterval) clearInterval(ws.pingInterval);
      };

      ws.onerror = () => {
        setWsConnected(false);
      };
    } catch (e) {
      console.warn('WebSocket unavailable, running in polling mode.');
    }

    // Polling interval fallback (every 5 seconds)
    const pollTimer = setInterval(fetchTelemetry, 5000);

    return () => {
      clearInterval(pollTimer);
      if (wsRef.current) {
        if (wsRef.current.pingInterval) clearInterval(wsRef.current.pingInterval);
        wsRef.current.close();
      }
      if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
    };
  }, []);

  // 5. Update Bus Markers on Leaflet Map
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    buses.forEach((bus) => {
      const isSelected = bus.bus_id === selectedBusId;
      const isMyStudentBus = isStudent && bus.student_stop_name != null;

      let colorClass = 'bg-blue-600 text-white';
      let ringClass = 'border-white';
      if (bus.status === 'Running') {
        colorClass = 'bg-emerald-600 text-white';
      } else if (bus.status === 'Delayed') {
        colorClass = 'bg-amber-500 text-white';
      } else if (bus.status === 'Stopped') {
        colorClass = 'bg-rose-600 text-white';
      } else {
        colorClass = 'bg-slate-500 text-white';
      }

      if (isMyStudentBus) {
        ringClass = 'ring-4 ring-blue-500 ring-offset-2 border-white';
      } else if (isSelected) {
        ringClass = 'ring-4 ring-indigo-500 ring-offset-2 border-white';
      }

      const iconHtml = `
        <div class="relative flex flex-col items-center group cursor-pointer">
          <div class="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg border-2 ${ringClass} ${colorClass} transition-transform transform hover:scale-110">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <!-- Heading Direction Needle -->
            <div 
              class="absolute -top-1 w-2.5 h-2.5 bg-white border border-slate-700 rounded-full shadow"
              style="transform: rotate(${bus.heading || 0}deg) translateY(-8px);"
            ></div>
          </div>
          <div class="mt-1 bg-slate-900/90 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded shadow whitespace-nowrap">
            ${bus.bus_number}
          </div>
        </div>
      `;

      const busIcon = L.divIcon({
        className: 'custom-bus-marker',
        html: iconHtml,
        iconSize: [44, 52],
        iconAnchor: [22, 26],
      });

      if (markersRef.current[bus.bus_id]) {
        // Move existing marker smoothly
        const marker = markersRef.current[bus.bus_id];
        marker.setLatLng([bus.latitude, bus.longitude]);
        marker.setIcon(busIcon);
      } else {
        // Create new marker
        const marker = L.marker([bus.latitude, bus.longitude], { icon: busIcon })
          .addTo(map)
          .on('click', () => {
            handleSelectBus(bus.bus_id);
          });

        markersRef.current[bus.bus_id] = marker;
      }
    });
  }, [buses, selectedBusId]);

  // 6. Draw Route Polyline and Route Stops for Selected Bus
  const handleSelectBus = (busId) => {
    setSelectedBusId(busId);
    setIsDrawerOpen(true);
    fetchStopEtas(busId);

    const bus = buses.find(b => b.bus_id === busId);
    if (!bus || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    map.setView([bus.latitude, bus.longitude], 13, { animate: true });

    // Clear previous stop markers & polyline
    stopMarkersRef.current.forEach(m => map.removeLayer(m));
    stopMarkersRef.current = [];
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }

    // Draw route polyline if available
    if (bus.stops_polyline && bus.stops_polyline.length > 1) {
      const poly = L.polyline(bus.stops_polyline, {
        color: '#2563EB',
        weight: 5,
        opacity: 0.85,
        dashArray: '10, 8',
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      polylineRef.current = poly;

      // Add stop pin markers
      bus.stops_polyline.forEach((coords, idx) => {
        const isCampus = idx === bus.stops_polyline.length - 1;
        const stopIcon = L.divIcon({
          className: 'custom-stop-marker',
          html: `
            <div class="w-6 h-6 rounded-full ${isCampus ? 'bg-blue-700' : 'bg-slate-800'} text-white border-2 border-white flex items-center justify-center font-bold text-[10px] shadow-md">
              ${idx + 1}
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const stopMarker = L.marker(coords, { icon: stopIcon })
          .addTo(map)
          .bindPopup(`<b>Stop #${idx + 1}</b>`);
        stopMarkersRef.current.push(stopMarker);
      });
    }
  };

  // 7. Manual Simulator Step
  const handleSimulateStep = async () => {
    try {
      await api.post('/tracking/simulate-step');
      fetchTelemetry();
    } catch (err) {
      console.error('Failed to trigger simulation step:', err);
    }
  };

  // 8. Toggle Automatic Simulation Interval
  const toggleAutoSimulate = () => {
    if (isSimulating) {
      if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
      simulationTimerRef.current = null;
      setIsSimulating(false);
    } else {
      setIsSimulating(true);
      simulationTimerRef.current = setInterval(() => {
        handleSimulateStep();
      }, 3000);
    }
  };

  const selectedBus = buses.find(b => b.bus_id === selectedBusId);

  const filteredBuses = buses.filter(b => {
    const matchesFilter = statusFilter === 'ALL' || b.status === statusFilter;
    const matchesSearch = 
      b.bus_number.toLowerCase().includes(search.toLowerCase()) ||
      (b.route_name && b.route_name.toLowerCase().includes(search.toLowerCase())) ||
      (b.driver_name && b.driver_name.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Top Header & Connection Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Radio className="w-7 h-7 text-blue-600 animate-pulse" />
            Live GPS Tracking & Telematics
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time geospatial positioning, speed gauges, next-stop ETAs, and interactive route telemetry
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Live Stream Connectivity Pill */}
          <div className="neu-panel-inset px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs font-bold">
            <span className={`w-2.5 h-2.5 rounded-full ${wsConnected ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`}></span>
            <span className={wsConnected ? 'text-emerald-700' : 'text-amber-700'}>
              {wsConnected ? 'Live WSS Stream' : 'Live Polling Mode'}
            </span>
          </div>

          <button
            onClick={fetchTelemetry}
            className="neu-button px-3 py-1.5 rounded-xl text-slate-600 hover:text-slate-900 transition flex items-center gap-1.5 text-xs font-semibold"
            title="Force Telemetry Sync"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sync
          </button>

          {/* Simulator Controls (Admin / Transport Manager) */}
          {isAdminOrManager && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSimulateStep}
                className="neu-button px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5"
                title="Advance fleet by 1 simulation step"
              >
                <ChevronRight className="w-4 h-4" />
                Step Simulator
              </button>

              <button
                onClick={toggleAutoSimulate}
                className={`neu-button px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                  isSimulating ? 'bg-amber-500 text-white' : 'text-slate-700'
                }`}
              >
                {isSimulating ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    Pause Sim
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    Auto Move
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Student Personalized Commute Banner */}
      {isStudent && selectedBus && selectedBus.student_stop_name && (
        <div className="neu-panel p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent border border-blue-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
              <BusIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Your Assigned Route Bus</span>
                <span className="font-mono font-extrabold text-slate-800 text-sm">{selectedBus.bus_number}</span>
                <StatusBadge status={selectedBus.status} />
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Designated Boarding Stop: <span className="font-bold text-slate-800">{selectedBus.student_stop_name}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 self-end md:self-center">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">ARRIVAL ESTIMATE</span>
              <div className="text-lg font-extrabold text-blue-700 flex items-center gap-1">
                <Clock className="w-4 h-4 text-blue-600" />
                {selectedBus.student_stop_eta_minutes ?? 12} mins
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">DISTANCE FROM STOP</span>
              <div className="text-lg font-extrabold text-slate-800 flex items-center gap-1">
                <Navigation className="w-4 h-4 text-slate-500" />
                {selectedBus.distance_to_student_stop_km ?? 4.2} km
              </div>
            </div>

            <button
              onClick={() => handleSelectBus(selectedBus.bus_id)}
              className="neu-button-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Compass className="w-4 h-4" />
              Focus Bus
            </button>
          </div>
        </div>
      )}

      {/* KPI Status Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <div className="neu-panel p-3.5 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <BusIcon className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fleet Tracked</span>
            <span className="text-lg font-extrabold text-slate-800">{summary?.total_tracked || buses.length}</span>
          </div>
        </div>

        <div className="neu-panel p-3.5 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Running</span>
            <span className="text-lg font-extrabold text-emerald-600">{summary?.running_count || 0}</span>
          </div>
        </div>

        <div className="neu-panel p-3.5 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Delayed</span>
            <span className="text-lg font-extrabold text-amber-600">{summary?.delayed_count || 0}</span>
          </div>
        </div>

        <div className="neu-panel p-3.5 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Stopped</span>
            <span className="text-lg font-extrabold text-rose-600">{summary?.stopped_count || 0}</span>
          </div>
        </div>

        <div className="neu-panel p-3.5 rounded-2xl flex items-center gap-3 col-span-2 sm:col-span-4 lg:col-span-1">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Offline / Maint</span>
            <span className="text-lg font-extrabold text-slate-700">{summary?.offline_count || 0}</span>
          </div>
        </div>
      </div>

      {/* Main Map & Filter Console Layout */}
      <div className="relative rounded-2xl overflow-hidden shadow-lg border border-white/60 bg-[#E8EDF3]">
        {/* Map Filter Overlay Bar */}
        <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="neu-panel bg-[#E8EDF3]/90 backdrop-blur-md px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-md">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Find bus #, route, driver..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none w-36 sm:w-48"
              />
            </div>

            <div className="neu-panel bg-[#E8EDF3]/90 backdrop-blur-md px-2 py-1 rounded-xl shadow-md hidden sm:flex items-center gap-1">
              {['ALL', 'Running', 'Delayed', 'Stopped'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                    statusFilter === st
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="pointer-events-auto">
            <button
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              className="neu-panel bg-[#E8EDF3]/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-blue-600"
            >
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Fleet Telemetry List ({filteredBuses.length})</span>
            </button>
          </div>
        </div>

        {/* Leaflet Map Canvas */}
        <div 
          ref={mapContainerRef} 
          className="w-full h-[620px] z-10"
          style={{ minHeight: '560px' }}
        ></div>

        {/* Right Drawer: Selected Bus Telemetry or Fleet Manifest */}
        {isDrawerOpen && (
          <div className="absolute top-0 right-0 bottom-0 w-full sm:w-96 z-30 bg-[#E8EDF3]/95 backdrop-blur-lg border-l border-white/60 shadow-2xl p-5 overflow-y-auto flex flex-col justify-between">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                    <BusIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      {selectedBus ? `Telematics: ${selectedBus.bus_number}` : 'Fleet Telemetry Radar'}
                    </h3>
                    <p className="text-[11px] text-slate-500">Live CAN bus sensors & GPS telemetry</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="neu-button p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {selectedBus ? (
                /* Selected Bus Comprehensive View */
                <div className="mt-4 space-y-4">
                  {/* Status & Identity Card */}
                  <div className="neu-panel p-4 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-base font-extrabold text-blue-700">
                        {selectedBus.bus_number}
                      </span>
                      <StatusBadge status={selectedBus.status} />
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      {selectedBus.registration_number}
                    </div>
                    <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 pt-1 border-t border-slate-200/80">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      <span>{selectedBus.route_name || 'Assigned Route'}</span>
                    </div>
                  </div>

                  {/* Telematics Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="neu-panel-inset p-3 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                        <Gauge className="w-3 h-3 text-blue-600" /> Speed
                      </span>
                      <div className="text-base font-extrabold text-slate-800 mt-1">
                        {selectedBus.speed} <span className="text-xs font-normal text-slate-500">km/h</span>
                      </div>
                    </div>

                    <div className="neu-panel-inset p-3 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                        <Compass className="w-3 h-3 text-indigo-600" /> Heading
                      </span>
                      <div className="text-base font-extrabold text-slate-800 mt-1">
                        {selectedBus.heading}°
                      </div>
                    </div>

                    <div className="neu-panel-inset p-3 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                        <Fuel className="w-3 h-3 text-amber-600" /> Fuel Level
                      </span>
                      <div className="text-base font-extrabold text-slate-800 mt-1">
                        {selectedBus.fuel_level_percent}%
                      </div>
                    </div>

                    <div className="neu-panel-inset p-3 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                        <Navigation className="w-3 h-3 text-emerald-600" /> Distance to Campus
                      </span>
                      <div className="text-base font-extrabold text-slate-800 mt-1">
                        {selectedBus.distance_to_campus_km} <span className="text-xs font-normal text-slate-500">km</span>
                      </div>
                    </div>
                  </div>

                  {/* Next Stop & ETA Banner */}
                  <div className="neu-panel p-3.5 rounded-xl border border-blue-200/60 bg-blue-50/30">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">NEXT UPCOMING STOP</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-bold text-slate-800 text-xs truncate max-w-[180px]">
                        {selectedBus.next_stop_name || 'Approaching College Campus'}
                      </span>
                      <span className="text-xs font-extrabold text-blue-700 bg-white px-2 py-0.5 rounded-md shadow-sm">
                        ETA: {selectedBus.next_stop_eta_minutes || 5}m
                      </span>
                    </div>
                  </div>

                  {/* Assigned Personnel Contacts */}
                  <div className="neu-panel p-3.5 rounded-xl space-y-2 text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CREW CONTACTS</span>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <div>
                          <p className="font-semibold text-slate-800">{selectedBus.driver_name || 'Assigned Driver'}</p>
                          <p className="text-[10px] text-slate-400">Senior Bus Driver</p>
                        </div>
                      </div>
                      {selectedBus.driver_phone && (
                        <a 
                          href={`tel:${selectedBus.driver_phone}`} 
                          className="neu-button p-1.5 rounded-lg text-emerald-600 hover:text-emerald-800"
                          title="Call Driver"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
                      <div className="flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-slate-400" />
                        <div>
                          <p className="font-semibold text-slate-800">{selectedBus.incharge_name || 'Assigned Incharge'}</p>
                          <p className="text-[10px] text-slate-400">Bus Incharge</p>
                        </div>
                      </div>
                      {selectedBus.incharge_phone && (
                        <a 
                          href={`tel:${selectedBus.incharge_phone}`} 
                          className="neu-button p-1.5 rounded-lg text-blue-600 hover:text-blue-800"
                          title="Call Incharge"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Route Stops Sequence Progression */}
                  {selectedRouteStops.length > 0 && (
                    <div className="neu-panel p-3.5 rounded-xl space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ROUTE SEQUENCE ETAS</span>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {selectedRouteStops.map((stop) => (
                          <div key={stop.stop_id} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-none">
                            <div className="flex items-center gap-2">
                              <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                                {stop.sequence}
                              </span>
                              <span className="font-semibold text-slate-700 truncate max-w-[160px]">{stop.stop_name}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-blue-600 text-[11px]">{stop.eta_minutes}m</span>
                              <span className="text-[10px] text-slate-400 block font-mono">{stop.distance_km}km</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Fleet List View When No Single Bus Selected */
                <div className="mt-4 space-y-2 max-h-[480px] overflow-y-auto pr-1">
                  {filteredBuses.map((bus) => (
                    <div
                      key={bus.bus_id}
                      onClick={() => handleSelectBus(bus.bus_id)}
                      className="neu-panel p-3 rounded-xl hover:shadow-md cursor-pointer transition flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                          <BusIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-800 text-xs">{bus.bus_number}</span>
                            <StatusBadge status={bus.status} />
                          </div>
                          <span className="text-[11px] text-slate-500 truncate block max-w-[150px]">
                            {bus.route_name || 'Route'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-blue-600 text-xs">{bus.speed} km/h</span>
                        <span className="text-[10px] text-slate-400 block">{bus.distance_to_campus_km} km to campus</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedBus && (
              <div className="pt-3 border-t border-slate-200">
                <button
                  onClick={() => setSelectedBusId(null)}
                  className="neu-button w-full py-2 rounded-xl text-xs font-semibold text-slate-600"
                >
                  Back to All Buses
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
