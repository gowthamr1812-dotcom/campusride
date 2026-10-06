import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Check, 
  Clock, 
  AlertTriangle, 
  Plus, 
  X, 
  RefreshCw, 
  Search, 
  Filter, 
  Users, 
  ChevronRight,
  FileCheck2,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function SafetyInstructions() {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole(['ADMIN']);

  const [instructions, setInstructions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);

  // Publish Modal State
  const [showModal, setShowModal] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: 'In-Transit Safety',
    target_role: 'ALL',
    content: '',
    do_points: '',
    dont_points: '',
    is_mandatory: true,
    version: 'v1.0'
  });

  const fetchData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      let url = '/instructions?';
      if (categoryFilter !== 'ALL') url += `category=${categoryFilter}&`;

      const res = await api.get(url);
      setInstructions(res.items || []);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load travel safety guidelines.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [categoryFilter]);

  const handleAcknowledge = async (id) => {
    try {
      await api.post(`/instructions/${id}/acknowledge`);
      setInstructions(prev => prev.map(inst => 
        inst.id === id ? { ...inst, is_acknowledged: true, acknowledged_at: new Date().toISOString() } : inst
      ));
    } catch (err) {
      alert(err.message || 'Failed to record compliance acknowledgment.');
    }
  };

  const handleCreateDirective = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      await api.post('/instructions', formData);
      setShowModal(false);
      setFormData({
        title: '',
        category: 'In-Transit Safety',
        target_role: 'ALL',
        content: '',
        do_points: '',
        dont_points: '',
        is_mandatory: true,
        version: 'v1.0'
      });
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to publish safety directive.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const filteredInstructions = instructions.filter(i => {
    const term = search.toLowerCase();
    return (
      i.title.toLowerCase().includes(term) ||
      i.content.toLowerCase().includes(term) ||
      i.category.toLowerCase().includes(term)
    );
  });

  // Calculate compliance statistics
  const totalCount = instructions.length;
  const acknowledgedCount = instructions.filter(i => i.is_acknowledged).length;
  const pendingCount = totalCount - acknowledgedCount;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-blue-600" />
            Travel Safety Guidelines & Directives
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Mandatory student transit regulations, emergency exit drills, and seasonal commuting SOPs
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="neu-button px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 transition flex items-center gap-2 text-xs font-semibold"
            title="Refresh Directives"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Sync
          </button>

          {isAdmin && (
            <button
              onClick={() => setShowModal(true)}
              className="neu-button-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Publish Directive
            </button>
          )}
        </div>
      </div>

      {/* Compliance Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="neu-panel p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Directives Published</span>
            <div className="text-xl font-extrabold text-slate-800 mt-0.5">{totalCount} SOP Policies</div>
            <span className="text-[11px] text-slate-500 font-medium block mt-0.5">Campus safety regulatory board</span>
          </div>
        </div>

        <div className="neu-panel p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Your Acknowledged</span>
            <div className="text-xl font-extrabold text-emerald-700 mt-0.5">{acknowledgedCount} Confirmed</div>
            <span className="text-[11px] text-emerald-600 font-semibold block mt-0.5">Compliant with safety norms</span>
          </div>
        </div>

        <div className="neu-panel p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Pending Review</span>
            <div className="text-xl font-extrabold text-amber-700 mt-0.5">{pendingCount} Outstanding</div>
            <span className="text-[11px] text-amber-600 font-medium block mt-0.5">Review and acknowledge below</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="neu-panel p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search guidelines, rules, or evacuation steps..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="neu-panel-inset w-full pl-9 pr-4 py-2 text-xs text-slate-800 rounded-xl placeholder-slate-400 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'ALL', label: 'All Directives' },
            { id: 'Boarding & De-boarding', label: 'Boarding' },
            { id: 'In-Transit Safety', label: 'In-Transit' },
            { id: 'Emergency Evacuation', label: 'Evacuation' },
            { id: 'Severe Weather Protocol', label: 'Monsoons' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                categoryFilter === cat.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'neu-button text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
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

      {/* Instructions Grid */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="neu-panel p-6 rounded-2xl animate-pulse space-y-3">
              <div className="h-5 bg-slate-200 rounded w-1/3"></div>
              <div className="h-4 bg-slate-200 rounded w-full"></div>
              <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : filteredInstructions.length === 0 ? (
        <div className="neu-panel p-12 rounded-2xl text-center text-slate-400">
          <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-2" />
          <h3 className="text-base font-bold text-slate-700">No Directives Found</h3>
          <p className="text-xs text-slate-400 mt-1">Try resetting the category filter.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredInstructions.map((inst) => {
            const doList = inst.do_points ? inst.do_points.split(';').map(s => s.trim()).filter(Boolean) : [];
            const dontList = inst.dont_points ? inst.dont_points.split(';').map(s => s.trim()).filter(Boolean) : [];

            return (
              <div 
                key={inst.id}
                className={`neu-panel p-6 rounded-2xl transition-all border ${
                  inst.is_acknowledged ? 'border-emerald-200/80 bg-emerald-50/10' : 'border-white/60'
                }`}
              >
                {/* Header: Title, Category, Version */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-800">{inst.title}</h3>
                      <span className="font-mono text-[10px] font-bold bg-slate-200 px-2 py-0.5 rounded text-slate-700">
                        {inst.version}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                        {inst.category}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[11px] text-slate-500 font-semibold">
                        Role: {inst.target_role}
                      </span>
                    </div>
                  </div>

                  <div>
                    {inst.is_acknowledged ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Acknowledged</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAcknowledge(inst.id)}
                        className="neu-button-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        I Acknowledge & Comply
                      </button>
                    )}
                  </div>
                </div>

                {/* Directive Body Content */}
                <p className="text-xs text-slate-700 leading-relaxed mt-4">
                  {inst.content}
                </p>

                {/* DO's and DON'Ts Checklist Boxes */}
                {(doList.length > 0 || dontList.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {/* DO's */}
                    {doList.length > 0 && (
                      <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/70 space-y-2">
                        <span className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Mandatory Safety Practices (DO's)
                        </span>
                        <ul className="space-y-1.5 text-xs text-slate-700">
                          {doList.map((pt, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                              <span>{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* DON'Ts */}
                    {dontList.length > 0 && (
                      <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200/70 space-y-2">
                        <span className="text-xs font-extrabold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                          <XCircle className="w-4 h-4 text-rose-600" />
                          Strictly Prohibited Conduct (DON'Ts)
                        </span>
                        <ul className="space-y-1.5 text-xs text-slate-700">
                          {dontList.map((pt, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0"></span>
                              <span>{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Publish Directive Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="neu-panel bg-[#E8EDF3] rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-white/60">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Publish Safety Directive</h3>
                  <p className="text-[11px] text-slate-500">Institutional policy formulation and compliance directive</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="neu-button p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDirective} className="space-y-4 mt-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Directive Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Severe Weather Fog Protocol"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl font-semibold"
                  >
                    <option value="Boarding & De-boarding">Boarding & De-boarding</option>
                    <option value="In-Transit Safety">In-Transit Safety</option>
                    <option value="Emergency Evacuation">Emergency Evacuation</option>
                    <option value="Severe Weather Protocol">Severe Weather Protocol</option>
                    <option value="Vehicle Pre-Trip">Vehicle Pre-Trip</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Target Role</label>
                  <select
                    value={formData.target_role}
                    onChange={(e) => setFormData({...formData, target_role: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl font-semibold"
                  >
                    <option value="ALL">All Roles</option>
                    <option value="STUDENT">Students</option>
                    <option value="DRIVER">Drivers</option>
                    <option value="BUS_INCHARGE">Bus Incharges</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Directive Content & Scope</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Provide comprehensive standard operating guidelines..."
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                ></textarea>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Mandatory DO's (Semicolon separated)
                </label>
                <input
                  type="text"
                  placeholder="Arrive early; Fasten seatbelts; Follow crew directives"
                  value={formData.do_points}
                  onChange={(e) => setFormData({...formData, do_points: e.target.value})}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Strict DON'Ts (Semicolon separated)
                </label>
                <input
                  type="text"
                  placeholder="Never run after bus; Do not lean out; No loud music"
                  value={formData.dont_points}
                  onChange={(e) => setFormData({...formData, dont_points: e.target.value})}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                />
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
                  {formSubmitting ? 'Publishing...' : 'Publish Directive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
