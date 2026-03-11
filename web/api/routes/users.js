import express from "express";
import convex from "../services/convexClient.js";
import { api } from "../../convex/_generated/api.js";

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const users = await convex.query(api.users.listAll);
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get("/:clerkId", async (req, res) => {
    try {
        const user = await convex.query(api.users.getByClerkId, { clerkId: req.params.clerkId });
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post("/", async (req, res) => {
    try {
        const userId = await convex.mutation(api.users.create, req.body);
        res.json({ userId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
