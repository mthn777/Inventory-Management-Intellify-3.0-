import React from 'react';
import Dashboard from '../Dashboard';

export default function StaffDashboard() {
  const staffUser = { firstName: 'Staff' };
  return <Dashboard userData={staffUser} onLogout={() => (window.location.href = '/')} />;
}
