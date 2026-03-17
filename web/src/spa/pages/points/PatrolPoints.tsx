import { useState } from "react";
import { Layout } from "../../../components/Layout";
import { Plus, Search, MapPin, Printer, X, Trash2, Loader2, Edit2 } from "lucide-react";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "../../../services/convex";
import type { Id } from "../../../../convex/_generated/dataModel";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { SearchableSitePicker } from "../../../components/SearchableSitePicker";

const ITEMS_PER_PAGE = 12;

export default function PatrolPoints() {
    const { user } = useUser();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSiteId, setSelectedSiteId] = useState<string>("all");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newName, setNewName] = useState("");
    const [newSiteId, setNewSiteId] = useState<string>("");
    const [newLat, setNewLat] = useState("");
    const [newLng, setNewLng] = useState("");
    const [isDetecting, setIsDetecting] = useState(false);
    const [editingPoint, setEditingPoint] = useState<any | null>(null);
    const [isDeletingId, setIsDeletingId] = useState<Id<"patrolPoints"> | null>(null);
    const [isBatchMode, setIsBatchMode] = useState(false);
    const [batchCount, setBatchCount] = useState("10");

    // Fetch user details to get organizationId
    const currentUser = useQuery(api.users.getByClerkId,
        user?.id ? { clerkId: user.id } : "skip"
    );
    const organizationId = currentUser?.organizationId;
    const selectedOrgId = localStorage.getItem('selectedOrgId') as Id<"organizations">;

    const orgIdToUse = organizationId || selectedOrgId;

    const isOwner = currentUser?.role === "Owner";

    const { results: points, status, loadMore } = usePaginatedQuery(
        api.patrolPoints.searchPoints,
        (isOwner || orgIdToUse) ? {
            organizationId: isOwner ? undefined : (orgIdToUse as Id<"organizations">),
            siteId: selectedSiteId === "all" ? undefined : selectedSiteId as Id<"sites">,
            searchQuery: searchQuery
        } : "skip",
        { initialNumItems: ITEMS_PER_PAGE }
    );

    const createPoint = useMutation(api.patrolPoints.createPoint);
    const createBatchPoints = useMutation(api.patrolPoints.createBatchPoints);
    const updatePoint = useMutation(api.patrolPoints.updatePoint);
    const deletePoint = useMutation(api.patrolPoints.removePoint);

    const handleAddPoint = async () => {
        if (!newName || !newSiteId || !orgIdToUse || !newLat || !newLng) {
            toast.error("Please fill in all fields (including coordinates)");
            return;
        }

        try {
            if (isBatchMode) {
                const count = parseInt(batchCount);
                if (isNaN(count) || count < 1 || count > 50) {
                    toast.error("Please enter a valid count between 1 and 50");
                    return;
                }
                await createBatchPoints({
                    baseName: newName,
                    siteId: newSiteId as Id<"sites">,
                    count: count,
                    latitude: parseFloat(newLat),
                    longitude: parseFloat(newLng),
                    organizationId: orgIdToUse,
                });
            } else {
                await createPoint({
                    name: newName,
                    siteId: newSiteId as Id<"sites">,
                    latitude: parseFloat(newLat),
                    longitude: parseFloat(newLng),
                    organizationId: orgIdToUse,
                });
            }
            setIsAddModalOpen(false);
            setNewName("");
            setNewSiteId("");
            setNewLat("");
            setNewLng("");
            setIsBatchMode(false);
            setBatchCount("10");
            toast.success(isBatchMode ? `Generated ${batchCount} patrol points` : "Patrol point created successfully");
        } catch (error) {
            toast.error("Failed to create patrol point");
        }
    };

    const handleUpdatePoint = async () => {
        if (!editingPoint) return;

        const lat = parseFloat(editingPoint.latitude);
        const lng = parseFloat(editingPoint.longitude);

        if (isNaN(lat) || isNaN(lng)) {
            toast.error("Valid Latitude and Longitude are required");
            return;
        }

        try {
            await updatePoint({
                id: editingPoint._id,
                name: editingPoint.name,
                siteId: editingPoint.siteId as Id<"sites">,
                latitude: lat,
                longitude: lng,
                qrCode: editingPoint.qrCode
            });
            setEditingPoint(null);
            toast.success("Patrol point updated successfully");
        } catch (error: any) {
            console.error("Update error:", error);
            toast.error(error.message || "Failed to update patrol point");
        }
    };

    const detectLocation = () => {
        setIsDetecting(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setNewLat(pos.coords.latitude.toString());
                setNewLng(pos.coords.longitude.toString());
                setIsDetecting(false);
                toast.success("Current location captured!");
            },
            (err) => {
                toast.error("Failed to get location: " + err.message);
                setIsDetecting(false);
            }
        );
    };

    const handleDeletePoint = async (id: Id<"patrolPoints">) => {
        try {
            await deletePoint({ id });
            setIsDeletingId(null);
            toast.success("Point deleted successfully");
        } catch (error) {
            toast.error("Failed to delete point");
        }
    };

    const handlePrintAll = () => {
        if (!points || points.length === 0) {
            toast.error("No points to print");
            return;
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const pointsHtml = points.map((point: any) => {
            const qrSvg = document.getElementById(`qr-${point._id}`)?.querySelector('svg')?.outerHTML;
            return `
                <div class="qr-page">
                    <div class="container">
                        ${qrSvg}
                        <h1>${point.siteName}_${point.name}</h1>
                        <p>ID: ${point.qrCode}</p>
                    </div>
                </div>
            `;
        }).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Print QR Batch</title>
                    <style>
                        body { margin: 0; padding: 0; }
                        .qr-page { 
                            display: flex; 
                            flex-direction: column; 
                            align-items: center; 
                            justify-content: center; 
                            height: 100vh; 
                            width: 100vw;
                            font-family: sans-serif; 
                            page-break-after: always;
                        }
                        .container { 
                            border: 2px solid #000; 
                            padding: 40px; 
                            border-radius: 20px; 
                            text-align: center;
                            width: 80%;
                            max-width: 500px;
                        }
                        h1 { margin-top: 20px; font-size: 28px; word-break: break-all; }
                        p { color: #666; margin-bottom: 30px; font-size: 14px; word-break: break-all; }
                        svg { width: 350px !important; height: 350px !important; }
                        @media print {
                            .qr-page { height: 100vh; width: 100vw; }
                        }
                    </style>
                </head>
                <body>
                    ${pointsHtml}
                    <script>window.onload = () => { window.print(); window.close(); }</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <Layout title="Patrol QR Points">
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search by name or QR..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                            />
                        </div>
                        {orgIdToUse && (
                            <SearchableSitePicker
                                organizationId={orgIdToUse as Id<"organizations">}
                                selectedSiteId={selectedSiteId}
                                onSelect={setSelectedSiteId}
                                className="w-full md:w-64"
                            />
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {points && points.length > 0 && (
                            <button
                                onClick={handlePrintAll}
                                className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-all text-white/70"
                                title="Print all filtered QR codes"
                            >
                                <Printer className="w-4 h-4" />
                                Print All
                            </button>
                        )}
                        <button
                            onClick={() => {
                                setIsBatchMode(true);
                                setBatchCount("10");
                                setIsAddModalOpen(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold hover:bg-white/10 transition-all text-white/70"
                        >
                            <Plus className="w-4 h-4 text-primary" />
                            Generate 10 QR
                        </button>
                        <button
                            onClick={() => {
                                setIsBatchMode(false);
                                setIsAddModalOpen(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                        >
                            <Plus className="w-4 h-4" />
                            Generate New QR
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {status === "LoadingFirstPage" ? (
                        <div className="col-span-full flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        </div>
                    ) : (
                        <>
                            {points?.map((point: any) => (
                                <div key={point._id} className="glass p-6 rounded-2xl border border-white/10 group hover:border-primary/50 transition-all relative">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-4 rounded-xl bg-white flex items-center justify-center border border-white/10 overflow-hidden" id={`qr-${point._id}`}>
                                            <QRCodeSVG value={point.qrCode} size={100} level="H" />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={() => setEditingPoint({ ...point })}
                                                className="p-2 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-primary transition-colors"
                                                title="Edit Point"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const qrSvg = document.getElementById(`qr-${point._id}`)?.querySelector('svg')?.outerHTML;
                                                    const printWindow = window.open('', '_blank');
                                                    if (!printWindow) return;
                                                    printWindow.document.write(`
                                                        <html>
                                                            <head>
                                                                <title>Print QR - ${point.name}</title>
                                                                <style>
                                                                    body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; margin: 0; }
                                                                    .container { border: 2px solid #000; padding: 40px; border-radius: 20px; text-align: center; max-width: 500px; width: 80%; }
                                                                    h1 { margin-top: 20px; font-size: 28px; word-break: break-all; }
                                                                    p { color: #666; margin-bottom: 30px; font-size: 14px; word-break: break-all; }
                                                                    svg { width: 350px !important; height: 350px !important; }
                                                                </style>
                                                            </head>
                                                            <body>
                                                                <div class="container">
                                                                    ${qrSvg}
                                                                    <h1>${point.siteName}_${point.name}</h1>
                                                                    <p>ID: ${point.qrCode}</p>
                                                                </div>
                                                                <script>window.onload = () => { window.print(); window.close(); }</script>
                                                            </body>
                                                        </html>
                                                    `);
                                                    printWindow.document.close();
                                                }}
                                                className="p-2 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-white transition-colors"
                                                title="Print QR Code"
                                            >
                                                <Printer className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setIsDeletingId(point._id)}
                                                className="p-2 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-red-500 transition-colors"
                                                title="Delete Point"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <h5 className="text-lg font-bold text-white/90">
                                        {point.siteName}_{point.name}
                                    </h5>
                                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                        <MapPin className="w-3.5 h-3.5" />
                                        {point.siteName}
                                    </div>
                                    <div className="mt-6 p-3 bg-white/5 rounded-xl border border-dashed border-white/10 text-center">
                                        <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest break-all">Point ID: {point.qrCode}</span>
                                    </div>
                                </div>
                            ))}
                            {points?.length === 0 && (
                                <div className="col-span-full text-center py-20 text-muted-foreground italic">
                                    No patrol points found. Click "Generate New QR" to create one.
                                </div>
                            )}

                            {status === "CanLoadMore" && (
                                <div className="col-span-full flex justify-center py-8">
                                    <button
                                        onClick={() => loadMore(ITEMS_PER_PAGE)}
                                        className="px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors text-white/70"
                                    >
                                        Load More Points
                                    </button>
                                </div>
                            )}
                            {status === "LoadingMore" && (
                                <div className="col-span-full flex justify-center py-8">
                                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
                    <div className="glass w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 p-4 sm:p-6 space-y-4 custom-scrollbar">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-white">Generate Patrol QR</h3>
                            <button onClick={() => setIsAddModalOpen(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">Assigned Site</label>
                                {orgIdToUse && (
                                    <SearchableSitePicker
                                        organizationId={orgIdToUse}
                                        selectedSiteId={newSiteId}
                                        onSelect={setNewSiteId}
                                    />
                                )}
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-medium text-muted-foreground uppercase">Point Name {isBatchMode && "Prefix"}</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-muted-foreground uppercase">Batch Mode</span>
                                        <button
                                            onClick={() => setIsBatchMode(!isBatchMode)}
                                            className={`w-8 h-4 rounded-full transition-colors relative ${isBatchMode ? 'bg-primary' : 'bg-white/10'}`}
                                        >
                                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${isBatchMode ? 'left-4.5' : 'left-0.5'}`} />
                                        </button>
                                    </div>
                                </div>
                                <input
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    placeholder={isBatchMode ? "e.g. Patrol Point" : "e.g. Main Transformer"}
                                    className="w-full px-4 py-2.5 bg-neutral-900 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-white"
                                />
                            </div>
                            {isBatchMode && (
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">Number of QR Codes (1-50)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={batchCount}
                                        onChange={e => setBatchCount(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-neutral-900 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-white"
                                    />
                                </div>
                            )}
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase mb-1 block flex justify-between">
                                    Precise GPS Location
                                    <button
                                        onClick={detectLocation}
                                        disabled={isDetecting}
                                        className="text-primary hover:text-primary/80 transition-colors lowercase"
                                    >
                                        {isDetecting ? "Detecting..." : "Detect Current Location"}
                                    </button>
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="number"
                                        step="any"
                                        value={newLat}
                                        onChange={e => setNewLat(e.target.value)}
                                        placeholder="Latitude"
                                        className="w-full px-4 py-2.5 bg-neutral-900 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-white text-sm"
                                    />
                                    <input
                                        type="number"
                                        step="any"
                                        value={newLng}
                                        onChange={e => setNewLng(e.target.value)}
                                        placeholder="Longitude"
                                        className="w-full px-4 py-2.5 bg-neutral-900 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-white text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleAddPoint}
                            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg"
                        >
                            Generate Point
                        </button>
                    </div>
                </div>
            )}

            {editingPoint && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
                    <div className="glass w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 p-4 sm:p-6 space-y-4 custom-scrollbar">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-white">Edit Patrol Point</h3>
                            <button onClick={() => setEditingPoint(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">Assigned Site</label>
                                {orgIdToUse && (
                                    <SearchableSitePicker
                                        organizationId={orgIdToUse}
                                        selectedSiteId={editingPoint.siteId}
                                        onSelect={sId => setEditingPoint({ ...editingPoint, siteId: sId })}
                                    />
                                )}
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">Point Name</label>
                                <input
                                    value={editingPoint.name}
                                    onChange={e => setEditingPoint({ ...editingPoint, name: e.target.value })}
                                    placeholder="e.g. Main Transformer"
                                    className="w-full px-4 py-2.5 bg-neutral-900 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">Reference QR Code</label>
                                <input
                                    value={editingPoint.qrCode}
                                    readOnly
                                    className="w-full px-4 py-2.5 bg-neutral-900/50 border border-white/10 rounded-xl text-muted-foreground font-mono text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase mb-1 block flex justify-between">
                                    GPS Coordinates
                                    <button
                                        onClick={() => {
                                            navigator.geolocation.getCurrentPosition(
                                                (pos) => setEditingPoint({ ...editingPoint, latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
                                                (err) => toast.error("Failed: " + err.message)
                                            );
                                        }}
                                        className="text-primary hover:text-primary/80 transition-colors lowercase"
                                    >
                                        Use Current
                                    </button>
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="number"
                                        step="any"
                                        value={editingPoint.latitude}
                                        onChange={e => setEditingPoint({ ...editingPoint, latitude: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-neutral-900 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-white text-sm"
                                    />
                                    <input
                                        type="number"
                                        step="any"
                                        value={editingPoint.longitude}
                                        onChange={e => setEditingPoint({ ...editingPoint, longitude: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-neutral-900 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-white text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleUpdatePoint}
                            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            )}

            {isDeletingId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="glass w-full max-w-sm rounded-2xl border border-white/10 p-6 space-y-4 text-center">
                        <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                            <Trash2 className="w-6 h-6 text-red-500" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-white">Delete QR Point?</h3>
                            <p className="text-sm text-muted-foreground">All patrol logs associated with this point will remain, but the point will be removed.</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setIsDeletingId(null)} className="flex-1 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10">Cancel</button>
                            <button onClick={() => handleDeletePoint(isDeletingId)} className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
