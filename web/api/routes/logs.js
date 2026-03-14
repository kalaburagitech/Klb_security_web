import express from "express";
import convex from "../services/convexClient.js";
import { api } from "../../convex/_generated/api.js";

const router = express.Router();

// Haversine distance in meters
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * POST /api/logs/validate-point
 * Validates a QR code scan against a patrol point with GPS geofencing.
 * Body: { siteId, qrCodeId, userLat, userLon, guardId }
 * Returns: { valid, pointId, pointName, distance }
 */
router.post("/validate-point", async (req, res) => {
    try {
        const { siteId, qrCodeId, userLat, userLon, guardId } = req.body;
        if (!siteId || !qrCodeId) {
            return res.status(400).json({ error: "siteId and qrCodeId are required" });
        }

        // Fetch all patrol points for this site
        const points = await convex.query(api.patrolPoints.listBySite, { siteId });

        // Find the point matching the scanned QR code ID
        const point = points?.find((p) => p.qrCodeId === qrCodeId || p._id === qrCodeId);

        if (!point) {
            return res.json({ valid: false, pointId: null, pointName: null, distance: 999 });
        }

        // Calculate GPS distance if coordinates are available
        let distance = 0;
        if (userLat != null && userLon != null && point.latitude != null && point.longitude != null) {
            distance = haversineDistance(userLat, userLon, point.latitude, point.longitude);
        }

        console.log(`[VALIDATE] QR=${qrCodeId}, Point=${point.name}, Distance=${distance.toFixed(1)}m`);

        res.json({
            valid: true,
            pointId: point._id,
            pointName: point.name,
            distance: Math.round(distance * 10) / 10,
        });
    } catch (error) {
        console.error("[VALIDATE] Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

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

// Issues endpoint - returns patrol logs that have issueDetails
router.get("/issues/org/:orgId", async (req, res) => {
    try {
        const logs = await convex.query(api.logs.listPatrolLogs, {
            organizationId: req.params.orgId,
        });
        const issues = (logs || []).filter((l) => l.issueDetails);
        res.json(issues);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get("/patrol/user/:userId", async (req, res) => {
    try {
        const logs = await convex.query(api.logs.listPatrolLogsByUser, { userId: req.params.userId });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
export default router;
