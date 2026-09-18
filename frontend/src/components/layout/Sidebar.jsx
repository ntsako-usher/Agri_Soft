import { NavLink } from 'react-router-dom';
import { Leaf, X } from 'lucide-react';
import StatusDot from '../ui/StatusDot';
import { primaryNav, secondaryNav } from './navigation';

function NavItem({ item, onNavigate }) {
  const { label, icon: Icon, to } = item;
  return (
    <NavLink to={to} end={to === '/'} onClick={onNavigate} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
      <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
      <span>{label}</span>
    </NavLink>
  );
}

export default function Sidebar({ open, onClose }) {
  return (
    <aside className={`sidebar ${open ? 'is-open' : ''}`}>
      <div className="sidebar-top">
        <div className="brand">
          <span className="brand-mark"><Leaf size={16} strokeWidth={1.8} /></span>
          <span>SOFT-AGRI</span>
        </div>
        <button type="button" className="icon-button mobile-only" onClick={onClose} aria-label="Close navigation">
          <X size={18} />
        </button>
      </div>

      <nav className="nav-list" aria-label="Primary">
        {primaryNav.map((item) => <NavItem key={item.to} item={item} onNavigate={onClose} />)}
      </nav>

      <div className="sidebar-bottom">
        <nav className="nav-list" aria-label="Secondary">
          {secondaryNav.map((item) => <NavItem key={item.to} item={item} onNavigate={onClose} />)}
        </nav>
        <div className="farm-online">
          <StatusDot tone="healthy" />
          <div>
            <strong>Farm online</strong>
            <small>All systems operational</small>
          </div>
        </div>
      </div>
    </aside>
  );
}
