import { useQuery } from "convex/react";
import { api } from "../../services/convex";
import { Layout } from "../../components/Layout";
import { Loader2, UserCheck } from "lucide-react";
import { cn } from "../../lib/utils";
import { useUser } from "@clerk/clerk-react";


export default function VisitLogs() {
    const { user } = useUser();

    // Fetch user details to get organizationId
    const currentUser = useQuery(api.users.getByClerkId,
        user?.id ? { clerkId: user.id } : "skip"
    );
    const organizationId = currentUser?.organizationId;

    const visitLogs = useQuery(api.logs.listVisitLogs,
        organizationId ? { organizationId } : "skip"
    );

    if (currentUser === undefined || (organizationId && visitLogs === undefined)) {
        return (
            <Layout title="Visit Logs">
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            </Layout>
        );
    }

    if (!organizationId) {
        return (
            <Layout title="Visit Logs">
                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                    <p className="text-muted-foreground text-center max-w-md">
                        Please set up or join an organization to view visit logs.
                    </p>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Visit Logs">
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Visit Registry</h2>
                        <p className="text-sm text-muted-foreground mt-1">Record of all visitor and manager site inspections.</p>
                    </div>
                </div>

                <div className="glass rounded-2xl border border-white/10 overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left min-w-[700px]">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Visitor / Role</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Site</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Purpose</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Time In</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {visitLogs?.map((log: any) => (
                                    <tr key={log._id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                                    <UserCheck className="w-4 h-4 text-muted-foreground" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-white/90">{log.userName}</span>
                                                    <span className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors">{log.userRole}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-white/80">{log.siteName}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-white/70">{log.remark || "Regular Inspection"}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(log._creationTime).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                                "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                            )}>
                                                Logged
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {visitLogs?.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground text-sm">
                                            No visit logs found for this organization.
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
