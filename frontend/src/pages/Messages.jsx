import { useEffect, useRef, useState } from "react";
import { api, currentUser } from "../api/client";
import Topbar from "../components/Topbar";
import { Send, RefreshCw, MessageSquare, Leaf } from "lucide-react";

const POLL_MS = 10000; // refresh every 10 seconds

export default function Messages() {
  const user = currentUser();
  const myId = user?.user_id;

  const [messages, setMessages] = useState([]);
  const [admin, setAdmin] = useState(null);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  const load = async () => {
    try {
      const [mRes, aRes] = await Promise.all([
        api.messages().catch(() => ({ data: [] })),
        api.adminId().catch(() => ({ data: null })),
      ]);
      setMessages(mRes.data || []);
      setAdmin(aRes.data);
    } catch {
      setError("Could not load messages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll to newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    const text = body.trim();
    if (!text || !admin?.id) return;
    setSending(true);
    setError("");
    try {
      const { data } = await api.sendMessage({
        recipient: admin.id,
        body: text,
      });
      setMessages((prev) => [...prev, data]);
      setBody("");
    } catch {
      setError("Could not send message. Try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{
        padding: "28px 32px",
        maxWidth: 900,
        height: "100vh",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Topbar />

      {/* Title */}
      <div style={{ marginBottom: 20 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 30,
            fontWeight: 500,
            letterSpacing: "-0.5px",
            color: "var(--text)",
          }}
        >
          Messages
        </h1>
        <div style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
          Chat directly with your administrator about anything on the farm.
        </div>
      </div>

      {/* Chat card */}
      <div
        className="card"
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          padding: 0,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "var(--accent-soft)",
                color: "var(--accent)",
                display: "grid",
                placeItems: "center",
                fontWeight: 600,
              }}
            >
              <Leaf size={18} />
            </span>
            <div>
              <div
                style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}
              >
                {admin?.name || "Soft-Agri Support"}
              </div>
              <div
                style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}
              >
                {admin?.email || "Administrator"}
              </div>
            </div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              borderRadius: "var(--radius-pill)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
              fontSize: 12,
              fontWeight: 500,
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            <RefreshCw
              size={13}
              style={{ animation: loading ? "spin 1s linear infinite" : "none" }}
            />
            Refresh
          </button>
        </div>

        {/* Messages thread */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: 20,
            background: "var(--surface-alt)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {loading && messages.length === 0 && (
            <div
              style={{
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: 13,
                padding: 40,
              }}
            >
              Loading messages…
            </div>
          )}

          {!loading && messages.length === 0 && (
            <div
              style={{
                textAlign: "center",
                color: "var(--text-muted)",
                marginTop: 40,
              }}
            >
              <MessageSquare
                size={28}
                style={{ opacity: 0.5, marginBottom: 10 }}
              />
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: "var(--text)",
                  marginBottom: 6,
                }}
              >
                No messages yet
              </div>
              <div style={{ fontSize: 13, maxWidth: 320, margin: "0 auto" }}>
                Send your first message to the admin below. They'll usually reply
                within a few hours.
              </div>
            </div>
          )}

          {messages.map((m) => (
            <Bubble
              key={m.id}
              msg={m}
              mine={String(m.sender) === String(myId)}
            />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Compose */}
        <form
          onSubmit={send}
          style={{
            padding: 16,
            borderTop: "1px solid var(--border)",
            display: "flex",
            gap: 10,
            background: "var(--surface)",
            flexShrink: 0,
          }}
        >
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              admin
                ? `Message ${admin.name || "admin"}…`
                : "Loading admin info…"
            }
            disabled={!admin || sending}
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: "var(--radius-pill)",
              border: "1px solid var(--border)",
              background: "var(--surface-alt)",
              color: "var(--text)",
              fontSize: 14,
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={sending || !body.trim() || !admin}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 20px",
              borderRadius: "var(--radius-pill)",
              border: "none",
              background: "var(--accent)",
              color: "white",
              fontSize: 13,
              fontWeight: 600,
              cursor:
                sending || !body.trim() || !admin ? "not-allowed" : "pointer",
              opacity: sending || !body.trim() || !admin ? 0.6 : 1,
            }}
          >
            <Send size={14} /> Send
          </button>
        </form>

        {error && (
          <div
            style={{
              padding: "10px 16px",
              background: "var(--danger-soft)",
              color: "var(--danger)",
              fontSize: 12,
              borderTop: "1px solid var(--border)",
            }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

function Bubble({ msg, mine }) {
  const time = new Date(msg.created_at).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div
      style={{
        display: "flex",
        justifyContent: mine ? "flex-end" : "flex-start",
      }}
    >
      <div
        style={{
          maxWidth: "72%",
          padding: "10px 14px",
          borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          background: mine ? "var(--accent)" : "var(--surface)",
          color: mine ? "white" : "var(--text)",
          border: mine ? "none" : "1px solid var(--border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
          {msg.body}
        </div>
        <div
          style={{
            fontSize: 10,
            marginTop: 4,
            opacity: mine ? 0.85 : 0.6,
            textAlign: "right",
          }}
        >
          {time}
        </div>
      </div>
    </div>
  );
}