import { Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import { FarmProvider } from './context/FarmContext';
import Dashboard from './pages/Dashboard';
import Monitoring from './pages/Monitoring';
import History from './pages/History';
import Alerts from './pages/Alerts';
import Devices from './pages/Devices';
import Settings from './pages/Settings';
import Login from './pages/Login';
import NotFound from './pages/NotFound';

// Add a page: create it in src/pages, add a <Route> here, add a nav item in components/layout/navigation.js.
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route
          element={
            <FarmProvider>
              <AppLayout />
            </FarmProvider>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="monitoring" element={<Monitoring />} />
          <Route path="history" element={<History />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="devices" element={<Devices />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
