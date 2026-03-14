import express from "express";
import convex from "../services/convexClient.js";
import { api } from "../../convex/_generated/api.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const incidentId = await convex.mutation(api.incidents.reportIncident, req.body);
    res.json({ incidentId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
