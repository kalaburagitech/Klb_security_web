import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../services/convex";
import { Layout } from "../../components/Layout";
import {
    Plus,
    Pencil,
    Trash2,
    Building2,
    Calendar,
    Search,
    Loader2,
    X,
    Check
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";

export default function OrganizationManagement() {
    const orgs = useQuery((api as any).organizations.list);
    const allSites = useQuery(api.sites.list);
    const allUsers = useQuery(api.users.list);
    const createOrg = useMutation((api as any).organizations.create);
    const updateOrg = useMutation((api as any).organizations.update);
    const removeOrg = useMutation((api as any).organizations.remove);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOrg, setEditingOrg] = useState<{ id: Id<"organizations">, name: string } | null>(null);
    const [name, setName] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const getSiteCount = (orgId: string) => {
        return (allSites as any)?.filter((s: any) => s.organizationId === orgId).length || 0;
    };

    const getUserCount = (orgId: string) => {
        return (allUsers as any)?.filter((u: any) => u.organizationId === orgId).length || 0;
    };

    const filteredOrgs = orgs?.filter((org: any) =>
        org.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSubmitting(true);
        try {
            if (editingOrg) {
                await updateOrg({ id: editingOrg.id, name });
                toast.success("Organization updated successfully");
            } else {
                await createOrg({ name });
                toast.success("Organization created successfully");
            }
            setIsModalOpen(false);
            setName("");
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
        setIsModalOpen(true);
    };

    const openEditModal = (org: any) => {
        setEditingOrg({ id: org._id, name: org.name });
        setName(org.name);
        setIsModalOpen(true);
    };

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

                {/* Grid */}
                {!orgs || !allSites || !allUsers ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                ) : filteredOrgs?.length === 0 ? (
                    <div className="text-center py-20 glass rounded-3xl border border-white/5">
                        <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                        <h3 className="text-lg font-medium text-white/60">No organizations found</h3>
                        <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or create a new one.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredOrgs?.map((org: any) => {
                            const siteCount = getSiteCount(org._id);
                            const userCount = getUserCount(org._id);
                            return (
                                <div
                                    key={org._id}
                                    className="group glass p-6 rounded-3xl border border-white/5 hover:border-primary/30 transition-all duration-300 relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                        <button
                                            onClick={() => openEditModal(org)}
                                            className="p-2 bg-white/5 hover:bg-primary/20 rounded-lg text-muted-foreground hover:text-primary transition-colors"
                                            title="Edit Organization Name"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(org)}
                                            className={cn(
                                                "p-2 bg-white/5 rounded-lg text-muted-foreground transition-colors",
                                                (siteCount > 0 || userCount > 0) ? "hover:bg-red-500/10 cursor-not-allowed opacity-50" : "hover:bg-red-500/20 hover:text-red-500"
                                            )}
                                            title={(siteCount > 0 || userCount > 0) ? "Cannot delete while sites or users are connected" : "Delete Organization"}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                                            <Building2 className="w-6 h-6 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-bold text-white truncate">{org.name}</h3>
                                            <div className="flex flex-col gap-2 mt-2">
                                                <div className="flex gap-4">
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                        <Calendar className="w-3 h-3" />
                                                        Established {new Date(org.createdAt).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                <div className="flex gap-3 mt-1">
                                                    <div className={cn(
                                                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                                        siteCount > 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-white/5 text-muted-foreground"
                                                    )}>
                                                        {siteCount} {siteCount === 1 ? 'Site' : 'Sites'}
                                                    </div>
                                                    <div className={cn(
                                                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                                        userCount > 0 ? "bg-blue-500/10 text-blue-400" : "bg-white/5 text-muted-foreground"
                                                    )}>
                                                        {userCount} {userCount === 1 ? 'User' : 'Users'}
                                                    </div>
                                                </div>
                                                {(siteCount === 0 && userCount === 0) && (
                                                    <span className="text-[10px] text-red-400 font-medium opacity-60 italic mt-1">Ready to Delete</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
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
                                {editingOrg ? "Rename Organization" : "New Organization"}
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
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                />
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
