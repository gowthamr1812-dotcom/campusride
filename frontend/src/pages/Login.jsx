import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Bus, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle, 
  ShieldCheck, 
  Users, 
  UserSquare2, 
  Navigation,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DEMO_ACCOUNTS = [
  {
    role: 'ADMIN',
    label: 'Admin',
    email: 'admin@campusride.edu',
    password: 'Admin@123',
    icon: ShieldCheck,
    color: 'border-blue-200 bg-blue-50/70 text-blue-700'
  },
  {
    role: 'TRANSPORT_MANAGER',
    label: 'Manager',
    email: 'manager@campusride.edu',
    password: 'Manager@123',
    icon: Navigation,
    color: 'border-indigo-200 bg-indigo-50/70 text-indigo-700'
  },
  {
    role: 'BUS_INCHARGE',
    label: 'Incharge',
    email: 'incharge@campusride.edu',
    password: 'Incharge@123',
    icon: Users,
    color: 'border-emerald-200 bg-emerald-50/70 text-emerald-700'
  },
  {
    role: 'DRIVER',
    label: 'Driver',
    email: 'driver@campusride.edu',
    password: 'Driver@123',
    icon: UserSquare2,
    color: 'border-amber-200 bg-amber-50/70 text-amber-700'
  },
  {
    role: 'STUDENT',
    label: 'Student',
    email: 'student@campusride.edu',
    password: 'Student@123',
    icon: GraduationCap,
    color: 'border-purple-200 bg-purple-50/70 text-purple-700'
  }
];

export default function Login() {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!usernameOrEmail.trim() || !password) {
      setErrorMessage('Please enter both your credentials to sign in.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(usernameOrEmail.trim(), password);
    setIsSubmitting(false);

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setErrorMessage(result.error);
    }
  };

  const handleSelectDemo = (acc) => {
    setUsernameOrEmail(acc.email);
    setPassword(acc.password);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#E8EDF3] flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="max-w-md w-full space-y-6">
        {/* Branding header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white shadow-lg mb-2">
            <Bus className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">
            Campus<span className="text-blue-600">Ride</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            College Transportation & Real-Time Telematics Platform
          </p>
        </div>

        {/* Login Card */}
        <div className="neu-panel p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-200/80 pb-3">
            <h2 className="text-base font-bold text-slate-800">
              Sign In to Your Account
            </h2>
            <p className="text-xs text-slate-500">
              Enter your institutional credentials to proceed
            </p>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Email or Username
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="name@campusride.edu"
                  className="neu-panel-inset w-full pl-10 pr-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="neu-panel-inset w-full pl-10 pr-10 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full neu-button-primary py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:opacity-95 transition-opacity disabled:opacity-60"
            >
              {isSubmitting ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Role Picker */}
          <div className="pt-4 border-t border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <span>Quick Demo Switcher</span>
              <span className="text-[10px] text-slate-400">Click to fill</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((acc) => {
                const Icon = acc.icon;
                const isSelected = usernameOrEmail === acc.email;
                return (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => handleSelectDemo(acc)}
                    className={`p-2 rounded-xl border text-left flex flex-col gap-1 transition-all text-[11px] ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/90 font-bold shadow-sm'
                        : `${acc.color} hover:opacity-90`
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5" />
                      <span className="truncate">{acc.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-400">
          CampusRide Platform &copy; 2026 • Encrypted JWT Authentication
        </div>
      </div>
    </div>
  );
}
