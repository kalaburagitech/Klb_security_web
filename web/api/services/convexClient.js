import { ConvexClient } from "convex/browser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local from the web directory
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

const convexUrl = process.env.VITE_CONVEX_URL;

if (!convexUrl) {
    throw new Error("VITE_CONVEX_URL is not defined in .env.local");
}

const client = new ConvexClient(convexUrl);

export default client;
