import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
// import { useQuery } from 'convex/react';
// import { api } from '../../services/convex';
import { siteService, pointService } from '../../services/api';
import { usePatrolStore } from '../../store/usePatrolStore';
import { Scan, Clock, CheckCircle, AlertTriangle, Building2, MapPin, LogOut } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useCustomAuth } from '../../context/AuthContext';
import { SiteHistoryPreview } from '../../components/SiteHistoryPreview';
import { useMutation } from 'convex/react';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isSmallScreen = SCREEN_WIDTH < 375;

export default function HomeScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const { userId, customUser, logout } = useCustomAuth();
    const [activeSession, setActiveSession] = useState<any>(null); // Still need to migrate getActiveSession
    const [sites, setSites] = useState<any[]>([]);
    const [elapsedMs, setElapsedMs] = useState(0);
    const sessionMinutes = 60;

    React.useEffect(() => {
        if (userId) {
            const fetchSites = async () => {
                try {
                    const response = await siteService.getAllSites();
                    setSites(response.data);
                } catch (error) {
                    console.error("Error fetching sites:", error);
                }
            };
            fetchSites();
        }
    }, [userId]);
    const endSession = async (options: any) => { console.log('Mocked end session', options); };
    const setSession = usePatrolStore((state) => state.setSession);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (activeSession) {
            setSession({
                id: activeSession._id,
                siteId: activeSession.siteId,
                siteName: "", // We can look this up
                startTime: activeSession.startTime,
                scannedPointIds: activeSession.scannedPoints
            });
        } else {
            setSession(null);
        }
    }, [activeSession]);

    useEffect(() => {
        if (!activeSession?.startTime) {
            setElapsedMs(0);
            return;
        }
        const tick = () => setElapsedMs(Date.now() - activeSession.startTime);
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [activeSession?.startTime]);

    const formatDuration = (ms: number) => {
        const totalSeconds = Math.max(0, Math.floor(ms / 1000));
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const remainingMs = sessionMinutes * 60 * 1000 - elapsedMs;

    const onRefresh = () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 1000);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.backgroundOrbs} pointerEvents="none">
                <View style={styles.orbA} />
                <View style={styles.orbB} />
                <View style={styles.orbC} />
            </View>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}
            >
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.greeting} numberOfLines={1} adjustsFontSizeToFit>Security Dashboard</Text>
                        <Text style={styles.subGreeting} numberOfLines={1}>Monitor and manage patrols</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity
                            onPress={() => logout()}
                            style={styles.logoutBtn}
                        >
                            <LogOut color="#ef4444" size={16} />
                            {!isSmallScreen && <Text style={styles.logoutText}>Log Out</Text>}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Active Session Status / Start Action */}
                {activeSession ? (
                    <View style={styles.activeSessionCard}>
                        <View style={styles.activeBadgeRow}>
                            <View style={styles.activeBadge}>
                                <View style={styles.pulse} />
                                <Text style={styles.activeText}>ACTIVE PATROL</Text>
                            </View>
                            <View style={styles.countdownBadge}>
                                <Clock color="#e2e8f0" size={14} />
                                <Text style={styles.countdownText}>
                                    {remainingMs >= 0 ? formatDuration(remainingMs) : `+${formatDuration(Math.abs(remainingMs))}`}
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.activeSiteTitle}>On duty at selected site</Text>
                        <View style={styles.sessionStatsRow}>
                            <View style={styles.sessionStat}>
                                <Text style={styles.sessionLabel}>Elapsed</Text>
                                <Text style={styles.sessionValue}>{formatDuration(elapsedMs)}</Text>
                            </View>
                            <View style={styles.sessionDivider} />
                            <View style={styles.sessionStat}>
                                <Text style={styles.sessionLabel}>Scans</Text>
                                <Text style={styles.sessionValue}>{activeSession.scannedPoints?.length || 0}</Text>
                            </View>
                        </View>
                        <View style={styles.activeActions}>
                            <TouchableOpacity
                                style={styles.resumeBtn}
                                onPress={() => navigation.navigate('QRScanner')}
                            >
                                <Scan color="white" size={20} />
                                <Text style={styles.resumeText}>Resume Patrol</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.stopBtn}
                                onPress={() => endSession({ sessionId: activeSession._id })}
                            >
                                <LogOut color="#ef4444" size={20} />
                                <Text style={styles.stopText}>Stop</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <View style={styles.actionContainer}>
                        <TouchableOpacity
                            style={[styles.startPatrolBar, { backgroundColor: '#0f172a', marginBottom: 12 }]}
                            onPress={() => navigation.navigate('Enrollment')}
                        >
                            <View style={[styles.startIcon, { backgroundColor: '#3b82f6' }]}>
                                <Building2 color="white" size={isSmallScreen ? 20 : 24} />
                            </View>
                            <View style={styles.startPatrolContent}>
                                <Text style={styles.startTitle} numberOfLines={1}>Enrollment</Text>
                                <Text 
                                    style={styles.startSub} 
                                    numberOfLines={3}
                                    ellipsizeMode="tail"
                                    allowFontScaling={false}
                                >
                                    {isSmallScreen ? 'Register person with face recognition' : 'Register new person with face recognition'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.startPatrolBar, { backgroundColor: '#1e1b4b', borderColor: '#312e81' }]}
                            onPress={() => navigation.navigate('MarkAttendance')}
                        >
                            <View style={[styles.startIcon, { backgroundColor: '#4338ca' }]}>
                                <CheckCircle color="white" size={isSmallScreen ? 20 : 24} />
                            </View>
                            <View style={styles.startPatrolContent}>
                                <Text style={styles.startTitle} numberOfLines={1}>Mark Attendance</Text>
                                <Text 
                                    style={[styles.startSub, { color: '#818cf8' }]} 
                                    numberOfLines={3}
                                    ellipsizeMode="tail"
                                    allowFontScaling={false}
                                >
                                    {isSmallScreen ? 'Check in or check out' : 'Check in or check out using face recognition'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Clock color="#cbd5e1" size={20} />
                        <Text style={styles.statValue}>12h</Text>
                        <Text style={styles.statLabel}>Today's Duty</Text>
                    </View>
                    <View style={styles.statCard}>
                        <CheckCircle color="#10b981" size={20} />
                        <Text style={styles.statValue}>24</Text>
                        <Text style={styles.statLabel}>Total Scans</Text>
                    </View>
                    <View style={styles.statCard}>
                        <AlertTriangle color="#f59e0b" size={20} />
                        <Text style={styles.statValue}>2</Text>
                        <Text style={styles.statLabel}>Incidents</Text>
                    </View>
                </View>

                {/* Sites List - Only for non-SG */}
                {customUser?.role !== 'SG' && (
                    <>
                        <Text style={styles.sectionTitle}>Your Assigned Sites</Text>
                        {sites?.map((site) => (
                            <TouchableOpacity
                                key={site._id}
                                onPress={() => navigation.navigate('SiteSelection', { selectedSiteId: site._id })}
                            >
                                <View style={styles.siteCard}>
                                    <View style={styles.siteMain}>
                                        <View style={styles.siteIcon}>
                                            <Building2 color="#64748b" size={24} />
                                        </View>
                                        <View style={styles.siteInfo}>
                                            <Text style={styles.siteName}>{site.name}</Text>
                                            <View style={styles.locationRow}>
                                                <MapPin color="#94a3b8" size={14} />
                                                <Text style={styles.locationText}>{site.locationName}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.siteBadge}>
                                            <CheckCircle color="#10b981" size={14} />
                                            <Text style={styles.siteBadgeText}>Ready</Text>
                                        </View>
                                    </View>
                                    <SiteHistoryPreview siteId={site._id} />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </>
                )}
            </ScrollView>
            <View style={{ height: insets.bottom }} />
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#020617',
    },
    backgroundOrbs: {
        ...StyleSheet.absoluteFillObject,
        zIndex: -1,
    },
    orbA: {
        position: 'absolute',
        width: 280,
        height: 280,
        borderRadius: 140,
        backgroundColor: 'rgba(59, 130, 246, 0.18)',
        top: -120,
        left: -80,
    },
    orbB: {
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        top: 160,
        right: -100,
    },
    orbC: {
        position: 'absolute',
        width: 260,
        height: 260,
        borderRadius: 130,
        backgroundColor: 'rgba(148, 163, 184, 0.08)',
        bottom: -120,
        left: 40,
    },
    scrollContent: {
        padding: isSmallScreen ? 16 : 24,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: isSmallScreen ? 24 : 32,
        gap: 12,
    },
    headerLeft: {
        flex: 1,
        minWidth: 0,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 0,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: isSmallScreen ? 8 : 12,
        paddingVertical: isSmallScreen ? 6 : 8,
        borderRadius: 8,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    logoutText: {
        color: '#ef4444',
        fontSize: isSmallScreen ? 10 : 11,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    greeting: {
        fontSize: isSmallScreen ? 22 : 28,
        fontWeight: 'bold',
        color: 'white',
    },
    subGreeting: {
        fontSize: isSmallScreen ? 13 : 16,
        color: '#64748b',
        marginTop: 4,
    },
    startPatrolBar: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        padding: isSmallScreen ? 12 : 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        gap: isSmallScreen ? 10 : 16,
        minHeight: isSmallScreen ? 70 : 80,
        width: '100%',
        maxWidth: '100%',
    },
    startIcon: {
        width: isSmallScreen ? 44 : 56,
        height: isSmallScreen ? 44 : 56,
        borderRadius: isSmallScreen ? 22 : 28,
        backgroundColor: '#2563eb',
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
        marginTop: 2,
    },
    startPatrolContent: {
        flex: 1,
        minWidth: 0,
        paddingRight: 0,
        overflow: 'hidden',
    },
    startTitle: {
        fontSize: isSmallScreen ? 15 : 18,
        fontWeight: 'bold',
        color: 'white',
    },
    startSub: {
        fontSize: isSmallScreen ? 10 : 13,
        color: '#64748b',
        marginTop: 4,
        lineHeight: isSmallScreen ? 14 : 18,
        width: '100%',
    },
    activeSessionCard: {
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        padding: 24,
        borderRadius: 32,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: '#1e293b',
        alignItems: 'center',
    },
    activeBadgeRow: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    activeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 8,
    },
    countdownBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(148, 163, 184, 0.12)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 14,
    },
    countdownText: {
        color: '#e2e8f0',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    pulse: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10b981',
    },
    activeText: {
        color: '#10b981',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    activeSiteTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    sessionStatsRow: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(2, 6, 23, 0.7)',
        borderRadius: 18,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
        marginBottom: 16,
    },
    sessionStat: {
        alignItems: 'center',
        flex: 1,
    },
    sessionDivider: {
        width: 1,
        height: 28,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    sessionLabel: {
        color: '#94a3b8',
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    sessionValue: {
        color: 'white',
        fontSize: 18,
        fontWeight: '800',
        marginTop: 4,
    },
    resumeBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2563eb',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 16,
        gap: 10,
        justifyContent: 'center',
    },
    resumeText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    activeActions: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    stopBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 16,
        gap: 8,
    },
    stopText: {
        color: '#ef4444',
        fontSize: 16,
        fontWeight: 'bold',
    },
    siteMain: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    actionContainer: {
        marginBottom: isSmallScreen ? 24 : 32,
        width: '100%',
    },
    statsGrid: {
        flexDirection: 'row',
        gap: isSmallScreen ? 8 : 12,
        marginBottom: isSmallScreen ? 24 : 32,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#0f172a',
        padding: isSmallScreen ? 12 : 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        alignItems: 'center',
        gap: isSmallScreen ? 6 : 8,
        minWidth: 0,
    },
    statValue: {
        fontSize: isSmallScreen ? 18 : 20,
        fontWeight: 'bold',
        color: 'white',
    },
    statLabel: {
        fontSize: isSmallScreen ? 10 : 11,
        color: '#64748b',
        fontWeight: '600',
        textAlign: 'center',
    },
    sectionTitle: {
        fontSize: isSmallScreen ? 16 : 18,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 16,
    },
    siteCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        padding: isSmallScreen ? 12 : 16,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        gap: isSmallScreen ? 12 : 16,
    },
    siteIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: '#1e293b',
        justifyContent: 'center',
        alignItems: 'center',
    },
    siteInfo: {
        flex: 1,
    },
    siteName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    locationText: {
        fontSize: 13,
        color: '#64748b',
    },
    progressText: {
        color: '#3b82f6',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    siteBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 14,
    },
    siteBadgeText: {
        color: '#10b981',
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
});
