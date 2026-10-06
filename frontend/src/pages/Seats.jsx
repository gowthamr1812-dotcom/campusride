import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Armchair, 
  Bus as BusIcon, 
  Search, 
  Users, 
  UserCheck, 
  UserX, 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  RefreshCw,
  Sparkles,
  Info
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Seats() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialBusId = searchParams.get('bus');
  const { hasRole, user } = useAuth();
  const canModify = hasRole(['ADMIN', 'TRANSPORT_MANAGER', 'BUS_INCHARGE']);

  const [buses, setBuses] = useState([]);
  const [selectedBusId, setSelectedBusId] = useState(initialBusId ? Number(initialBusId) : null);
  const [selectedBus, setSelectedBus] = useState(null);
  const [seats, setSeats] = useState([]);
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSeats, setIsLoadingSeats] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Selected seat modal/action state
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [assigningStudentId, setAssigningStudentId] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Load list of all buses and students
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const [busesRes, studentsRes] = await Promise.all([
          api.get('/buses'),
          api.get('/students?page=1&limit=100')
        ]);
        const busList = busesRes.items || [];
        setBuses(busList);
        setStudents(studentsRes.items || []);

        if (busList.length > 0) {
          // If initial bus ID in URL, select that, else pick the first bus
          const targetId = initialBusId ? Number(initialBusId) : busList[0].id;
          const found = busList.find(b => b.id === targetId) || busList[0];
          setSelectedBusId(found.id);
          setSelectedBus(found);
        }
      } catch (err) {
        setErrorMessage(err.message || 'Failed to load initial transport data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Fetch seats whenever selectedBusId changes
  const fetchBusSeats = async (busId) => {
    if (!busId) return;
    setIsLoadingSeats(true);
    setErrorMessage(null);
    try {
      const seatsRes = await api.get(`/seats?bus_id=${busId}`);
      setSeats(seatsRes || []);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load seats for selected bus.');
    } finally {
      setIsLoadingSeats(false);
    }
  };

  useEffect(() => {
    if (selectedBusId) {
      const b = buses.find(x => x.id === Number(selectedBusId));
      if (b) setSelectedBus(b);
      fetchBusSeats(selectedBusId);
      setSearchParams({ bus: selectedBusId });
    }
  }, [selectedBusId]);

  // Handle bus selection change
  const handleBusChange = (e) => {
    const id = Number(e.target.value);
    setSelectedBusId(id);
    setSelectedSeat(null);
  };

  // Seat Assignment
  const handleAssignStudent = async () => {
    if (!assigningStudentId || !selectedSeat) return;
    setSubmittingAction(true);
    try {
      await api.post(`/seats/assign?bus_id=${selectedBusId}`, {
        seat_number: selectedSeat.seat_number,
        student_id: Number(assigningStudentId)
      });
      await fetchBusSeats(selectedBusId);
      setSelectedSeat(null);
      setAssigningStudentId('');
    } catch (err) {
      alert(err.message || 'Error assigning seat. Seat might already be assigned.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Status Change (e.g. Free up seat or mark Reserved/Blocked)
  const handleUpdateStatus = async (newStatus) => {
    if (!selectedSeat) return;
    setSubmittingAction(true);
    try {
      await api.put(`/seats/status?bus_id=${selectedBusId}&seat_number=${encodeURIComponent(selectedSeat.seat_number)}&status=${encodeURIComponent(newStatus)}`);
      await fetchBusSeats(selectedBusId);
      setSelectedSeat(null);
    } catch (err) {
      alert(err.message || 'Failed to update seat status.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Counters
  const assignedSeats = seats.filter(s => s.status === 'Assigned');
  const availableSeats = seats.filter(s => s.status === 'Available');
  const reservedSeats = seats.filter(s => s.status === 'Reserved');
  const blockedSeats = seats.filter(s => s.status === 'Blocked' || s.status === 'Maintenance');
  const occupancyPct = seats.length > 0 ? ((assignedSeats.length / seats.length) * 100).toFixed(1) : 0;

  // Filter students available for assignment
  const filteredStudents = students.filter(stu => {
    if (!studentSearch) return true;
    const query = studentSearch.toLowerCase();
    return (
      stu.name?.toLowerCase().includes(query) ||
      stu.roll_number?.toLowerCase().includes(query) ||
      stu.stop?.stop_name?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="neu-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
              Passenger Cabin & Seat Allocation
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
              Interactive 2x2 Cabin Layout
            </span>
          </div>
          <p className="text-xs text-slate-500">
            View allocated student passes, reserved allocations, and maintain zero-collision seat assignments.
          </p>
        </div>

        {/* Bus Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <BusIcon className="w-4 h-4 text-blue-600 shrink-0" />
            <select
              value={selectedBusId || ''}
              onChange={handleBusChange}
              disabled={isLoading}
              className="neu-panel-inset px-3 py-2 text-xs font-bold text-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {buses.map(b => (
                <option key={b.id} value={b.id}>
                  {b.bus_number} ({b.registration_number}) - {b.capacity} Seats
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => fetchBusSeats(selectedBusId)}
            className="neu-button p-2.5 rounded-xl text-slate-600 hover:text-blue-600"
            title="Refresh Cabin Grid"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingSeats ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Selected Bus Overview & Stats Strip */}
      {selectedBus && (
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          <div className="neu-panel p-3.5 text-center col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Total Capacity</span>
            <div className="text-lg font-black text-slate-800">{seats.length || selectedBus.capacity}</div>
          </div>
          <div className="neu-panel p-3.5 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned</span>
            <div className="text-lg font-black text-blue-600">{assignedSeats.length}</div>
          </div>
          <div className="neu-panel p-3.5 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Available</span>
            <div className="text-lg font-black text-emerald-600">{availableSeats.length}</div>
          </div>
          <div className="neu-panel p-3.5 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Reserved</span>
            <div className="text-lg font-black text-purple-600">{reservedSeats.length}</div>
          </div>
          <div className="neu-panel p-3.5 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Blocked</span>
            <div className="text-lg font-black text-rose-600">{blockedSeats.length}</div>
          </div>
          <div className="neu-panel p-3.5 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Occupancy</span>
            <div className="text-lg font-black text-slate-800">{occupancyPct}%</div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Cabin Grid Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Interactive Seat Cabin */}
        <div className="lg:col-span-2 neu-panel p-6 space-y-5">
          {/* Legend and Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            {/* Color Legend */}
            <div className="flex items-center gap-4 text-xs flex-wrap">
              <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                <span className="w-3.5 h-3.5 rounded-md bg-emerald-100 border border-emerald-400"></span>
                Available
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                <span className="w-3.5 h-3.5 rounded-md bg-blue-600 border border-blue-700"></span>
                Assigned
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                <span className="w-3.5 h-3.5 rounded-md bg-purple-600 border border-purple-700"></span>
                Reserved
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                <span className="w-3.5 h-3.5 rounded-md bg-rose-600 border border-rose-700"></span>
                Blocked
              </span>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1">
              {['ALL', 'Available', 'Assigned', 'Reserved', 'Blocked'].map(st => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    filterStatus === st 
                      ? 'neu-panel-inset text-blue-600 font-extrabold bg-white/50' 
                      : 'neu-button text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Cabin Layout */}
          {isLoadingSeats ? (
            <div className="neu-panel-inset p-12 text-center text-xs text-slate-400 animate-pulse">
              Loading passenger cabin layout...
            </div>
          ) : seats.length === 0 ? (
            <div className="neu-panel-inset p-12 text-center text-xs text-slate-400">
              No seat records generated for this bus yet.
            </div>
          ) : (
            <div className="neu-panel-inset p-6 rounded-2xl max-w-xl mx-auto space-y-4">
              {/* Front Cabin Banner */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-300/80 px-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Front Door
                </span>
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <BusIcon className="w-4 h-4 text-blue-600" /> Driver Cabin
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Emergency Exit
                </span>
              </div>

              {/* 2x2 Seating Grid with Central Aisle */}
              <div className="space-y-3">
                {/* Group seats into rows of 4 (e.g. 01A, 01B, 01C, 01D) */}
                {Array.from({ length: Math.ceil(seats.length / 4) }).map((_, rowIndex) => {
                  const rowSeats = seats.slice(rowIndex * 4, rowIndex * 4 + 4);
                  const leftSeats = rowSeats.slice(0, 2);
                  const rightSeats = rowSeats.slice(2, 4);

                  return (
                    <div key={rowIndex} className="flex items-center justify-between gap-4">
                      {/* Left Pair (A [Window], B [Aisle]) */}
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        {leftSeats.map((seat) => {
                          const isSelected = selectedSeat?.id === seat.id;
                          const isFilteredOut = filterStatus !== 'ALL' && seat.status !== filterStatus;

                          let seatStyle = 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:border-emerald-500';
                          if (seat.status === 'Assigned') seatStyle = 'bg-blue-600 text-white border-blue-700 shadow-sm';
                          else if (seat.status === 'Reserved') seatStyle = 'bg-purple-600 text-white border-purple-700 shadow-sm';
                          else if (seat.status === 'Blocked' || seat.status === 'Maintenance') seatStyle = 'bg-rose-600 text-white border-rose-700 shadow-sm';

                          return (
                            <button
                              key={seat.id}
                              disabled={isFilteredOut}
                              onClick={() => setSelectedSeat(seat)}
                              title={`Seat ${seat.seat_number} - ${seat.status}${seat.student ? ` (${seat.student.name})` : ''}`}
                              className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center border font-bold text-xs transition-all relative ${
                                isSelected ? 'ring-2 ring-blue-500 scale-105 shadow-md' : ''
                              } ${isFilteredOut ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer hover:scale-105'} ${seatStyle}`}
                            >
                              <Armchair className="w-4 h-4 mb-0.5" />
                              <span className="leading-tight">{seat.seat_number}</span>
                              {seat.is_window && (
                                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" title="Window Seat"></span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Central Aisle */}
                      <div className="w-8 text-center text-[10px] font-mono font-bold text-slate-300 uppercase">
                        {rowIndex + 1}
                      </div>

                      {/* Right Pair (C [Aisle], D [Window]) */}
                      <div className="flex items-center gap-2 flex-1 justify-start">
                        {rightSeats.map((seat) => {
                          const isSelected = selectedSeat?.id === seat.id;
                          const isFilteredOut = filterStatus !== 'ALL' && seat.status !== filterStatus;

                          let seatStyle = 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:border-emerald-500';
                          if (seat.status === 'Assigned') seatStyle = 'bg-blue-600 text-white border-blue-700 shadow-sm';
                          else if (seat.status === 'Reserved') seatStyle = 'bg-purple-600 text-white border-purple-700 shadow-sm';
                          else if (seat.status === 'Blocked' || seat.status === 'Maintenance') seatStyle = 'bg-rose-600 text-white border-rose-700 shadow-sm';

                          return (
                            <button
                              key={seat.id}
                              disabled={isFilteredOut}
                              onClick={() => setSelectedSeat(seat)}
                              title={`Seat ${seat.seat_number} - ${seat.status}${seat.student ? ` (${seat.student.name})` : ''}`}
                              className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center border font-bold text-xs transition-all relative ${
                                isSelected ? 'ring-2 ring-blue-500 scale-105 shadow-md' : ''
                              } ${isFilteredOut ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer hover:scale-105'} ${seatStyle}`}
                            >
                              <Armchair className="w-4 h-4 mb-0.5" />
                              <span className="leading-tight">{seat.seat_number}</span>
                              {seat.is_window && (
                                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" title="Window Seat"></span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Rear Cabin Banner */}
              <div className="pt-3 border-t border-slate-300/80 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Rear Cabin &bull; Emergency Door
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Selected Seat Detail & Actions Drawer */}
        <div className="neu-panel p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Armchair className="w-5 h-5 text-blue-600" />
              <h3 className="font-extrabold text-sm text-slate-800">
                Seat Inspector
              </h3>
            </div>
            {selectedSeat && (
              <button
                onClick={() => setSelectedSeat(null)}
                className="text-slate-400 hover:text-slate-700 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {!selectedSeat ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-12 h-12 rounded-2xl neu-panel flex items-center justify-center mx-auto text-slate-400">
                <Armchair className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Click any seat in the 2x2 layout to view allocated student credentials, modify seat availability, or assign boarding passes.
              </p>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              {/* Seat Badge & Attributes */}
              <div className="neu-panel-inset p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-base font-black text-slate-800">
                    Seat {selectedSeat.seat_number}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    selectedSeat.status === 'Assigned' ? 'bg-blue-100 text-blue-700' :
                    selectedSeat.status === 'Reserved' ? 'bg-purple-100 text-purple-700' :
                    selectedSeat.status === 'Blocked' ? 'bg-rose-100 text-rose-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    {selectedSeat.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span>Window Seat:</span>
                  <strong className="text-slate-700">{selectedSeat.is_window ? 'Yes (Window View)' : 'No (Aisle Side)'}</strong>
                </div>
              </div>

              {/* Assigned Student Card (if Assigned) */}
              {selectedSeat.student ? (
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5" /> Allocated Student
                    </span>
                    <span className="font-mono text-[11px] font-bold text-blue-800">
                      {selectedSeat.student.roll_number}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">
                      {selectedSeat.student.name}
                    </h4>
                    <span className="text-[11px] text-slate-500 block">
                      {selectedSeat.student.department} &bull; Year {selectedSeat.student.year}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-600 pt-1 border-t border-blue-200/60">
                    Boarding Stop: <strong className="text-slate-800">{selectedSeat.student.stop?.stop_name || 'Campus Gate'}</strong>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-slate-500">
                  <UserX className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                  <p className="font-semibold">No Student Assigned</p>
                  <p className="text-[10px] text-slate-400">This seat is currently unassigned.</p>
                </div>
              )}

              {/* Actions for Authorized Staff */}
              {canModify && (
                <div className="pt-3 border-t border-slate-200 space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Administrative Controls
                  </span>

                  {/* Status Toggle Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleUpdateStatus('Available')}
                      disabled={submittingAction || selectedSeat.status === 'Available'}
                      className="neu-button p-2 rounded-xl text-center font-bold text-emerald-700 hover:bg-emerald-50 text-[11px]"
                    >
                      Make Free
                    </button>
                    <button
                      onClick={() => handleUpdateStatus('Reserved')}
                      disabled={submittingAction || selectedSeat.status === 'Reserved'}
                      className="neu-button p-2 rounded-xl text-center font-bold text-purple-700 hover:bg-purple-50 text-[11px]"
                    >
                      Reserve
                    </button>
                    <button
                      onClick={() => handleUpdateStatus('Blocked')}
                      disabled={submittingAction || selectedSeat.status === 'Blocked'}
                      className="neu-button p-2 rounded-xl text-center font-bold text-rose-700 hover:bg-rose-50 text-[11px]"
                    >
                      Block
                    </button>
                  </div>

                  {/* Student Allocation Form */}
                  <div className="p-3 neu-panel-inset rounded-xl space-y-2 mt-2">
                    <span className="font-bold text-[11px] text-slate-700 block">
                      Assign Student Pass to this Seat:
                    </span>

                    <input
                      type="text"
                      placeholder="Search student by name or roll no..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="neu-panel w-full px-2.5 py-1.5 text-xs text-slate-800 rounded-lg focus:outline-none"
                    />

                    <select
                      value={assigningStudentId}
                      onChange={(e) => setAssigningStudentId(e.target.value)}
                      className="neu-panel w-full px-2.5 py-1.5 text-xs text-slate-800 rounded-lg focus:outline-none"
                    >
                      <option value="">Select Student...</option>
                      {filteredStudents.slice(0, 30).map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.roll_number}) - Stop: {s.stop?.stop_name || 'N/A'}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={handleAssignStudent}
                      disabled={!assigningStudentId || submittingAction}
                      className="neu-button-primary w-full py-2 rounded-xl text-xs font-bold mt-1"
                    >
                      {submittingAction ? 'Assigning...' : 'Assign Student to Seat'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
