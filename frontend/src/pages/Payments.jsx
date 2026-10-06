import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  CreditCard, 
  Search, 
  Plus, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Receipt as ReceiptIcon, 
  RefreshCw, 
  AlertCircle, 
  X, 
  Calendar, 
  ArrowUpRight, 
  ShieldCheck,
  TrendingUp,
  Wallet,
  Smartphone
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

export default function Payments() {
  const { user, hasRole } = useAuth();
  const isStudent = user?.role === 'STUDENT';
  const canManage = hasRole(['ADMIN', 'TRANSPORT_MANAGER']);
  const isAdmin = user?.role === 'ADMIN';

  const [payments, setPayments] = useState([]);
  const [studentFees, setStudentFees] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [errorMessage, setErrorMessage] = useState(null);

  // Pay Online / Record Payment Modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [paySuccessMsg, setPaySuccessMsg] = useState(null);
  const [payForm, setPayForm] = useState({
    student_id: '',
    amount: 12000,
    payment_method: 'UPI',
    notes: 'Transport fee online settlement'
  });

  const fetchData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      let url = '/payments?';
      if (statusFilter !== 'ALL') url += `status=${statusFilter}&`;
      if (methodFilter !== 'ALL') url += `payment_method=${methodFilter}&`;

      const promises = [
        api.get(url),
        api.get('/fees/students')
      ];

      if (canManage) {
        promises.push(api.get('/fees/summary'));
      }

      const [paymentsRes, feesRes, summaryRes] = await Promise.all(promises);

      setPayments(paymentsRes.items || []);
      setStudentFees(feesRes.items || []);
      if (summaryRes) setSummary(summaryRes);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load payment transactions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, methodFilter]);

  // Student's own liability if student role
  const myFeeLiability = studentFees.length > 0 ? studentFees[0] : null;

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    setPaySubmitting(true);
    try {
      const payload = {
        amount: Number(payForm.amount),
        payment_method: payForm.payment_method,
        notes: payForm.notes
      };

      if (!isStudent) {
        if (!payForm.student_id) throw new Error('Please select a student.');
        payload.student_id = Number(payForm.student_id);
      } else if (myFeeLiability) {
        payload.student_id = myFeeLiability.student_id;
        payload.student_fee_id = myFeeLiability.id;
      }

      const res = await api.post('/payments', payload);
      setPaySuccessMsg(`Payment of ₹${res.amount.toLocaleString()} processed successfully! Receipt: ${res.receipt_number}`);
      setShowPayModal(false);
      fetchData();
    } catch (err) {
      alert(err.message || 'Payment processing failed.');
    } finally {
      setPaySubmitting(false);
    }
  };

  // Filter payments by search
  const filteredPayments = payments.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.transaction_id?.toLowerCase().includes(q) ||
      p.student_name?.toLowerCase().includes(q) ||
      p.student_roll?.toLowerCase().includes(q) ||
      p.receipt_number?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="neu-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
              {isStudent ? 'My Transport Fee Status & Online Payments' : 'Institutional Fee Payments & Revenue Ledger'}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
              {payments.length} Transactions
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {isStudent 
              ? 'View your annual transport pass dues, pay online via UPI/Card, and access verified receipts.'
              : 'Monitor real-time fee collections, pending liabilities, payment methods, and auto-generated receipts.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="neu-button p-2.5 rounded-xl text-slate-600 hover:text-blue-600"
            title="Refresh Transactions"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {isStudent && myFeeLiability && myFeeLiability.pending_amount > 0 && (
            <button
              onClick={() => {
                setPayForm(prev => ({ ...prev, amount: myFeeLiability.pending_amount }));
                setShowPayModal(true);
              }}
              className="neu-button-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Smartphone className="w-4 h-4" />
              <span>Pay Dues Online (₹{myFeeLiability.pending_amount.toLocaleString()})</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setShowPayModal(true)}
              className="neu-button-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Record Manual Payment</span>
            </button>
          )}
        </div>
      </div>

      {paySuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{paySuccessMsg}</span>
          </div>
          <button onClick={() => setPaySuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STUDENT PERSONAL FEE STATUS CARD */}
      {isStudent && myFeeLiability && (
        <div className="neu-panel p-6 space-y-4 bg-gradient-to-br from-white/80 to-blue-50/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                Academic Year {myFeeLiability.academic_year} &bull; Commuter Pass
              </span>
              <h3 className="text-lg font-black text-slate-800">
                Transport Pass Fee Assessment
              </h3>
            </div>
            <StatusBadge status={myFeeLiability.status} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 neu-panel-inset rounded-xl">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Assessed Fee</span>
              <div className="text-2xl font-black text-slate-800 mt-1">₹{myFeeLiability.total_amount.toLocaleString()}</div>
            </div>
            <div className="p-4 neu-panel-inset rounded-xl">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Amount Paid</span>
              <div className="text-2xl font-black text-emerald-600 mt-1">₹{myFeeLiability.paid_amount.toLocaleString()}</div>
            </div>
            <div className="p-4 neu-panel-inset rounded-xl">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Balance Pending</span>
              <div className={`text-2xl font-black mt-1 ${myFeeLiability.pending_amount > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                ₹{myFeeLiability.pending_amount.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MANAGEMENT FINANCE KPI STRIP */}
      {summary && canManage && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="neu-panel p-4 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Total Assessed</span>
            <div className="text-xl font-black text-slate-800">₹{summary.total_assessed.toLocaleString()}</div>
          </div>
          <div className="neu-panel p-4 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Total Collected</span>
            <div className="text-xl font-black text-emerald-600">₹{summary.total_collected.toLocaleString()}</div>
          </div>
          <div className="neu-panel p-4 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Pending Dues</span>
            <div className="text-xl font-black text-rose-600">₹{summary.total_pending.toLocaleString()}</div>
          </div>
          <div className="neu-panel p-4 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Collection Rate</span>
            <div className="text-xl font-black text-blue-600">{summary.collection_rate_pct}%</div>
          </div>
        </div>
      )}

      {/* Search and Filters Strip */}
      <div className="neu-panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transaction ID, student, roll number, or receipt..."
            className="neu-panel-inset w-full pl-9 pr-4 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="neu-panel-inset px-3 py-1.5 text-xs font-semibold text-slate-700 rounded-xl focus:outline-none"
          >
            <option value="ALL">All Payment Methods</option>
            <option value="UPI">UPI (Google Pay / PhonePe)</option>
            <option value="Online">Online Gateway / Card</option>
            <option value="NetBanking">Net Banking</option>
            <option value="Cash">Cash Counter</option>
          </select>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Payments Table */}
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="neu-panel p-5 h-20 rounded-xl bg-slate-200/50"></div>
          ))}
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="neu-panel p-12 text-center text-slate-500 text-xs">
          No payment records found matching your filters.
        </div>
      ) : (
        <div className="neu-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase font-bold bg-slate-100/30">
                  <th className="py-3 px-4">Transaction ID</th>
                  {!isStudent && <th className="py-3 px-4">Passenger / Student</th>}
                  <th className="py-3 px-4">Amount Paid</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Official Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-200/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {p.transaction_id}
                    </td>
                    {!isStudent && (
                      <td className="py-3 px-4">
                        <span className="font-extrabold text-slate-900 block">
                          {p.student_name}
                        </span>
                        <span className="font-mono text-[10px] text-blue-600 font-semibold">
                          {p.student_roll} &bull; Bus: {p.bus_number || 'N/A'}
                        </span>
                      </td>
                    )}
                    <td className="py-3 px-4 font-extrabold text-emerald-600 text-sm">
                      ₹{p.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200/80 text-slate-700">
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(p.payment_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px]">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {p.receipt_number ? (
                        <Link
                          to={`/receipts?id=${p.receipt_number}`}
                          className="neu-button px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                        >
                          <ReceiptIcon className="w-3.5 h-3.5" />
                          <span>{p.receipt_number}</span>
                        </Link>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Processing Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="neu-panel max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span>{isStudent ? 'Online Transport Fee Payment' : 'Record Student Fee Payment'}</span>
              </h3>
              <button 
                onClick={() => setShowPayModal(false)}
                className="neu-button p-1.5 rounded-lg text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleProcessPayment} className="space-y-3.5">
              {!isStudent && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Select Student</label>
                  <select
                    required
                    value={payForm.student_id}
                    onChange={(e) => setPayForm({...payForm, student_id: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                  >
                    <option value="">Select Student...</option>
                    {studentFees.map(sf => (
                      <option key={sf.student_id} value={sf.student_id}>
                        {sf.student_name} ({sf.student_roll}) - Due: ₹{sf.pending_amount.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Payment Amount (₹)</label>
                <input
                  type="number"
                  min="500"
                  required
                  value={payForm.amount}
                  onChange={(e) => setPayForm({...payForm, amount: Number(e.target.value)})}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Payment Gateway / Mode</label>
                <select
                  value={payForm.payment_method}
                  onChange={(e) => setPayForm({...payForm, payment_method: e.target.value})}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                >
                  <option value="UPI">UPI (Google Pay / PhonePe / BHIM)</option>
                  <option value="Online">Debit / Credit Card</option>
                  <option value="NetBanking">Net Banking</option>
                  {!isStudent && <option value="Cash">Cash at Transportation Office</option>}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Notes / Narration</label>
                <input
                  type="text"
                  placeholder="e.g. Annual Bus Pass Payment"
                  value={payForm.notes}
                  onChange={(e) => setPayForm({...payForm, notes: e.target.value})}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="neu-button px-4 py-2 rounded-xl text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paySubmitting}
                  className="neu-button-primary px-5 py-2 rounded-xl text-xs font-bold"
                >
                  {paySubmitting ? 'Authorizing Payment...' : `Confirm & Pay ₹${payForm.amount.toLocaleString()}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
