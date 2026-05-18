// this is the entry point of the app.
// it finds the <div id="root"> in index.html and tells React to take over that element.
// everything the user sees is rendered inside that div.
// StrictMode is a development helper that warns about common mistakes — it has no effect in production.

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
