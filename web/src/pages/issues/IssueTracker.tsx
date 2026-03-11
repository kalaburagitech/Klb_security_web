import React, { useState } from "react";
import { Layout } from "../../components/Layout";
import { AlertTriangle, Clock, MapPin, CheckCircle2, ShieldAlert, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../services/convex";
import { useUser } from "@clerk/clerk-react";
import type { Id } from "../../../convex/_generated/dataModel";

export default function IssueTracker() {
    const { user } = useUser();
    const [selectedOrgId, setSelectedOrgId] = useState<string>("");

    const currentUser = useQuery(api.users.getByClerkId,
        user?.id ? { clerkId: user.id } : "skip"
    );
    const organizationId = currentUser?.organizationId;
    const orgs = useQuery(api.organizations.list);

    const orgIssues = useQuery((api.logs as any).listIssuesByOrg,
        (organizationId || (selectedOrgId as Id<"organizations">)) ? { organizationId: (organizationId || selectedOrgId) as Id<"organizations"> } : "skip"
    );
    const allIssuesList = useQuery(api.logs.listIssues);
    const isSuperAdmin = currentUser?.role === "Owner" || currentUser?.role === "Deployment Manager";
    const issues = isSuperAdmin ? allIssuesList : orgIssues;

    const resolveIssue = useMutation(api.logs.resolveIssue);

    const handleResolve = async (issueId: any) => {
        try {
            await resolveIssue({ issueId });
        } catch (error) {
            console.error("Failed to resolve issue:", error);
        }
    };

    // Calculate Stats
    const stats = React.useMemo(() => {
        if (!issues) return { critical: 0, warnings: 0, resolvedToday: 0 };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return issues.reduce((acc: any, issue: any) => {
            if (issue.status === "open") {
                if (issue.priority === "High") acc.critical++;
                if (issue.priority === "Medium") acc.warnings++;
            } else if (issue.status === "closed") {
                const issueDate = new Date(issue.timestamp);
                issueDate.setHours(0, 0, 0, 0);
                if (issueDate.getTime() === today.getTime()) {
                    acc.resolvedToday++;
                }
            }
            return acc;
        }, { critical: 0, warnings: 0, resolvedToday: 0 });
    }, [issues]);

    const activeIssues = React.useMemo(() => {
        return issues?.filter((i: any) => i.status === "open") || [];
    }, [issues]);

    if (currentUser === undefined || (organizationId && issues === undefined)) {
        return (
            <Layout title="Issue Tracker">
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            </Layout>
        );
    }

    if (!currentUser) {
        return (
            <Layout title="Issue Tracker">
                <div className="flex items-center justify-center h-64">
                    <p className="text-muted-foreground">User profile not found. Please contact support.</p>
                </div>
            </Layout>
        );
    }

    if (!organizationId) {
        return (
            <Layout title="Issue Tracker">
                <div className="flex items-center justify-center h-64">
                    <p className="text-muted-foreground">No organization assigned to your profile.</p>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Issue Tracker">
            <div className="space-y-6">
                {/* Organization Selector (if not linked) */}
                {!currentUser?.organizationId && (
                    <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl mb-6">
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="glass p-6 rounded-2xl border border-red-500/20 bg-red-500/[0.02]">
                        <div className="flex items-center gap-3 mb-2">
                            <ShieldAlert className="w-5 h-5 text-red-500" />
                            <span className="text-sm font-semibold text-red-400">Critical Issues</span>
                        </div>
                        <p className="text-3xl font-bold text-white tracking-tight">{stats.critical}</p>
                    </div>
                    <div className="glass p-6 rounded-2xl border border-amber-500/20 bg-amber-500/[0.02]">
                        <div className="flex items-center gap-3 mb-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            <span className="text-sm font-semibold text-amber-400">Active Warnings</span>
                        </div>
                        <p className="text-3xl font-bold text-white tracking-tight">{stats.warnings}</p>
                    </div>
                    <div className="glass p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.02]">
                        <div className="flex items-center gap-3 mb-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            <span className="text-sm font-semibold text-emerald-400">Resolved Today</span>
                        </div>
                        <p className="text-3xl font-bold text-white tracking-tight">{stats.resolvedToday}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {activeIssues.map((issue: any) => (
                        <div key={issue._id} className="glass p-5 rounded-2xl border border-white/10 hover:border-white/20 transition-all group">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className={cn(
                                        "p-3 rounded-xl",
                                        issue.priority === "High" ? "bg-red-500/10" : "bg-amber-500/10"
                                    )}>
                                        <AlertTriangle className={cn(
                                            "w-6 h-6",
                                            issue.priority === "High" ? "text-red-500" : "text-amber-500"
                                        )} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors">{issue.title}</h3>
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                                issue.priority === "High" ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                            )}>
                                                {issue.priority}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-3">{issue.description}</p>
                                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <MapPin className="w-3.5 h-3.5" />
                                                <span className="text-white font-medium">{issue.siteName}</span>
                                                <span className="mx-1 opacity-20">|</span>
                                                <span className="text-primary">{issue.locationContext}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" />
                                                {new Date(issue.timestamp).toLocaleString()}
                                            </div>
                                            <div className="flex items-center gap-1 ml-auto">
                                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                                                    <span className="text-[10px] font-bold text-primary">{issue.reporterName?.[0]}</span>
                                                </div>
                                                <span className="text-white ml-1">{issue.reporterName}</span>
                                                <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-md border border-white/10 uppercase font-bold tracking-tighter">
                                                    {issue.reporterRole}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 self-end sm:self-center">
                                    <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold hover:bg-white/10 transition-colors text-white">
                                        View Details
                                    </button>
                                    <button
                                        onClick={() => handleResolve(issue._id)}
                                        className="px-4 py-2 bg-primary/10 border border-primary/20 text-primary rounded-xl text-xs font-semibold hover:bg-primary hover:text-white transition-all shadow-sm active:scale-95"
                                    >
                                        Resolve
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {activeIssues.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">No active issues found.</div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
