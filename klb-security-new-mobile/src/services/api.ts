import axios from 'axios';
import { Platform } from 'react-native';

// Update this single URL to your production endpoint (e.g. Render) before building
// For local development, use your computer's local IP address.
export const API_URL = 'http://10.133.65.251:3000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const authService = {
    sendOtp: (mobileNumber: string) => api.post('/auth/otp', { mobileNumber }),
    verifyOtp: (mobileNumber: string, otp: string) => api.post('/auth/verify', { mobileNumber, otp }),
};

export const userService = {
    getUsers: () => api.get('/users'),
    getUserByClerkId: (clerkId: string) => api.get(`/users/${clerkId}`),
    createUser: (userData: any) => api.post('/users', userData),
};

export const siteService = {
    getSitesByOrg: (orgId: string) => api.get(`/sites/org/${orgId}`),
    getSitesByIds: (ids: string[]) => api.post('/sites/list', { ids }),
    getSitesByUser: (userId: string) => api.get(`/sites/user/${userId}`),
    getAllSites: () => api.get('/sites/all'),
    getSiteById: (id: string) => api.get(`/sites/${id}`),
};

export const pointService = {
    getPointsByOrg: (orgId: string) => api.get(`/points/org/${orgId}`),
    getPointsBySite: (siteId: string) => api.get(`/points/site/${siteId}`),
    createPoint: (pointData: any) => api.post('/points', pointData),
    updatePoint: (pointData: any) => api.put(`/points/${pointData.id}`, pointData),
};

export const logService = {
    getPatrolLogs: (orgId: string, siteId?: string) =>
        api.get(`/logs/patrol/org/${orgId}${siteId ? `?siteId=${siteId}` : ''}`),
    getPatrolLogsByUser: (userId: string) => api.get(`/logs/patrol/user/${userId}`),
    getVisitLogs: (orgId: string) => api.get(`/logs/visit/org/${orgId}`),
    getVisitLogsByUser: (userId: string) => api.get(`/logs/visit/user/${userId}`),
    createPatrolLog: (logData: any) => api.post('/logs/patrol', logData),
    createDualLog: (logData: any) => api.post('/logs/dual', logData),
    validatePatrolPoint: (siteId: string, qrCodeId: string, userLat: number, userLon: number, guardId: string) =>
        api.post('/logs/validate-point', { siteId, qrCodeId, userLat, userLon, guardId }),
    updateSessionPoints: (sessionId: string, pointId: string) => api.post('/logs/session/points/update', { sessionId, pointId }),
    endSession: (sessionId: string) => api.post(`/logs/session/${sessionId}/end`),
};

/**
 * Helper to convert a Convex storageId (assetId) to a public display URL.
 * Returns null if storageId is falsy or on error.
 */
export const uploadService = {
    getImageUrl: async (storageId: string): Promise<string | null> => {
        try {
            const res = await api.get(`/upload/url/${encodeURIComponent(storageId)}`);
            return res.data?.url ?? null;
        } catch {
            return null;
        }
    },
};

export default api;
