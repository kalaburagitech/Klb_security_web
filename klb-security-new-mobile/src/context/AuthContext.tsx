import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CustomUser {
    _id: string;
    name: string;
    email?: string;
    role: string;
    organizationId: string;
    siteId?: string;
    siteIds?: string[];
    regionId?: string;
    city?: string;
}

interface AuthContextType {
    isCustomSignedIn: boolean;
    customUser: CustomUser | null;
    userId: string | null;
    organizationId: string | null;
    login: (user: CustomUser) => Promise<void>;
    logout: () => Promise<void>;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [customUser, setCustomUser] = useState<CustomUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadStorageData();
    }, []);

    const loadStorageData = async () => {
        try {
            const storedUser = await AsyncStorage.getItem('custom_user');
            if (storedUser) {
                setCustomUser(JSON.parse(storedUser));
            }
        } catch (e) {
            console.error('Failed to load auth state', e);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (user: CustomUser) => {
        try {
            await AsyncStorage.setItem('custom_user', JSON.stringify(user));
            setCustomUser(user);
        } catch (e) {
            console.error('Failed to save auth state', e);
        }
    };

    const logout = async () => {
        try {
            if (customUser?._id) {
                try {
                    // Temporarily disabling backend logout log because we removed convex imports from mobile
                    console.log("Logged out user", customUser._id);
                } catch (err) {
                    console.error('Failed to log logout', err);
                }
            }
            await AsyncStorage.removeItem('custom_user');
            const store = require('../store/usePatrolStore').usePatrolStore;
            store.getState().setLastSelection(null, null);
            store.getState().clearLastScannedPoints();
            setCustomUser(null);
        } catch (e) {
            console.error('Failed to clear auth state', e);
        }
    };

    return (
        <AuthContext.Provider value={{
            isCustomSignedIn: !!customUser,
            customUser,
            userId: customUser?._id || null,
            organizationId: customUser?.organizationId || null,
            login,
            logout,
            isLoading
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useCustomAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useCustomAuth must be used within an AuthProvider');
    }
    return context;
};
