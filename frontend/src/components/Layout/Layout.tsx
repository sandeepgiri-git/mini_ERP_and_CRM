import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-layout">
      <div
        className={`sidebar-backdrop${isSidebarOpen ? ' open' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <TopBar onToggleSidebar={() => setIsSidebarOpen(prev => !prev)} />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
