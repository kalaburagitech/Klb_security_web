import { Layout } from "../components/Layout";
import {
    ShieldCheck,
    MapPin,
    AlertTriangle,
    TrendingUp,
    ArrowUpRight,
    Users,
    PlusCircle
} from "lucide-react";
import { cn } from "../lib/utils";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "@clerk/clerk-react";
import { useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";

export default function Dashboard() {
    const { user } = useUser();
    const [selectedOrgId, setSelectedOrgId] = useState<string>("");

    // Fetch real data
    const currentUser = useQuery(api.users.getByClerkId,
        user?.id ? { clerkId: user.id } : "skip"
    );
    const organizationId = currentUser?.organizationId;
    const orgs = useQuery(api.organizations.list);

    const users = useQuery(api.users.listByOrg,
        (organizationId || (selectedOrgId as Id<"organizations">)) ? { organizationId: (organizationId || selectedOrgId) as Id<"organizations"> } : "skip"
    );
    const sites = useQuery(api.sites.listSitesByOrg,
        (organizationId || (selectedOrgId as Id<"organizations">)) ? { organizationId: (organizationId || selectedOrgId) as Id<"organizations"> } : "skip"
    );
    const patrolLogs = useQuery(api.logs.listPatrolLogs,
        (organizationId || (selectedOrgId as Id<"organizations">)) ? { organizationId: (organizationId || selectedOrgId) as Id<"organizations"> } : "skip"
    );
    const issuesList = useQuery(api.logs.listIssuesByOrg,
        (organizationId || (selectedOrgId as Id<"organizations">)) ? { organizationId: (organizationId || selectedOrgId) as Id<"organizations"> } : "skip"
    );

    const stats = [
        {
            label: "Active Sites",
            value: sites?.length?.toString() || "0",
            icon: MapPin,
            color: "text-emerald-400",
            trend: sites === undefined ? "Loading..." : "Live"
        },
        {
            label: "Total Users",
            value: users?.length?.toString() || "0",
            icon: Users,
            color: "text-blue-400",
            trend: users === undefined ? "Loading..." : `+${users?.length || 0}`
        },
        {
            label: "Total Patrols",
            value: patrolLogs?.length?.toString() || "0",
            icon: ShieldCheck,
            color: "text-amber-400",
            trend: patrolLogs === undefined ? "Loading..." : "Updated"
        },
        {
            label: "Open Issues",
            value: issuesList?.filter((i: any) => i.status === "open").length?.toString() || "0",
            icon: AlertTriangle,
            color: "text-rose-500",
            trend: issuesList === undefined ? "Loading..." : "Critical"
        },
    ];

    return (
        <Layout title="Command Center Overview">
            <div className="space-y-8">
                {/* Organization Selector (if not linked) */}
                {!currentUser?.organizationId && (
                    <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl">
                        <span className="text-sm font-semibold text-muted-foreground ml-2">Select Organization:</span>
                        <div className="flex flex-wrap gap-2">
                            {orgs?.map((org) => (
                                <button
                                    key={org._id}
                                    onClick={() => setSelectedOrgId(org._id)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-xl text-xs font-semibold border transition-all",
                                        selectedOrgId === org._id
                                            ? "bg-primary text-primary-foreground border-primary shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                                            : "bg-white/5 text-muted-foreground border-white/10 hover:border-white/20"
                                    )}
                                >
                                    {org.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Quick Actions Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl">
                    <span className="text-sm font-semibold text-muted-foreground ml-2">Quick Actions:</span>
                    <div className="flex flex-wrap gap-3">
                        <a href="/users" className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl text-sm font-semibold hover:bg-primary/20 transition-all">
                            <PlusCircle className="w-4 h-4" />
                            Add New User
                        </a>
                        <a href="/sites" className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-sm font-semibold hover:bg-emerald-500/20 transition-all">
                            <PlusCircle className="w-4 h-4" />
                            Add New Site
                        </a>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {stats.map((stat) => (
                        <div
                            key={stat.label}
                            className="glass p-4 sm:p-6 rounded-2xl border border-white/10 hover:border-primary/50 transition-all group relative overflow-hidden"
                        >
                            <div className="absolute -right-4 -top-4 w-16 h-16 sm:w-24 sm:h-24 bg-primary/5 rounded-full blur-2xl sm:blur-3xl group-hover:bg-primary/10 transition-colors" />

                            <div className="flex justify-between items-start relative z-10">
                                <div className={cn("p-1.5 sm:p-2 rounded-xl bg-white/5", stat.color)}>
                                    <stat.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-[10px] text-muted-foreground font-medium">
                                    {stat.trend}
                                    <TrendingUp className="w-3 h-3 text-primary" />
                                </div>
                            </div>

                            <div className="mt-3 sm:mt-4 relative z-10">
                                <p className="text-[10px] sm:text-sm font-medium text-muted-foreground">{stat.label}</p>
                                <div className="flex items-baseline gap-2 mt-0.5 sm:mt-1">
                                    <h3 className="text-xl sm:text-3xl font-bold text-white tracking-tight">{stat.value}</h3>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Recent Alerts & Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 glass rounded-2xl border border-white/10 p-6 min-h-[400px]">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="text-lg font-semibold text-white/90">Patrol Intensity</h4>
                            <button className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1 group">
                                View Reports
                                <ArrowUpRight className="w-3.5 h-3.5 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                        </div>

                        <div className="flex-1 flex items-center justify-center text-muted-foreground border border-dashed border-white/5 rounded-xl bg-white/[0.02]">
                            <p className="text-sm">Activity Chart Visualization</p>
                        </div>
                    </div>

                    <div className="glass rounded-2xl border border-white/10 p-6 h-full">
                        <h4 className="text-lg font-semibold text-white/90 mb-6">Recent Alerts</h4>
                        <div className="space-y-4">
                            {issuesList && issuesList.filter((i: any) => i.status === "open").length > 0 ? (
                                issuesList.filter((i: any) => i.status === "open").slice(0, 5).map((issue: any) => (
                                    <div key={issue._id} className="flex gap-4 p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all cursor-pointer">
                                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                                            issue.priority === "High" ? "bg-rose-500/10" : "bg-amber-500/10")}>
                                            <AlertTriangle className={cn("w-5 h-5",
                                                issue.priority === "High" ? "text-rose-500" : "text-amber-500")} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white/90 truncate">{issue.title}</p>
                                            <p className="text-xs text-muted-foreground truncate">{issue.description}</p>
                                            <p className="text-[10px] text-muted-foreground mt-1 opacity-60">
                                                {new Date(issue.timestamp).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 text-muted-foreground text-sm italic">
                                    No recent alerts.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
