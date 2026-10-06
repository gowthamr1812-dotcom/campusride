import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="w-16 h-16 rounded-2xl neu-panel flex items-center justify-center text-rose-500 font-extrabold text-2xl">
        404
      </div>
      <h2 className="text-xl font-bold text-slate-800">
        Page or Module Not Found
      </h2>
      <p className="text-xs text-slate-500 max-w-md">
        The requested module is either under scheduled implementation or unavailable. Please return to the central dashboard.
      </p>
      <Link
        to="/"
        className="neu-button px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-blue-600 inline-flex items-center gap-2"
      >
        <Home className="w-4 h-4" />
        <span>Return to Dashboard</span>
      </Link>
    </div>
  );
}
