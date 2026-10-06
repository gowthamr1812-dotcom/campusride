import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#E8EDF3] flex items-center justify-center p-6">
        <div className="neu-panel p-8 max-w-sm w-full text-center space-y-4 animate-pulse">
          <div className="w-12 h-12 rounded-xl bg-blue-200 mx-auto"></div>
          <div className="h-4 bg-slate-300 rounded w-3/4 mx-auto"></div>
          <div className="h-3 bg-slate-200 rounded w-1/2 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
        <div className="neu-panel p-8 max-w-md w-full space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">
            Access Restricted (RBAC)
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your current role <span className="font-bold text-slate-800">[{user.role}]</span> is not authorized to access this module.
          </p>
          <div className="pt-2">
            <Navigate to="/" replace />
          </div>
        </div>
      </div>
    );
  }

  return children;
}
