import { ConvexClient } from "convex/browser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local from the web directory
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
    throw new Error("Convex URL missing. Set VITE_CONVEX_URL or CONVEX_URL in environment.");
}

const client = new ConvexClient(convexUrl);

export default client;
