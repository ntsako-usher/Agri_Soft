import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Overview from "./pages/Overview";
import Monitoring from "./pages/Monitoring";
import History from "./pages/History";
import Alerts from "./pages/Alerts";
import Devices from "./pages/Devices";
import Settings from "./pages/Settings";
import Messages from "./pages/Messages";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import SignupSuccess from "./pages/SignupSuccess";
import AwaitingApproval from "./pages/AwaitingApproval";
import NewFarm from "./pages/NewFarm";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import RequireRole from "./auth/roleGuard";
import TechnicianLayout from "./layouts/TechnicianLayout";
import AdminLayout from "./layouts/AdminLayout";

import MyTasks from "./pages/technician/MyTasks";
import TaskDetail from "./pages/technician/TaskDetail";
import TaskHistory from "./pages/technician/TaskHistory";

import AdminDashboard from "./pages/admin/AdminDashboard";
import ServiceRequests from "./pages/admin/ServiceRequests";
import Technicians from "./pages/admin/Technicians";
import Farmers from "./pages/admin/Farmers";

import { currentRole } from "./api/client";

/* ---------- Layouts ---------- */

function FarmerLayout() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: "auto" }}>
        <Outlet />
      </main>
    </div>
  );
}

// Shared pages (Messages, Settings) — pick layout by role
function RoleAwareLayout() {
  const role = currentRole();
  if (role === "technician") return <TechnicianLayout />;
  if (role === "admin") return <AdminLayout />;
  return <FarmerLayout />;
}

/* ---------- Auth ---------- */

function RequireAuth() {
  if (!localStorage.getItem("access")) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

/* ---------- App ---------- */

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/signup-success" element={<SignupSuccess />} />
        <Route path="/awaiting-approval" element={<AwaitingApproval />} />

        {/* Authed */}
        <Route element={<RequireAuth />}>
          {/* Onboarding — no sidebar */}
          <Route path="/farms/new" element={<NewFarm />} />

          {/* FARMER dashboard */}
          <Route element={<RequireRole role="farmer" />}>
            <Route element={<FarmerLayout />}>
              <Route path="/" element={<Overview />} />
              <Route path="/monitoring" element={<Monitoring />} />
              <Route path="/history" element={<History />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/devices" element={<Devices />} />
            </Route>
          </Route>

          {/* TECHNICIAN dashboard */}
          <Route element={<RequireRole role="technician" />}>
            <Route element={<TechnicianLayout />}>
              <Route path="/tech/tasks" element={<MyTasks />} />
              <Route path="/tech/tasks/:id" element={<TaskDetail />} />
              <Route path="/tech/history" element={<TaskHistory />} />
            </Route>
          </Route>

          {/* ADMIN dashboard */}
          <Route element={<RequireRole role="admin" />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/requests" element={<ServiceRequests />} />
              <Route path="/admin/technicians" element={<Technicians />} />
              <Route path="/admin/farmers" element={<Farmers />} />
              <Route path="/admin/devices" element={<Devices />} />
              <Route path="/admin/alerts" element={<Alerts />} />
            </Route>
          </Route>

          {/* Shared pages — any logged-in role */}
          <Route element={<RoleAwareLayout />}>
            <Route path="/messages" element={<Messages />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}