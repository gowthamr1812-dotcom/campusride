import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Search, 
  Plus, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Edit3, 
  X,
  Users,
  ShieldCheck,
  TrendingUp,
  CreditCard
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

export default function Fees() {
  const { hasRole } = useAuth();
  const canManage = hasRole(['ADMIN']);

  const [feeStructures, setFeeStructures] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [errorMessage, setErrorMessage] = useState(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingSlab, setEditingSlab] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    academic_year: '2025-2026',
    slab_name: '',
    min_distance_km: 0,
    max_distance_km: 15,
    amount: 18000,
    billing_frequency: 'Annual',
    due_date: '2025-09-30',
    description: '',
    status: 'Active'
  });

  const fetchFeeStructures = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      let url = `/fees?academic_year=${encodeURIComponent(academicYear)}`;
      if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;

      const res = await api.get(url);
      setFeeStructures(res.items || []);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load fee structures.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeeStructures();
  }, [academicYear, statusFilter]);

  const handleOpenAdd = () => {
    setEditingSlab(null);
    setFormData({
      academic_year: academicYear,
      slab_name: '',
      min_distance_km: 0,
      max_distance_km: 15,
      amount: 18000,
      billing_frequency: 'Annual',
      due_date: '2025-09-30',
      description: '',
      status: 'Active'
    });
    setShowModal(true);
  };

  const handleOpenEdit = (slab) => {
    setEditingSlab(slab);
    setFormData({
      academic_year: slab.academic_year,
      slab_name: slab.slab_name,
      min_distance_km: slab.min_distance_km,
      max_distance_km: slab.max_distance_km,
      amount: slab.amount,
      billing_frequency: slab.billing_frequency,
      due_date: slab.due_date || '2025-09-30',
      description: slab.description || '',
      status: slab.status
    });
    setShowModal(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      if (editingSlab) {
        await api.put(`/fees/${editingSlab.id}`, formData);
      } else {
        await api.post('/fees', formData);
      }
      setShowModal(false);
      fetchFeeStructures();
    } catch (err) {
      alert(err.message || 'Failed to save fee structure');
    } finally {
      setFormSubmitting(false);
    }
  };

  const minAmount = feeStructures.length > 0 ? Math.min(...feeStructures.map(s => s.amount)) : 0;
  const maxAmount = feeStructures.length > 0 ? Math.max(...feeStructures.map(s => s.amount)) : 0;
  const totalEnrolled = feeStructures.reduce((acc, s) => acc + (s.student_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="neu-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
              Institutional Transport Fee Slabs
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
              Academic Year {academicYear}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Define distance/corridor fare tiers, payment schedule due dates, and billing frequencies.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="neu-panel-inset px-3 py-2 text-xs font-bold text-slate-800 rounded-xl focus:outline-none"
          >
            <option value="2025-2026">2025-2026 Academic Year</option>
            <option value="2024-2025">2024-2025 Academic Year</option>
          </select>

          <button
            onClick={fetchFeeStructures}
            className="neu-button p-2.5 rounded-xl text-slate-600 hover:text-blue-600"
            title="Refresh Fee Tiers"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {canManage && (
            <button
              onClick={handleOpenAdd}
              className="neu-button-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Define Fare Tier</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="neu-panel p-4 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Active Fare Tiers</span>
          <div className="text-xl font-black text-slate-800">{feeStructures.length}</div>
        </div>
        <div className="neu-panel p-4 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Base Minimum Fare</span>
          <div className="text-xl font-black text-emerald-600">₹{minAmount.toLocaleString()}</div>
        </div>
        <div className="neu-panel p-4 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Max Express Fare</span>
          <div className="text-xl font-black text-blue-600">₹{maxAmount.toLocaleString()}</div>
        </div>
        <div className="neu-panel p-4 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned Passengers</span>
          <div className="text-xl font-black text-purple-600">{totalEnrolled}</div>
        </div>
      </div>

      {/* Filter Strip */}
      <div className="neu-panel p-4 flex items-center justify-between gap-3">
        <span className="text-xs font-bold text-slate-700">Filter Fare Slabs:</span>
        <div className="flex items-center gap-1.5">
          {['ALL', 'Active', 'Inactive'].map(st => (
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

      {/* Slabs Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-pulse">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="neu-panel p-6 h-48 rounded-2xl bg-slate-200/50"></div>
          ))}
        </div>
      ) : feeStructures.length === 0 ? (
        <div className="neu-panel p-12 text-center text-slate-500 text-xs">
          No fee structures configured for this academic cycle.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {feeStructures.map((slab) => (
            <div key={slab.id} className="neu-panel p-5 space-y-4 hover:translate-y-[-2px] transition-transform">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl neu-panel flex items-center justify-center text-emerald-600 font-black text-base shrink-0">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                      {slab.slab_name}
                    </h3>
                    <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      Distance: <strong>{slab.min_distance_km} km &ndash; {slab.max_distance_km} km</strong>
                    </span>
                  </div>
                </div>
                <StatusBadge status={slab.status} />
              </div>

              <p className="text-xs text-slate-600 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                {slab.description || 'Standard institutional transport tier.'}
              </p>

              <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-200">
                <div className="p-2 neu-panel-inset rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Fare Rate</span>
                  <span className="text-base font-black text-emerald-600">₹{slab.amount.toLocaleString()}</span>
                </div>
                <div className="p-2 neu-panel-inset rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Billing Cycle</span>
                  <span className="text-xs font-bold text-slate-700 block mt-1">{slab.billing_frequency}</span>
                </div>
                <div className="p-2 neu-panel-inset rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Passengers</span>
                  <span className="text-base font-black text-blue-600">{slab.student_count || 0}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Due: <strong>{slab.due_date || '30 Sep 2025'}</strong>
                </span>

                {canManage && (
                  <button
                    onClick={() => handleOpenEdit(slab)}
                    className="neu-button px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Tier</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="neu-panel max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-800">
                {editingSlab ? 'Edit Fare Tier' : 'Define New Transport Fare Tier'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="neu-button p-1.5 rounded-lg text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Tier Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tier 1: Up to 15 km"
                  value={formData.slab_name}
                  onChange={(e) => setFormData({...formData, slab_name: e.target.value})}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Min Distance (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.min_distance_km}
                    onChange={(e) => setFormData({...formData, min_distance_km: Number(e.target.value)})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Max Distance (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={formData.max_distance_km}
                    onChange={(e) => setFormData({...formData, max_distance_km: Number(e.target.value)})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Annual Fee (₹)</label>
                  <input
                    type="number"
                    min="1000"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Frequency</label>
                  <select
                    value={formData.billing_frequency}
                    onChange={(e) => setFormData({...formData, billing_frequency: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                  >
                    <option value="Annual">Annual</option>
                    <option value="Semester">Semester</option>
                    <option value="Quarterly">Quarterly</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Description</label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                  placeholder="Zone coverage or express features..."
                ></textarea>
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
                  {formSubmitting ? 'Saving...' : 'Save Fare Tier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
