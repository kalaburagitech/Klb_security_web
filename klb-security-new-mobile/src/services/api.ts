import axios from 'axios';
import { Platform } from 'react-native';

// Update this single URL to your production endpoint (e.g. Render) before building
// For local development, use your computer's local IP address.
export const API_URL = 'http://192.168.0.108:3000/api';

// Face Recognition API URL
export const FACE_RECOGNITION_API_URL = 'https://rawly-unmeditative-isaura.ngrok-free.dev/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Face Recognition API client (uses multipart/form-data)
const faceRecognitionApi = axios.create({
    baseURL: FACE_RECOGNITION_API_URL,
    headers: {
        'accept': 'application/json',
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

export const faceRecognitionService = {
    batchEnroll: (formData: FormData) => faceRecognitionApi.post('/batch_enroll', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    }),
    recognize: (formData: FormData) => faceRecognitionApi.post('/recognize', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    }),
    checkAttendance: (params: { person_id?: number; emp_id?: string; name?: string; date?: string }) => {
        const queryParams = new URLSearchParams();
        if (params.person_id !== undefined) queryParams.append('person_id', params.person_id.toString());
        if (params.emp_id) queryParams.append('emp_id', params.emp_id);
        if (params.name) queryParams.append('name', params.name);
        if (params.date) queryParams.append('date', params.date);
        return faceRecognitionApi.get(`/attendance/check?${queryParams.toString()}`);
    },
    markAttendance: (data: {
        person_id?: number;
        emp_id?: string;
        name?: string;
        date?: string;
        status: 'present' | 'absent';
        action: 'check_in' | 'check_out';
        latitude?: number;
        longitude?: number;
        location_accuracy?: number;
    }) => {
        const formData = new URLSearchParams();
        if (data.person_id !== undefined) formData.append('person_id', data.person_id.toString());
        if (data.emp_id) formData.append('emp_id', data.emp_id);
        if (data.name) formData.append('name', data.name);
        if (data.date) formData.append('date', data.date);
        formData.append('status', data.status);
        formData.append('action', data.action);
        if (data.latitude !== undefined) formData.append('latitude', data.latitude.toString());
        if (data.longitude !== undefined) formData.append('longitude', data.longitude.toString());
        if (data.location_accuracy !== undefined) formData.append('location_accuracy', data.location_accuracy.toString());

        return faceRecognitionApi.post('/attendance/mark', formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
    },
};

export const regionService = {
    getRegions: () => api.get('/regions'),
};

export const enrollmentService = {
    create: (enrollmentData: any) => api.post('/enrollment', enrollmentData),
    list: (filters?: any) => api.get('/enrollment', { params: filters }),
};

export const attendanceService = {
    create: (attendanceData: any) => api.post('/attendance', attendanceData),
    list: (filters?: any) => api.get('/attendance', { params: filters }),
};

export default api;
