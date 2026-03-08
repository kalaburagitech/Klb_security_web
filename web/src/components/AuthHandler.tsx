import React, { useEffect, useState } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { toast } from "sonner";
import { useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AuthHandler({ children }: { children: React.ReactNode }) {
    const { user, isLoaded } = useUser();
    const { session } = useClerk();
    const navigate = useNavigate();
    const syncUser = useMutation(api.auth.getOrCreateUser);
    const logLogin = useMutation(api.loginLogs.logLogin);
    const generateToken = useAction(api.jwt.generateUserToken);
    const [isSynced, setIsSynced] = useState(false);

    useEffect(() => {
        const handleAuth = async () => {
            console.log("AuthHandler: checking status...", { isLoaded, hasUser: !!user, isSynced });
            if (isLoaded && user && !isSynced) {
                try {
                    console.log("AuthHandler: syncing user with Convex...", user.id);
                    const convexUser = await syncUser({
                        clerkId: user.id,
                        name: user.fullName || user.username || "Unknown",
                        email: user.primaryEmailAddress?.emailAddress || "",
                    });

                    if (convexUser) {
                        console.log("AuthHandler: user synced, generating token...", convexUser._id);
                        const token = await generateToken({
                            userId: convexUser._id,
                            email: convexUser.email || "",
                            role: convexUser.role,
                            permissions: convexUser.permissions,
                        });

                        console.log("AuthHandler: token generated, storing in localStorage");
                        localStorage.setItem("auth_token", token);

                        await logLogin({
                            userId: convexUser._id,
                            email: user.primaryEmailAddress?.emailAddress || "",
                            sessionId: session?.id,
                            browserInfo: navigator.userAgent,
                            loginStatus: "success",
                        });

                        console.log("AuthHandler: sync complete");
                        setIsSynced(true);

                        if (convexUser.role === "NEW_USER" && window.location.pathname !== "/restricted") {
                            console.log("AuthHandler: redirecting to restricted access");
                            navigate("/restricted");
                        }
                    } else {
                        console.error("AuthHandler: syncUser returned null");
                        toast.error("User synchronization failed: no user data returned.");
                    }
                } catch (error: any) {
                    console.error("AuthHandler: sync failed error:", error);
                    toast.error(`Authentication sync error: ${error.message || "Unknown error"}`);
                }
            }
        };

        handleAuth();
    }, [isLoaded, user, isSynced, syncUser, logLogin, generateToken, session, navigate]);

    if (!isLoaded || (user && !isSynced)) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-black gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-gray-400 font-medium tracking-tight">Securing Session...</p>
            </div>
        );
    }

    return <>{children}</>;
}
