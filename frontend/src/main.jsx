import "./styles/globals.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import router from "./app/router";
import { NotificationsProvider } from "./app/notifications";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <NotificationsProvider>
    <RouterProvider router={router} />
    </NotificationsProvider>
  </React.StrictMode>
);
