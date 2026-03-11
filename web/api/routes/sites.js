import express from "express";
import convex from "../services/convexClient.js";
import { api } from "../../convex/_generated/api.js";

const router = express.Router();

router.get("/org/:orgId", async (req, res) => {
    try {
        const sites = await convex.query(api.sites.listSitesByOrg, { organizationId: req.params.orgId });
        res.json(sites);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get("/all", async (req, res) => {
    try {
        const sites = await convex.query(api.sites.listAll);
        res.json(sites);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
