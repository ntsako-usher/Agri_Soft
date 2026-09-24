import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Sprout, ChevronRight, LogOut, Clock, XCircle,
  Lock, Eye, EyeOff, CheckCircle2, Star, Wrench, Send, RotateCcw,
} from "lucide-react";
import { api, currentUser } from "../api/client";
import Topbar from "../components/Topbar";
import { PLANS, PLAN_ORDER, getPlan } from "../constants/plans";

// ----- Service workflow helpers -----
const SERVICE_LABEL = {
  none: null,
  requested: "Service: Awaiting admin",
  assigned: "Service: Technician assigned",
  completed: "Service: Your review needed",
  confirmed: "Service: Confirmed",
};

const SERVICE_TONE = {
  requested: { fg: "var(--warn)",   bg: "var(--warn-soft)" },
  assigned:  { fg: "var(--accent)", bg: "var(--accent-soft)" },
  completed: { fg: "var(--danger)", bg: "var(--danger-soft)" },
  confirmed: { fg: "var(--good)",   bg: "var(--accent-soft)" },
};

export default function Settings() {
  const nav = useNavigate();
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = currentUser();

  // Change password form state
  const [pwForm, setPwForm] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [pwErr, setPwErr] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // Change plan state
  const [changingPlanFor, setChangingPlanFor] = useState(null);
  const [planBusy, setPlanBusy] = useState(false);
  const [planErr, setPlanErr] = useState("");

  // Service workflow state
  const [serviceAction, setServiceAction] = useState(null); // { farmId, type: 'request'|'confirm'|'reject' }
  const [serviceText, setServiceText] = useState("");
  const [serviceBusy, setServiceBusy] = useState(false);
  const [serviceErr, setServiceErr] = useState("");

  const loadFarms = () => {
    setLoading(true);
    api.farms()
      .then(({ data }) => setFarms(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadFarms(); }, []);

  const signOut = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const changePw = (k) => (e) =>
    setPwForm((f) => ({ ...f, [k]: e.target.value }));

  const submitPasswordChange = async (e) => {
    e.preventDefault();
    setPwErr("");
    setPwSuccess("");

    if (pwForm.new_password.length < 6) {
      setPwErr("New password must be at least 6 characters.");
      return;
    }
    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwErr("New passwords do not match.");
      return;
    }
    if (pwForm.new_password === pwForm.old_password) {
      setPwErr("New password must be different from your current one.");
      return;
    }

    setPwBusy(true);
    try {
      await api.changePassword({
        old_password: pwForm.old_password,
        new_password: pwForm.new_password,
      });
      setPwSuccess("Password changed successfully.");
      setPwForm({ old_password: "", new_password: "", confirm_password: "" });
      setTimeout(() => setPwSuccess(""), 4000);
    } catch (e) {
      const d = e.response?.data;
      if (d?.old_password) setPwErr(d.old_password[0] || "Current password is incorrect.");
      else if (d?.new_password) setPwErr(d.new_password[0] || "New password was rejected.");
      else if (d?.detail) setPwErr(d.detail);
      else if (!e.response) setPwErr("Cannot reach server. Please try again.");
      else setPwErr("Could not change password.");
    } finally {
      setPwBusy(false);
    }
  };

  const changePlan = async (farmId, newPlan) => {
    setPlanErr("");
    setPlanBusy(true);
    try {
      await api.updateFarm(farmId, { plan: newPlan });
      setFarms((prev) =>
        prev.map((f) => (f.id === farmId ? { ...f, plan: newPlan } : f))
      );
      setChangingPlanFor(null);
    } catch (e) {
      const d = e.response?.data;
      setPlanErr(
        d?.plan?.[0] || d?.detail || "Could not update plan. Please try again."
      );
    } finally {
      setPlanBusy(false);
    }
  };

  // ----- Service workflow handlers -----
  const openServiceAction = (farmId, type) => {
    setServiceAction({ farmId, type });
    setServiceText("");
    setServiceErr("");
  };

  const closeServiceAction = () => {
    setServiceAction(null);
    setServiceText("");
    setServiceErr("");
  };

  const submitServiceAction = async () => {
    if (!serviceAction) return;
    const { farmId, type } = serviceAction;
    setServiceErr("");

    if (!serviceText.trim()) {
      setServiceErr(
        type === "request"
          ? "Describe what you need the technician to do."
          : "Please explain what needs to be redone."
      );
      return;
    }

    setServiceBusy(true);
    try {
      let payload;
      if (type === "request") {
        payload = { service_notes: serviceText.trim() };
      } else if (type === "reject") {
        payload = { farmer_feedback: serviceText.trim() };
      } else if (type === "confirm") {
        payload = { farmer_feedback: serviceText.trim() };
      }

      let data;
      if (type === "request") {
        ({ data } = await api.requestService(farmId, payload));
      } else if (type === "reject") {
        ({ data } = await api.rejectService(farmId, payload));
      } else {
        ({ data } = await api.confirmService(farmId, payload));
      }

      setFarms((prev) => prev.map((f) => (f.id === farmId ? data : f)));
      closeServiceAction();
    } catch (e) {
      const d = e.response?.data;
      setServiceErr(
        d?.detail ||
          (typeof d === "object" ? Object.values(d).flat().join(" ") : "Could not submit.")
      );
    } finally {
      setServiceBusy(false);
    }
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200 }}>
      <Topbar />

      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          margin: 0, fontSize: 30, fontWeight: 500,
          letterSpacing: "-0.5px", color: "var(--text)",
        }}>
          Settings
        </h1>
        <div style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
          Manage your account and farms.
        </div>
      </div>

      {/* Account */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 14 }}>Account</div>
        <div style={{ display: "grid", gap: 10, fontSize: 13 }}>
          <Row label="Name" value={user?.name ?? "—"} />
          <Row label="Email" value={user?.email ?? "—"} />
          <Row
            label="Status"
            value={
              user?.status
                ? user.status.charAt(0).toUpperCase() + user.status.slice(1)
                : "—"
            }
          />
        </div>
        <button onClick={signOut} style={{
          marginTop: 18,
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "10px 18px",
          borderRadius: "var(--radius-pill)",
          border: "1px solid var(--border)",
          background: "var(--surface-alt)",
          color: "var(--danger)", fontWeight: 500, fontSize: 13,
          cursor: "pointer",
        }}>
          <LogOut size={14} /> Sign out
        </button>
      </div>

      {/* Change password */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          marginBottom: 6,
        }}>
          <span style={{
            width: 32, height: 32, borderRadius: 10,
            background: "var(--accent-soft)",
            display: "grid", placeItems: "center",
            color: "var(--accent)",
          }}>
            <Lock size={15} />
          </span>
          <div>
            <div style={{ fontWeight: 500, fontSize: 14 }}>Change password</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              Update the password you use to sign in.
            </div>
          </div>
        </div>

        <form onSubmit={submitPasswordChange} style={{
          marginTop: 16,
          display: "grid", gap: 12,
        }}>
          <PasswordRow
            label="Current password"
            value={pwForm.old_password}
            onChange={changePw("old_password")}
            show={showPw}
            onToggle={() => setShowPw((s) => !s)}
            autoComplete="current-password"
          />
          <PasswordRow
            label="New password"
            value={pwForm.new_password}
            onChange={changePw("new_password")}
            show={showPw}
            onToggle={() => setShowPw((s) => !s)}
            autoComplete="new-password"
          />
          <PasswordRow
            label="Confirm new password"
            value={pwForm.confirm_password}
            onChange={changePw("confirm_password")}
            show={showPw}
            onToggle={() => setShowPw((s) => !s)}
            autoComplete="new-password"
          />

          {pwErr && (
            <div style={{
              fontSize: 13, color: "var(--danger)",
              background: "var(--danger-soft)",
              padding: "10px 12px",
              borderRadius: "var(--radius-sm)",
            }}>
              {pwErr}
            </div>
          )}

          {pwSuccess && (
            <div style={{
              fontSize: 13, color: "var(--good)",
              background: "var(--accent-soft)",
              padding: "10px 12px",
              borderRadius: "var(--radius-sm)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <CheckCircle2 size={14} /> {pwSuccess}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" disabled={pwBusy} style={{
              padding: "11px 22px",
              borderRadius: "var(--radius-pill)",
              background: "var(--accent)", color: "white",
              border: "none", fontWeight: 600, fontSize: 13,
              opacity: pwBusy ? 0.6 : 1,
              cursor: pwBusy ? "wait" : "pointer",
            }}>
              {pwBusy ? "Updating…" : "Update password"}
            </button>
          </div>
        </form>
      </div>

      {/* Farms */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 16,
        }}>
          <div>
            <div style={{ fontWeight: 500, fontSize: 14 }}>Your farms</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              {loading
                ? "Loading…"
                : `${farms.length} ${farms.length === 1 ? "farm" : "farms"} registered`}
            </div>
          </div>
          <button onClick={() => nav("/farms/new")} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "9px 16px",
            borderRadius: "var(--radius-pill)",
            background: "var(--accent)", color: "white",
            border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>
            <Plus size={14} /> Add farm
          </button>
        </div>

        {planErr && (
          <div style={{
            fontSize: 13, color: "var(--danger)",
            background: "var(--danger-soft)",
            padding: "10px 12px",
            borderRadius: "var(--radius-sm)",
            marginBottom: 12,
          }}>
            {planErr}
          </div>
        )}

        {!loading && farms.length === 0 && (
          <div style={{
            padding: 20,
            border: "1px dashed var(--border)",
            borderRadius: "var(--radius-sm)",
            fontSize: 13, color: "var(--text-muted)",
            textAlign: "center",
          }}>
            No farms yet. Click "Add farm" to register your first one.
          </div>
        )}

        {farms.map((f) => {
          const isApproved = !f.status || f.status === "approved";
          const isPending = f.status === "pending";
          const isRejected = f.status === "rejected";
          const currentPlan = getPlan(f.plan);
          const isChanging = changingPlanFor === f.id;
          const serviceStatus = f.service_status || "none";
          const serviceLabel = SERVICE_LABEL[serviceStatus];
          const serviceTone = SERVICE_TONE[serviceStatus];
          const serviceFormOpen = serviceAction?.farmId === f.id;

          return (
            <div
              key={f.id}
              style={{
                padding: "14px 0",
                borderTop: "1px solid var(--border)",
              }}
            >
              <div style={{
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <span style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: isApproved
                    ? "var(--accent-soft)"
                    : isPending
                    ? "var(--warn-soft)"
                    : "var(--danger-soft)",
                  display: "grid", placeItems: "center",
                  color: isApproved
                    ? "var(--accent)"
                    : isPending
                    ? "var(--warn)"
                    : "var(--danger)",
                  flexShrink: 0,
                }}>
                  {isApproved ? (
                    <Sprout size={16} />
                  ) : isPending ? (
                    <Clock size={16} />
                  ) : (
                    <XCircle size={16} />
                  )}
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: "flex", alignItems: "center",
                    gap: 8, flexWrap: "wrap",
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>
                      {f.farm_name}
                    </span>

                    {f.plan && (
                      <span style={{
                        fontSize: 10, fontWeight: 600,
                        padding: "3px 8px",
                        borderRadius: "var(--radius-pill)",
                        background: f.plan === "premium"
                          ? "var(--warn-soft)"
                          : "var(--accent-soft)",
                        color: f.plan === "premium"
                          ? "var(--warn)"
                          : "var(--accent)",
                        textTransform: "uppercase",
                        letterSpacing: 0.4,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}>
                        {f.plan === "premium" && <Star size={9} />}
                        {currentPlan.name}
                      </span>
                    )}

                    {serviceLabel && (
                      <span style={{
                        fontSize: 10, fontWeight: 600,
                        padding: "3px 8px",
                        borderRadius: "var(--radius-pill)",
                        background: serviceTone.bg,
                        color: serviceTone.fg,
                        textTransform: "uppercase",
                        letterSpacing: 0.4,
                      }}>
                        {serviceLabel}
                      </span>
                    )}

                    {isPending && (
                      <span style={{
                        fontSize: 10, fontWeight: 600,
                        padding: "3px 8px",
                        borderRadius: "var(--radius-pill)",
                        background: "var(--warn-soft)",
                        color: "var(--warn)",
                        textTransform: "uppercase",
                        letterSpacing: 0.4,
                      }}>
                        Pending
                      </span>
                    )}

                    {isRejected && (
                      <span style={{
                        fontSize: 10, fontWeight: 600,
                        padding: "3px 8px",
                        borderRadius: "var(--radius-pill)",
                        background: "var(--danger-soft)",
                        color: "var(--danger)",
                        textTransform: "uppercase",
                        letterSpacing: 0.4,
                      }}>
                        Rejected
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    {isPending
                      ? "Awaiting admin review — dashboard access locked"
                      : isRejected
                      ? "Contact support for more information"
                      : `${f.location_desc || "No location set"} · ${
                          f.size_hectares
                            ? `${Number(f.size_hectares).toFixed(2)} ha`
                            : "—"
                        }`}
                  </div>
                </div>

                {isApproved && !isChanging && (
                  <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
                    {/* Service request / confirm buttons */}
                    {(serviceStatus === "none" || serviceStatus === "confirmed") && (
                      <button
                        onClick={() => openServiceAction(f.id, "request")}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "6px 12px",
                          borderRadius: "var(--radius-pill)",
                          border: "1px solid var(--border)",
                          background: "var(--accent-soft)",
                          color: "var(--accent)",
                          fontSize: 12, fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        <Wrench size={12} /> Request service
                      </button>
                    )}
                    {serviceStatus === "completed" && (
                      <>
                        <button
                          onClick={() => openServiceAction(f.id, "confirm")}
                          style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "6px 12px",
                            borderRadius: "var(--radius-pill)",
                            border: "none",
                            background: "var(--accent)",
                            color: "white",
                            fontSize: 12, fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          <CheckCircle2 size={12} /> Confirm job
                        </button>
                        <button
                          onClick={() => openServiceAction(f.id, "reject")}
                          style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "6px 12px",
                            borderRadius: "var(--radius-pill)",
                            border: "1px solid var(--border)",
                            background: "var(--surface-alt)",
                            color: "var(--danger)",
                            fontSize: 12, fontWeight: 500,
                            cursor: "pointer",
                          }}
                        >
                          <RotateCcw size={12} /> Request redo
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setChangingPlanFor(f.id)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "var(--radius-pill)",
                        border: "1px solid var(--border)",
                        background: "var(--surface-alt)",
                        color: "var(--text-muted)",
                        fontSize: 12, fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      Change plan
                    </button>
                    <button
                      onClick={() => nav(`/?field=${f.id}`)}
                      style={{
                        background: "transparent", border: "none",
                        cursor: "pointer", color: "var(--text-muted)",
                        padding: 6,
                      }}
                      aria-label="Open farm"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Service workflow form */}
              {serviceFormOpen && (
                <div style={{
                  marginTop: 12,
                  padding: 14,
                  background:
                    serviceAction.type === "reject"
                      ? "var(--danger-soft)"
                      : serviceAction.type === "confirm"
                      ? "var(--accent-soft)"
                      : "var(--surface-alt)",
                  borderRadius: "var(--radius-sm)",
                  display: "grid", gap: 10,
                }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600, color: "var(--text)",
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    {serviceAction.type === "request" && (
                      <><Wrench size={14} /> Request a technician</>
                    )}
                    {serviceAction.type === "confirm" && (
                      <><CheckCircle2 size={14} /> Confirm this job is done</>
                    )}
                    {serviceAction.type === "reject" && (
                      <><RotateCcw size={14} /> Request a redo</>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {serviceAction.type === "request" &&
                      "Describe the issue or installation work you need. The admin will assign a technician."}
                    {serviceAction.type === "confirm" &&
                      "Optional: leave a comment about the technician's work."}
                    {serviceAction.type === "reject" &&
                      "Explain what was wrong so the admin can send a technician back."}
                  </div>
                  <textarea
                    value={serviceText}
                    onChange={(e) => setServiceText(e.target.value)}
                    rows={3}
                    placeholder={
                      serviceAction.type === "request"
                        ? "e.g. Install 3 soil moisture sensors in the north block"
                        : serviceAction.type === "confirm"
                        ? "Optional comment…"
                        : "e.g. Sensor 2 still shows no readings"
                    }
                    required={serviceAction.type !== "confirm"}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                      color: "var(--text)",
                      fontSize: 13,
                      fontFamily: "inherit",
                      resize: "vertical",
                      outline: "none",
                    }}
                  />

                  {serviceErr && (
                    <div style={{
                      fontSize: 12, color: "var(--danger)",
                      background: "var(--surface)",
                      padding: "8px 10px",
                      borderRadius: "var(--radius-sm)",
                    }}>
                      {serviceErr}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button
                      onClick={closeServiceAction}
                      disabled={serviceBusy}
                      style={{
                        padding: "7px 14px",
                        borderRadius: "var(--radius-pill)",
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        color: "var(--text-muted)",
                        fontSize: 12, fontWeight: 500,
                        cursor: serviceBusy ? "wait" : "pointer",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitServiceAction}
                      disabled={serviceBusy}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "7px 16px",
                        borderRadius: "var(--radius-pill)",
                        border: "none",
                        background: serviceAction.type === "reject"
                          ? "var(--danger)"
                          : "var(--accent)",
                        color: "white",
                        fontSize: 12, fontWeight: 600,
                        cursor: serviceBusy ? "wait" : "pointer",
                        opacity: serviceBusy ? 0.6 : 1,
                      }}
                    >
                      <Send size={12} />
                      {serviceBusy
                        ? "Sending…"
                        : serviceAction.type === "request"
                        ? "Send request"
                        : serviceAction.type === "confirm"
                        ? "Confirm"
                        : "Send back"}
                    </button>
                  </div>
                </div>
              )}

              {/* Inline plan picker */}
              {isChanging && (
                <div style={{
                  marginTop: 12,
                  padding: 14,
                  background: "var(--surface-alt)",
                  borderRadius: "var(--radius-sm)",
                  display: "grid", gap: 10,
                }}>
                  <div style={{
                    fontSize: 12, color: "var(--text-muted)",
                    fontWeight: 500,
                  }}>
                    Choose a new plan for {f.farm_name}
                  </div>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                  }}>
                    {PLAN_ORDER.map((key) => {
                      const plan = PLANS[key];
                      const isCurrent = f.plan === key;
                      return (
                        <button
                          key={key}
                          onClick={() => !isCurrent && changePlan(f.id, key)}
                          disabled={isCurrent || planBusy}
                          style={{
                            textAlign: "left",
                            padding: 12,
                            borderRadius: "var(--radius-sm)",
                            border: isCurrent
                              ? "2px solid var(--accent)"
                              : "1px solid var(--border)",
                            background: isCurrent
                              ? "var(--accent-soft)"
                              : "var(--surface)",
                            cursor: isCurrent ? "default" : "pointer",
                            opacity: planBusy ? 0.6 : 1,
                            fontFamily: "inherit",
                          }}
                        >
                          <div style={{
                            display: "flex", alignItems: "center", gap: 6,
                            marginBottom: 4,
                          }}>
                            {key === "premium" && <Star size={12} color="var(--warn)" />}
                            <span style={{
                              fontSize: 13, fontWeight: 600,
                              color: "var(--text)",
                            }}>
                              {plan.name}
                            </span>
                            {isCurrent && (
                              <span style={{
                                fontSize: 10, color: "var(--accent)",
                                fontWeight: 600, marginLeft: "auto",
                              }}>
                                CURRENT
                              </span>
                            )}
                          </div>
                          <div style={{
                            fontSize: 11, color: "var(--text-muted)",
                            lineHeight: 1.5,
                          }}>
                            {plan.features[0]}
                            {plan.features.length > 1 && ` + ${plan.features.length - 1} more`}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div style={{
                    display: "flex", justifyContent: "flex-end", gap: 8,
                  }}>
                    <button
                      onClick={() => setChangingPlanFor(null)}
                      disabled={planBusy}
                      style={{
                        padding: "7px 14px",
                        borderRadius: "var(--radius-pill)",
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        color: "var(--text-muted)",
                        fontSize: 12, fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ color: "var(--text)", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function PasswordRow({ label, value, onChange, show, onToggle, autoComplete }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
        {label}
      </span>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required
          style={{
            width: "100%",
            padding: "11px 42px 11px 14px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            background: "var(--surface-alt)",
            color: "var(--text)", fontSize: 14,
            outline: "none", boxSizing: "border-box",
          }}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? "Hide password" : "Show password"}
          style={{
            position: "absolute", right: 10, top: "50%",
            transform: "translateY(-50%)",
            background: "transparent", border: "none",
            color: "var(--text-muted)", cursor: "pointer",
            padding: 6, display: "flex",
          }}
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </label>
  );
}