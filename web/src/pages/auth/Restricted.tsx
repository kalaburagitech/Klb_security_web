import { useClerk } from "@clerk/clerk-react";
import { ShieldAlert, LogOut } from "lucide-react";

export default function Restricted() {
    const { signOut } = useClerk();

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="max-w-md w-full glass p-8 rounded-3xl border border-white/10 text-center space-y-6">
                <div className="flex justify-center">
                    <div className="p-4 bg-red-500/10 rounded-full">
                        <ShieldAlert className="w-12 h-12 text-red-500" />
                    </div>
                </div>
                
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-white">Access Restricted</h1>
                    <p className="text-gray-400">
                        Your account is currently not authorized to access the system. 
                        Please contact the administrator to activate your account.
                    </p>
                </div>

                <button
                    onClick={() => signOut()}
                    className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all flex items-center justify-center gap-2 group"
                >
                    <LogOut className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                    Sign Out
                </button>
            </div>
        </div>
    );
}
