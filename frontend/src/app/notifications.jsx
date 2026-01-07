import React, { createContext, useContext, useMemo, useState } from "react";

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const [items, setItems] = useState([]); // {id, type, title, message, time, read}

  const api = useMemo(() => {
    return {
      items,
      unreadCount: items.filter((x) => !x.read).length,

      add(notification) {
        const id = crypto?.randomUUID ? crypto.randomUUID() : String(Date.now());
        const time = new Date().toLocaleTimeString();
        setItems((prev) => [
          { id, time, read: false, ...notification },
          ...prev,
        ]);
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
  }, [items]);

  return (
    <NotificationsContext.Provider value={api}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
