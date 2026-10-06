import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  Search, 
  Bus as BusIcon, 
  UserCheck, 
  UserX, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Users, 
  UserSquare2, 
  ShieldCheck, 
  QrCode, 
  Filter, 
  Calendar, 
  CheckSquare, 
  XSquare, 
  Plus, 
  X,
  Sparkles
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

export default function Attendance() {
  const { user, hasRole } = useAuth();
  const isStudent = user?.role === 'STUDENT';
  const isIncharge = user?.role === 'BUS_INCHARGE';
  const canManageAll = hasRole(['ADMIN', 'TRANSPORT_MANAGER']);

  // Tabs: 'students' (manifest) or 'staff' (driver/incharge daily logs)
  const [activeTab, setActiveTab] = useState(isStudent ? 'students' : 'students');
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [tripType, setTripType] = useState('Morning Pickup');

  // Bus selector
  const [buses, setBuses] = useState([]);
  const [selectedBusId, setSelectedBusId] = useState('');
  const [selectedBusNumber, setSelectedBusNumber] = useState('');

  // Student Attendance Data
  const [studentRecords, setStudentRecords] = useState([]);
  const [studentSummary, setStudentSummary] = useState(null);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [stopFilter, setStopFilter] = useState('ALL');

  // Staff Attendance Data
  const [staffRecords, setStaffRecords] = useState([]);
  const [staffSummary, setStaffSummary] = useState(null);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [staffTypeFilter, setStaffTypeFilter] = useState('ALL');

  // RFID / QR Simulator Input
  const [scanCode, setScanCode] = useState('');
  const [scanSuccessMessage, setScanSuccessMessage] = useState(null);

  // Staff Check-In Modal (Admin/Manager)
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffSubmitting, setStaffSubmitting] = useState(false);
  const [staffForm, setStaffForm] = useState({
    staff_type: 'DRIVER',
    driver_id: '',
    incharge_id: '',
    bus_id: '',
    status: 'Present',
    shift: 'Regular Shift',
    remarks: ''
  });
  const [driversList, setDriversList] = useState([]);
  const [inchargesList, setInchargesList] = useState([]);

  // Fetch initial fleet and lists
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [busesRes, driversRes, inchargesRes] = await Promise.all([
          api.get('/buses'),
          canManageAll ? api.get('/drivers') : Promise.resolve({ items: [] }),
          canManageAll ? api.get('/incharges') : Promise.resolve({ items: [] })
        ]);

        const busList = busesRes.items || [];
        setBuses(busList);
        setDriversList(driversRes.items || []);
        setInchargesList(inchargesRes.items || []);

        if (busList.length > 0) {
          // If incharge, preselect their assigned bus
          if (isIncharge && user?.assigned_bus) {
            const found = busList.find(b => b.bus_number === user.assigned_bus) || busList[0];
            setSelectedBusId(found.id);
            setSelectedBusNumber(found.bus_number);
          } else {
            setSelectedBusId(busList[0].id);
            setSelectedBusNumber(busList[0].bus_number);
          }
        }
      } catch (err) {
        console.error('Failed to load fleet for attendance:', err);
      }
    };

    fetchInitialData();
  }, []);

  // Fetch student attendance records
  const fetchStudentAttendance = async () => {
    setIsLoadingStudents(true);
    try {
      let url = `/attendance/students?date=${targetDate}&trip_type=${encodeURIComponent(tripType)}`;
      if (selectedBusId && !isStudent) {
        url += `&bus_id=${selectedBusId}`;
      }

      const [listRes, summaryRes] = await Promise.all([
        api.get(url),
        !isStudent ? api.get(`/attendance/students/summary?date=${targetDate}${selectedBusId ? `&bus_id=${selectedBusId}` : ''}`) : Promise.resolve(null)
      ]);

      setStudentRecords(listRes.items || []);
      setStudentSummary(summaryRes);
    } catch (err) {
      console.error('Failed to load student attendance:', err);
    } finally {
      setIsLoadingStudents(false);
    }
  };

  // Fetch staff attendance records
  const fetchStaffAttendance = async () => {
    if (isStudent) return;
    setIsLoadingStaff(true);
    try {
      let url = `/attendance/staff?date=${targetDate}`;
      if (staffTypeFilter !== 'ALL') {
        url += `&staff_type=${staffTypeFilter}`;
      }

      const [listRes, summaryRes] = await Promise.all([
        api.get(url),
        api.get(`/attendance/staff/summary?date=${targetDate}`)
      ]);

      setStaffRecords(listRes.items || []);
      setStaffSummary(summaryRes);
    } catch (err) {
      console.error('Failed to load staff attendance:', err);
    } finally {
      setIsLoadingStaff(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'students') {
      fetchStudentAttendance();
    } else {
      fetchStaffAttendance();
    }
  }, [activeTab, targetDate, tripType, selectedBusId, staffTypeFilter]);

  // Handle Marking Student Attendance (Boarded, Absent, Excused)
  const handleMarkStudent = async (record, newStatus) => {
    try {
      await api.post('/attendance/students', {
        student_id: record.student_id,
        bus_id: record.bus_id || selectedBusId,
        trip_id: record.trip_id,
        stop_id: record.stop_id,
        date: targetDate,
        trip_type: tripType,
        status: newStatus,
        method: 'Manual'
      });
      fetchStudentAttendance();
    } catch (err) {
      alert(err.message || 'Error updating boarding status');
    }
  };

  // Batch mark all visible students as Boarded
  const handleBatchMarkAllVisible = async () => {
    const unboarded = filteredStudents.filter(r => r.status !== 'Boarded');
    if (unboarded.length === 0) return;

    try {
      await api.post('/attendance/students/batch', {
        bus_id: Number(selectedBusId),
        date: targetDate,
        trip_type: tripType,
        method: 'Manual',
        items: unboarded.map(r => ({
          student_id: r.student_id,
          status: 'Boarded',
          stop_id: r.stop_id
        }))
      });
      fetchStudentAttendance();
    } catch (err) {
      alert(err.message || 'Failed to batch mark attendance');
    }
  };

  // Simulate RFID / QR Scan
  const handleScanSubmit = async (e) => {
    e.preventDefault();
    if (!scanCode.trim()) return;

    // Find student in current records by roll number or name
    const match = studentRecords.find(r => 
      r.student_roll?.toLowerCase() === scanCode.trim().toLowerCase() ||
      r.student_name?.toLowerCase().includes(scanCode.trim().toLowerCase())
    );

    if (!match) {
      alert(`No student with Pass / ID "${scanCode}" found on this bus manifest.`);
      return;
    }

    try {
      await api.post('/attendance/students', {
        student_id: match.student_id,
        bus_id: match.bus_id || selectedBusId,
        date: targetDate,
        trip_type: tripType,
        status: 'Boarded',
        method: 'RFID'
      });
      setScanSuccessMessage(`Passenger Verified: ${match.student_name} (${match.student_roll}) marked BOARDED!`);
      setScanCode('');
      setTimeout(() => setScanSuccessMessage(null), 4000);
      fetchStudentAttendance();
    } catch (err) {
      alert(err.message || 'Error logging RFID scan');
    }
  };

  // Handle Staff Check-In submit
  const handleSaveStaffAttendance = async (e) => {
    e.preventDefault();
    setStaffSubmitting(true);
    try {
      await api.post('/attendance/staff', {
        staff_type: staffForm.staff_type,
        driver_id: staffForm.staff_type === 'DRIVER' ? Number(staffForm.driver_id) : null,
        incharge_id: staffForm.staff_type === 'BUS_INCHARGE' ? Number(staffForm.incharge_id) : null,
        bus_id: staffForm.bus_id ? Number(staffForm.bus_id) : null,
        date: targetDate,
        status: staffForm.status,
        shift: staffForm.shift,
        remarks: staffForm.remarks
      });
      setShowStaffModal(false);
      fetchStaffAttendance();
    } catch (err) {
      alert(err.message || 'Failed to record staff check-in');
    } finally {
      setStaffSubmitting(false);
    }
  };

  // Unique Stops for filtering
  const availableStops = Array.from(new Set(studentRecords.map(r => r.stop_name).filter(Boolean)));

  // Filtered Students
  const filteredStudents = studentRecords.filter(r => {
    const matchesSearch = !studentSearch || (
      r.student_name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      r.student_roll?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      r.seat_number?.toLowerCase().includes(studentSearch.toLowerCase())
    );
    const matchesStop = stopFilter === 'ALL' || r.stop_name === stopFilter;
    return matchesSearch && matchesStop;
  });

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="neu-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
              {isStudent ? 'My Transport Attendance Log' : 'Institutional Attendance & Boarding Manifest'}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
              {isStudent ? 'Passenger Pass History' : `${tripType}`}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {isStudent 
              ? 'View your boarding timestamps, designated pickup stops, and transport attendance records.'
              : 'Real-time student boarding verification, RFID card simulation, and staff shift check-in logs.'}
          </p>
        </div>

        {/* Action / Date controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 neu-panel-inset px-3 py-1.5 rounded-xl">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
            />
          </div>

          <button
            onClick={activeTab === 'students' ? fetchStudentAttendance : fetchStaffAttendance}
            className="neu-button p-2.5 rounded-xl text-slate-600 hover:text-blue-600"
            title="Refresh Attendance"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingStudents || isLoadingStaff ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {!isStudent && canManageAll && activeTab === 'staff' && (
            <button
              onClick={() => setShowStaffModal(true)}
              className="neu-button-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Record Check-In</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Switcher (Student manifest vs Staff Daily) */}
      {!isStudent && (
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'students'
                ? 'neu-panel-inset text-blue-600 bg-white/50'
                : 'neu-button text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Student Boarding Manifest</span>
          </button>

          <button
            onClick={() => setActiveTab('staff')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'staff'
                ? 'neu-panel-inset text-blue-600 bg-white/50'
                : 'neu-button text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Staff Attendance (Drivers & Incharges)</span>
          </button>
        </div>
      )}

      {/* TAB 1: STUDENT BOARDING MANIFEST */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          {/* KPI Strip */}
          {studentSummary && !isStudent && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="neu-panel p-3.5 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Expected</span>
                <div className="text-lg font-black text-slate-800">{studentSummary.total_expected}</div>
              </div>
              <div className="neu-panel p-3.5 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Boarded</span>
                <div className="text-lg font-black text-emerald-600">{studentSummary.total_boarded}</div>
              </div>
              <div className="neu-panel p-3.5 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Absent</span>
                <div className="text-lg font-black text-rose-600">{studentSummary.total_absent}</div>
              </div>
              <div className="neu-panel p-3.5 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Excused</span>
                <div className="text-lg font-black text-purple-600">{studentSummary.total_excused}</div>
              </div>
              <div className="neu-panel p-3.5 text-center col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Boarding Rate</span>
                <div className="text-lg font-black text-blue-600">{studentSummary.boarding_rate_pct}%</div>
              </div>
            </div>
          )}

          {/* Filtering & RFID Scan simulator bar */}
          {!isStudent && (
            <div className="neu-panel p-4 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Bus and Trip Selector */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <BusIcon className="w-4 h-4 text-blue-600" />
                    <select
                      value={selectedBusId}
                      onChange={(e) => {
                        const bId = e.target.value;
                        setSelectedBusId(bId);
                        const match = buses.find(b => b.id === Number(bId));
                        if (match) setSelectedBusNumber(match.bus_number);
                      }}
                      className="neu-panel-inset px-3 py-1.5 text-xs font-bold text-slate-800 rounded-xl focus:outline-none"
                    >
                      {buses.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.bus_number} ({b.capacity} Seats)
                        </option>
                      ))}
                    </select>
                  </div>

                  <select
                    value={tripType}
                    onChange={(e) => setTripType(e.target.value)}
                    className="neu-panel-inset px-3 py-1.5 text-xs font-bold text-slate-800 rounded-xl focus:outline-none"
                  >
                    <option value="Morning Pickup">Morning Pickup</option>
                    <option value="Evening Drop">Evening Drop</option>
                  </select>

                  {/* Stop Filter */}
                  {availableStops.length > 0 && (
                    <select
                      value={stopFilter}
                      onChange={(e) => setStopFilter(e.target.value)}
                      className="neu-panel-inset px-3 py-1.5 text-xs font-semibold text-slate-700 rounded-xl focus:outline-none"
                    >
                      <option value="ALL">All Boarding Stops</option>
                      {availableStops.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Batch Mark All Button */}
                <button
                  onClick={handleBatchMarkAllVisible}
                  className="neu-button px-3.5 py-1.5 rounded-xl text-xs font-bold text-emerald-700 hover:bg-emerald-50 flex items-center gap-1.5"
                >
                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                  <span>Mark Visible Boarded</span>
                </button>
              </div>

              {/* RFID / QR Simulator Box */}
              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <form onSubmit={handleScanSubmit} className="flex items-center gap-2 flex-1 max-w-md">
                  <div className="relative flex-1">
                    <QrCode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Simulate RFID / QR Scan (e.g. STU-0001 or Name)..."
                      value={scanCode}
                      onChange={(e) => setScanCode(e.target.value)}
                      className="neu-panel-inset w-full pl-9 pr-3 py-1.5 text-xs text-slate-800 rounded-xl focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="neu-button-primary px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap"
                  >
                    Scan & Verify
                  </button>
                </form>

                {/* Search in table */}
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search student or seat..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="neu-panel-inset w-full pl-9 pr-3 py-1.5 text-xs text-slate-800 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              {scanSuccessMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{scanSuccessMessage}</span>
                </div>
              )}
            </div>
          )}

          {/* Student Manifest Table */}
          {isLoadingStudents ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3, 4, 5].map(n => (
                <div key={n} className="neu-panel p-4 h-16 rounded-xl bg-slate-200/50"></div>
              ))}
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="neu-panel p-12 text-center text-slate-500 text-xs">
              No boarding attendance records found for this selection.
            </div>
          ) : (
            <div className="neu-panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase font-bold bg-slate-100/30">
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Roll Number</th>
                      <th className="py-3 px-4">Assigned Stop</th>
                      <th className="py-3 px-4">Seat #</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Boarding Time</th>
                      <th className="py-3 px-4">Method</th>
                      {!isStudent && <th className="py-3 px-4 text-right">Quick Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-200/30 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-extrabold text-slate-900 block">
                            {record.student_name || `Student #${record.student_id}`}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {record.student_department || 'Engineering'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-blue-600">
                          {record.student_roll || '—'}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700">
                          {record.stop_name || 'Campus Gate'}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-600">
                          {record.seat_number ? `Seat ${record.seat_number}` : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={record.status} />
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                          {record.boarding_time 
                            ? new Date(record.boarding_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            record.method === 'RFID' ? 'bg-purple-100 text-purple-700' : 'bg-slate-200/80 text-slate-700'
                          }`}>
                            {record.method}
                          </span>
                        </td>
                        {!isStudent && (
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleMarkStudent(record, 'Boarded')}
                                title="Mark Boarded"
                                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                                  record.status === 'Boarded'
                                    ? 'bg-emerald-600 text-white'
                                    : 'neu-button text-emerald-700 hover:bg-emerald-100'
                                }`}
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleMarkStudent(record, 'Absent')}
                                title="Mark Absent"
                                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                                  record.status === 'Absent'
                                    ? 'bg-rose-600 text-white'
                                    : 'neu-button text-rose-700 hover:bg-rose-100'
                                }`}
                              >
                                <UserX className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: STAFF DAILY ATTENDANCE (DRIVERS & INCHARGES) */}
      {activeTab === 'staff' && !isStudent && (
        <div className="space-y-6">
          {/* Staff KPI Summary Strip */}
          {staffSummary && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="neu-panel p-3.5 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Personnel</span>
                <div className="text-lg font-black text-slate-800">{staffSummary.total_staff}</div>
              </div>
              <div className="neu-panel p-3.5 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Drivers Present</span>
                <div className="text-lg font-black text-emerald-600">{staffSummary.drivers_present}</div>
              </div>
              <div className="neu-panel p-3.5 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Drivers Absent</span>
                <div className="text-lg font-black text-rose-600">{staffSummary.drivers_absent}</div>
              </div>
              <div className="neu-panel p-3.5 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Incharges Present</span>
                <div className="text-lg font-black text-blue-600">{staffSummary.incharges_present}</div>
              </div>
              <div className="neu-panel p-3.5 text-center col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Attendance Rate</span>
                <div className="text-lg font-black text-purple-600">{staffSummary.attendance_rate_pct}%</div>
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div className="neu-panel p-4 flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-700">Filter Staff Role:</span>
            <div className="flex items-center gap-1.5">
              {['ALL', 'DRIVER', 'BUS_INCHARGE'].map(st => (
                <button
                  key={st}
                  onClick={() => setStaffTypeFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    staffTypeFilter === st
                      ? 'neu-panel-inset text-blue-600 font-bold bg-white/50'
                      : 'neu-button text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st === 'DRIVER' ? 'Drivers Only' : st === 'BUS_INCHARGE' ? 'Incharges Only' : 'All Staff'}
                </button>
              ))}
            </div>
          </div>

          {/* Staff Attendance Table */}
          {isLoadingStaff ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map(n => (
                <div key={n} className="neu-panel p-4 h-16 rounded-xl bg-slate-200/50"></div>
              ))}
            </div>
          ) : staffRecords.length === 0 ? (
            <div className="neu-panel p-12 text-center text-slate-500 text-xs">
              No staff attendance records logged for {targetDate}.
            </div>
          ) : (
            <div className="neu-panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase font-bold bg-slate-100/30">
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">Staff Code</th>
                      <th className="py-3 px-4">Assigned Bus</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Check-In Time</th>
                      <th className="py-3 px-4">Shift</th>
                      <th className="py-3 px-4">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staffRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-200/30 transition-colors">
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            record.staff_type === 'DRIVER' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {record.staff_type === 'DRIVER' ? 'Driver' : 'Bus Incharge'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-extrabold text-slate-900">
                          {record.staff_name || 'Staff Member'}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-500">
                          {record.staff_code || '—'}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {record.bus_number || '—'}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={record.status} />
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {record.check_in_time 
                            ? new Date(record.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {record.shift}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {record.remarks || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Staff Check-In Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="neu-panel max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-800">
                Log Staff Daily Check-In
              </h3>
              <button 
                onClick={() => setShowStaffModal(false)}
                className="neu-button p-1.5 rounded-lg text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStaffAttendance} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Staff Role</label>
                <select
                  value={staffForm.staff_type}
                  onChange={(e) => setStaffForm({...staffForm, staff_type: e.target.value})}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                >
                  <option value="DRIVER">Driver</option>
                  <option value="BUS_INCHARGE">Bus Incharge</option>
                </select>
              </div>

              {staffForm.staff_type === 'DRIVER' ? (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Select Driver</label>
                  <select
                    required
                    value={staffForm.driver_id}
                    onChange={(e) => setStaffForm({...staffForm, driver_id: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                  >
                    <option value="">Select Driver...</option>
                    {driversList.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.driver_id}) - Bus: {d.assigned_bus || 'N/A'}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Select Bus Incharge</label>
                  <select
                    required
                    value={staffForm.incharge_id}
                    onChange={(e) => setStaffForm({...staffForm, incharge_id: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                  >
                    <option value="">Select Incharge...</option>
                    {inchargesList.map(inc => (
                      <option key={inc.id} value={inc.id}>
                        {inc.name} ({inc.incharge_id}) - Bus: {inc.assigned_bus || 'N/A'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Status</label>
                  <select
                    value={staffForm.status}
                    onChange={(e) => setStaffForm({...staffForm, status: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                  >
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Late">Late</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Shift</label>
                  <select
                    value={staffForm.shift}
                    onChange={(e) => setStaffForm({...staffForm, shift: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                  >
                    <option value="Morning Shift">Morning Shift</option>
                    <option value="Evening Shift">Evening Shift</option>
                    <option value="Regular Shift">Regular Shift</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Verified license and emergency kit"
                  value={staffForm.remarks}
                  onChange={(e) => setStaffForm({...staffForm, remarks: e.target.value})}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="neu-button px-4 py-2 rounded-xl text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={staffSubmitting}
                  className="neu-button-primary px-5 py-2 rounded-xl text-xs font-bold"
                >
                  {staffSubmitting ? 'Recording...' : 'Save Check-In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
