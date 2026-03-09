import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Layout } from "../../components/Layout";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { useUser } from "@clerk/clerk-react";


export default function PatrolLogs() {
    const { user } = useUser();
    
    // Fetch user details to get organizationId
    const currentUser = useQuery(api.users.getByClerkId,
        user?.id ? { clerkId: user.id } : "skip"
    );
    const organizationId = currentUser?.organizationId;

    const patrolLogs = useQuery(api.logs.listPatrolLogs,
        organizationId ? { organizationId } : "skip"
    );

    if (currentUser === undefined || (organizationId && patrolLogs === undefined)) {
        return (
            <Layout title="Patrol Logs">
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            </Layout>
        );
    }

    if (!organizationId) {
        return (
            <Layout title="Patrol Logs">
                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                    <p className="text-muted-foreground text-center max-w-md">
                        Please set up or join an organization to view patrol logs.
                    </p>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Patrol Logs">
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Active Patrols</h2>
                        <p className="text-sm text-muted-foreground mt-1">Real-time monitoring of security patrols across all sites.</p>
                    </div>
                </div>

                <div className="glass rounded-2xl border border-white/10 overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left min-w-[700px]">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Site / Location</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Officer</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Started</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Points</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {patrolLogs?.map((log: any) => (
                                    <tr key={log._id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-white/90">{log.siteName}</span>
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{log.area || "Main Area"}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-white/80">{log.userName}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(log._creationTime).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-medium text-white/70">
                                                {log.completedPoints ?? 0} / {log.totalPoints ?? 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                                log.status === "completed" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                            )}>
                                                {log.status || "In Progress"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {patrolLogs?.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground text-sm">
                                            No patrol logs found for this organization.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
