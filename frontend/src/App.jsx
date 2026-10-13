import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardShell from './pages/DashboardShell';
import Drivers from './pages/Drivers';
import BusIncharges from './pages/BusIncharges';
import Students from './pages/Students';
import Buses from './pages/Buses';
import BusDetails from './pages/BusDetails';
import RoutesPage from './pages/Routes';
import Stops from './pages/Stops';
import Seats from './pages/Seats';
import Trips from './pages/Trips';
import Attendance from './pages/Attendance';
import Fees from './pages/Fees';
import Payments from './pages/Payments';
import Receipts from './pages/Receipts';
import Maintenance from './pages/Maintenance';
import Fuel from './pages/Fuel';
import Documents from './pages/Documents';
import LiveTracking from './pages/LiveTracking';
import Emergency from './pages/Emergency';
import Notifications from './pages/Notifications';
import SafetyInstructions from './pages/SafetyInstructions';
import AiAssistant from './pages/AiAssistant';
import Reports from './pages/Reports';
import AdminUsers from './pages/AdminUsers';
import AdminSettings from './pages/AdminSettings';
import Profile from './pages/Profile';
import Login from './pages/Login';
import NotFound from './pages/NotFound';

function AppLayout() {
  const { sidebarCollapsed } = useTheme();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#E8EDF3] text-slate-800 flex">
      {/* Dynamic Role Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div 
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
          sidebarCollapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        <Header />
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          <Routes>
            <Route path="/" element={<DashboardShell />} />
            <Route path="/drivers" element={<Drivers />} />
            <Route path="/incharges" element={<BusIncharges />} />
            <Route path="/students" element={<Students />} />
            <Route path="/buses" element={<Buses />} />
            <Route path="/buses/:busIdentifier" element={<BusDetails />} />
            <Route path="/routes" element={<RoutesPage />} />
            <Route path="/stops" element={<Stops />} />
            <Route path="/seats" element={<Seats />} />
            <Route path="/trips" element={<Trips />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/fees" element={<Fees />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/receipts" element={<Receipts />} />
            <Route path="/services" element={<Maintenance />} />
            <Route path="/fuel" element={<Fuel />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/tracking" element={<LiveTracking />} />
            <Route path="/emergency" element={<Emergency />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/instructions" element={<SafetyInstructions />} />
            <Route path="/ai" element={<AiAssistant />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Profile />} />
            {/* Catch-all for modules in subsequent phases */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public authentication page */}
            <Route path="/login" element={<Login />} />

            {/* Authenticated application routes */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
