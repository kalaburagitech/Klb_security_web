import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../services/convex";
import { Layout } from "../../../components/Layout";
import {
    Plus,
    Pencil,
    Trash2,
    Power,
    Calendar,
    Search,
    Loader2,
    X,
    Check
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../../lib/utils";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";

export default function OrganizationManagement() {
    const { user } = useUser();
    const currentUser = useQuery(
        api.users.getByClerkId,
        user?.id ? { clerkId: user.id } : "skip"
    );
    const orgs = useQuery(
        (api as any).organizations.list,
        currentUser?.organizationId ? { currentOrganizationId: currentUser.organizationId } : {}
    );
    const allSites = useQuery(api.sites.listAll);
    const allUsers = useQuery(api.users.listAll);
    const createOrg = useMutation((api as any).organizations.create);
    const updateOrg = useMutation((api as any).organizations.update);
    const setOrgStatus = useMutation((api as any).organizations.setStatus);
    const updateOrgAccess = useMutation((api as any).organizations.updateAccess);
    const removeOrg = useMutation((api as any).organizations.remove);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOrg, setEditingOrg] = useState<{
        id: Id<"organizations">;
        name: string;
        status: "active" | "inactive";
        access: {
            patrolling: boolean;
            visits: boolean;
            attendance: boolean;
        };
    } | null>(null);
    const [name, setName] = useState("");
    const [status, setStatus] = useState<"active" | "inactive">("active");
    const [access, setAccess] = useState({
        patrolling: true,
        visits: true,
        attendance: true,
    });
    const [searchQuery, setSearchQuery] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const getSiteCount = (orgId: string) => {
        return (allSites as any)?.filter((s: any) => s.organizationId === orgId).length || 0;
    };

    const getUserCount = (orgId: string) => {
        return (allUsers as any)?.filter((u: any) => u.organizationId === orgId).length || 0;
    };

    const getMainOrgName = (org: any) => {
        if (!org.parentOrganizationId) {
            return "Self";
        }
        const parentOrg = orgs?.find((item: any) => item._id === org.parentOrganizationId);
        return parentOrg?.name || "-";
    };

    const filteredOrgs = useMemo(() => orgs?.filter((org: any) =>
        org.name.toLowerCase().includes(searchQuery.toLowerCase())
    ), [orgs, searchQuery]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSubmitting(true);
        try {
            if (editingOrg) {
                await updateOrg({ id: editingOrg.id, name, status, access });
                toast.success("Organization updated successfully");
            } else {
                await createOrg({ name, status, access });
                toast.success("Organization created successfully");
            }
            setIsModalOpen(false);
            setName("");
            setStatus("active");
            setAccess({ patrolling: true, visits: true, attendance: true });
            setEditingOrg(null);
        } catch (error: any) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (org: any) => {
        const siteCount = getSiteCount(org._id);
        const userCount = getUserCount(org._id);

        if (siteCount > 0 || userCount > 0) {
            let message = "Cannot delete organization.";
            if (siteCount > 0 && userCount > 0) {
                message += ` It has ${siteCount} site(s) and ${userCount} user(s) connected.`;
            } else if (siteCount > 0) {
                message += ` It has ${siteCount} site(s) connected. Please remove sites first.`;
            } else {
                message += ` It has ${userCount} user(s) registered. Please remove users first.`;
            }
            toast.error(message);
            return;
        }

        if (!confirm("Are you sure you want to delete this organization?")) return;

        try {
            await removeOrg({ id: org._id });
            toast.success("Organization deleted successfully");
        } catch (error: any) {
            toast.error(error.message || "Failed to delete organization");
        }
    };

    const openCreateModal = () => {
        setEditingOrg(null);
        setName("");
        setStatus("active");
        setAccess({ patrolling: true, visits: true, attendance: true });
        setIsModalOpen(true);
    };

    const openEditModal = (org: any) => {
        setEditingOrg({
            id: org._id,
            name: org.name,
            status: org.status || "active",
            access: org.access || { patrolling: true, visits: true, attendance: true },
        });
        setName(org.name);
        setStatus(org.status || "active");
        setAccess(org.access || { patrolling: true, visits: true, attendance: true });
        setIsModalOpen(true);
    };

    const handleToggleStatus = async (org: any) => {
        try {
            const nextStatus = org.status === "inactive" ? "active" : "inactive";
            await setOrgStatus({ id: org._id, status: nextStatus });
            toast.success(`Organization ${nextStatus === "active" ? "activated" : "deactivated"} successfully`);
        } catch (error: any) {
            toast.error(error.message || "Failed to update organization status");
        }
    };

    const handleToggleAccess = async (org: any, key: "patrolling" | "visits" | "attendance") => {
        try {
            const currentAccess = org.access || { patrolling: true, visits: true, attendance: true };
            const nextAccess = {
                ...currentAccess,
                [key]: !currentAccess[key],
            };
            await updateOrgAccess({ id: org._id, access: nextAccess });
            toast.success(`${key} access updated`);
        } catch (error: any) {
            toast.error(error.message || "Failed to update organization access");
        }
    };

    const renderToggle = (
        checked: boolean,
        onClick: () => void,
        title: string
    ) => (
        <button
            onClick={onClick}
            className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                checked ? "bg-emerald-500/80" : "bg-white/10"
            )}
            title={title}
        >
            <span
                className={cn(
                    "inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
                    checked ? "translate-x-5" : "translate-x-1"
                )}
            />
        </button>
    );

    return (
        <Layout title="Organization Management">
            <div className="space-y-8">
                {/* Header Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search organizations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-primary/20"
                    >
                        <Plus className="w-4 h-4" />
                        New Organization
                    </button>
                </div>

                {/* Table */}
                {!orgs || !allSites || !allUsers ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                ) : filteredOrgs?.length === 0 ? (
                    <div className="text-center py-20 glass rounded-3xl border border-white/5">
                        <Power className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                        <h3 className="text-lg font-medium text-white/60">No organizations found</h3>
                        <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or create a new one.</p>
                    </div>
                ) : (
                    <div className="glass rounded-2xl border border-white/10 overflow-hidden">
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left min-w-[1250px]">
                                <thead>
                                    <tr className="border-b border-white/5 bg-white/[0.02]">
                                        <th className="px-4 sm:px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Organization</th>
                                        <th className="px-4 sm:px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                                        <th className="px-4 sm:px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Main Org</th>
                                        <th className="px-4 sm:px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Created</th>
                                        <th className="px-4 sm:px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sites</th>
                                        <th className="px-4 sm:px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Users</th>
                                        <th className="px-4 sm:px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                                        <th className="px-4 sm:px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Patrolling</th>
                                        <th className="px-4 sm:px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Visits</th>
                                        <th className="px-4 sm:px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Attendance</th>
                                        <th className="px-4 sm:px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredOrgs?.map((org: any) => {
                                        const siteCount = getSiteCount(org._id);
                                        const userCount = getUserCount(org._id);
                                        const orgAccess = org.access || { patrolling: true, visits: true, attendance: true };
                                        return (
                                            <tr key={org._id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-4 sm:px-6 py-4">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-sm font-semibold text-white truncate">{org.name}</span>
                                                            <span className="text-xs text-muted-foreground truncate">{org._id}</span>
                                                        </div>
                                                        {org.parentOrganizationId && (
                                                            <button
                                                                onClick={() => openEditModal(org)}
                                                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-primary/20 text-[10px] font-medium text-muted-foreground hover:text-primary transition-colors whitespace-nowrap"
                                                                title="Edit organization name"
                                                            >
                                                                <Pencil className="w-3 h-3" />
                                                                Edit
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 sm:px-6 py-4 text-sm text-white">
                                                    <span className={cn(
                                                        "inline-flex items-center px-2 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider border whitespace-nowrap",
                                                        !org.parentOrganizationId
                                                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                                            : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                                    )}>
                                                        {!org.parentOrganizationId ? "MAIN_ORG" : "SUB_ORG"}
                                                    </span>
                                                </td>
                                                <td className="px-4 sm:px-6 py-4 text-sm text-white">{getMainOrgName(org)}</td>
                                                <td className="px-4 sm:px-6 py-4 text-sm text-muted-foreground">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-4 h-4" />
                                                        {new Date(org.createdAt).toLocaleDateString()}
                                                    </div>
                                                </td>
                                                <td className="px-4 sm:px-6 py-4 text-sm text-white">{siteCount}</td>
                                                <td className="px-4 sm:px-6 py-4 text-sm text-white">{userCount}</td>
                                                <td className="px-4 sm:px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <span className={cn(
                                                            "inline-flex items-center px-2 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider border whitespace-nowrap",
                                                            org.status === "inactive"
                                                                ? "bg-red-500/10 text-red-400 border-red-500/20"
                                                                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                        )}>
                                                            {org.status === "inactive" ? "Inactive" : "Active"}
                                                        </span>
                                                        {renderToggle(
                                                            org.status !== "inactive",
                                                            () => handleToggleStatus(org),
                                                            org.status === "inactive" ? "Activate organization" : "Deactivate organization"
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 sm:px-6 py-4">
                                                    {renderToggle(
                                                        orgAccess.patrolling,
                                                        () => handleToggleAccess(org, "patrolling"),
                                                        "Toggle patrolling access"
                                                    )}
                                                </td>
                                                <td className="px-4 sm:px-6 py-4">
                                                    {renderToggle(
                                                        orgAccess.visits,
                                                        () => handleToggleAccess(org, "visits"),
                                                        "Toggle visits access"
                                                    )}
                                                </td>
                                                <td className="px-4 sm:px-6 py-4">
                                                    {renderToggle(
                                                        orgAccess.attendance,
                                                        () => handleToggleAccess(org, "attendance"),
                                                        "Toggle attendance access"
                                                    )}
                                                </td>
                                                <td className="px-4 sm:px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => openEditModal(org)}
                                                            className="p-2 bg-white/5 hover:bg-primary/20 rounded-lg text-muted-foreground hover:text-primary transition-colors"
                                                            title="Edit organization"
                                                            disabled={!org.parentOrganizationId}
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(org)}
                                                            className={cn(
                                                                "p-2 bg-white/5 rounded-lg text-muted-foreground transition-colors",
                                                                (siteCount > 0 || userCount > 0 || !org.parentOrganizationId)
                                                                    ? "hover:bg-red-500/10 cursor-not-allowed opacity-50"
                                                                    : "hover:bg-red-500/20 hover:text-red-500"
                                                            )}
                                                            title={!org.parentOrganizationId
                                                                ? "MAIN_ORG cannot be deleted"
                                                                : (siteCount > 0 || userCount > 0)
                                                                    ? "Cannot delete while sites or users are connected"
                                                                    : "Delete organization"}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className="relative w-full max-w-md glass rounded-3xl border border-white/10 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">
                                {editingOrg ? "Edit Organization" : "New Organization"}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                                <X className="w-5 h-5 text-muted-foreground" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                                    Display Name
                                </label>
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="Enter organization name..."
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={editingOrg ? !orgs?.find((org: any) => org._id === editingOrg.id)?.parentOrganizationId : false}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                                    Status
                                </label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                                    Organization Access
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {([
                                        ["patrolling", "Patrolling"],
                                        ["visits", "Visits"],
                                        ["attendance", "Attendance"],
                                    ] as const).map(([key, label]) => (
                                        <div key={key} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 flex items-center justify-between">
                                            <span className="text-sm text-white">{label}</span>
                                            {renderToggle(
                                                access[key],
                                                () => setAccess({ ...access, [key]: !access[key] }),
                                                `Toggle ${label.toLowerCase()} access`
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-white font-semibold hover:bg-white/5 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !name.trim()}
                                    className="flex-3 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Check className="w-5 h-5" />
                                    )}
                                    {editingOrg ? "Update Name" : "Create Organization"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}
