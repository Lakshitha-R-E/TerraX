import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  Layers, Lock, Mail, Eye, EyeOff, ShieldCheck,
  AlertCircle, Loader2, ArrowRight, MapPin, Eye as ViewerIcon,
  CheckCircle2, Info, Building2, HelpCircle, X
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { DEMO_CREDENTIALS } from '../services/auth';
import type { UserRole } from '../types';
import clsx from 'clsx';

export default function Login() {
  const { isAuthenticated, login } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  // If already authenticated, redirect to root immediately
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const [role, setRole] = useState<UserRole>('Admin');
  const [email, setEmail] = useState('admin@terrax.gov.in');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // When role changes, pre-populate demo credentials for seamless evaluation
  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    setError(null);
    const demo = DEMO_CREDENTIALS[newRole];
    if (demo) {
      setEmail(demo.email);
      setPassword(demo.pass);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your government email or username.');
      return;
    }
    if (!password) {
      setError('Please enter your account password.');
      return;
    }

    setLoading(true);
    try {
      const res = await login({ email: email.trim(), password, role }, rememberMe);
      if (res.success) {
        const fromPath = (location.state as any)?.from?.pathname || '/';
        navigate(fromPath, { replace: true });
      } else {
        setError(res.error || 'Invalid credentials. Please verify your email and password.');
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication service error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (targetRole: UserRole) => {
    handleRoleChange(targetRole);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-5xl bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        
        {/* Left Branding / Information Panel (Desktop 5 cols) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-700">
          {/* Subtle GIS grid pattern background */}
          <div 
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(#93c5fd 1px, transparent 1px), linear-gradient(to right, #334155 1px, transparent 1px)',
              backgroundSize: '24px 24px, 48px 48px',
            }}
          />

          <div className="relative z-10">
            {/* National / Department Header */}
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Department of Land Resources (DoLR)
              </span>
            </div>

            {/* TerraX Logo & Title */}
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shadow-md shadow-blue-900/50">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                  TerraX
                  <span className="text-[11px] font-medium text-blue-400 bg-blue-950/80 px-1.5 py-0.5 rounded border border-blue-500/30">
                    v2.0
                  </span>
                </h1>
                <p className="text-xs text-slate-300 font-medium">3D Property Intelligence for a Smarter Tomorrow</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 mt-3 leading-relaxed">
              Unified 3D Land Parcel &amp; Vertical Property Cadastral Infrastructure. Powered by 3D ULPIN ISO 19152 LADM standards for high-density urban property mapping.
            </p>

            {/* Key Capabilities Badges */}
            <div className="mt-6 space-y-2.5">
              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-left">
                <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-200">Volumetric 3D ULPIN Generation</p>
                  <p className="text-[11px] text-slate-400">Unique spatial-temporal identification for apartments, floors &amp; air rights.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-left">
                <Building2 className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-200">Subsurface &amp; Elevated Rights</p>
                  <p className="text-[11px] text-slate-400">Underground metro utilities, parking chambers &amp; elevated transit corridors.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-left">
                <MapPin className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-200">Adyar, Chennai Study Region</p>
                  <p className="text-[11px] text-slate-400">Integrated with Microsoft ML Footprints, OSM Roads &amp; ISRO DEM.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Security Badge */}
          <div className="relative z-10 pt-6 mt-6 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Secure Gov.in Portal
            </span>
            <span className="text-[10px] text-slate-500 font-mono">SIH26011</span>
          </div>
        </div>

        {/* Right Form Panel (Desktop 7 cols) */}
        <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-white">
          <div>
            {/* Form Header */}
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Portal Authentication</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Sign in to access your authorized 3D property management workspace.
              </p>
            </div>

            {/* Role Selector Tabs */}
            <div className="mb-5">
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Select Operating Role
              </label>
              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-lg border border-slate-200">
                {(
                  [
                    { id: 'Admin', label: 'Admin', icon: ShieldCheck, desc: 'Central Cadastre' },
                    { id: 'Surveyor', label: 'Surveyor', icon: MapPin, desc: 'Field Verification' },
                    { id: 'Authority Viewer', label: 'Authority', icon: ViewerIcon, desc: 'Public / Registry' },
                  ] as const
                ).map(({ id, label, icon: Icon, desc }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleRoleChange(id)}
                    className={clsx(
                      'flex flex-col items-center justify-center py-2 px-1 rounded-md text-xs font-medium transition-all cursor-pointer',
                      role === id
                        ? 'bg-white text-blue-700 shadow-sm border border-slate-200 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    )}
                  >
                    <Icon className={clsx('w-4 h-4 mb-0.5', role === id ? 'text-blue-600' : 'text-slate-500')} />
                    <span>{label}</span>
                    <span className="text-[9px] text-slate-400 hidden sm:inline">{desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message Alert */}
            {error && (
              <div
                role="alert"
                className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700 animate-fadeIn"
              >
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-red-800">Authentication Failed</p>
                  <p className="text-[11px] mt-0.5 text-red-700">{error}</p>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email / Username Input */}
              <div>
                <label htmlFor="email-input" className="form-label">
                  Government Email / Username <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="email-input"
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="e.g. name@terrax.gov.in"
                    className="form-input pl-9 text-xs py-2"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="password-input" className="form-label mb-0">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-[11px] text-blue-600 hover:text-blue-700 hover:underline font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Enter account password"
                    className="form-input pl-9 pr-9 text-xs py-2"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 focus:ring-1"
                  />
                  <span>Remember my session on this device</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-2.5 text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to {role} Console</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Demo Quick-Fill Section */}
            <div className="mt-6 pt-5 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Info className="w-3 h-3 text-blue-500" />
                  Demo Evaluation Credentials
                </span>
                <span className="text-[10px] text-slate-400">Click to prefill</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(
                  [
                    { role: 'Admin', email: 'admin@terrax.gov.in', pass: 'Admin@123', color: 'border-blue-200 hover:bg-blue-50/50' },
                    { role: 'Surveyor', email: 'surveyor@terrax.gov.in', pass: 'Surveyor@123', color: 'border-emerald-200 hover:bg-emerald-50/50' },
                    { role: 'Authority Viewer', email: 'viewer@terrax.gov.in', pass: 'Viewer@123', color: 'border-amber-200 hover:bg-amber-50/50' },
                  ] as const
                ).map((cred) => (
                  <button
                    key={cred.role}
                    type="button"
                    onClick={() => handleQuickFill(cred.role)}
                    className={clsx(
                      'p-2 rounded border text-left transition-colors cursor-pointer',
                      cred.color,
                      role === cred.role ? 'ring-1 ring-blue-500 bg-slate-50' : 'bg-white'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-800">{cred.role}</span>
                      {role === cred.role && <CheckCircle2 className="w-3 h-3 text-blue-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono truncate">{cred.email}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">Key: <span className="font-mono text-slate-600">{cred.pass}</span></p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Accreditation Notice */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
            <span>Govt. of India — Smart Land Governance</span>
            <span>Version 2.0 (SIH26011)</span>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-5 relative">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-3.5 right-3.5 text-slate-400 hover:text-slate-600"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 text-slate-900 mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Credential Recovery Procedure</h3>
                <p className="text-[11px] text-slate-500">Government Cadastral Security Protocol</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              As a secure Land Records &amp; Property Intelligence platform, password resets require verification by the Cadastral System Administrator.
            </p>

            <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs space-y-1.5 mb-4">
              <p className="font-semibold text-slate-800">For SIH 2026 Evaluation:</p>
              <p className="text-slate-600">Please use the pre-configured demo credentials shown on the login screen:</p>
              <ul className="list-disc pl-4 text-slate-600 text-[11px] space-y-0.5">
                <li><strong>Admin:</strong> admin@terrax.gov.in (Admin@123)</li>
                <li><strong>Surveyor:</strong> surveyor@terrax.gov.in (Surveyor@123)</li>
                <li><strong>Authority Viewer:</strong> viewer@terrax.gov.in (Viewer@123)</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full btn-primary py-2 text-xs font-medium"
            >
              Return to Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
