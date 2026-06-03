import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Mail, Lock, User, ArrowRight, Sparkles } from 'lucide-react';
import { db } from '../services/db';

interface AuthScreenProps {
  onLoginSuccess: (email: string) => void;
}

type AuthMode = 'login' | 'signup' | 'forgot';

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Simulate Network Request
    setTimeout(() => {
      setLoading(false);
      if (mode === 'login') {
        if (email && password.length >= 6) {
          db.loginUser(email);
          onLoginSuccess(email);
        } else {
          setMessage({ text: 'Please enter a valid email and 6+ character password.', type: 'error' });
        }
      } else if (mode === 'signup') {
        if (email && name && password.length >= 6) {
          db.loginUser(email);
          onLoginSuccess(email);
        } else {
          setMessage({ text: 'Fill all inputs and use a 6+ character password.', type: 'error' });
        }
      } else {
        setMessage({ text: 'Password reset link sent to your email.', type: 'success' });
      }
    }, 1200);
  };

  const handleGoogleLogin = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const mockEmail = 'gate_ranker_1@gmail.com';
      db.loginUser(mockEmail);
      onLoginSuccess(mockEmail);
    }, 800);
  };

  return (
    <div className="min-height-screen flex items-center justify-center p-4 min-h-screen relative overflow-hidden">
      {/* Background abstract circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md glass-panel p-5 md:p-8 rounded-2xl shadow-2xl relative z-10 font-outfit"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20 mb-3">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight font-outfit m-0">
            GATE<span className="text-gradient-purple">OS</span>
          </h1>
          <p className="text-gray-400 text-sm mt-2 text-center">
            The Personal Command Center for GATE CS AIR &lt; 100
          </p>
        </div>

        <AnimatePresence mode="wait">
          <motion.form 
            key={mode}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {message && (
              <div className={`p-3 rounded-lg text-sm border ${
                message.type === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}>
                {message.text}
              </div>
            )}

            {mode === 'signup' && (
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-medium">FULL NAME</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4.5 w-4.5 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="E.g. Anish Sharma"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm glass-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-medium">EMAIL ADDRESS</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4.5 w-4.5 text-gray-400" />
                <input
                  type="email"
                  required
                  placeholder="name@domain.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm glass-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-gray-400 font-medium">PASSWORD</label>
                  {mode === 'login' && (
                    <button 
                      type="button" 
                      onClick={() => setMode('forgot')}
                      className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4.5 w-4.5 text-gray-400" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm glass-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg font-semibold text-sm transition-all shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'login' && 'Sign In to Command Center'}
                  {mode === 'signup' && 'Create Account'}
                  {mode === 'forgot' && 'Send Reset Code'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </motion.form>
        </AnimatePresence>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#111928] px-2 text-gray-400">Or continue with</span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-2.5 border border-white/10 bg-white/5 hover:bg-white/10 text-gray-200 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.41 0-6.19-2.772-6.19-6.19 0-3.42 2.78-6.19 6.19-6.19 1.482 0 2.825.525 3.882 1.39l2.97-2.97C18.666 2.502 15.657 1.5 12.24 1.5c-5.79 0-10.5 4.71-10.5 10.5s4.71 10.5 10.5 10.5c6.04 0 10.05-4.24 10.05-10.23 0-.69-.08-1.2-.23-1.485H12.24Z"
            />
          </svg>
          Google Authentication
        </button>

        <div className="mt-8 text-center text-sm text-gray-400">
          {mode === 'login' ? (
            <>
              New to GATEOS?{' '}
              <button 
                onClick={() => setMode('signup')}
                className="text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
              >
                Sign up free
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button 
                onClick={() => setMode('login')}
                className="text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
