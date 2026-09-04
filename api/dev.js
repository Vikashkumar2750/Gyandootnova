/**
 * Development-only API server entry point.
 * Runs on port 3001 alongside Vite dev server (port 5173).
 */
import apiApp from "./server.js";
import express from "express";

const app = express();
app.use(apiApp);

const PORT = parseInt(process.env.API_PORT || "3001", 10);
app.listen(PORT, () => {
  console.log(`🔧 API dev server running on http://localhost:${PORT}`);
});
