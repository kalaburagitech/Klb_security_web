import { useState } from "react";
import { cn } from "../../../lib/utils";
import { Layout } from "../../../components/Layout";

import PatrolLogs from "./PatrolLogs";
import PatrolPoints from "./PatrolPoints";
import PatrolQRCodes from "./PatrolQRCodes";

export default function Patrol() {
    const [tab, setTab] = useState<"points" | "logs" | "qr">("qr");

    return (
        <Layout title="Patrol Dashboard">
            <div className="space-y-6">

                {/* Tabs — QR first (print labels before registering on mobile) */}
                <div className="flex gap-6 border-b border-white/10 px-2">
                    <button
                        onClick={() => setTab("qr")}
                        className={cn(
                            "pb-2 text-sm font-medium",
                            tab === "qr"
                                ? "text-primary border-b-2 border-primary"
                                : "text-muted-foreground"
                        )}
                    >
                        QR code
                    </button>

                    <button
                        onClick={() => setTab("points")}
                        className={cn(
                            "pb-2 text-sm font-medium",
                            tab === "points"
                                ? "text-primary border-b-2 border-primary"
                                : "text-muted-foreground"
                        )}
                    >
                        Patrol Points
                    </button>

                    <button
                        onClick={() => setTab("logs")}
                        className={cn(
                            "pb-2 text-sm font-medium",
                            tab === "logs"
                                ? "text-primary border-b-2 border-primary"
                                : "text-muted-foreground"
                        )}
                    >
                        Patrol Reports
                    </button>
                </div>

                {/* Content */}
                <div>
                    {tab === "qr" && <PatrolQRCodes />}
                    {tab === "points" && <PatrolPoints />}
                    {tab === "logs" && <PatrolLogs />}
                </div>

            </div>
        </Layout>
    );
}