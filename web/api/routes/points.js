import express from "express";
import convex from "../services/convexClient.js";
import { api } from "../../convex/_generated/api.js";

const router = express.Router();

router.get("/org/:orgId", async (req, res) => {
    try {
        const points = await convex.query(api.patrolPoints.listByOrg, { organizationId: req.params.orgId });
        res.json(points);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get("/site/:siteId", async (req, res) => {
    try {
        const points = await convex.query(api.patrolPoints.listBySite, { siteId: req.params.siteId });
        res.json(points);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post("/", async (req, res) => {
    try {
        const pointId = await convex.mutation(api.patrolPoints.createPoint, req.body);
        res.json({ pointId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
