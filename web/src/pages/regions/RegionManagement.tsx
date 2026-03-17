import React, { useState } from "react";
import { Layout } from "../../components/Layout";
import { Plus, Globe, Search, Loader2, Edit2, Trash2, X, Hash } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../services/convex";
import { useUser } from "@clerk/nextjs";
import type { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";

export default function RegionManagement() {
    const { user } = useUser();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingRegion, setEditingRegion] = useState<{ id: Id<"regions">; regionId: string; regionName: string } | null>(null);
    const [isDeletingId, setIsDeletingId] = useState<Id<"regions"> | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const [newRegionId, setNewRegionId] = useState("");
    const [newRegionName, setNewRegionName] = useState("");

    const regions = useQuery(api.regions.list);
    const createRegion = useMutation(api.regions.create);
    const updateRegion = useMutation(api.regions.update);
    const removeRegion = useMutation(api.regions.remove);

    const currentUser = useQuery(api.users.getByClerkId,
        user?.id ? { clerkId: user.id } : "skip"
    );

    const isSuperAdmin = currentUser?.role === "Owner" || currentUser?.role === "Deployment Manager";

    const filteredRegions = regions?.filter(r =>
        r.regionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.regionId.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAddRegion = async () => {
        if (!newRegionId || !newRegionName) {
            toast.error("Please fill in all fields");
            return;
        }
        try {
            await createRegion({
                regionId: newRegionId,
                regionName: newRegionName,
            });
            setIsAddModalOpen(false);
            setNewRegionId("");
            setNewRegionName("");
            toast.success("Region created successfully");
        } catch (error: any) {
            console.error("Failed to create region:", error);
            toast.error(error.message || "Failed to create region");
        }
    };

    const handleUpdateRegion = async () => {
        if (!editingRegion) return;
        try {
            await updateRegion({
                id: editingRegion.id,
                regionId: editingRegion.regionId,
                regionName: editingRegion.regionName,
            });
            setEditingRegion(null);
            toast.success("Region updated successfully");
        } catch (error: any) {
            console.error("Failed to update region:", error);
            toast.error(error.message || "Failed to update region");
        }
    };

    const handleDeleteRegion = async (id: Id<"regions">) => {
        try {
            await removeRegion({ id });
            setIsDeletingId(null);
            toast.success("Region deleted successfully");
        } catch (error) {
            console.error("Failed to delete region:", error);
            toast.error("Failed to delete region");
        }
    };

    if (currentUser === undefined || regions === undefined) {
        return (
            <Layout title="Region Management">
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            </Layout>
        );
    }

    if (!isSuperAdmin) {
        return (
            <Layout title="Region Management">
                <div className="flex items-center justify-center h-64">
                    <p className="text-muted-foreground">You do not have permission to manage regions.</p>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Region Management">
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search regions..."
                                className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 w-full sm:w-64 text-white"
                            />
                        </div>
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                    >
                        <Plus className="w-4 h-4" />
                        Add New Region
                    </button>
                </div>

                <div className="glass rounded-2xl border border-white/10 overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Region ID</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Region Name</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {((filteredRegions as any[]) || [])?.map((region: any) => (
                                    <tr key={region._id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                    <Hash className="w-4 h-4 text-primary" />
                                                </div>
                                                <span className="text-sm font-medium text-white/90">{region.regionId}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <Globe className="w-4 h-4 text-muted-foreground" />
                                                <span className="text-sm text-white/90">{region.regionName}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setEditingRegion({
                                                        id: region._id,
                                                        regionId: region.regionId,
                                                        regionName: region.regionName
                                                    })}
                                                    className="p-2 hover:bg-white/5 rounded-lg text-muted-foreground hover:text-primary transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setIsDeletingId(region._id)}
                                                    className="p-2 hover:bg-white/5 rounded-lg text-muted-foreground hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredRegions?.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground text-sm">
                                            No regions found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Add Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="glass w-full max-w-md rounded-2xl border border-white/10 p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-white">Add New Region</h3>
                            <button onClick={() => setIsAddModalOpen(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Region ID (e.g. KA, MH)</label>
                                <input
                                    value={newRegionId}
                                    onChange={e => setNewRegionId(e.target.value.toUpperCase())}
                                    type="text"
                                    className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-white"
                                    placeholder="Enter short ID"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Region Name</label>
                                <input
                                    value={newRegionName}
                                    onChange={e => setNewRegionName(e.target.value)}
                                    type="text"
                                    className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-white"
                                    placeholder="e.g. Karnataka"
                                />
                            </div>
                        </div>
                        <button onClick={handleAddRegion} className="w-full py-2 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all">Create Region</button>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editingRegion && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="glass w-full max-w-md rounded-2xl border border-white/10 p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-white">Edit Region</h3>
                            <button onClick={() => setEditingRegion(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Region ID</label>
                                <input
                                    value={editingRegion.regionId}
                                    onChange={e => setEditingRegion({ ...editingRegion, regionId: e.target.value.toUpperCase() })}
                                    type="text"
                                    className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Region Name</label>
                                <input
                                    value={editingRegion.regionName}
                                    onChange={e => setEditingRegion({ ...editingRegion, regionName: e.target.value })}
                                    type="text"
                                    className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-white"
                                />
                            </div>
                        </div>
                        <button onClick={handleUpdateRegion} className="w-full py-2 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all">Save Changes</button>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {isDeletingId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="glass w-full max-w-sm rounded-2xl border border-white/10 p-6 space-y-4 text-center">
                        <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                            <Trash2 className="w-6 h-6 text-red-500" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-white">Delete Region?</h3>
                            <p className="text-sm text-muted-foreground">This will permanently remove the region. Sites and users assigned to this region will lose their region reference.</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setIsDeletingId(null)} className="flex-1 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors text-white">Cancel</button>
                            <button onClick={() => handleDeleteRegion(isDeletingId)} className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
