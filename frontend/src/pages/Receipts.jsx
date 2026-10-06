import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Receipt as ReceiptIcon, 
  Search, 
  Download, 
  Printer, 
  CheckCircle2, 
  Bus as BusIcon, 
  User, 
  Calendar, 
  RefreshCw, 
  AlertCircle, 
  X, 
  MapPin, 
  ShieldCheck,
  CreditCard,
  FileText
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Receipts() {
  const [searchParams] = useSearchParams();
  const initialReceiptId = searchParams.get('id');

  const { user } = useAuth();
  const isStudent = user?.role === 'STUDENT';

  const [receipts, setReceipts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);

  // Selected receipt for modal / printing
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isLoadingReceiptDetail, setIsLoadingReceiptDetail] = useState(false);

  const fetchReceipts = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.get('/receipts');
      setReceipts(res.items || []);

      if (initialReceiptId) {
        openReceiptModal(initialReceiptId);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load receipts.');
    } finally {
      setIsLoading(false);
    }
  };

  const openReceiptModal = async (identifier) => {
    setIsLoadingReceiptDetail(true);
    try {
      const detail = await api.get(`/receipts/${identifier}`);
      setSelectedReceipt(detail);
    } catch (err) {
      alert(err.message || 'Error opening receipt');
    } finally {
      setIsLoadingReceiptDetail(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, [initialReceiptId]);

  const handlePrint = () => {
    window.print();
  };

  const filteredReceipts = receipts.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.receipt_number?.toLowerCase().includes(q) ||
      r.student_name?.toLowerCase().includes(q) ||
      r.student_roll?.toLowerCase().includes(q) ||
      r.transaction_id?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="neu-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
              {isStudent ? 'My Official Transport Fee Receipts' : 'Institutional Transport Fee Receipts Archive'}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
              {receipts.length} Issued Receipts
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Official digitally verified receipts with passenger details, corridor allocations, and transaction references.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchReceipts}
            className="neu-button px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-blue-600 flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="neu-panel p-4 flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by receipt number (REC-2026-...), student name, or roll no..."
            className="neu-panel-inset w-full pl-9 pr-4 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-xl"
          />
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Receipts Table */}
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="neu-panel p-5 h-20 rounded-xl bg-slate-200/50"></div>
          ))}
        </div>
      ) : filteredReceipts.length === 0 ? (
        <div className="neu-panel p-12 text-center text-slate-500 text-xs">
          No transport fee receipts found.
        </div>
      ) : (
        <div className="neu-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase font-bold bg-slate-100/30">
                  <th className="py-3 px-4">Receipt Number</th>
                  {!isStudent && <th className="py-3 px-4">Student</th>}
                  <th className="py-3 px-4">Corridor & Bus</th>
                  <th className="py-3 px-4">Amount Paid</th>
                  <th className="py-3 px-4">Date Issued</th>
                  <th className="py-3 px-4">Payment Mode</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReceipts.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-200/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">
                      {r.receipt_number}
                    </td>
                    {!isStudent && (
                      <td className="py-3 px-4">
                        <span className="font-extrabold text-slate-900 block">
                          {r.student_name}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 font-semibold">
                          {r.student_roll}
                        </span>
                      </td>
                    )}
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-800 block">
                        {r.bus_number || 'BUS-01'}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Stop: {r.stop_name || 'Campus Gate'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-extrabold text-emerald-600 text-sm">
                      ₹{r.amount_paid.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(r.issued_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200/80 text-slate-700">
                        {r.payment_mode}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openReceiptModal(r.receipt_number)}
                        className="neu-button px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:text-blue-600 inline-flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        <span>View Official Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Interactive Official Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white print:static">
          <div className="neu-panel max-w-xl w-full p-8 space-y-6 bg-white relative print:shadow-none print:border-none print:max-w-none">
            {/* Top Close / Print bar (hidden in print) */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 print:hidden">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Official E-Receipt Document
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="neu-button px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1.5 hover:text-blue-600"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button 
                  onClick={() => setSelectedReceipt(null)}
                  className="neu-button p-1.5 rounded-lg text-slate-500 hover:text-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Receipt Body */}
            <div className="space-y-6 text-slate-800">
              {/* College Header */}
              <div className="text-center pb-4 border-b-2 border-slate-800 space-y-1">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center mx-auto font-black shadow-md">
                  <BusIcon className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">
                  CampusRide Transportation Management
                </h2>
                <p className="text-[11px] text-slate-500 font-semibold tracking-wide">
                  OFFICIAL ANNUAL COMMUTER FEE PAYMENT RECEIPT
                </p>
              </div>

              {/* Receipt Metadata Row */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Receipt Number</span>
                  <span className="font-mono font-black text-blue-700 text-sm">{selectedReceipt.receipt_number}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Issue Date</span>
                  <span className="font-mono font-bold text-slate-700">
                    {new Date(selectedReceipt.issued_at).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Student & Pass Credentials Box */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Student Name</span>
                    <span className="font-extrabold text-slate-900 text-sm">{selectedReceipt.student_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Roll / Pass ID</span>
                    <span className="font-mono font-bold text-slate-800">{selectedReceipt.student_roll}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-200/80 text-[11px]">
                  <div>
                    <span className="text-slate-400 block font-semibold">Department</span>
                    <span className="font-bold text-slate-700">{selectedReceipt.student_department || 'Engineering'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Assigned Bus</span>
                    <span className="font-bold text-blue-600">{selectedReceipt.bus_number || 'BUS-01'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Boarding Point</span>
                    <span className="font-bold text-slate-700">{selectedReceipt.stop_name || 'Campus Gate'}</span>
                  </div>
                </div>
              </div>

              {/* Financial Table */}
              <div className="space-y-2 text-xs">
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="flex justify-between bg-slate-100 p-2.5 font-bold text-slate-700">
                    <span>Description</span>
                    <span>Amount</span>
                  </div>
                  <div className="flex justify-between p-3 border-b border-slate-100 font-medium">
                    <div>
                      <span className="font-bold block">Annual College Transportation Fee ({selectedReceipt.academic_year})</span>
                      <span className="text-[10px] text-slate-400">Institutional pass and priority seat reservation</span>
                    </div>
                    <span className="font-mono font-bold">₹{selectedReceipt.amount_paid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-slate-50 font-extrabold text-sm text-slate-900">
                    <span>Total Amount Paid</span>
                    <span className="text-emerald-600 font-black">₹{selectedReceipt.amount_paid.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex justify-between text-[11px] text-slate-500 pt-1 px-1">
                  <span>Balance Due: <strong className="text-slate-800">₹{selectedReceipt.balance_due.toLocaleString()}</strong></span>
                  <span>Payment Mode: <strong className="text-slate-800 uppercase">{selectedReceipt.payment_mode}</strong></span>
                  <span>Txn Ref: <strong className="font-mono text-slate-800">{selectedReceipt.transaction_id || 'N/A'}</strong></span>
                </div>
              </div>

              {/* Digital Seal Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Digitally Signed & Validated</span>
                </div>
                <div className="text-right text-[10px] text-slate-400 font-mono">
                  Autonomous College Transport Wing<br />Official Computer Generated Receipt
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
