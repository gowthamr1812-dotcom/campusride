import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Bus, 
  CreditCard, 
  MapPin, 
  Armchair, 
  RefreshCw, 
  Eye, 
  X, 
  AlertCircle,
  GraduationCap
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

const DEPARTMENTS = ['ALL', 'CSE', 'ECE', 'MECH', 'IT', 'CIVIL', 'EEE', 'AIDS'];
const PAYMENT_STATUSES = ['ALL', 'Paid', 'Partial', 'Pending', 'Overdue'];

export default function Students() {
  const { user, hasRole } = useAuth();
  const canManage = hasRole(['ADMIN', 'TRANSPORT_MANAGER']);
  const isStudent = user?.role === 'STUDENT';
  const isIncharge = user?.role === 'BUS_INCHARGE';

  const [students, setStudents] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('ALL');
  const [year, setYear] = useState('ALL');
  const [busFilter, setBusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    student_id: '',
    name: '',
    department: 'CSE',
    year: 1,
    phone: '',
    parent_phone: '',
    bus: 'BUS-01',
    route: 'Tambaram Route',
    stop: 'Stop 1 (Tambaram)',
    seat: '01A',
    transport_status: 'Active',
    payment_status: 'Paid'
  });

  const fetchStudents = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      let query = `/students?page=${page}&page_size=${pageSize}&`;
      if (search) query += `search=${encodeURIComponent(search)}&`;
      if (department !== 'ALL') query += `department=${encodeURIComponent(department)}&`;
      if (year !== 'ALL') query += `year=${year}&`;
      if (busFilter !== 'ALL') query += `bus=${encodeURIComponent(busFilter)}&`;
      if (paymentFilter !== 'ALL') query += `payment_status=${encodeURIComponent(paymentFilter)}&`;

      const res = await api.get(query);
      setStudents(res.items || []);
      setTotalCount(res.total || 0);
      setTotalPages(res.total_pages || 1);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load student manifest.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [page, pageSize, search, department, year, busFilter, paymentFilter]);

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      await api.post('/students', formData);
      setShowAddModal(false);
      fetchStudents();
    } catch (err) {
      alert(err.message || 'Error registering student passenger');
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="neu-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
              Student Transport Manifest
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
              {totalCount} Total Passengers
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {isStudent 
              ? 'Your personalized college transport pass and assigned seat.'
              : isIncharge 
              ? 'Boarding roster strictly filtered for your designated bus.'
              : 'Global passenger manifest, assigned buses, seat coordinates, and transport dues.'
            }
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStudents}
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
              <span>Enroll Passenger</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Query Toolbar (hidden for students viewing self) */}
      {!isStudent && (
        <div className="neu-panel p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search student ID (STU-0001), name, boarding stop, or phone..."
                className="neu-panel-inset w-full pl-9 pr-4 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <select
                value={department}
                onChange={(e) => { setDepartment(e.target.value); setPage(1); }}
                className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-700 focus:outline-none"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>Department: {d}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={paymentFilter}
                onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}
                className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-700 focus:outline-none"
              >
                {PAYMENT_STATUSES.map((p) => (
                  <option key={p} value={p}>Payment: {p}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Data Table */}
      <div className="neu-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100/70 border-b border-slate-200/80 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
              <tr>
                <th className="py-3 px-4">Student ID & Name</th>
                <th className="py-3 px-4">Department & Year</th>
                <th className="py-3 px-4">Bus & Seat</th>
                <th className="py-3 px-4">Route & Stop</th>
                <th className="py-3 px-4">Transport Pass</th>
                <th className="py-3 px-4">Fee Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2 text-blue-600" />
                    Loading transport roster...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    No student passenger records found.
                  </td>
                </tr>
              ) : (
                students.map((stu) => (
                  <tr key={stu.id} className="hover:bg-white/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{stu.name}</div>
                      <div className="font-mono text-[11px] text-slate-500">{stu.student_id}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{stu.department}</div>
                      <div className="text-[11px] text-slate-500">Year {stu.year}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-bold text-blue-600">
                        <Bus className="w-3.5 h-3.5" />
                        <span>{stu.bus}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Armchair className="w-3 h-3 text-slate-400" />
                        <span>Seat {stu.seat}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800 truncate max-w-[150px]">{stu.route}</div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate max-w-[150px]">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{stu.stop}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge 
                        status={stu.transport_status === 'Active' ? 'running' : 'stopped'}
                        label={stu.transport_status}
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        stu.payment_status === 'Paid'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : stu.payment_status === 'Partial'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : stu.payment_status === 'Pending'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {stu.payment_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedStudent(stu)}
                        className="neu-button p-1.5 rounded-lg text-slate-600 hover:text-blue-600"
                        title="View Full Passenger Pass"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {!isStudent && totalPages > 1 && (
          <div className="p-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing <span className="font-bold text-slate-800">{students.length}</span> of <span className="font-bold text-slate-800">{totalCount}</span> passengers
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="neu-button p-1.5 rounded-lg disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold px-2">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="neu-button p-1.5 rounded-lg disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Student Details Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="neu-panel max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-800">
                  College Transport Pass
                </h3>
              </div>
              <button 
                onClick={() => setSelectedStudent(null)}
                className="neu-button p-1.5 rounded-lg text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="neu-panel-inset p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-black text-base text-slate-900">{selectedStudent.name}</div>
                  <div className="font-mono text-xs text-blue-600">{selectedStudent.student_id}</div>
                </div>
                <StatusBadge 
                  status={selectedStudent.transport_status === 'Active' ? 'running' : 'stopped'}
                  label={selectedStudent.transport_status}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200">
                <div>
                  <span className="text-slate-400">Department:</span>
                  <div className="font-bold text-slate-800">{selectedStudent.department} (Year {selectedStudent.year})</div>
                </div>
                <div>
                  <span className="text-slate-400">Fee Status:</span>
                  <div className="font-bold text-emerald-700">{selectedStudent.payment_status}</div>
                </div>
                <div>
                  <span className="text-slate-400">Bus & Seat:</span>
                  <div className="font-bold text-slate-800">{selectedStudent.bus} • Seat {selectedStudent.seat}</div>
                </div>
                <div>
                  <span className="text-slate-400">Boarding Stop:</span>
                  <div className="font-bold text-slate-800">{selectedStudent.stop}</div>
                </div>
                <div>
                  <span className="text-slate-400">Student Phone:</span>
                  <div className="font-medium text-slate-800">{selectedStudent.phone || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-slate-400">Emergency Parent Phone:</span>
                  <div className="font-medium text-slate-800">{selectedStudent.parent_phone || 'N/A'}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedStudent(null)}
                className="neu-button px-4 py-2 rounded-xl text-xs font-semibold text-slate-700"
              >
                Close Pass
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enroll Passenger Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="neu-panel max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-800">
                Enroll New Student Passenger
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="neu-button p-1.5 rounded-lg text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Student ID</label>
                  <input
                    type="text"
                    required
                    placeholder="STU-0321"
                    value={formData.student_id}
                    onChange={(e) => setFormData({...formData, student_id: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="R. Vignesh"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  >
                    {DEPARTMENTS.filter(d => d !== 'ALL').map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Academic Year</label>
                  <select
                    value={formData.year}
                    onChange={(e) => setFormData({...formData, year: Number(e.target.value)})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  >
                    {[1, 2, 3, 4].map(y => (
                      <option key={y} value={y}>Year {y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Student Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98405 50321"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Parent Contact</label>
                  <input
                    type="text"
                    placeholder="+91 98406 60321"
                    value={formData.parent_phone}
                    onChange={(e) => setFormData({...formData, parent_phone: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Bus</label>
                  <input
                    type="text"
                    value={formData.bus}
                    onChange={(e) => setFormData({...formData, bus: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Seat</label>
                  <input
                    type="text"
                    value={formData.seat}
                    onChange={(e) => setFormData({...formData, seat: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Stop</label>
                  <input
                    type="text"
                    value={formData.stop}
                    onChange={(e) => setFormData({...formData, stop: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800"
                  />
                </div>
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
                  {formSubmitting ? 'Enrolling...' : 'Save Passenger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
