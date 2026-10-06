import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Plus, 
  Calendar, 
  Bus as BusIcon, 
  RefreshCw, 
  AlertCircle, 
  AlertTriangle,
  X, 
  ShieldCheck, 
  CheckCircle2, 
  Building2,
  Clock,
  Edit3,
  FileCheck2,
  Award,
  ShieldAlert
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

export default function Documents() {
  const { user, hasRole } = useAuth();
  const canManage = hasRole(['ADMIN', 'TRANSPORT_MANAGER']);

  const [docs, setDocs] = useState([]);
  const [buses, setBuses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [docTypeFilter, setDocTypeFilter] = useState('ALL');
  const [busFilter, setBusFilter] = useState('ALL');
  const [errorMessage, setErrorMessage] = useState(null);

  // Modal State for Register / Renew
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    bus_id: '',
    document_type: 'Fitness Certificate (FC)',
    document_number: '',
    issuing_authority: 'RTO Chennai (Central)',
    issue_date: new Date().toISOString().split('T')[0],
    expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: 'Annual fitness renewal certificate'
  });

  const fetchData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      let url = '/documents?';
      if (statusFilter !== 'ALL') url += `status=${statusFilter}&`;
      if (docTypeFilter !== 'ALL') url += `document_type=${docTypeFilter}&`;
      if (busFilter !== 'ALL') url += `bus_id=${busFilter}&`;

      const [docsRes, busesRes, summaryRes] = await Promise.all([
        api.get(url),
        api.get('/buses'),
        api.get('/fleet/summary')
      ]);

      setDocs(docsRes.items || []);
      setBuses(busesRes.items || []);
      setSummary(summaryRes);

      if (busesRes.items?.length > 0 && !formData.bus_id) {
        setFormData(prev => ({ ...prev, bus_id: busesRes.items[0].id }));
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load vehicle compliance documents.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, docTypeFilter, busFilter]);

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setSelectedDocId(null);
    setFormData({
      bus_id: buses[0]?.id || '',
      document_type: 'Fitness Certificate (FC)',
      document_number: `FC-TN-${Math.floor(100000 + Math.random() * 900000)}`,
      issuing_authority: 'RTO Chennai (Central)',
      issue_date: new Date().toISOString().split('T')[0],
      expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: 'Annual compliance certificate'
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (doc) => {
    setIsEditing(true);
    setSelectedDocId(doc.id);
    setFormData({
      bus_id: doc.bus_id,
      document_type: doc.document_type,
      document_number: doc.document_number,
      issuing_authority: doc.issuing_authority,
      issue_date: doc.issue_date,
      expiry_date: doc.expiry_date,
      notes: doc.notes || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      if (isEditing && selectedDocId) {
        await api.put(`/documents/${selectedDocId}`, {
          document_number: formData.document_number,
          expiry_date: formData.expiry_date,
          issuing_authority: formData.issuing_authority,
          notes: formData.notes
        });
      } else {
        await api.post('/documents', {
          ...formData,
          bus_id: Number(formData.bus_id)
        });
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to save compliance certificate.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const filteredDocs = docs.filter(d => {
    const term = search.toLowerCase();
    return (
      (d.document_number && d.document_number.toLowerCase().includes(term)) ||
      (d.bus_number && d.bus_number.toLowerCase().includes(term)) ||
      (d.document_type && d.document_type.toLowerCase().includes(term)) ||
      (d.issuing_authority && d.issuing_authority.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FileText className="w-7 h-7 text-blue-600" />
            Vehicle Compliance & RTO Vault
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage fitness certificates (FC), commercial insurance policies, pollution (PUC), and RC books
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="neu-button px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 transition flex items-center gap-2 text-xs font-semibold"
            title="Refresh Vault"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Sync
          </button>

          {canManage && (
            <button
              onClick={handleOpenCreateModal}
              className="neu-button-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Register Document
            </button>
          )}
        </div>
      </div>

      {/* Compliance Health KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="neu-panel p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Certificates</span>
            <div className="text-xl font-extrabold text-slate-800 mt-0.5">
              {docs.length} Active Records
            </div>
            <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
              Across 20 Fleet Buses
            </span>
          </div>
        </div>

        <div className="neu-panel p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Valid Documents</span>
            <div className="text-xl font-extrabold text-emerald-700 mt-0.5">
              {summary?.valid_documents_count ?? docs.filter(d => d.status === 'Valid').length}
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold block mt-0.5">
              100% Legal RTO clearance
            </span>
          </div>
        </div>

        <div className="neu-panel p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Expiring Soon</span>
            <div className="text-xl font-extrabold text-amber-700 mt-0.5">
              {summary?.expiring_documents_count ?? docs.filter(d => d.status === 'Expiring Soon').length}
            </div>
            <span className="text-[11px] text-amber-600 font-semibold block mt-0.5">
              Within 30 calendar days
            </span>
          </div>
        </div>

        <div className="neu-panel p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Expired Permits</span>
            <div className="text-xl font-extrabold text-rose-700 mt-0.5">
              {summary?.expired_documents_count ?? docs.filter(d => d.status === 'Expired').length}
            </div>
            <span className="text-[11px] text-rose-600 font-semibold block mt-0.5">
              Immediate action needed
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
            placeholder="Search certificate #, authority, or bus number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="neu-panel-inset w-full pl-9 pr-4 py-2 text-xs text-slate-800 rounded-xl placeholder-slate-400 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={docTypeFilter}
            onChange={(e) => setDocTypeFilter(e.target.value)}
            className="neu-panel-inset px-3 py-1.5 text-xs text-slate-700 rounded-xl focus:outline-none font-semibold"
          >
            <option value="ALL">All Document Types</option>
            <option value="RC Book">RC Book</option>
            <option value="Commercial Insurance">Commercial Insurance</option>
            <option value="Fitness Certificate (FC)">Fitness Certificate (FC)</option>
            <option value="Pollution Certificate (PUC)">Pollution Certificate (PUC)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="neu-panel-inset px-3 py-1.5 text-xs text-slate-700 rounded-xl focus:outline-none font-semibold"
          >
            <option value="ALL">All Statuses</option>
            <option value="Valid">Valid</option>
            <option value="Expiring Soon">Expiring Soon</option>
            <option value="Expired">Expired</option>
          </select>

          <select
            value={busFilter}
            onChange={(e) => setBusFilter(e.target.value)}
            className="neu-panel-inset px-3 py-1.5 text-xs text-slate-700 rounded-xl focus:outline-none font-semibold"
          >
            <option value="ALL">All Buses</option>
            {buses.map(b => (
              <option key={b.id} value={b.id}>{b.bus_number}</option>
            ))}
          </select>
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

      {/* Documents Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="neu-panel p-5 rounded-2xl animate-pulse space-y-3">
              <div className="h-4 bg-slate-200 rounded w-1/3"></div>
              <div className="h-6 bg-slate-200 rounded w-2/3"></div>
              <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="neu-panel p-12 rounded-2xl text-center text-slate-400">
          <FileText className="w-12 h-12 mx-auto text-slate-300 mb-2" />
          <h3 className="text-base font-semibold text-slate-700">No compliance certificates found</h3>
          <p className="text-xs text-slate-400 mt-1">Try resetting the filter criteria or register a new document.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => {
            const isExpiring = doc.status === 'Expiring Soon';
            const isExpired = doc.status === 'Expired';

            return (
              <div 
                key={doc.id} 
                className={`neu-panel p-5 rounded-2xl flex flex-col justify-between transition-all duration-200 hover:shadow-md border ${
                  isExpired 
                    ? 'border-red-300 bg-red-50/20' 
                    : isExpiring 
                    ? 'border-amber-300 bg-amber-50/20' 
                    : 'border-white/60'
                }`}
              >
                <div>
                  {/* Top Bar: Bus Identifier + Status */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
                    <span className="font-extrabold text-blue-700 flex items-center gap-1.5 text-xs">
                      <BusIcon className="w-3.5 h-3.5" />
                      {doc.bus_number || `Bus #${doc.bus_id}`}
                    </span>
                    <StatusBadge status={doc.status} />
                  </div>

                  {/* Document Category & Number */}
                  <div className="mt-3">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      {doc.document_type === 'RC Book' && <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />}
                      {doc.document_type === 'Commercial Insurance' && <FileCheck2 className="w-3.5 h-3.5 text-indigo-600" />}
                      {doc.document_type === 'Fitness Certificate (FC)' && <Award className="w-3.5 h-3.5 text-emerald-600" />}
                      {doc.document_type === 'Pollution Certificate (PUC)' && <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />}
                      {doc.document_type}
                    </div>
                    <div className="text-sm font-mono font-extrabold text-slate-800 mt-1 break-all">
                      {doc.document_number}
                    </div>
                  </div>

                  {/* Issuing Authority */}
                  <div className="mt-2 text-xs text-slate-600 flex items-center gap-1.5 font-medium">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{doc.issuing_authority}</span>
                  </div>

                  {/* Expiry Pill */}
                  <div className="mt-3 p-2.5 rounded-xl neu-panel-inset flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">VALIDITY EXPIRY</span>
                      <span className="font-bold text-slate-700 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {doc.expiry_date}
                      </span>
                    </div>

                    <div className="text-right">
                      {isExpired ? (
                        <span className="text-[10px] font-extrabold text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {Math.abs(doc.days_until_expiry || 0)}d Overdue
                        </span>
                      ) : isExpiring ? (
                        <span className="text-[10px] font-extrabold text-amber-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {doc.days_until_expiry}d Left
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600">
                          {doc.days_until_expiry}d Remaining
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                {canManage && (
                  <div className="mt-4 pt-3 border-t border-slate-200/80 flex justify-end">
                    <button
                      onClick={() => handleOpenEditModal(doc)}
                      className="neu-button px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-600 flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Renew / Update
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Register / Renew Document */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="neu-panel bg-[#E8EDF3] rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-white/60">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {isEditing ? 'Renew Compliance Document' : 'Register Compliance Document'}
                  </h3>
                  <p className="text-[11px] text-slate-500">Government RTO records and statutory compliance certificates</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="neu-button p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Target Bus</label>
                  <select
                    value={formData.bus_id}
                    onChange={(e) => setFormData({...formData, bus_id: e.target.value})}
                    disabled={isEditing}
                    required
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl disabled:opacity-70"
                  >
                    {buses.map(b => (
                      <option key={b.id} value={b.id}>{b.bus_number} ({b.registration_number})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Document Category</label>
                  <select
                    value={formData.document_type}
                    onChange={(e) => setFormData({...formData, document_type: e.target.value})}
                    disabled={isEditing}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl disabled:opacity-70 font-semibold"
                  >
                    <option value="RC Book">RC Book</option>
                    <option value="Commercial Insurance">Commercial Insurance</option>
                    <option value="Fitness Certificate (FC)">Fitness Certificate (FC)</option>
                    <option value="Pollution Certificate (PUC)">Pollution Certificate (PUC)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Certificate / Policy Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FC-TN-09-2026-9021"
                  value={formData.document_number}
                  onChange={(e) => setFormData({...formData, document_number: e.target.value})}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Issuing Authority</label>
                <input
                  type="text"
                  required
                  placeholder="RTO Chennai (Central)"
                  value={formData.issuing_authority}
                  onChange={(e) => setFormData({...formData, issuing_authority: e.target.value})}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Issue Date</label>
                  <input
                    type="date"
                    required
                    value={formData.issue_date}
                    onChange={(e) => setFormData({...formData, issue_date: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Notes / Coverage Scope</label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
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
                  {formSubmitting ? 'Saving...' : (isEditing ? 'Update & Renew' : 'Register Document')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
