import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';

// Shell shared by every authenticated page: sidebar + top bar + routed content.
export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  // Close the mobile drawer after navigating.
  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      {menuOpen && <button type="button" className="scrim" onClick={() => setMenuOpen(false)} aria-label="Close navigation" />}
      <div className="main">
        <Header onMenu={() => setMenuOpen(true)} />
        <main id="main-content" className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
