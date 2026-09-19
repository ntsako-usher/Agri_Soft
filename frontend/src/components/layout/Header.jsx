import { useEffect, useRef, useState } from 'react';
import { CircleHelp, LogOut, Menu, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { formatDate, greeting } from '../../utils/format';
import StatusDot from '../ui/StatusDot';

function Popover({ id, openId, setOpenId, trigger, title, children }) {
  const ref = useRef(null);
  const open = openId === id;

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => !ref.current?.contains(e.target) && setOpenId(null);
    const onKey = (e) => e.key === 'Escape' && setOpenId(null);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, setOpenId]);

  return (
    <div className="popover-wrap" ref={ref}>
      {trigger({ open, toggle: () => setOpenId(open ? null : id) })}
      {open && (
        <div className="popover card" role="dialog" aria-label={title}>
          <strong>{title}</strong>
          {children}
        </div>
      )}
    </div>
  );
}

export default function Header({ onMenu }) {
  const { user, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [openId, setOpenId] = useState(null);
  const name = user?.name ?? 'there';
  const initial = name.charAt(0).toUpperCase();

  return (
    <header className="topbar">
      <button type="button" className="icon-button mobile-only" onClick={onMenu} aria-label="Open navigation">
        <Menu size={20} />
      </button>

      <div className="topbar-title">
        <p className="eyebrow">{formatDate(new Date().toISOString(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <h1>{greeting()}, {name}</h1>
        <p className="text-muted">Here's what's happening on your farm today.</p>
      </div>

      <div className="topbar-actions">
        <span className="system-pill"><StatusDot tone="healthy" />All systems normal</span>

        <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
          <Sun size={14} aria-hidden="true" />
          <span className="theme-toggle-knob">{isDark ? <Moon size={13} /> : <Sun size={13} />}</span>
          <Moon size={14} aria-hidden="true" />
        </button>

        <Popover
          id="help"
          openId={openId}
          setOpenId={setOpenId}
          title="Help"
          trigger={({ toggle, open }) => (
            <button type="button" className="icon-button" onClick={toggle} aria-expanded={open} aria-label="Help">
              <CircleHelp size={18} />
            </button>
          )}
        >
          <ul className="help-list">
            <li>Use the sidebar to move between Overview, Monitoring, History, Alerts and Devices.</li>
            <li>Pick a field on Overview or Monitoring to change which field you're viewing.</li>
            <li>Open Settings to change the theme and alert preferences.</li>
          </ul>
        </Popover>

        <Popover
          id="profile"
          openId={openId}
          setOpenId={setOpenId}
          title="Account"
          trigger={({ toggle, open }) => (
            <button type="button" className="avatar" onClick={toggle} aria-expanded={open} aria-label="Account menu">
              {initial}
            </button>
          )}
        >
          <div className="profile-row">
            <span className="avatar static">{initial}</span>
            <div>
              <strong>{name}</strong>
              <small className="text-muted">Farm manager</small>
            </div>
          </div>
          <button type="button" className="button secondary" onClick={signOut}>
            <LogOut size={14} aria-hidden="true" />
            Sign out
          </button>
        </Popover>
      </div>
    </header>
  );
}
