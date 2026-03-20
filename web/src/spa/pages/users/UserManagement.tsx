import { useState } from "react";
import { Layout } from "../../../components/Layout";
import { Plus, User, Mail, Shield, Search, Loader2, Edit2, Trash2, X, Building, Smartphone } from "lucide-react";
import { cn } from "../../../lib/utils";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../services/convex";
import { useUser } from "@clerk/nextjs";
import type { Id } from "../../../../convex/_generated/dataModel";
import { toast } from "sonner";

const ROLES = ["Owner", "Deployment Manager", "Manager", "Officer", "Security Officer", "SG", "SO", "NEW_USER"] as const;
type Role = typeof ROLES[number];

export default function UserManagement() {
    const { user } = useUser();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<{ id: Id<"users">; name: string; email?: string; mobileNumber?: string; role: Role; siteIds?: Id<"sites">[]; organizationId: Id<"organizations">; regionId?: string; city?: string; permissions?: any } | null>(null);
    const [showEditCityList, setShowEditCityList] = useState(false);
    const [isDeletingId, setIsDeletingId] = useState<Id<"users"> | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [siteSearchQuery, setSiteSearchQuery] = useState("");
    const [editSiteSearchQuery, setEditSiteSearchQuery] = useState("");
    const [selectedSiteIds, setSelectedSiteIds] = useState<Id<"sites">[]>([]);

    const [newName, setNewName] = useState("");
    const [newClerkId, setNewClerkId] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newMobile, setNewMobile] = useState("");
    const [newRole, setNewRole] = useState<Role>("SO");
    const [newRegionId, setNewRegionId] = useState("");
    const [newCity, setNewCity] = useState("");
    const [showNewCityList, setShowNewCityList] = useState(true);
    const [selectedOrgId, setSelectedOrgId] = useState<string>("");
    const [isCreateOrgModalOpen, setIsCreateOrgModalOpen] = useState(false);
    const [newOrgName, setNewOrgName] = useState("");

    const [newPermissions, setNewPermissions] = useState({
        users: false,
        sites: false,
        patrolPoints: false,
        patrolLogs: true,
        visitLogs: true,
        issues: true,
        analytics: true,
    });

    const createUser = useMutation(api.users.create);
    const updateUser = useMutation(api.users.update);
    const removeUser = useMutation(api.users.remove);
    const createOrg = useMutation(api.organizations.create);

    const currentUser = useQuery(api.users.getByClerkId,
        user?.id ? { clerkId: user.id } : "skip"
    );

    const organizationId = currentUser?.organizationId;
    const orgs = useQuery(api.organizations.list);
    const regions = useQuery(api.regions.list);
    const activeOrgId = editingUser?.organizationId || selectedOrgId || organizationId;
    const sites = useQuery(api.sites.listSitesByOrg,
        activeOrgId ? { organizationId: activeOrgId as Id<"organizations"> } : "skip"
    );
    const allUsers = useQuery(api.users.listAll);
    const orgUsers = useQuery((api.users as any).listByOrg,
        organizationId ? { organizationId } : "skip"
    );

    const isSuperAdmin = currentUser?.role === "Owner" || currentUser?.role === "Deployment Manager";
    const users = isSuperAdmin ? allUsers : orgUsers;

    const filteredUsers = users?.filter((u: any) =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAddUser = async () => {
        const orgIdToUse = organizationId || selectedOrgId;
        if (!orgIdToUse || !newName) {
            toast.error("Please enter a name and select an Organization");
            return;
        }
        try {
            await createUser({
                name: newName,
                clerkId: newClerkId || undefined,
                email: newEmail || undefined,
                mobileNumber: newMobile || undefined,
                role: newRole as any,
                organizationId: orgIdToUse as Id<"organizations">,
                regionId: newRegionId || undefined,
                city: newCity || undefined,
                siteIds: selectedSiteIds.length > 0 ? selectedSiteIds : undefined,
                permissions: newPermissions
            });
            setIsAddModalOpen(false);
            setNewName("");
            setNewClerkId("");
            setNewEmail("");
            setNewMobile("");
            setNewRole("SO");
            setNewRegionId("");
            setNewCity("");
            setSelectedSiteIds([]);
            setSiteSearchQuery("");
            toast.success("User added successfully");
        } catch (error: any) {
            console.error("Failed to create user:", error);
            toast.error(error.message || "Failed to add user");
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

    const handleUpdateUser = async () => {
        if (!editingUser) return;
        try {
            await updateUser({
                id: editingUser.id,
                name: editingUser.name,
                email: editingUser.email,
                mobileNumber: editingUser.mobileNumber,
                role: editingUser.role as any,
                siteIds: editingUser.siteIds,
                organizationId: editingUser.organizationId,
                regionId: editingUser.regionId,
                city: editingUser.city,
                permissions: (editingUser as any).permissions
            });
            setEditingUser(null);
            toast.success("User updated successfully");
        } catch (error) {
            console.error("Failed to update user:", error);
            toast.error("Failed to update user");
        }
    };

    const handleDeleteUser = async (id: Id<"users">) => {
        try {
            await removeUser({ id });
            setIsDeletingId(null);
            toast.success("User deleted successfully");
        } catch (error) {
            console.error("Failed to delete user:", error);
            toast.error("Failed to delete user");
        }
    };

    if (currentUser === undefined || (organizationId && users === undefined)) {
        return (
            <Layout title="User Management">
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="User Management">
            <div className="space-y-6">
                {!currentUser || !organizationId ? (
                    <div className="space-y-6">
                        <div className="flex justify-end">
                            <button
                                onClick={() => {
                                    setNewClerkId(user?.id || "");
                                    setIsAddModalOpen(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                            >
                                <Plus className="w-4 h-4" />
                                Add User
                            </button>
                        </div>

                        <div className="glass rounded-2xl border border-white/10 p-12 text-center space-y-4">
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                                <User className="w-8 h-8 text-primary" />
                            </div>
                            <div className="max-w-md mx-auto">
                                <h3 className="text-xl font-bold text-white">Profile Not Found</h3>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Your account is authenticated but not yet registered in our system.
                                    Use the **Add User** button to create your profile or contact an administrator.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="relative group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search users..."
                                        className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 w-64 text-white"
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
                                Add User
                            </button>
                        </div>

                        <div className="glass rounded-2xl border border-white/10 overflow-hidden">
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left min-w-[700px]">
                                    <thead>
                                        <tr className="border-b border-white/5 bg-white/[0.02]">
                                            <th className="px-4 sm:px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                                            <th className="px-4 sm:px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                                            <th className="px-4 sm:px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
                                            <th className="px-4 sm:px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                                            <th className="px-4 sm:px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredUsers?.map((u: any) => (
                                            <tr key={u._id} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-4 sm:px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                                            <User className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-sm font-medium text-white/90 truncate">{u.name}</span>
                                                            <span className="text-[10px] sm:text-xs text-muted-foreground truncate">{u.clerkId}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 sm:px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <Mail className="w-3 h-3 text-primary/60" />
                                                            <span className="truncate">{u.email || "No email"}</span>
                                                        </div>
                                                        {u.mobileNumber && (
                                                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/80">
                                                                <Smartphone className="w-2.5 h-2.5" />
                                                                <span>{u.mobileNumber}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 sm:px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={cn(
                                                            "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap",
                                                            u.role === "Owner" ? "bg-red-500/10 text-red-500 border-red-500/20" :
                                                                u.role === "Deployment Manager" ? "bg-purple-500/10 text-purple-500 border-purple-500/20" :
                                                                    u.role === "Manager" ? "bg-primary/10 text-primary border-primary/20" :
                                                                        u.role === "Officer" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                                                            u.role === "Security Officer" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                                                                u.role === "NEW_USER" ? "bg-gray-500/10 text-gray-500 border-gray-500/20" :
                                                                                    "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                                        )}>
                                                            <Shield className="w-2.5 h-2.5 sm:w-3 h-3 mr-1" />
                                                            {u.role}
                                                        </span>
                                                        {u.regionId && (
                                                            <div className="text-[10px] text-muted-foreground flex flex-wrap gap-1">
                                                                <span className="font-semibold text-primary/70">{u.regionId}:</span>
                                                                <span className="text-white/80">{u.city || "No City Selected"}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 sm:px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        <span className="text-[10px] sm:text-xs text-muted-foreground">Active</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 sm:px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1 sm:gap-2">
                                                        <button
                                                            onClick={() => setEditingUser({
                                                                id: u._id,
                                                                name: u.name,
                                                                email: u.email,
                                                                mobileNumber: u.mobileNumber,
                                                                role: u.role as Role,
                                                                siteIds: u.siteIds,
                                                                organizationId: u.organizationId,
                                                                regionId: u.regionId,
                                                                permissions: u.permissions || newPermissions
                                                            })}
                                                            className="p-1.5 sm:p-2 hover:bg-white/5 rounded-lg text-muted-foreground hover:text-primary transition-colors"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5 sm:w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setIsDeletingId(u._id)}
                                                            className="p-1.5 sm:p-2 hover:bg-white/5 rounded-lg text-muted-foreground hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5 sm:w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredUsers?.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground text-sm">
                                                    No users found for this organization.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Add User Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
                    <div className="glass w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 p-4 sm:p-6 space-y-4 custom-scrollbar">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-white">Add New User</h3>
                            <button onClick={() => setIsAddModalOpen(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase">Full Name</label>
                                <input value={newName} onChange={e => setNewName(e.target.value)} type="text" className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground uppercase">Email</label>
                                    <input value={newEmail} onChange={e => setNewEmail(e.target.value)} type="email" placeholder="Optional" className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm text-white" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground uppercase">Mobile</label>
                                    <input value={newMobile} onChange={e => setNewMobile(e.target.value)} type="tel" placeholder="Optional" className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm text-white" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase">Clerk ID (Optional)</label>
                                <input value={newClerkId} onChange={e => setNewClerkId(e.target.value)} type="text" placeholder="Auto-generated if empty" className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-xs text-white" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase">Organization</label>
                                <div className="flex gap-2 mt-1">
                                    <select
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
                                            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-white"
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
                                    {regions?.map(r => <option key={r._id} value={r.regionId}>{r.regionName} ({r.regionId})</option>)}
                                </select>
                                {newRegionId && regions?.find(r => r.regionId === newRegionId) && (
                                    <div className="mt-2 space-y-2">
                                        {(!showNewCityList && newCity) ? (
                                            <div className="flex items-center justify-between bg-neutral-900/50 p-3 rounded-xl border border-white/10">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Selected City</span>
                                                    <span className="text-sm text-primary font-medium">{newCity}</span>
                                                </div>
                                                <button 
                                                    onClick={() => setShowNewCityList(true)}
                                                    className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium text-white transition-colors border border-white/10"
                                                >
                                                    Change
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="max-h-40 overflow-y-auto custom-scrollbar bg-neutral-900/50 p-3 rounded-xl border border-white/10">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Select City</label>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {regions.find(r => r.regionId === newRegionId)?.cities?.map(city => (
                                                        <label key={city} className="flex items-center gap-3 cursor-pointer group p-2 hover:bg-white/5 rounded-lg transition-colors">
                                                            <input
                                                                type="radio"
                                                                name="newCity"
                                                                value={city}
                                                                checked={newCity === city}
                                                                onChange={e => {
                                                                    setNewCity(e.target.value);
                                                                    setShowNewCityList(false);
                                                                }}
                                                                className="w-4 h-4 border-white/20 bg-white/5 text-primary focus:ring-primary/50"
                                                            />
                                                            <span className={cn(
                                                                "text-sm transition-colors",
                                                                newCity === city ? "text-primary font-medium" : "text-white/70 group-hover:text-white"
                                                            )}>{city}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase">Role</label>
                                <select value={newRole} onChange={e => setNewRole(e.target.value as Role)} className="w-full mt-1 px-4 py-2 bg-neutral-900 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50">
                                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase flex items-center justify-between">
                                    Assigned Sites
                                    {selectedSiteIds.length > 0 && <span className="text-primary font-bold">{selectedSiteIds.length} selected</span>}
                                </label>
                                <div className="mt-1 relative group mb-2">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <input 
                                        type="text" 
                                        placeholder="Search sites to assign..." 
                                        value={siteSearchQuery}
                                        onChange={e => setSiteSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-xs text-white" 
                                    />
                                </div>
                                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar bg-neutral-900/50 p-2 rounded-xl border border-white/10">
                                    {(() => {
                                        const filteredSites = sites?.filter(s => 
                                            s.name.toLowerCase().includes(siteSearchQuery.toLowerCase()) ||
                                            s.locationName.toLowerCase().includes(siteSearchQuery.toLowerCase())
                                        ) || [];

                                        return (
                                            <>
                                                {filteredSites.map(s => {
                                                    const isSelected = selectedSiteIds.includes(s._id);
                                                    return (
                                                        <button
                                                            key={s._id}
                                                            type="button"
                                                            onClick={() => {
                                                                if (isSelected) {
                                                                    setSelectedSiteIds(selectedSiteIds.filter(id => id !== s._id));
                                                                } else {
                                                                    setSelectedSiteIds([...selectedSiteIds, s._id]);
                                                                }
                                                            }}
                                                            className={cn(
                                                                "w-full flex items-center justify-between p-2 rounded-lg border transition-all text-left group",
                                                                isSelected ? "bg-primary/10 border-primary/30" : "bg-white/5 border-white/5 hover:bg-white/10"
                                                            )}
                                                        >
                                                            <div className="min-w-0">
                                                                <div className={cn("text-xs font-medium truncate", isSelected ? "text-primary" : "text-white")}>{s.name}</div>
                                                                <div className="text-[10px] text-muted-foreground truncate">{s.locationName}</div>
                                                            </div>
                                                            {isSelected ? (
                                                                <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                                                                    <Plus className="w-3 h-3 text-primary-foreground rotate-45" />
                                                                </div>
                                                            ) : (
                                                                <Plus className="w-4 h-4 text-muted-foreground group-hover:text-white" />
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                                {filteredSites.length === 0 && (
                                                    <div className="py-8 text-center">
                                                        <p className="text-xs text-muted-foreground italic">No matching sites found</p>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                            <div className="space-y-2 py-2 border-y border-white/5">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Dashboard Access</label>
                                    <button
                                        type="button"
                                        onClick={() => setNewPermissions(Object.keys(newPermissions).reduce((acc: any, key) => ({ ...acc, [key]: true }), {}))}
                                        className="text-[10px] text-primary hover:underline"
                                    >
                                        Select All
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                    {Object.entries(newPermissions).map(([key, value]) => (
                                        <label key={key} className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={value}
                                                onChange={e => setNewPermissions({ ...newPermissions, [key]: e.target.checked })}
                                                className="w-3.5 h-3.5 rounded border-white/10 bg-white/5 text-primary focus:ring-primary/50"
                                            />
                                            <span className="text-xs text-white/70 group-hover:text-white capitalize">
                                                {key.replace(/([A-Z])/g, ' $1').trim()}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <button onClick={handleAddUser} className="w-full py-2 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all">Create User</button>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
                    <div className="glass w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 p-4 sm:p-6 space-y-4 custom-scrollbar">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-white">Edit User</h3>
                            <button onClick={() => setEditingUser(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase">Full Name</label>
                                <input value={editingUser.name} onChange={e => setEditingUser({ ...editingUser, name: e.target.value })} type="text" className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground uppercase">Email</label>
                                    <input value={editingUser.email || ""} onChange={e => setEditingUser({ ...editingUser, email: e.target.value })} type="email" className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm text-white" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground uppercase">Mobile</label>
                                    <input value={editingUser.mobileNumber || ""} onChange={e => setEditingUser({ ...editingUser, mobileNumber: e.target.value })} type="tel" className="w-full mt-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm text-white" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase">Organization</label>
                                <select
                                    value={editingUser.organizationId}
                                    onChange={e => setEditingUser({ ...editingUser, organizationId: e.target.value as Id<"organizations"> })}
                                    className="w-full mt-1 px-4 py-2 bg-neutral-900 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50"
                                >
                                    {orgs?.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase">Region</label>
                                <select
                                    value={editingUser.regionId || ""}
                                    onChange={e => setEditingUser({ ...editingUser, regionId: e.target.value })}
                                    className="w-full mt-1 px-4 py-2 bg-neutral-900 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-white"
                                >
                                    <option value="">Select Region (Optional)</option>
                                    {regions?.map(r => <option key={r._id} value={r.regionId}>{r.regionName} ({r.regionId})</option>)}
                                </select>
                                {editingUser.regionId && regions?.find(r => r.regionId === editingUser.regionId) && (
                                    <div className="mt-2 space-y-2">
                                        {(!showEditCityList && editingUser.city) ? (
                                            <div className="flex items-center justify-between bg-neutral-900/50 p-3 rounded-xl border border-white/10">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Selected City</span>
                                                    <span className="text-sm text-primary font-medium">{editingUser.city}</span>
                                                </div>
                                                <button 
                                                    onClick={() => setShowEditCityList(true)}
                                                    className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium text-white transition-colors border border-white/10"
                                                >
                                                    Change
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="max-h-40 overflow-y-auto custom-scrollbar bg-neutral-900/50 p-3 rounded-xl border border-white/10">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Select City</label>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {regions.find(r => r.regionId === editingUser.regionId)?.cities?.map(city => (
                                                        <label key={city} className="flex items-center gap-3 cursor-pointer group p-2 hover:bg-white/5 rounded-lg transition-colors">
                                                            <input
                                                                type="radio"
                                                                name="editCity"
                                                                value={city}
                                                                checked={editingUser.city === city}
                                                                onChange={e => {
                                                                    setEditingUser({ ...editingUser, city: e.target.value });
                                                                    setShowEditCityList(false);
                                                                }}
                                                                className="w-4 h-4 border-white/20 bg-white/5 text-primary focus:ring-primary/50"
                                                            />
                                                            <span className={cn(
                                                                "text-sm transition-colors",
                                                                editingUser.city === city ? "text-primary font-medium" : "text-white/70 group-hover:text-white"
                                                            )}>{city}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase">Role</label>
                                <select value={editingUser.role} onChange={e => setEditingUser({ ...editingUser, role: e.target.value as Role })} className="w-full mt-1 px-4 py-2 bg-neutral-900 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50">
                                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase flex items-center justify-between">
                                    Assigned Sites
                                    {editingUser.siteIds && editingUser.siteIds.length > 0 && <span className="text-primary font-bold">{editingUser.siteIds.length} assigned</span>}
                                </label>
                                <div className="mt-1 relative group mb-2">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <input 
                                        type="text" 
                                        placeholder="Search sites to assign..." 
                                        value={editSiteSearchQuery}
                                        onChange={e => setEditSiteSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-xs text-white" 
                                    />
                                </div>
                                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar bg-neutral-900/50 p-2 rounded-xl border border-white/10">
                                    {(() => {
                                        const filteredSites = sites?.filter(s => 
                                            s.name.toLowerCase().includes(editSiteSearchQuery.toLowerCase()) ||
                                            s.locationName.toLowerCase().includes(editSiteSearchQuery.toLowerCase())
                                        ) || [];

                                        return (
                                            <>
                                                {filteredSites.map(s => {
                                                    const isSelected = editingUser.siteIds?.includes(s._id);
                                                    return (
                                                        <button
                                                            key={s._id}
                                                            type="button"
                                                            onClick={() => {
                                                                const currentSiteIds = editingUser.siteIds || [];
                                                                if (isSelected) {
                                                                    setEditingUser({ ...editingUser, siteIds: currentSiteIds.filter(id => id !== s._id) });
                                                                } else {
                                                                    setEditingUser({ ...editingUser, siteIds: [...currentSiteIds, s._id] });
                                                                }
                                                            }}
                                                            className={cn(
                                                                "w-full flex items-center justify-between p-2 rounded-lg border transition-all text-left group",
                                                                isSelected ? "bg-primary/10 border-primary/30" : "bg-white/5 border-white/5 hover:bg-white/10"
                                                            )}
                                                        >
                                                            <div className="min-w-0">
                                                                <div className={cn("text-xs font-medium truncate", isSelected ? "text-primary" : "text-white")}>{s.name}</div>
                                                                <div className="text-[10px] text-muted-foreground truncate">{s.locationName}</div>
                                                            </div>
                                                            {isSelected ? (
                                                                <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                                                                    <Plus className="w-3 h-3 text-primary-foreground rotate-45" />
                                                                </div>
                                                            ) : (
                                                                <Plus className="w-4 h-4 text-muted-foreground group-hover:text-white" />
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                                {filteredSites.length === 0 && (
                                                    <div className="py-8 text-center">
                                                        <p className="text-xs text-muted-foreground italic">No matching sites found</p>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                            <div className="space-y-2 py-2 border-y border-white/5">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Dashboard Access</label>
                                    <button
                                        type="button"
                                        onClick={() => setEditingUser({ ...editingUser!, permissions: Object.keys((editingUser as any).permissions || newPermissions).reduce((acc: any, key) => ({ ...acc, [key]: true }), {}) } as any)}
                                        className="text-[10px] text-primary hover:underline"
                                    >
                                        Select All
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                    {Object.entries((editingUser as any).permissions || newPermissions).map(([key, value]: [string, any]) => (
                                        <label key={key} className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={!!value}
                                                onChange={e => setEditingUser({ ...editingUser!, permissions: { ...((editingUser as any).permissions || newPermissions), [key]: e.target.checked } } as any)}
                                                className="w-3.5 h-3.5 rounded border-white/10 bg-white/5 text-primary focus:ring-primary/50"
                                            />
                                            <span className="text-xs text-white/70 group-hover:text-white capitalize">
                                                {key.replace(/([A-Z])/g, ' $1').trim()}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <button onClick={handleUpdateUser} className="w-full py-2 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all">Save Changes</button>
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
                            <h3 className="text-lg font-semibold text-white">Delete User?</h3>
                            <p className="text-sm text-muted-foreground">This action cannot be undone. All data associated with this user will be maintained but they will lose access.</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setIsDeletingId(null)} className="flex-1 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors text-white">Cancel</button>
                            <button onClick={() => handleDeleteUser(isDeletingId)} className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Org Modal */}
            {isCreateOrgModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md text-left">
                    <div className="glass w-full max-w-sm rounded-2xl border border-white/10 p-6 space-y-4 shadow-2xl">
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
