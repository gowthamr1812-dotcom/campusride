import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Users, 
  Search, 
  Plus, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Edit3, 
  X, 
  UserPlus, 
  Key, 
  Mail, 
  Phone, 
  UserCheck, 
  ShieldAlert,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

export default function AdminUsers() {
  const { user } = useAuth();

  const [usersList, setUsersList] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [errorMessage, setErrorMessage] = useState(null);

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    full_name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    role: 'STUDENT',
    is_active: true
  });

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'STUDENT',
    is_active: true,
    password: ''
  });

  const fetchData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      let url = `/users?page=${page}&page_size=50&`;
      if (roleFilter !== 'ALL') url += `role=${roleFilter}&`;
      if (statusFilter !== 'ALL') url += `is_active=${statusFilter === 'Active'}&`;
      if (search) url += `search=${encodeURIComponent(search)}&`;

      const res = await api.get(url);
      setUsersList(res.items || []);
      setTotalCount(res.total || 0);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load user directory.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [roleFilter, statusFilter, page]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateSubmitting(true);
    try {
      await api.post('/users', createForm);
      setShowCreateModal(false);
      setCreateForm({
        full_name: '',
        username: '',
        email: '',
        phone: '',
        password: '',
        role: 'STUDENT',
        is_active: true
      });
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to provision user account.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleOpenEdit = (targetUser) => {
    setSelectedUser(targetUser);
    setEditForm({
      full_name: targetUser.full_name,
      email: targetUser.email,
      phone: targetUser.phone || '',
      role: targetUser.role,
      is_active: targetUser.is_active,
      password: ''
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setEditSubmitting(true);
    try {
      const payload = {
        full_name: editForm.full_name,
        email: editForm.email,
        phone: editForm.phone,
        role: editForm.role,
        is_active: editForm.is_active
      };
      if (editForm.password) {
        payload.password = editForm.password;
      }
      await api.put(`/users/${selectedUser.id}`, payload);
      setShowEditModal(false);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to update user account.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleToggleStatus = async (userId) => {
    try {
      await api.post(`/users/${userId}/toggle-status`);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to toggle account active status.');
    }
  };

  const handleUnlockUser = async (userId) => {
    try {
      await api.post(`/users/${userId}/unlock`);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to unlock user account.');
    }
  };

  // Quick count calculations
  const adminCount = usersList.filter(u => u.role === 'ADMIN' || u.role === 'TRANSPORT_MANAGER').length;
  const crewCount = usersList.filter(u => u.role === 'DRIVER' || u.role === 'BUS_INCHARGE').length;
  const studentCount = usersList.filter(u => u.role === 'STUDENT').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Shield className="w-7 h-7 text-blue-600" />
            Users & Roles Administration
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Enterprise RBAC provisioning, credential lifecycle management, and account security audit
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="neu-button px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 transition flex items-center gap-2 text-xs font-semibold"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Sync
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="neu-button-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Provision User
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="neu-panel p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Accounts</span>
            <div className="text-2xl font-extrabold text-slate-800 mt-0.5">{totalCount} Users</div>
            <span className="text-[11px] text-slate-500 font-medium block mt-0.5">Directory database</span>
          </div>
        </div>

        <div className="neu-panel p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Admin & Managers</span>
            <div className="text-2xl font-extrabold text-indigo-700 mt-0.5">{adminCount} Staff</div>
            <span className="text-[11px] text-indigo-600 font-semibold block mt-0.5">Command clearance</span>
          </div>
        </div>

        <div className="neu-panel p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Fleet Crew Members</span>
            <div className="text-2xl font-extrabold text-emerald-700 mt-0.5">{crewCount} Operators</div>
            <span className="text-[11px] text-emerald-600 font-semibold block mt-0.5">Drivers & Incharges</span>
          </div>
        </div>

        <div className="neu-panel p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Student Commuters</span>
            <div className="text-2xl font-extrabold text-teal-700 mt-0.5">{studentCount} Students</div>
            <span className="text-[11px] text-teal-600 font-semibold block mt-0.5">Transit passholders</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="neu-panel p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <form onSubmit={(e) => { e.preventDefault(); fetchData(); }} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by full name, email, username, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="neu-panel-inset w-full pl-9 pr-4 py-2 text-xs text-slate-800 rounded-xl placeholder-slate-400 focus:outline-none"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="neu-panel-inset px-3 py-1.5 text-xs text-slate-700 rounded-xl focus:outline-none font-semibold"
          >
            <option value="ALL">All Roles</option>
            <option value="ADMIN">ADMIN</option>
            <option value="TRANSPORT_MANAGER">TRANSPORT_MANAGER</option>
            <option value="BUS_INCHARGE">BUS_INCHARGE</option>
            <option value="DRIVER">DRIVER</option>
            <option value="STUDENT">STUDENT</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="neu-panel-inset px-3 py-1.5 text-xs text-slate-700 rounded-xl focus:outline-none font-semibold"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active Accounts</option>
            <option value="Inactive">Suspended Accounts</option>
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

      {/* Users Directory Table */}
      <div className="neu-panel rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">User Identity</th>
                <th className="py-3 px-4">Contacts</th>
                <th className="py-3 px-4">Role Badge</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Security & Last Login</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3 px-4"><div className="h-4 bg-slate-200 rounded w-28"></div></td>
                    <td className="py-3 px-4"><div className="h-4 bg-slate-200 rounded w-36"></div></td>
                    <td className="py-3 px-4"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                    <td className="py-3 px-4"><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                    <td className="py-3 px-4"><div className="h-4 bg-slate-200 rounded w-28"></div></td>
                    <td className="py-3 px-4"><div className="h-4 bg-slate-200 rounded w-20 ml-auto"></div></td>
                  </tr>
                ))
              ) : usersList.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold">No user accounts found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Try adjusting your role or keyword filters.</p>
                  </td>
                </tr>
              ) : (
                usersList.map((u) => {
                  const isLocked = u.failed_login_attempts >= 5 || (u.locked_until && new Date(u.locked_until) > new Date());
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-extrabold text-xs flex items-center justify-center shrink-0">
                            {u.full_name ? u.full_name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 block">{u.full_name}</span>
                            <span className="text-[11px] text-slate-400 font-mono">@{u.username}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-[170px]">{u.email}</span>
                        </div>
                        {u.phone && (
                          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mt-0.5 font-mono">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{u.phone}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-lg text-[10px] font-extrabold tracking-wider ${
                          u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                          u.role === 'TRANSPORT_MANAGER' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' :
                          u.role === 'BUS_INCHARGE' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                          u.role === 'DRIVER' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                          'bg-teal-100 text-teal-700 border border-teal-200'
                        }`}>
                          {u.role}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            Suspended
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-[11px] text-slate-600">
                          {u.last_login_at 
                            ? new Date(u.last_login_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                            : 'Never logged in'}
                        </div>
                        {isLocked ? (
                          <span className="text-[10px] text-rose-600 font-extrabold flex items-center gap-1 mt-0.5">
                            <Lock className="w-3 h-3" /> Account Locked
                          </span>
                        ) : u.failed_login_attempts > 0 ? (
                          <span className="text-[10px] text-amber-600 font-semibold block mt-0.5">
                            {u.failed_login_attempts} failed attempts
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">
                            Security Verified
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isLocked && (
                            <button
                              onClick={() => handleUnlockUser(u.id)}
                              className="neu-button p-1.5 rounded-lg text-amber-600 hover:text-amber-800"
                              title="Unlock account"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => handleToggleStatus(u.id)}
                            className="neu-button p-1.5 rounded-lg text-slate-500 hover:text-slate-800"
                            title={u.is_active ? 'Suspend Account' : 'Reactivate Account'}
                          >
                            {u.is_active ? <XCircle className="w-3.5 h-3.5 text-rose-500" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                          </button>

                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="neu-button p-1.5 rounded-lg text-blue-600 hover:text-blue-800"
                            title="Edit User & Credentials"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="neu-panel bg-[#E8EDF3] rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-white/60">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Provision User Account</h3>
                  <p className="text-[11px] text-slate-500">Assign role credentials and identity attributes</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="neu-button p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Anandha Krishnan"
                    value={createForm.full_name}
                    onChange={(e) => setCreateForm({...createForm, full_name: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. anandha_k"
                    value={createForm.username}
                    onChange={(e) => setCreateForm({...createForm, username: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="name@campusride.edu"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98401 00000"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({...createForm, phone: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Assigned Role</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({...createForm, role: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl font-bold"
                  >
                    <option value="STUDENT">STUDENT</option>
                    <option value="DRIVER">DRIVER</option>
                    <option value="BUS_INCHARGE">BUS_INCHARGE</option>
                    <option value="TRANSPORT_MANAGER">TRANSPORT_MANAGER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Initial Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="neu-button px-4 py-2 rounded-xl text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="neu-button-primary px-5 py-2 rounded-xl text-xs font-bold"
                >
                  {createSubmitting ? 'Provisioning...' : 'Provision Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="neu-panel bg-[#E8EDF3] rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-white/60">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Edit Account: @{selectedUser.username}</h3>
                  <p className="text-[11px] text-slate-500">Update role designation or reset access credentials</p>
                </div>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                className="neu-button p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4 mt-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Assigned Role</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl font-bold"
                  >
                    <option value="STUDENT">STUDENT</option>
                    <option value="DRIVER">DRIVER</option>
                    <option value="BUS_INCHARGE">BUS_INCHARGE</option>
                    <option value="TRANSPORT_MANAGER">TRANSPORT_MANAGER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Account Active Status</label>
                  <select
                    value={editForm.is_active ? 'Active' : 'Inactive'}
                    onChange={(e) => setEditForm({...editForm, is_active: e.target.value === 'Active'})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl font-semibold"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Suspended</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Reset Password (Leave blank to keep current)
                </label>
                <input
                  type="password"
                  placeholder="Enter new password to override..."
                  value={editForm.password}
                  onChange={(e) => setEditForm({...editForm, password: e.target.value})}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                />
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
                  disabled={editSubmitting}
                  className="neu-button-primary px-5 py-2 rounded-xl text-xs font-bold"
                >
                  {editSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
