import { Layout } from "../../../components/Layout";
import { 
  Users, 
  Search, 
  Calendar, 
  Filter, 
  Download, 
  CheckCircle, 
  XCircle, 
  Clock,
  MapPin,
  ChevronRight
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../services/convex";
import { cn } from "../../../lib/utils";

const formatDateStr = (date: Date) => {
  return date.toISOString().split('T')[0];
};

const formatDisplayTime = (timestamp?: number) => {
  if (!timestamp) return "--:--";
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
};

export default function AttendancePage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  
  // Queries
  const regions = useQuery(api.regions.list);
  const attendanceRecords = useQuery(api.attendance.list, { 
    date: date,
    region: selectedRegion || undefined
  });

  const filteredRecords = (attendanceRecords as any[])?.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.empId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    present: filteredRecords?.filter((r: any) => r.status === "present").length || 0,
    absent: filteredRecords?.filter((r: any) => r.status === "absent").length || 0,
    total: filteredRecords?.length || 0
  };

  return (
    <Layout title="Attendance Management">
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass p-6 rounded-2xl border border-white/10 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Staff</p>
              <h3 className="text-2xl font-bold text-white mt-1">{stats.total}</h3>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="glass p-6 rounded-2xl border border-white/10 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Present Today</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">{stats.present}</h3>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
          <div className="glass p-6 rounded-2xl border border-white/10 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Absent/On Leave</p>
              <h3 className="text-2xl font-bold text-rose-500 mt-1">{stats.absent}</h3>
            </div>
            <div className="p-3 bg-rose-500/10 rounded-xl text-rose-500">
              <XCircle className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="glass p-4 rounded-2xl border border-white/10 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or Employee ID..."
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="date"
                className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-white"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            
            <select
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-white min-w-[150px]"
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
            >
              <option value="" className="bg-[#1a1c20]">All Regions</option>
              {regions?.map((r: any) => (
                <option key={r.regionId} value={r.regionId} className="bg-[#1a1c20]">{r.regionName}</option>
              ))}
            </select>
            
            <button className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-muted-foreground">
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="glass rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Employee</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Region</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Check In</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Check Out</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredRecords?.map((record: any) => (
                <tr key={record._id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                        {record.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{record.name}</p>
                        <p className="text-xs text-muted-foreground">ID: {record.empId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">{record.region}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-white">
                      <Clock className="w-3.5 h-3.5 text-primary/60" />
                      {record.checkInTime ? formatDisplayTime(record.checkInTime) : "--:--"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-white">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      {record.checkOutTime ? formatDisplayTime(record.checkOutTime) : "--:--"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                      record.status === "present" 
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                        : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                    )}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-blue-400 font-medium">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[150px]">View Map</span>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRecords?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No attendance records found for this selection.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
