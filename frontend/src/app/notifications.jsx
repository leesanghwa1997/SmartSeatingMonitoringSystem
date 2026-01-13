import React, { createContext, useContext, useMemo, useState, useEffect } from "react";

const NotificationsContext = createContext(null);

const LS_KEY = "ssms.notifications.enabled";

export function NotificationsProvider({ children }) {
  const [items, setItems] = useState([]); // {id, type, title, message, time, read}
  const [enabled, setEnabled] = useState(true);

  // ✅ 새로고침해도 ON/OFF 유지
  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY);
    if (saved === "0") setEnabled(false);
  }, []);

  useEffect(() => {
    localStorage.setItem(LS_KEY, enabled ? "1" : "0");
  }, [enabled]);

  const api = useMemo(() => {
    return {
      items,
      enabled,
      toggleEnabled() {
        setEnabled((v) => !v);
      },

      unreadCount: items.filter((x) => !x.read).length,

      add(notification) {
        // ✅ 알림 OFF면 컨텍스트에도 안 쌓이게 (원하면 이 줄 지워도 됨)
        if (!enabled) return;

        const id = crypto?.randomUUID ? crypto.randomUUID() : String(Date.now());
        const time = new Date().toLocaleTimeString("ko-KR", {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        });

        setItems((prev) => [{ id, time, read: false, ...notification }, ...prev]);
      },

      markAllRead() {
        setItems((prev) => prev.map((x) => ({ ...x, read: true })));
      },

      clearAll() {
        setItems([]);
      },

      markRead(id) {
        setItems((prev) => prev.map((x) => (x.id === id ? { ...x, read: true } : x)));
      },
    };
  }, [items, enabled]);

  return <NotificationsContext.Provider value={api}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
