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
  Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-center items-center p-4 sm:p-6 overflow-hidden">
      {/* College Buses Background Image with Elegant Dark Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
        style={{
          backgroundImage: `url('/campus-bus-bg.jpg'), url('https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1920&q=80')`,
        }}
      />
      {/* Soft gradient backdrop overlay for high contrast and readability */}
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/85 via-slate-900/70 to-blue-950/80 backdrop-blur-[3px]" />

      {/* Main Content Container */}
      <div className="relative z-10 max-w-md w-full space-y-6 my-auto">
        {/* Branding header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-blue-500 text-white shadow-xl shadow-blue-500/25 mb-1 border border-white/20">
            <Bus className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-md">
            Campus<span className="text-blue-400">Ride</span>
          </h1>
          <p className="text-xs text-slate-300 font-medium tracking-wide">
            College Transportation & Real-Time Telematics Platform
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/30 space-y-6">
          <div className="border-b border-slate-200/80 pb-3">
            <h2 className="text-lg font-bold text-slate-800">
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
                  className="neu-panel-inset w-full pl-10 pr-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 rounded-xl"
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
                  className="neu-panel-inset w-full pl-10 pr-10 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 rounded-xl"
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
              className="w-full neu-button-primary py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:opacity-95 transition-opacity disabled:opacity-60 shadow-md"
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

          {/* Security Assurance Badge */}
          <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span>End-to-end encrypted session with RBAC</span>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-300 drop-shadow">
          CampusRide Platform &copy; 2026 • Encrypted JWT Authentication
        </div>
      </div>
    </div>
  );
}
