import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Routes
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import sitesRoutes from "./routes/sites.js";
import pointsRoutes from "./routes/points.js";
import logsRoutes from "./routes/logs.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/sites", sitesRoutes);
app.use("/api/points", pointsRoutes);
app.use("/api/logs", logsRoutes);
app.use("/api/issues", issuesRoutes);
app.use("/api/incidents", incidentRoutes);

// Health check
app.get("/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 API Server running at http://localhost:${PORT}`);
    console.log(`📡 Convex target: ${process.env.VITE_CONVEX_URL}`);
});
