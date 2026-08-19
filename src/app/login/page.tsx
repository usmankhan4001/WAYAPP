'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Lock,
  Mail,
  Eye,
  EyeOff,
  UserPlus,
} from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'ACCESS_DENIED_NOT_GCC_USER') {
      setErrorMsg('Access Denied: Email domain not permitted. Please use your enterprise email.');
    } else if (errorParam === 'SESSION_EXPIRED') {
      setErrorMsg('Your session has expired. Please sign in again.');
    } else if (errorParam === 'META_APP_ID_MISSING') {
      setErrorMsg('Meta App ID is not configured. Please use email and password to sign in.');
    } else if (errorParam) {
      setErrorMsg(decodeURIComponent(errorParam));
    }
  }, [searchParams]);

  const handleMetaLogin = () => {
    setLoading(true);
    window.location.href = '/api/auth/meta';
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.needsRegistration) {
          setNeedsSetup(true);
          setErrorMsg(data.error);
        } else {
          setErrorMsg(data.error || 'Authentication failed. Check your credentials.');
        }
      } else {
        const redirect = searchParams.get('redirect') || '/';
        router.push(redirect);
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-600 text-white font-black text-xl shadow-lg shadow-emerald-600/30 mb-2">
            W
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            WAYAPP <span className="text-emerald-400">Enterprise</span>
          </h1>
          <p className="text-xs text-slate-400">
            WhatsApp Cloud Marketing & Communication Gateway
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
          {/* Security Badge */}
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="text-[11px] text-slate-300">
              Encrypted enterprise authentication with role-based access control.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                {errorMsg}
                {needsSetup && (
                  <div className="mt-2">
                    <Link
                      href="/register"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 underline"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Create Super Admin Account
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Email + Password Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Business Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="name@gccstartup.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950/70 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-sans"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-700 bg-slate-950/70 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{loading ? 'Verifying credentials...' : 'Sign In'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Quick Fill Default Admin Credentials */}
            <button
              type="button"
              onClick={() => {
                setEmail('admin@gccstartup.com');
                setPassword('Admin@12345');
              }}
              className="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-emerald-400 font-semibold text-[11px] border border-slate-700/60 transition-all flex items-center justify-center gap-1.5"
            >
              <span>⚡ Use Default Admin:</span>
              <span className="font-mono text-slate-300">admin@gccstartup.com</span>
            </button>
          </form>

          {/* Registration / Account Action */}
          <div className="text-center pt-2">
            <Link
              href="/register"
              className="text-xs text-slate-400 hover:text-emerald-400 transition-colors"
            >
              Need to create an account? <span className="font-semibold text-emerald-400">Register</span>
            </Link>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px bg-slate-800 flex-1" />
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
              Or Social Single Sign-On
            </span>
            <div className="h-px bg-slate-800 flex-1" />
          </div>

          {/* Meta OAuth Button */}
          <button
            type="button"
            onClick={handleMetaLogin}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold text-xs flex items-center justify-center gap-3 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            <span>Continue with Meta / Facebook</span>
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-500">
          WAYAPP v1.0 &bull; Secure Enterprise Gateway
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
