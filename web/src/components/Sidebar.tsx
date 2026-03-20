import { cn } from "../lib/utils";
import {
    LayoutDashboard,
    Users,
    MapPin,
    QrCode,
    ClipboardList,
    ShieldAlert,
    BarChart3,
    Settings,
    Building2,
    Globe,
    Calendar,
    X
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../services/convex";
import { NavLink, useLocation } from "react-router-dom";

const navItems = [
    { name: "Dashboard", icon: LayoutDashboard, href: "/", permission: "analytics" },
    { name: "Users", icon: Users, href: "/users", permission: "users" },
    { name: "Organizations", icon: Building2, href: "/organizations", permission: "sites" },
    { name: "Regions", icon: Globe, href: "/regions", permission: "sites" },
    { name: "Sites", icon: MapPin, href: "/sites", permission: "sites" },
    { name: "Patrol Points", icon: QrCode, href: "/patrol-points", permission: "patrolPoints" },
    { name: "Patrol Logs", icon: ClipboardList, href: "/patrol-logs", permission: "patrolLogs" },
    { name: "Visit Logs", icon: ClipboardList, href: "/visit-logs", permission: "visitLogs" },
    { name: "Attendance", icon: Calendar, href: "/attendance", permission: "attendance" },
    { name: "Issue Tracker", icon: ShieldAlert, href: "/issues", permission: "issues" },
    { name: "Analytics", icon: BarChart3, href: "/analytics", permission: "analytics" },
];

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const { user } = useUser();
    const location = useLocation();
    const currentUser = useQuery(api.users.getByClerkId,
        user?.id ? { clerkId: user.id } : "skip"
    );

    const permissions = currentUser?.permissions;

    const filteredNavItems = navItems.filter(item => {
        if (!permissions) {
            if (currentUser?.role === "Owner") return true;
            return false;
        }
        return permissions[item.permission as keyof typeof permissions];
    });

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[50] lg:hidden"
                    onClick={onClose}
                />
            )}

            <aside className={cn(
                "fixed inset-y-0 left-0 z-[60] w-64 glass flex flex-col border-r border-white/5 transition-transform duration-300 transform lg:translate-x-0 lg:static lg:inset-auto",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="p-6 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                            <ShieldAlert className="text-primary-foreground w-5 h-5" />
                        </div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                            Security OS
                        </h1>
                    </div>
                    {onClose && (
                        <button onClick={onClose} className="lg:hidden p-1 hover:bg-white/10 rounded-lg">
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    )}
                </div>

                <nav className="flex-1 px-4 py-4 space-y-1">
                    {filteredNavItems.map((item) => (
                        <NavLink
                            key={item.name}
                            to={item.href}
                            onClick={onClose}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                                location.pathname === item.href
                                    ? "bg-primary/20 text-primary border border-primary/20 shadow-[0_0_15px_rgba(37,99,235,0.2)]"
                                    : "text-muted-foreground hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <item.icon className={cn(
                                "w-4 h-4",
                                location.pathname === item.href ? "text-primary" : "text-muted-foreground group-hover:text-white"
                            )} />
                            {item.name}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-white/5 mt-auto">
                    <NavLink
                        to="/settings"
                        onClick={onClose}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-white/5 hover:text-white"
                    >
                        <Settings className="w-4 h-4" />
                        Settings
                    </NavLink>
                </div>
            </aside>
        </>
    );
}
