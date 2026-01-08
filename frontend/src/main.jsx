import "./styles/globals.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom"; // ✅ 이 줄 추가
import router from "./app/router";
import { NotificationsProvider } from "./app/notifications";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <NotificationsProvider>
    <RouterProvider router={router} />
    </NotificationsProvider>
  </React.StrictMode>
);
