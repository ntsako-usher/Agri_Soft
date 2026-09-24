import { Navigate, Outlet } from "react-router-dom";
import { currentRole } from "../api/client";

/**
 * Wrap routes to require a specific role.
 *
 * Usage:
 *   <Route element={<RequireRole role="technician" />}>
 *     <Route path="/tech/tasks" element={<MyTasks />} />
 *   </Route>
 *
 * - Not logged in      → redirect to /login
 * - Wrong role         → redirect to their own home
 */
export default function RequireRole({ role }) {
  const userRole = currentRole();

  if (!userRole) {
    return <Navigate to="/login" replace />;
  }

  const allowed = Array.isArray(role) ? role : [role];
  if (!allowed.includes(userRole)) {
    return <Navigate to={homeFor(userRole)} replace />;
  }

  return <Outlet />;
}

function homeFor(role) {
  if (role === "technician") return "/tech/tasks";
  if (role === "admin") return "/admin";
  return "/";
}