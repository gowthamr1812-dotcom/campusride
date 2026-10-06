import React, { useState, useEffect } from 'react';
import { 
  Fuel as FuelIcon, 
  Search, 
  Plus, 
  Calendar, 
  Bus as BusIcon, 
  RefreshCw, 
  AlertCircle, 
  X, 
  DollarSign, 
  Gauge, 
  Receipt,
  MapPin,
  CreditCard,
  CheckCircle2,
  TrendingUp,
  Droplet
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Fuel() {
  const { user, hasRole } = useAuth();
  const canManage = hasRole(['ADMIN', 'TRANSPORT_MANAGER']);
  const isDriver = user?.role === 'DRIVER';

  const [fuelLogs, setFuelLogs] = useState([]);
  const [buses, setBuses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [busFilter, setBusFilter] = useState('ALL');
  const [errorMessage, setErrorMessage] = useState(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    bus_id: '',
    log_date: new Date().toISOString().split('T')[0],
    liters_filled: 60.0,
    rate_per_liter: 94.50,
    odometer_reading: 12500.0,
    fuel_station: 'Indian Oil Campus Depot',
    fuel_level_after_fill: 100.0,
    payment_mode: 'Fleet Card',
    invoice_slip_number: '',
    notes: 'Routine refuel before morning route'
  });

  const fetchData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      let url = '/fuel?';
      if (busFilter !== 'ALL') url += `bus_id=${busFilter}&`;

      const [fuelRes, busesRes, summaryRes] = await Promise.all([
        api.get(url),
        api.get('/buses'),
        api.get('/fleet/summary')
      ]);

      setFuelLogs(fuelRes.items || []);
      setBuses(busesRes.items || []);
      setSummary(summaryRes);

      if (busesRes.items?.length > 0 && !formData.bus_id) {
        setFormData(prev => ({ 
          ...prev, 
          bus_id: busesRes.items[0].id,
          odometer_reading: busesRes.items[0].odometer || 12000
        }));
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load diesel telemetry records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [busFilter]);

  const handleCreateFuelLog = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      await api.post('/fuel', {
        ...formData,
        bus_id: Number(formData.bus_id),
        liters_filled: Number(formData.liters_filled),
        rate_per_liter: Number(formData.rate_per_liter),
        odometer_reading: Number(formData.odometer_reading),
        fuel_level_after_fill: Number(formData.fuel_level_after_fill)
      });
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to record diesel refuel entry.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const filteredLogs = fuelLogs.filter(log => {
    const matchesSearch = 
      (log.bus_number && log.bus_number.toLowerCase().includes(search.toLowerCase())) ||
      (log.fuel_station && log.fuel_station.toLowerCase().includes(search.toLowerCase())) ||
      (log.invoice_slip_number && log.invoice_slip_number.toLowerCase().includes(search.toLowerCase())) ||
      (log.driver_name && log.driver_name.toLowerCase().includes(search.toLowerCase()));
    return matchesSearch;
  });

  // Calculate local quick statistics
  const totalLitersInView = filteredLogs.reduce((acc, curr) => acc + (curr.liters_filled || 0), 0);
  const totalCostInView = filteredLogs.reduce((acc, curr) => acc + (curr.total_cost || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FuelIcon className="w-7 h-7 text-blue-600" />
            Diesel & Fuel Telemetry
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Log diesel refuels, audit campus depot billing, and monitor fleet tank levels in real time
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="neu-button px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 transition flex items-center gap-2 text-xs font-semibold"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Sync
          </button>

          {(canManage || isDriver) && (
            <button
              onClick={() => {
                if (buses.length > 0 && !formData.bus_id) {
                  setFormData(prev => ({ ...prev, bus_id: buses[0].id }));
                }
                setShowModal(true);
              }}
              className="neu-button-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Record Diesel Fill
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="neu-panel p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Fuel Spend</span>
            <div className="text-xl font-extrabold text-slate-800 mt-0.5">
              ₹{(summary?.monthly_fuel_cost || totalCostInView).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
              <TrendingUp className="w-3 h-3" /> Campus fuel card billing
            </span>
          </div>
        </div>

        <div className="neu-panel p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Droplet className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Diesel Consumed</span>
            <div className="text-xl font-extrabold text-slate-800 mt-0.5">
              {(summary?.monthly_fuel_liters || totalLitersInView).toFixed(1)} L
            </div>
            <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
              Across active route fleet
            </span>
          </div>
        </div>

        <div className="neu-panel p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <FuelIcon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Contract Tariff</span>
            <div className="text-xl font-extrabold text-slate-800 mt-0.5">
              ₹94.50 / L
            </div>
            <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
              Indian Oil Institutional Bulk
            </span>
          </div>
        </div>

        <div className="neu-panel p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Gauge className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Refuel Transactions</span>
            <div className="text-xl font-extrabold text-slate-800 mt-0.5">
              {fuelLogs.length} Records
            </div>
            <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
              Authenticated odometer sync
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
            placeholder="Search invoice slip, station depot, driver, or bus..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="neu-panel-inset w-full pl-9 pr-4 py-2 text-xs text-slate-800 rounded-xl placeholder-slate-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <BusIcon className="w-4 h-4 text-slate-400" />
            <select
              value={busFilter}
              onChange={(e) => setBusFilter(e.target.value)}
              className="neu-panel-inset px-3 py-1.5 text-xs text-slate-700 rounded-xl focus:outline-none font-semibold"
            >
              <option value="ALL">All Buses</option>
              {buses.map(b => (
                <option key={b.id} value={b.id}>{b.bus_number} ({b.registration_number})</option>
              ))}
            </select>
          </div>
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

      {/* Main Table / List */}
      <div className="neu-panel rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Date & Slip</th>
                <th className="py-3 px-4">Bus Identifier</th>
                <th className="py-3 px-4">Driver / Operator</th>
                <th className="py-3 px-4">Diesel Quantity</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Odometer & Fuel Gauge</th>
                <th className="py-3 px-4">Depot Station</th>
                <th className="py-3 px-4">Payment Mode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3 px-4"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                    <td className="py-3 px-4"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                    <td className="py-3 px-4"><div className="h-4 bg-slate-200 rounded w-28"></div></td>
                    <td className="py-3 px-4"><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                    <td className="py-3 px-4"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                    <td className="py-3 px-4"><div className="h-4 bg-slate-200 rounded w-32"></div></td>
                    <td className="py-3 px-4"><div className="h-4 bg-slate-200 rounded w-28"></div></td>
                    <td className="py-3 px-4"><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                  </tr>
                ))
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <FuelIcon className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold">No diesel telemetry logs found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Try altering search keywords or log a new diesel refill receipt.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const fuelPct = Math.min(100, Math.max(0, log.fuel_level_after_fill || 100));
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {log.log_date}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                          <Receipt className="w-3 h-3 text-slate-400" />
                          {log.invoice_slip_number || 'N/A'}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-blue-700 flex items-center gap-1.5">
                          <BusIcon className="w-3.5 h-3.5 text-blue-600" />
                          {log.bus_number || `Bus #${log.bus_id}`}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {log.registration_number || 'TN Registration'}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-700">
                          {log.driver_name || 'Assigned Driver'}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-800">
                        {log.liters_filled.toFixed(1)} L
                        <div className="text-[10px] text-slate-400 font-normal">
                          @ ₹{log.rate_per_liter.toFixed(2)}/L
                        </div>
                      </td>

                      <td className="py-3 px-4 font-extrabold text-slate-900">
                        ₹{log.total_cost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-4 min-w-[150px]">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                          <span className="flex items-center gap-1 font-mono">
                            <Gauge className="w-3 h-3 text-slate-400" />
                            {log.odometer_reading.toLocaleString()} km
                          </span>
                          <span className="text-[10px] text-blue-600 font-bold">{fuelPct}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              fuelPct > 50 ? 'bg-emerald-500' : fuelPct > 25 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${fuelPct}%` }}
                          ></div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-slate-700 flex items-center gap-1 font-medium text-[11px]">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[140px]">{log.fuel_station}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          <CreditCard className="w-3 h-3 text-slate-500" />
                          {log.payment_mode}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Refuel Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="neu-panel bg-[#E8EDF3] rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-white/60">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <FuelIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Record Diesel Refuel</h3>
                  <p className="text-[11px] text-slate-500">Synchronize fuel tank capacity and campus odometer</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="neu-button p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFuelLog} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Target Bus</label>
                  <select
                    value={formData.bus_id}
                    onChange={(e) => {
                      const selectedBus = buses.find(b => String(b.id) === e.target.value);
                      setFormData({
                        ...formData, 
                        bus_id: e.target.value,
                        odometer_reading: selectedBus ? (selectedBus.odometer || 12000) : formData.odometer_reading
                      });
                    }}
                    required
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                  >
                    {buses.map(b => (
                      <option key={b.id} value={b.id}>{b.bus_number} ({b.registration_number})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Refuel Date</label>
                  <input
                    type="date"
                    required
                    value={formData.log_date}
                    onChange={(e) => setFormData({...formData, log_date: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Liters Filled (L)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    required
                    value={formData.liters_filled}
                    onChange={(e) => setFormData({...formData, liters_filled: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Rate per Liter (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="50"
                    required
                    value={formData.rate_per_liter}
                    onChange={(e) => setFormData({...formData, rate_per_liter: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl font-bold"
                  />
                </div>
              </div>

              {/* Computed total cost preview */}
              <div className="neu-panel-inset p-3 rounded-xl bg-blue-50/40 border border-blue-200/50 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-600">Total Refuel Charge:</span>
                <span className="text-sm font-extrabold text-blue-700">
                  ₹{(Number(formData.liters_filled || 0) * Number(formData.rate_per_liter || 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Odometer Reading (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.odometer_reading}
                    onChange={(e) => setFormData({...formData, odometer_reading: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Tank Level After Fill (%)</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    required
                    value={formData.fuel_level_after_fill}
                    onChange={(e) => setFormData({...formData, fuel_level_after_fill: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Depot / Station Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Indian Oil Campus Depot"
                    value={formData.fuel_station}
                    onChange={(e) => setFormData({...formData, fuel_station: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Invoice Slip Number</label>
                  <input
                    type="text"
                    placeholder="SLIP-IOCL-9988"
                    value={formData.invoice_slip_number}
                    onChange={(e) => setFormData({...formData, invoice_slip_number: e.target.value})}
                    className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Payment Mode</label>
                <select
                  value={formData.payment_mode}
                  onChange={(e) => setFormData({...formData, payment_mode: e.target.value})}
                  className="neu-panel-inset w-full px-3 py-2 text-xs text-slate-800 rounded-xl"
                >
                  <option value="Fleet Card">Fleet Card (Campus IOCL Account)</option>
                  <option value="Cash Voucher">Cash Voucher</option>
                  <option value="Corporate Credit">Corporate Credit</option>
                </select>
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
                  {formSubmitting ? 'Recording...' : 'Save Refuel Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
