import express from "express";
import convex from "../services/convexClient.js";
import { api } from "../../convex/_generated/api.js";

const router = express.Router();

router.get("/org/:orgId", async (req, res) => {
  try {
    const issues = await convex.query(api.issues.list, { organizationId: req.params.orgId });
    res.json(issues);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id/resolve", async (req, res) => {
  try {
    await convex.mutation(api.issues.resolveIssue, { issueId: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
