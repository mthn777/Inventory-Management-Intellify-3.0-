import React from 'react';
import Dashboard from '../Dashboard';

export default function AdminDashboard() {
  const adminUser = { firstName: 'Admin' };
  return <Dashboard userData={adminUser} onLogout={() => (window.location.href = '/')} />;
}
