import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Layout } from "../../components/Layout";
import { Plus, MapPin, Search, Loader2, Edit2, Trash2, X, Building, ChevronDown, ChevronRight, Clock, Users, UserPlus, UserMinus } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
const MapPicker = dynamic(() => import("../../components/MapPicker").then(mod => mod.MapPicker), { ssr: false });
import { api } from "../../services/convex";
import { useUser } from "@clerk/nextjs";
import type { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";

export default function SiteManagement() {
    const { user } = useUser();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingSite, setEditingSite] = useState<{
        id: Id<"sites">;
        name: string;
        locationName: string;
        latitude: number;
        longitude: number;
        allowedRadius: number;
        shiftStart: string;
        shiftEnd: string;
        organizationId: Id<"organizations">;
        regionId?: string;
    } | null>(null);
    const [isDeletingId, setIsDeletingId] = useState<Id<"sites"> | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const [newName, setNewName] = useState("");
    const [newLocation, setNewLocation] = useState("");
    const [newLat, setNewLat] = useState("");
    const [newLng, setNewLng] = useState("");
    const [newRadius, setNewRadius] = useState("100");
    const [newShiftStart, setNewShiftStart] = useState("08:00");
    const [newShiftEnd, setNewShiftEnd] = useState("20:00");
    const [newRegionId, setNewRegionId] = useState("");
    const [expandedSiteId, setExpandedSiteId] = useState<Id<"sites"> | null>(null);
    const [selectedOrgId, setSelectedOrgId] = useState<string>("");
    const [isCreateOrgModalOpen, setIsCreateOrgModalOpen] = useState(false);
    const [newOrgName, setNewOrgName] = useState("");
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [assigningSiteId, setAssigningSiteId] = useState<Id<"sites"> | null>(null);
    const [assignSearchQuery, setAssignSearchQuery] = useState("");
    const [showMapPicker, setShowMapPicker] = useState(false);
    const [showEditMapPicker, setShowEditMapPicker] = useState(false);

    const createSite = useMutation(api.sites.createSite);
    const updateSite = useMutation(api.sites.updateSite);
    const removeSite = useMutation(api.sites.removeSite);
    const createOrg = useMutation(api.organizations.create);
    const updateUser = useMutation(api.users.update);

    const currentUser = useQuery(api.users.getByClerkId,
        user?.id ? { clerkId: user.id } : "skip"
    );

    const organizationId = currentUser?.organizationId;
    const orgs = useQuery(api.organizations.list);
    const regions = useQuery(api.regions.list);

    // Admins/Owners should see all sites, others only their org's sites

    const allSites = useQuery(api.sites.listAll);

    const orgSites = useQuery(api.sites.listSitesByOrg,
        organizationId ? { organizationId } : "skip"
    );

    const isSuperAdmin = currentUser?.role === "Owner" || currentUser?.role === "Deployment Manager";
    const sites = isSuperAdmin ? allSites : orgSites;

    const users = useQuery(api.users.listByOrg,
        organizationId ? { organizationId } : "skip"
    );

    const filteredSites = sites?.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.locationName.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const handleAddSite = async () => {
        const orgIdToUse = organizationId || selectedOrgId;
        if (!orgIdToUse || !newName || !newLocation) {
            toast.error("Please fill in all fields and select an Organization");
            return;
        }
        try {
            await createSite({
                name: newName,
                locationName: newLocation,
                latitude: parseFloat(newLat) || 0,
                longitude: parseFloat(newLng) || 0,
                allowedRadius: parseInt(newRadius) || 100,
                organizationId: orgIdToUse as Id<"organizations">,
                regionId: newRegionId || undefined,
                shiftStart: newShiftStart,
                shiftEnd: newShiftEnd
            });
            setIsAddModalOpen(false);
            setNewName("");
            setNewLocation("");
            setNewLat("");
            setNewLng("");
            setNewRadius("100");
            setNewShiftStart("08:00");
            setNewShiftEnd("20:00");
            setNewRegionId("");
            toast.success("Site created successfully");
        } catch (error: any) {
            console.error("Failed to create site:", error);
            toast.error(error.message || "Failed to create site");
        }
    };

    const handleCreateOrg = async () => {
        if (!newOrgName) {
            toast.error("Please enter an organization name");
            return;
        }
        try {
            const orgId = await createOrg({ name: newOrgName });
            setSelectedOrgId(orgId);
            setIsCreateOrgModalOpen(false);
            setNewOrgName("");
            toast.success("Organization created successfully");
        } catch (error: any) {
            console.error("Failed to create organization:", error);
            toast.error(error.message || "Failed to create organization");
        }
    };

    const handleGetCurrentLocation = (target: "new" | "edit") => {
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your browser");
            return;
        }

        const toastId = toast.loading("Fetching current location...");

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                if (target === "new") {
                    setNewLat(latitude.toString());
                    setNewLng(longitude.toString());
                } else if (editingSite) {
                    setEditingSite({
                        ...editingSite,
                        latitude,
                        longitude
                    });
                }
                toast.success("Location updated", { id: toastId });
            },
            (error) => {
                console.error("Geolocation error:", error);
                toast.error("Failed to get location: " + error.message, { id: toastId });
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const handleUpdateSite = async () => {
        if (!editingSite) return;
        try {
            await updateSite({
                id: editingSite.id,
                name: editingSite.name,
                locationName: editingSite.locationName,
                latitude: editingSite.latitude,
                longitude: editingSite.longitude,
                allowedRadius: editingSite.allowedRadius,
                organizationId: editingSite.organizationId,
                regionId: editingSite.regionId,
                shiftStart: editingSite.shiftStart,
                shiftEnd: editingSite.shiftEnd
            });
            setEditingSite(null);
            toast.success("Site updated successfully");
        } catch (error) {
            console.error("Failed to update site:", error);
            toast.error("Failed to update site");
        }
    };

    const handleDeleteSite = async (id: Id<"sites">) => {
        try {
            await removeSite({ id });
            setIsDeletingId(null);
            toast.success("Site deleted successfully");
        } catch (error) {
            console.error("Failed to delete site:", error);
            toast.error("Failed to delete site");
        }
    };

    if (currentUser === undefined || (organizationId && sites === undefined)) {
        return (
            <Layout title="Site Management">
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            </Layout>
        );
    }

    if (!currentUser || !organizationId) {
        return (
            <Layout title="Site Management">
                <div className="space-y-6">
                    <div className="flex justify-end">
                        <button
                            onClick={() => {
                                setSelectedOrgId(organizationId || "");
                                setIsAddModalOpen(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                        >
                            <Plus className="w-4 h-4" />
                            Add New Site
                        </button>
                    </div>

                    <div className="glass rounded-2xl border border-white/10 p-12 text-center space-y-4">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                            <MapPin className="w-8 h-8 text-primary" />
                        </div>
                        <div className="max-w-md mx-auto">
                            <h3 className="text-xl font-bold text-white">Organization Not Assigned</h3>
                            <p className="text-sm text-muted-foreground mt-2">
                                You need to be part of an organization to manage sites.
                                Use the **Add New Site** button if you have an organization ID, or contact your administrator.
                            </p>
                        </div>
                    </div>
                </div>

                {isAddModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
                        <div className="glass w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 p-4 sm:p-6 space-y-4 custom-scrollbar">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-white">Add New Site</h3>
                                <button onClick={() => setIsAddModalOpen(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground uppercase">Site Name</label>
                                    <input value={newName} onChange={e => setNewName(e.target.value)} type="text" className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground uppercase">Location Name</label>
                                    <input value={newLocation} onChange={e => setNewLocation(e.target.value)} type="text" className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground uppercase">Organization</label>
                                    <div className="flex gap-2 mt-1">
                                        <select
                                            id="org-select-new"
                                            value={selectedOrgId}
                                            onChange={e => setSelectedOrgId(e.target.value)}
                                            className="flex-1 px-4 py-2 bg-neutral-900 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50"
                                        >
                                            <option value="">Select Organization</option>
                                            {orgs?.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
                                        </select>
                                        {!organizationId && (
                                            <button
                                                onClick={() => setIsCreateOrgModalOpen(true)}
                                                className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
                                                title="Create New Organization"
                                            >
                                                <Plus className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground uppercase">Latitude</label>
                                        <input value={newLat} onChange={e => setNewLat(e.target.value)} type="number" step="any" className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground uppercase">Longitude</label>
                                        <input value={newLng} onChange={e => setNewLng(e.target.value)} type="number" step="any" className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground uppercase">Allowed Radius (m)</label>
                                    <input value={newRadius} onChange={e => setNewRadius(e.target.value)} type="number" className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50" />
                                </div>
                            </div>
                            <button onClick={handleAddSite} className="w-full py-2 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all">Create Site</button>
                        </div>
                    </div>
                )}

                {/* Create Org Modal */}
                {isCreateOrgModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md">
                        <div className="glass w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 p-4 sm:p-6 space-y-4 shadow-2xl custom-scrollbar">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-white">New Organization</h3>
                                <button onClick={() => setIsCreateOrgModalOpen(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Organization Name</label>
                                    <input
                                        autoFocus
                                        value={newOrgName}
                                        onChange={e => setNewOrgName(e.target.value)}
                                        placeholder="e.g. Acme Security Corp"
                                        type="text"
                                        className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleCreateOrg}
                                disabled={!newOrgName}
                                className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
                            >
                                Create & Select
                            </button>
                        </div>
                    </div>
                )}
            </Layout>
        );
    }

    return (
        <Layout title="Site Management">
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search sites..."
                                className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 w-full sm:w-64"
                            />
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setSelectedOrgId(organizationId || "");
                            setIsAddModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                    >
                        <Plus className="w-4 h-4" />
                        Add New Site
                    </button>
                </div>

                <div className="glass rounded-2xl border border-white/10 overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left min-w-[800px]">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="px-4 sm:px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Site Name</th>
                                    <th className="px-4 sm:px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location</th>
                                    <th className="px-4 sm:px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Radius</th>
                                    <th className="px-4 sm:px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Coordinates</th>
                                    <th className="px-4 sm:px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                                    <th className="px-4 sm:px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredSites?.map((site) => (
                                    <React.Fragment key={site._id}>
                                        <tr className="hover:bg-white/[0.02] transition-colors group cursor-pointer" onClick={() => setExpandedSiteId(expandedSiteId === site._id ? null : site._id)}>
                                            <td className="px-4 sm:px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="shrink-0 text-muted-foreground">
                                                        {expandedSiteId === site._id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                    </div>
                                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                        <MapPin className="w-4 h-4 text-primary" />
                                                    </div>
                                                    <span className="text-sm font-medium text-white/90 truncate">{site.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 sm:px-6 py-4 text-sm text-muted-foreground truncate max-w-[150px] sm:max-w-none">{site.locationName}</td>
                                            <td className="px-4 sm:px-6 py-4 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                                                    {site.shiftStart || "N/A"} - {site.shiftEnd || "N/A"}
                                                </div>
                                            </td>
                                            <td className="px-4 sm:px-6 py-4 text-xs font-mono text-muted-foreground/60 whitespace-nowrap">
                                                {site.latitude.toFixed(4)}, {site.longitude.toFixed(4)}
                                            </td>
                                            <td className="px-4 sm:px-6 py-4">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border bg-emerald-500/10 text-emerald-500 border-emerald-500/20 whitespace-nowrap">
                                                    Active
                                                </span>
                                            </td>
                                            <td className="px-4 sm:px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1 sm:gap-2">
                                                    <button
                                                        onClick={() => setEditingSite({
                                                            id: site._id,
                                                            name: site.name,
                                                            locationName: site.locationName,
                                                            latitude: site.latitude,
                                                            longitude: site.longitude,
                                                            allowedRadius: site.allowedRadius,
                                                            shiftStart: site.shiftStart || "08:00",
                                                            shiftEnd: site.shiftEnd || "20:00",
                                                            organizationId: site.organizationId,
                                                            regionId: site.regionId
                                                        })}
                                                        className="p-1.5 sm:p-2 hover:bg-white/5 rounded-lg text-muted-foreground hover:text-primary transition-colors"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5 sm:w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setIsDeletingId(site._id)}
                                                        className="p-1.5 sm:p-2 hover:bg-white/5 rounded-lg text-muted-foreground hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5 sm:w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedSiteId === site._id && (
                                            <tr className="bg-white/[0.01]">
                                                <td colSpan={6} className="px-6 py-4 bg-primary/5">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-top-2 duration-300">
                                                        <div className="space-y-3">
                                                            <h4 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                                                                <Clock className="w-3.5 h-3.5" />
                                                                Shift Details
                                                            </h4>
                                                            <div className="glass rounded-xl p-4 border-white/5 space-y-2">
                                                                <div className="flex justify-between text-sm">
                                                                    <span className="text-muted-foreground">Operating Hours:</span>
                                                                    <span className="text-white font-medium">{site.shiftStart || "08:00"} - {site.shiftEnd || "20:00"}</span>
                                                                </div>
                                                                <div className="flex justify-between text-sm">
                                                                    <span className="text-muted-foreground">Geofence Radius:</span>
                                                                    <span className="text-white font-medium">{site.allowedRadius} meters</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-3">
                                                            <div className="flex items-center justify-between">
                                                                <h4 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                                                                    <Users className="w-3.5 h-3.5" />
                                                                    Assigned Officers
                                                                </h4>
                                                                <button
                                                                    onClick={() => {
                                                                        setAssigningSiteId(site._id);
                                                                        setIsAssignModalOpen(true);
                                                                    }}
                                                                    className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-lg text-[10px] font-bold hover:bg-primary/20 transition-all border border-primary/20"
                                                                >
                                                                    <UserPlus className="w-3 h-3" />
                                                                    Assign
                                                                </button>
                                                            </div>
                                                            <div className="glass rounded-xl p-4 border-white/5 min-h-[60px]">
                                                                <SiteOfficersList siteId={site._id} onRemove={async (officerId) => {
                                                                    const officer = users?.find(u => u._id === officerId);
                                                                    if (!officer) return;
                                                                    try {
                                                                        await updateUser({
                                                                            id: officer._id,
                                                                            name: officer.name,
                                                                            role: officer.role as any,
                                                                            email: officer.email,
                                                                            mobileNumber: officer.mobileNumber,
                                                                            organizationId: officer.organizationId,
                                                                            siteIds: officer.siteIds?.filter(id => id !== site._id),
                                                                        } as any);
                                                                        toast.success(`${officer.name} unassigned`);
                                                                    } catch (error: any) {
                                                                        console.error("Failed to unassign officer:", error);
                                                                        toast.error(error.message || "Failed to unassign officer");
                                                                    }
                                                                }} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                                {filteredSites?.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground text-sm">
                                            No sites found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Assign Officer Modal */}
            {isAssignModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
                    <div className="glass w-full max-w-md max-h-[80vh] overflow-hidden rounded-2xl border border-white/10 flex flex-col">
                        <div className="p-4 sm:p-6 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-primary" />
                                Assign Officer
                            </h3>
                            <button onClick={() => setIsAssignModalOpen(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
                        </div>

                        <div className="p-4 border-b border-white/5">
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    value={assignSearchQuery}
                                    onChange={(e) => setAssignSearchQuery(e.target.value)}
                                    placeholder="Search officers..."
                                    className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 text-white"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                            {users?.filter(u =>
                                (u.role === "Officer" || u.role === "Security Officer" || u.role === "SG" || u.role === "SO") &&
                                !u.siteIds?.includes(assigningSiteId!) &&
                                u.name.toLowerCase().includes(assignSearchQuery.toLowerCase())
                            ).map(officer => (
                                <button
                                    key={officer._id}
                                    onClick={async () => {
                                        if (!assigningSiteId) return;
                                        try {
                                            const currentSiteIds = officer.siteIds || [];
                                            await updateUser({
                                                id: officer._id,
                                                name: officer.name,
                                                role: officer.role as any,
                                                email: officer.email,
                                                mobileNumber: officer.mobileNumber,
                                                organizationId: officer.organizationId,
                                                siteIds: [...currentSiteIds, assigningSiteId],
                                                permissions: officer.permissions
                                            } as any);
                                            toast.success(`${officer.name} assigned successfully`);
                                            setIsAssignModalOpen(false);
                                            setAssignSearchQuery("");
                                        } catch (error: any) {
                                            console.error("Failed to assign officer:", error);
                                            toast.error(error.code === "ValidationFailed" ? "Invalid officer data" : (error.message || "Failed to assign officer"));
                                        }
                                    }}
                                    className="w-full flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all group"
                                >
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary group-hover:scale-110 transition-transform">
                                        {officer.name.charAt(0)}
                                    </div>
                                    <div className="text-left">
                                        <div className="text-sm font-medium text-white">{officer.name}</div>
                                        <div className="text-xs text-muted-foreground">{officer.role}</div>
                                    </div>
                                    <Plus className="w-4 h-4 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
                                </button>
                            ))}
                            {users?.filter(u =>
                                (u.role === "Officer" || u.role === "Security Officer" || u.role === "SG" || u.role === "SO") &&
                                !u.siteIds?.includes(assigningSiteId!) &&
                                u.name.toLowerCase().includes(assignSearchQuery.toLowerCase())
                            ).length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground text-sm italic">
                                        No available officers found
                                    </div>
                                )}
                        </div>
                    </div>
                </div>
            )}

            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
                    <div className="glass w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 p-4 sm:p-6 space-y-4 custom-scrollbar">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-white">Add New Site</h3>
                            <button onClick={() => setIsAddModalOpen(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase">Site Name</label>
                                <input value={newName} onChange={e => setNewName(e.target.value)} type="text" className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase">Location Name</label>
                                <input value={newLocation} onChange={e => setNewLocation(e.target.value)} type="text" className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase">Organization</label>
                                <div className="flex gap-2 mt-1">
                                    <select
                                        id="org-select-add"
                                        value={selectedOrgId}
                                        onChange={e => setSelectedOrgId(e.target.value)}
                                        className="flex-1 px-4 py-2 bg-neutral-900 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50"
                                    >
                                        <option value="">Select Organization</option>
                                        {orgs?.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
                                    </select>
                                    {!organizationId && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsCreateOrgModalOpen(true);
                                            }}
                                            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
                                            title="Create New Organization"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase">Region</label>
                                <select
                                    value={newRegionId}
                                    onChange={e => setNewRegionId(e.target.value)}
                                    className="w-full mt-1 px-4 py-2 bg-neutral-900 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-white"
                                >
                                    <option value="">Select Region (Optional)</option>
                                    {((regions as any) || [])?.map((r: any) => <option key={r._id} value={r.regionId}>{r.regionName} ({r.regionId})</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground uppercase">Shift Start</label>
                                    <input value={newShiftStart} onChange={e => setNewShiftStart(e.target.value)} type="time" className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground uppercase">Shift End</label>
                                    <input value={newShiftEnd} onChange={e => setNewShiftEnd(e.target.value)} type="time" className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 relative">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-medium text-muted-foreground uppercase">Latitude</label>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleGetCurrentLocation("new")}
                                                className="text-[10px] text-primary hover:underline flex items-center gap-1"
                                            >
                                                <MapPin className="w-2.5 h-2.5" />
                                                Current
                                            </button>
                                            <button
                                                onClick={() => setShowMapPicker(!showMapPicker)}
                                                className="text-[10px] text-primary hover:underline flex items-center gap-1"
                                            >
                                                Pick Map
                                            </button>
                                        </div>
                                    </div>
                                    <input value={newLat} onChange={e => setNewLat(e.target.value)} type="number" step="any" className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground uppercase">Longitude</label>
                                    <input value={newLng} onChange={e => setNewLng(e.target.value)} type="number" step="any" className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50" />
                                </div>
                            </div>
                            {showMapPicker && (
                                <MapPicker
                                    onLocationSelect={(lat, lng) => {
                                        setNewLat(lat.toString());
                                        setNewLng(lng.toString());
                                    }}
                                />
                            )}
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase">Allowed Radius (m)</label>
                                <input value={newRadius} onChange={e => setNewRadius(e.target.value)} type="number" className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50" />
                            </div>
                        </div>
                        <button onClick={handleAddSite} className="w-full py-2 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all">Create Site</button>
                    </div>
                </div>
            )}

            {editingSite && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
                    <div className="glass w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 p-4 sm:p-6 space-y-4 custom-scrollbar">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-white">Edit Site</h3>
                            <button onClick={() => setEditingSite(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase">Site Name</label>
                                <input value={editingSite.name} onChange={e => setEditingSite({ ...editingSite, name: e.target.value })} type="text" className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase">Location Name</label>
                                <input value={editingSite.locationName} onChange={e => setEditingSite({ ...editingSite, locationName: e.target.value })} type="text" className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground uppercase">Shift Start</label>
                                    <input value={editingSite.shiftStart} onChange={e => setEditingSite({ ...editingSite, shiftStart: e.target.value })} type="time" className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground uppercase">Shift End</label>
                                    <input value={editingSite.shiftEnd} onChange={e => setEditingSite({ ...editingSite, shiftEnd: e.target.value })} type="time" className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase">Organization</label>
                                <select
                                    value={editingSite.organizationId}
                                    onChange={e => setEditingSite({ ...editingSite, organizationId: e.target.value as Id<"organizations"> })}
                                    className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50"
                                >
                                    {orgs?.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase">Region</label>
                                <select
                                    value={editingSite.regionId || ""}
                                    onChange={e => setEditingSite({ ...editingSite, regionId: e.target.value })}
                                    className="w-full mt-1 px-4 py-2 bg-neutral-900 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-white"
                                >
                                    <option value="">Select Region (Optional)</option>
                                    {((regions as any) || [])?.map((r: any) => <option key={r._id} value={r.regionId}>{r.regionName} ({r.regionId})</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3 relative">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-medium text-muted-foreground uppercase">Latitude</label>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleGetCurrentLocation("edit")}
                                                className="text-[10px] text-primary hover:underline flex items-center gap-1"
                                            >
                                                <MapPin className="w-2.5 h-2.5" />
                                                Current
                                            </button>
                                            <button
                                                onClick={() => setShowEditMapPicker(!showEditMapPicker)}
                                                className="text-[10px] text-primary hover:underline flex items-center gap-1"
                                            >
                                                Pick Map
                                            </button>
                                        </div>
                                    </div>
                                    <input value={editingSite.latitude} onChange={e => setEditingSite({ ...editingSite, latitude: parseFloat(e.target.value) || 0 })} type="number" step="any" className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground uppercase">Longitude</label>
                                    <input value={editingSite.longitude} onChange={e => setEditingSite({ ...editingSite, longitude: parseFloat(e.target.value) || 0 })} type="number" step="any" className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50" />
                                </div>
                            </div>
                            {showEditMapPicker && (
                                <MapPicker
                                    initialLat={editingSite.latitude}
                                    initialLng={editingSite.longitude}
                                    onLocationSelect={(lat, lng) => {
                                        setEditingSite({ ...editingSite, latitude: lat, longitude: lng });
                                    }}
                                />
                            )}
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase">Allowed Radius (m)</label>
                                <input value={editingSite.allowedRadius} onChange={e => setEditingSite({ ...editingSite, allowedRadius: parseInt(e.target.value) || 0 })} type="number" className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50" />
                            </div>
                        </div>
                        <button onClick={handleUpdateSite} className="w-full py-2 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all">Save Changes</button>
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
                            <h3 className="text-lg font-semibold text-white">Delete Site?</h3>
                            <p className="text-sm text-muted-foreground">This action cannot be undone. All patrol points and logs associated with this site will remain in the database but the site itself will be removed.</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setIsDeletingId(null)} className="flex-1 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors">Cancel</button>
                            <button onClick={() => handleDeleteSite(isDeletingId)} className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {isCreateOrgModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md text-left">
                    <div className="glass w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 p-4 sm:p-6 space-y-4 shadow-2xl custom-scrollbar">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Building className="w-5 h-5 text-primary" />
                                New Organization
                            </h3>
                            <button onClick={() => setIsCreateOrgModalOpen(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Organization Name</label>
                                <input
                                    autoFocus
                                    value={newOrgName}
                                    onChange={e => setNewOrgName(e.target.value)}
                                    placeholder="e.g. Acme Security Corp"
                                    type="text"
                                    className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleCreateOrg}
                            disabled={!newOrgName}
                            className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
                        >
                            Create & Select
                        </button>
                    </div>
                </div>
            )}
        </Layout>
    );
}


function SiteOfficersList({ siteId, onRemove }: { siteId: Id<"sites">, onRemove: (id: Id<"users">) => void }) {
    const rawOfficers = useQuery(api.users.listBySite, { siteId });
    const officers = rawOfficers?.filter(u => u.siteIds?.includes(siteId));

    if (officers === undefined) return <div className="text-xs text-muted-foreground italic">Loading officers...</div>;
    if (officers.length === 0) return <div className="text-xs text-muted-foreground italic">No officers assigned to this site.</div>;

    return (
        <div className="flex flex-wrap gap-2">
            {officers.map(officer => (
                <div key={officer._id} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10 group/item">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                        {officer.name.charAt(0)}
                    </div>
                    <div>
                        <div className="text-xs font-medium text-white">{officer.name}</div>
                        <div className="text-[10px] text-muted-foreground">{officer.role}</div>
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove(officer._id);
                        }}
                        className="p-1 hover:bg-red-500/10 rounded text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover/item:opacity-100"
                        title="Remove Officer"
                    >
                        <UserMinus className="w-3 h-3" />
                    </button>
                </div>
            ))}
        </div>
    );
}
