import React, { useState } from 'react';
import { Mail, Lock, UserPlus, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function StaffLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [status, setStatus] = useState('approved'); // 'approved' | 'pending'

  const onSubmit = (e) => {
    e.preventDefault();
    if (form.email && form.password) {
      if (status === 'pending') {
        alert('Your request is awaiting admin approval.');
        return;
      }
      navigate('/staff-dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4 relative">
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 inline-flex items-center px-3 py-2 rounded-lg text-slate-700 bg-white/80 backdrop-blur hover:bg-white shadow transition"
      >
        <ArrowLeft className="h-4 w-4 mr-1.5" />
        Back
      </button>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
        <h1 className="text-2xl font-bold text-slate-900 text-center mb-1">Staff Login</h1>
        <p className="text-slate-500 text-center mb-6">Sign in to access your workspace</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email or Username</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="staff@domain.com"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-semibold transition-colors">Login</button>
        </form>
        <div className="mt-5">
          <button
            type="button"
            onClick={() => navigate('/staff-register')}
            className="w-full inline-flex items-center justify-center bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-semibold transition-colors"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            New Staff
          </button>
        </div>
      </div>
    </div>
  );
}
