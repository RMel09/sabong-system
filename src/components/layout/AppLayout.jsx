import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
  const location = useLocation();
  const isFullscreen = location.pathname === '/display' || location.pathname === '/terminal';

  if (isFullscreen) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-background font-body">
      <Sidebar />
      <main className="ml-64 min-h-screen p-6">
        <Outlet />
      </main>
    </div>
  );
}