"use client";

import dynamic from "next/dynamic";
import { ShieldCheck } from "lucide-react";

const SignIn = dynamic(
    () => import("@clerk/nextjs").then((mod) => mod.SignIn),
    { ssr: false }
);

export default function Login() {
    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
            </div>

            <div className="w-full max-w-[440px] z-10 space-y-8">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="p-3 bg-white/5 rounded-2xl border border-white/10 shadow-2xl">
                        <ShieldCheck className="w-12 h-12 text-primary" />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold text-white tracking-tight">Security OS</h1>
                        <p className="text-gray-400">Enterprise Security Management System</p>
                    </div>
                </div>

                <div className="glass rounded-[32px] border border-white/10 shadow-2xl overflow-hidden">
                    <SignIn
                        forceRedirectUrl="/dashboard"
                        fallbackRedirectUrl="/dashboard"
                        signUpForceRedirectUrl="/dashboard"
                    />
                </div>

                <p className="text-center text-gray-500 text-sm">
                    Protected by high-level encryption & Clerk security.
                </p>
            </div>
        </div>
    );
}