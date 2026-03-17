import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../services/convex";
import { Layout } from "../../../components/Layout";
import { Loader2, UserCheck, Eye, X, Image as ImageIcon } from "lucide-react";
import { cn } from "../../../lib/utils";
import { useUser } from "@clerk/nextjs";


export default function VisitLogs() {
    const { user } = useUser();
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Fetch user details to get organizationId
    const currentUser = useQuery(api.users.getByClerkId,
        user?.id ? { clerkId: user.id } : "skip"
    );
    const organizationId = currentUser?.organizationId;
    const isOwner = currentUser?.role === "Owner";

    const visitLogs = useQuery(
        isOwner ? api.logs.listAllVisitLogs : api.logs.listVisitLogs,
        isOwner ? {} : (organizationId ? { organizationId } : "skip")
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
                        <table className="w-full text-left min-w-[800px]">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Visitor / Role</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Site</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Purpose</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Time In</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
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
                                        <td className="px-6 py-4 text-right">
                                            {log.imageUrl && (
                                                <button 
                                                    onClick={() => setSelectedImage(log.imageUrl)}
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-primary hover:text-white transition-all shadow-sm active:scale-95"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                    View
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {visitLogs?.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground text-sm">
                                            No visit logs found for this organization.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Image Preview Modal */}
            {selectedImage && (
                <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setSelectedImage(null)}
                >
                    <div 
                        className="relative max-w-4xl w-full bg-neutral-900 rounded-2xl border border-white/10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                            <div className="flex items-center gap-2 text-white/90">
                                <ImageIcon className="w-4 h-4 text-primary" />
                                <span className="text-sm font-semibold">Visit Upload View</span>
                            </div>
                            <button 
                                onClick={() => setSelectedImage(null)}
                                className="p-1 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-2 bg-black/40 flex items-center justify-center min-h-[300px] max-h-[70vh]">
                            <img 
                                src={selectedImage} 
                                alt="Visit Log Attachment" 
                                className="max-w-full max-h-full object-contain rounded-lg shadow-inner"
                            />
                        </div>
                        <div className="p-4 bg-white/[0.02] border-t border-white/5 flex justify-end">
                            <button 
                                onClick={() => setSelectedImage(null)}
                                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-white hover:bg-white/10 transition-colors"
                            >
                                Close Preview
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
