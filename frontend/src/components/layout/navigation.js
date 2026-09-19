import { Activity, Bell, Gauge, LayoutDashboard, Settings, Wifi } from 'lucide-react';

// Add a page = add an entry here + a <Route> in App.jsx.
export const primaryNav = [
  { label: 'Overview', icon: LayoutDashboard, to: '/' },
  { label: 'Monitoring', icon: Activity, to: '/monitoring' },
  { label: 'History', icon: Gauge, to: '/history' },
  { label: 'Alerts', icon: Bell, to: '/alerts' },
  { label: 'Devices', icon: Wifi, to: '/devices' },
];

export const secondaryNav = [{ label: 'Settings', icon: Settings, to: '/settings' }];
