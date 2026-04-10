import { Layout } from "../../../components/Layout";
import { 
  ShieldCheck, 
  MapPin, 
  Clock, 
  ClipboardList, 
  TrendingUp,
  LayoutDashboard
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../services/convex";
import { useState } from "react";
import { cn } from "../../../lib/utils";
import type { Id } from "../../../../convex/_generated/dataModel";
import { SiteSelector } from "../../../components/SiteSelector";

interface MonitoringDashboardProps {
  userId: Id<"users">;
}

export default function MonitoringDashboard({ userId }: MonitoringDashboardProps) {
  const [selectedSiteId, setSelectedSiteId] = useState<string>("all");
  
  const dashboardData = useQuery(
    api.clientDashboard.getClientDashboardData, 
    { userId, siteIds: (selectedSiteId === "all" || !selectedSiteId) ? undefined : [selectedSiteId as Id<"sites">] }
  );

  if (!dashboardData) {
    return (
      <Layout title="Monitoring Dashboard">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-pulse flex flex-col items-center gap-4">
             <LayoutDashboard className="w-12 h-12 text-primary/20" />
             <p className="text-muted-foreground font-medium">Loading command center...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const { organizationName, assignedSites, attendance, patrolLogs, visitLogs } = dashboardData;

  return (
    <Layout title={`${organizationName} • Monitoring`}>
      <div className="space-y-8 pb-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/5 border border-white/10 p-6 rounded-3xl glass shadow-2xl relative z-[100]">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{organizationName}</h1>
            <p className="text-muted-foreground text-sm mt-1">Real-time site monitoring and security reports</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="min-w-[200px]">
              <SiteSelector
                organizationId={dashboardData.assignedSites[0]?.organizationId}
                selectedSiteId={selectedSiteId === "all" ? "" : selectedSiteId}
                onSiteChange={(id) => setSelectedSiteId(id || "all")}
                requestingUserId={userId}
                allOptionLabel="All Sites"
              />
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard 
            label="Daily Patrols" 
            value={patrolLogs.length} 
            icon={ShieldCheck} 
            color="text-amber-400" 
            bg="bg-amber-400/10" 
          />
          <StatCard 
            label="Visit Reports" 
            value={visitLogs.length} 
            icon={ClipboardList} 
            color="text-emerald-400" 
            bg="bg-emerald-400/10" 
          />
          <StatCard 
            label="Today's Attendance" 
            value={attendance.length} 
            icon={Clock} 
            color="text-blue-400" 
            bg="bg-blue-400/10" 
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Recent Patrols */}
          <DataSection 
            title="Recent Patrol Activity" 
            icon={ShieldCheck} 
            color="text-amber-400"
          >
            {patrolLogs.length > 0 ? (
              <div className="space-y-4">
                {patrolLogs.slice(0, 10).map((log: any) => (
                  <ActivityItem 
                    key={log._id}
                    title={log.userName}
                    subtitle={`${log.siteName} • ${log.pointName || "General"}`}
                    time={new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  />
                ))}
              </div>
            ) : (
              <EmptyState message="No recent patrol activity" />
            )}
          </DataSection>

          {/* Recent Attendance */}
          <DataSection 
            title="Recent Attendance" 
            icon={Clock} 
            color="text-blue-400"
          >
            {attendance.length > 0 ? (
              <div className="space-y-4">
                {attendance.slice(0, 10).map((log: any) => (
                  <ActivityItem 
                    key={log._id}
                    title={log.name}
                    subtitle={`${log.siteName || "Unknown"} • ${log.status}`}
                    time={log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "No In"}
                  />
                ))}
              </div>
            ) : (
              <EmptyState message="No recent attendance" />
            )}
          </DataSection>

          {/* Recent Visits (Full Width potentially, or in grid) */}
          <div className="xl:col-span-2">
            <DataSection 
              title="Recent Visit Reports" 
              icon={ClipboardList} 
              color="text-emerald-400"
            >
              {visitLogs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {visitLogs.slice(0, 10).map((log: any) => (
                    <ActivityItem 
                      key={log._id}
                      title={log.userName}
                      subtitle={`${log.siteName} • ${log.visitType || "General Visit"}`}
                      time={new Date(log.createdAt).toLocaleDateString()}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState message="No recent visit reports" />
              )}
            </DataSection>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ label, value, icon: Icon, color, bg }: any) {
  return (
    <div className="glass p-6 rounded-3xl border border-white/10 hover:border-primary/50 transition-all group relative overflow-hidden">
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
      <div className="flex items-center gap-4 relative z-10">
        <div className={cn("p-4 rounded-2xl", bg, color)}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{label}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
        </div>
      </div>
    </div>
  );
}

function DataSection({ title, icon: Icon, color, children }: any) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 lg:p-8 glass shadow-xl">
      <div className="flex items-center gap-3 mb-8">
        <div className={cn("p-2 rounded-xl bg-white/5", color)}>
          <Icon className="w-5 h-5" />
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function ActivityItem({ title, subtitle, time }: any) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
          {title[0]}
        </div>
        <div>
          <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{title}</p>
          <p className="text-[10px] text-muted-foreground uppercase mt-1">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
         <Clock className="w-3 h-3" />
         <span className="text-[10px] font-medium">{time}</span>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-12 flex flex-col items-center justify-center text-center opacity-50">
      <TrendingUp className="w-8 h-8 text-muted-foreground/30 mb-2" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
