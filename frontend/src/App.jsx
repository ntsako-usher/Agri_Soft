import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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

function Layout({ children }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: "auto" }}>{children}</main>
    </div>
  );
}

function RequireAuth({ children }) {
  if (!localStorage.getItem("access")) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/signup-success" element={<SignupSuccess />} />
        <Route path="/awaiting-approval" element={<AwaitingApproval />} />

        {/* Onboarding — authed but no sidebar */}
        <Route path="/farms/new" element={<RequireAuth><NewFarm /></RequireAuth>} />

        {/* Dashboard — authed + sidebar */}
        <Route path="/" element={<RequireAuth><Layout><Overview /></Layout></RequireAuth>} />
        <Route path="/monitoring" element={<RequireAuth><Layout><Monitoring /></Layout></RequireAuth>} />
        <Route path="/history" element={<RequireAuth><Layout><History /></Layout></RequireAuth>} />
        <Route path="/alerts" element={<RequireAuth><Layout><Alerts /></Layout></RequireAuth>} />
        <Route path="/devices" element={<RequireAuth><Layout><Devices /></Layout></RequireAuth>} />
        <Route path="/messages" element={<RequireAuth><Layout><Messages /></Layout></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth><Layout><Settings /></Layout></RequireAuth>} />
      </Routes>
    </BrowserRouter>
  );
}