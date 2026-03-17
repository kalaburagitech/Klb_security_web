import { Layout } from "../../../components/Layout";
import { User, Bell, Shield, Smartphone, Building2, Save, Globe, Lock } from "lucide-react";
import { cn } from "../../../lib/utils";

export default function Settings() {
  return (
    <Layout title="Settings">
      <div className="max-w-4xl space-y-8 pb-12">
        {/* Header Section */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-white tracking-tight">System Settings</h1>
          <p className="text-muted-foreground text-sm">
            Manage your organization profile, notifications, and security preferences.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Navigation Sidebar */}
          <aside className="lg:col-span-1 space-y-1">
            <nav className="flex flex-col gap-1">
              {[
                { name: "Profile", icon: User, active: true },
                { name: "Organization", icon: Building2 },
                { name: "Notifications", icon: Bell },
                { name: "Security", icon: Shield },
                { name: "Mobile App", icon: Smartphone },
                { name: "Language", icon: Globe },
              ].map((item) => (
                <button
                  key={item.name}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                    item.active
                      ? "bg-primary/20 text-primary border border-primary/20 shadow-[0_4px_12px_rgba(37,99,235,0.1)]"
                      : "text-muted-foreground hover:bg-white/5 hover:text-white"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </button>
              ))}
            </nav>
          </aside>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Profile Section */}
            <div className="glass p-6 rounded-2xl border border-white/10 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-6 border-b border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/20 flex items-center justify-center shrink-0">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Admin Profile</h3>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
                      System Manager
                    </p>
                  </div>
                </div>
                <button className="sm:ml-auto w-full sm:w-auto px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-white hover:bg-white/10 transition-colors">
                  Change Avatar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Full Name</label>
                  <input
                    type="text"
                    defaultValue="Admin Manager"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase ml-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    defaultValue="admin@securecorp.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all opacity-50 cursor-not-allowed"
                    disabled
                  />
                </div>
              </div>
            </div>

            {/* Security Section */}
            <div className="glass p-6 rounded-2xl border border-white/10 space-y-6">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-white tracking-tight">Login Security</h3>
              </div>

              <div className="space-y-4">
                {[
                  {
                    title: "Two-Factor Authentication",
                    desc: "Add an extra layer of security to your account.",
                    enabled: true,
                  },
                  { title: "Device Logging", desc: "Track all active sessions and device IPs.", enabled: true },
                  {
                    title: "Auto-Lock Session",
                    desc: "Log out automatically after 30 minutes of inactivity.",
                    enabled: false,
                  },
                ].map((setting) => (
                  <div
                    key={setting.title}
                    className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl"
                  >
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-white/90">{setting.title}</h4>
                      <p className="text-xs text-muted-foreground">{setting.desc}</p>
                    </div>
                    <div
                      className={cn(
                        "w-10 h-5 rounded-full p-1 transition-colors cursor-pointer",
                        setting.enabled ? "bg-primary" : "bg-white/20"
                      )}
                    >
                      <div
                        className={cn(
                          "w-3 h-3 bg-white rounded-full transition-transform",
                          setting.enabled ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button className="px-6 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold text-white hover:bg-white/10 transition-colors">
                Cancel
              </button>
              <button className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
