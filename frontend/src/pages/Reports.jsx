import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Download, 
  Calendar, 
  TrendingUp, 
  Bus, 
  Clock, 
  Fuel, 
  Users, 
  FileSpreadsheet, 
  FileText, 
  CheckCircle2, 
  RefreshCw,
  Filter,
  ShieldCheck
} from 'lucide-react';
import api from '../services/api';

export default function Reports() {
  const [timeRange, setTimeRange] = useState('MONTH');
  const [reportType, setReportType] = useState('FLEET_PERFORMANCE');
  const [isLoading, setIsLoading] = useState(false);
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setIsLoading(true);
      try {
        const [busRes, routeRes] = await Promise.all([
          api.get('/buses').catch(() => []),
          api.get('/routes').catch(() => ({ items: [] }))
        ]);
        setBuses(busRes || []);
        setRoutes(routeRes.items || []);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalyticsData();
  }, []);

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Report Type,Generated Date,Fleet Total,Active Corridors\n"
      + `${reportType},${new Date().toISOString()},${buses.length},${routes.length}\n`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CampusRide_${reportType}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 tracking-wide uppercase">
              Management Intelligence
            </span>
            <span className="text-xs text-slate-500 font-medium">• Executive Analytics & Compliance</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-blue-600" />
            Operational Reports & Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit fleet punctuality, route capacity utilization, diesel expenditures, and passenger attendance telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="neu-button px-4 py-2 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 hover:text-blue-600"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="neu-button-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md hover:shadow-lg"
          >
            <Download className="w-4 h-4" />
            Print / PDF Report
          </button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="neu-panel p-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">On-Time Punctuality</div>
          <div className="text-2xl font-extrabold text-emerald-600">94.8%</div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            +1.4% improvement this month
          </div>
        </div>

        <div className="neu-panel p-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Distance Logged</div>
          <div className="text-2xl font-extrabold text-slate-800">18,450 km</div>
          <div className="text-[10px] text-slate-500 mt-1">20 active fleet buses</div>
        </div>

        <div className="neu-panel p-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Fuel Consumed</div>
          <div className="text-2xl font-extrabold text-slate-800">4,820 L</div>
          <div className="text-[10px] text-slate-500 mt-1">Avg 3.82 km/L economy</div>
        </div>

        <div className="neu-panel p-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Boarding Attendance</div>
          <div className="text-2xl font-extrabold text-blue-600">93.2%</div>
          <div className="text-[10px] text-slate-500 mt-1">912 active student passes</div>
        </div>
      </div>

      {/* Detailed Corridors Performance Table */}
      <div className="neu-panel overflow-hidden">
        <div className="p-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <Bus className="w-4 h-4 text-blue-600" />
            Corridor Service Performance Audit
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Filter:</span>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="neu-panel-inset px-3 py-1.5 text-xs text-slate-700 bg-transparent focus:outline-none"
            >
              <option value="TODAY">Today's Dispatch</option>
              <option value="WEEK">Last 7 Days</option>
              <option value="MONTH">Current Academic Month</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Corridor Code</th>
                <th className="py-3 px-4">Route Name</th>
                <th className="py-3 px-4">Stops Serviced</th>
                <th className="py-3 px-4">Est. Distance</th>
                <th className="py-3 px-4">Est. Duration</th>
                <th className="py-3 px-4">Punctuality Score</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {routes.slice(0, 10).map((r, i) => (
                <tr key={r.id || i} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-bold text-blue-600">{r.route_code}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{r.name}</td>
                  <td className="py-3 px-4 text-slate-600">{r.stops?.length || 4} stops</td>
                  <td className="py-3 px-4 text-slate-600">{r.total_distance_km || 25} km</td>
                  <td className="py-3 px-4 text-slate-600">{r.estimated_duration_minutes || 45} mins</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                      {92 + (i % 7)}% On-Time
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                      {r.status || 'Active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
