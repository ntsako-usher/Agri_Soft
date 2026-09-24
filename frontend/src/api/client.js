import axios from "axios";

const BASE_URL = "http://127.0.0.1:8000/api";

const client = axios.create({ baseURL: BASE_URL });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem("refresh");
        const { data } = await axios.post(`${BASE_URL}/auth/token/refresh/`, { refresh });
        localStorage.setItem("access", data.access);
        original.headers.Authorization = `Bearer ${data.access}`;
        return client(original);
      } catch {
        localStorage.clear();
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

/* ---------- Auth helpers ---------- */

export function decodeJWT(token) {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    );
    return decoded;
  } catch {
    return null;
  }
}

export function currentUser() {
  return decodeJWT(localStorage.getItem("access"));
}

/* ---------- Role helper ---------- */

export function currentRole() {
  const user = currentUser();
  if (!user) return null;
  if (user.is_staff || user.role === "admin") return "admin";
  if (user.role === "technician") return "technician";
  return "farmer";
}

/* ---------- API ---------- */

export const api = {
  // Auth
  login:    (email, password) =>
              axios.post(`${BASE_URL}/auth/token/`, { username: email, password }),
  register: (payload) =>
              axios.post(`${BASE_URL}/farmers/register/`, payload),
  changePassword: (payload) =>
              client.post("/farmers/change-password/", payload),

  // Farms
  farms:      () => client.get("/farms/"),
  createFarm: (payload) => client.post("/farms/", payload),

  // Technician workflow
  pendingService: (params) => client.get("/farms/pending-service/", { params }),
  assignTechnician: (farmId, payload) =>
              client.post(`/farms/${farmId}/assign-technician/`, payload),
  markServiceDone: (farmId, payload) =>
              client.post(`/farms/${farmId}/mark-service-done/`, payload),

  // Farmer service requests / feedback
  requestService: (farmId, payload) =>
              client.post(`/farms/${farmId}/request-service/`, payload),
  confirmService: (farmId, payload) =>
              client.post(`/farms/${farmId}/confirm-service/`, payload),
  rejectService: (farmId, payload) =>
              client.post(`/farms/${farmId}/reject-service/`, payload),

  // Users (admin)
  technicians: () => client.get("/farmers/technicians/"),
  farmersList: () => client.get("/farmers/all/"),

  // Devices & data
  devices:      (farmId) => client.get(farmId ? `/devices/?farm=${farmId}` : "/devices/"),
  device:       (id) => client.get(`/devices/${id}/`),
  createDevice: (payload) => client.post("/devices/", payload),
  updateDevice: (id, payload) => client.patch(`/devices/${id}/`, payload),
  deleteDevice: (id) => client.delete(`/devices/${id}/`),

  readings:     (deviceId, range = "24h") =>
                  client.get(`/readings/?device=${deviceId}&range=${range}`),

  // Alerts
  alerts:       () => client.get("/alerts/"),
  createAlert:  (payload) => client.post("/alerts/", payload),
  resolveAlert: (id) => client.patch(`/alerts/${id}/resolve/`),
  reopenAlert:  (id) => client.patch(`/alerts/${id}/reopen/`),
  deleteAlert:  (id) => client.delete(`/alerts/${id}/`),

  // Messages (farmer ↔ admin chat)
  adminId:          () => client.get("/farmers/admin-id/"),
  messages:         () => client.get("/farmers/messages/"),
  sendMessage:      (payload) => client.post("/farmers/messages/", payload),
  markMessageRead:  (id) => client.patch(`/farmers/messages/${id}/`, { is_read: true }),

  // Commands / irrigation
  commands:   () => client.get("/commands/"),
  irrigation: (fieldId, on) =>
                client.post("/irrigation/", { field: fieldId, on }),

  // Aggregates
  overview:   (fieldId) => client.get(`/overview/?field=${fieldId}`),
  monitoring: (fieldId) => client.get(`/monitoring/?field=${fieldId}`),
};