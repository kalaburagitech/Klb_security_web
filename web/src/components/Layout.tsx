import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Bell, Search, UserCircle, Menu } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../services/convex";

interface LayoutProps {
    children: React.ReactNode;
    title?: string;
}

export function Layout({ children, title = "Security Dashboard" }: LayoutProps) {
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const { user } = useUser();
    
    const currentUser = useQuery(api.users.getByClerkId, 
        user?.id ? { clerkId: user.id } : "skip"
    );
    
    const organization = useQuery(api.organizations.get, 
        currentUser?.organizationId ? { id: currentUser.organizationId } : "skip"
    );

    return (
        <div className="flex h-screen bg-background overflow-hidden relative">
            {/* Background Glow */}
            <div className="absolute top-0 left-0 w-full h-full command-center-gradient pointer-events-none" />

            <Sidebar isOpen={isMobileOpen} onClose={() => setIsMobileOpen(false)} />

            <main className="flex-1 flex flex-col min-w-0 relative">
                {/* Topbar */}
                <header className="h-16 border-b border-white/5 px-4 md:px-8 flex items-center justify-between glass z-10 sticky top-0 shrink-0">
                    <div className="flex items-center gap-2 md:gap-4">
                        <button
                            onClick={() => setIsMobileOpen(true)}
                            className="p-2 hover:bg-white/10 rounded-lg lg:hidden"
                        >
                            <Menu className="w-5 h-5 text-white" />
                        </button>
                        <h2 className="text-sm md:text-lg font-semibold tracking-tight text-white/90 truncate max-w-[150px] md:max-w-none">
                            {title}
                        </h2>
                        <div className="hidden md:flex items-center bg-white/5 rounded-full px-3 py-1 border border-white/10 ml-4 group transition-colors focus-within:border-primary/50">
                            <Search className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="bg-transparent border-none focus:outline-none text-xs px-2 py-1 w-48 text-white placeholder:text-muted-foreground"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="relative w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-muted-foreground hover:text-white">
                            < Bell className="w-4 h-4" />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full border border-background shadow-[0_0_10px_rgba(37,99,235,0.5)]" />
                        </button>
                        <div className="h-8 w-px bg-white/10" />
                        <div className="flex items-center gap-3 pl-2 cursor-pointer group">
                            <div className="text-right hidden sm:block leading-none">
                                <p className="text-xs font-semibold text-white/90 group-hover:text-white transition-colors">
                                    {currentUser?.name || user?.fullName || "User"}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                    {organization?.name || "No Organization"}
                                </p>
                            </div>
                            <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center bg-white/5 overflow-hidden group-hover:border-primary/50 transition-all">
                                {user?.imageUrl ? (
                                    <img src={user.imageUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <UserCircle className="w-5 h-5 text-muted-foreground" />
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <section className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {children}
                    </div>
                </section>
            </main>
        </div>
    );
}
