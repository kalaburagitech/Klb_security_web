import express from "express";
import convex from "../services/convexClient.js";
import { api } from "../../convex/_generated/api.js";

const router = express.Router();

router.get("/patrol/org/:orgId", async (req, res) => {
    try {
        const logs = await convex.query(api.logs.listPatrolLogs, {
            organizationId: req.params.orgId,
            siteId: req.query.siteId
        });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get("/visit/org/:orgId", async (req, res) => {
    try {
        const logs = await convex.query(api.logs.listVisitLogs, { organizationId: req.params.orgId });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post("/patrol", async (req, res) => {
    try {
        const logId = await convex.mutation(api.logs.createPatrolLog, req.body);
        res.json({ logId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post("/dual", async (req, res) => {
    try {
        const result = await convex.mutation(api.logs.createDualLog, req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
