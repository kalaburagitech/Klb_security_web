import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Building2, User, Clock, ClipboardList, ChevronRight, MapPin, LogOut, X, CheckCircle, ShieldAlert, Menu, Calendar as CalendarIcon, Scan } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
// import { useQuery } from 'convex/react';
// import { api } from '../services/convex';
import { siteService, logService, regionService } from '../services/api';
import { useCustomAuth } from '../context/AuthContext';
import { usePatrolStore } from '../store/usePatrolStore';
import { isAdministrativeRole } from '../utils/roleUtils';
import { showError } from '../utils/toastUtils';
import { AttendanceWeekView } from '../components/AttendanceWeekView';

export default function OfficerDashboard() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const { organizationId, userId, logout, customUser } = useCustomAuth();
    const isAdmin = isAdministrativeRole(customUser);
    const [selectedSiteId, setSelectedSiteId] = useState<any>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLogout = async () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to logout?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Logout",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await logout();
                        } catch (err) {
                            console.error("Logout failed", err);
                        }
                    }
                }
            ]
        );
    };
    const [sites, setSites] = useState<any[]>([]);
    const [regions, setRegions] = useState<any[]>([]);
    const { lastCity, setLastSelection } = usePatrolStore();
    const [selectedCity, setSelectedCity] = useState<string | null>(lastCity || customUser?.city || null);

    /** Region from the signed-in profile only — no region picker on this screen. */
    const connectedRegionId = customUser?.regionId ?? null;

    const cityFilterOptions = useMemo((): string[] => {
        if (!connectedRegionId) return [];
        const fromUser =
            Array.isArray(customUser?.cities) && customUser!.cities!.length > 0
                ? (customUser!.cities as string[])
                : customUser?.city
                  ? [String(customUser.city)]
                  : [];
        const uniqUser = [...new Set(fromUser.map((c) => String(c).trim()).filter(Boolean))];
        if (uniqUser.length > 0) return uniqUser;
        const r = regions.find((x) => x.regionId === connectedRegionId);
        const fromRegion = Array.isArray(r?.cities) ? (r.cities as string[]) : [];
        return [...new Set(fromRegion.map((c) => String(c).trim()).filter(Boolean))];
    }, [customUser, regions, connectedRegionId]);

    const regionDisplayName =
        (connectedRegionId && regions.find((r) => r.regionId === connectedRegionId)?.regionName) ||
        (connectedRegionId ? 'Your region' : isAdmin ? 'Organization' : 'No region assigned');

    React.useEffect(() => {
        if (cityFilterOptions.length === 0) {
            setSelectedCity(null);
            return;
        }
        if (cityFilterOptions.length === 1) {
            setSelectedCity(cityFilterOptions[0]);
            return;
        }
        setSelectedCity((prev) => {
            if (prev && cityFilterOptions.includes(prev)) return prev;
            if (lastCity && cityFilterOptions.includes(lastCity)) return lastCity;
            return cityFilterOptions[0];
        });
    }, [cityFilterOptions, lastCity]);

    const [patrolLogs, setPatrolLogs] = useState<any[]>([]);
    const [visitLogs, setVisitLogs] = useState<any[]>([]);

    React.useEffect(() => {
        regionService.getRegions()
            .then(res => setRegions(res.data || []))
            .catch(err => console.error("Error fetching regions:", err));
    }, []);

    React.useEffect(() => {
        if (!organizationId || !userId) return;

        const applyCityScope = (data: any[]) => {
            let out = data;
            if (selectedCity) {
                out = out.filter(
                    (site: any) =>
                        String(site.city || '').toLowerCase().trim() ===
                        String(selectedCity).toLowerCase().trim()
                );
            } else if (cityFilterOptions.length > 0) {
                const citySet = new Set(cityFilterOptions.map((c) => c.toLowerCase()));
                out = out.filter(
                    (site: any) => site.city && citySet.has(String(site.city).toLowerCase().trim())
                );
            }
            return out;
        };

        const fail = (err: unknown) => {
            console.error('Error fetching sites:', err);
            showError('Sync Error', 'Failed to load sites. Please check your connection.');
            setSites([]);
        };

        if (!connectedRegionId) {
            if (isAdmin) {
                siteService
                    .getAllSites()
                    .then((res) => setSites(applyCityScope(res.data || [])))
                    .catch(fail);
            } else {
                setSites([]);
            }
            return;
        }

        const fetchMethod = isAdmin
            ? siteService.getAllSites()
            : siteService.getSitesByUser(userId, connectedRegionId, selectedCity || undefined);

        fetchMethod
            .then((res) => {
                let data = res.data || [];
                if (isAdmin) {
                    data = data.filter(
                        (site: any) =>
                            String(site.regionId || '').toLowerCase().trim() ===
                            String(connectedRegionId).toLowerCase().trim()
                    );
                }
                setSites(applyCityScope(data));
            })
            .catch(fail);
    }, [organizationId, userId, isAdmin, connectedRegionId, selectedCity, cityFilterOptions]);

    React.useEffect(() => {
        if (!organizationId && !isAdmin) return;
        const effectiveOrgId = isAdmin ? 'all' : (organizationId as string);

        logService
            .getPatrolLogs(
                effectiveOrgId,
                selectedSiteId || undefined,
                connectedRegionId || undefined,
                selectedCity || undefined
            )
            .then((res) => setPatrolLogs(res.data))
            .catch((err) => {
                console.error('Error fetching patrol logs:', err);
                showError('Logs Error', 'Failed to load patrol history.');
            });

        logService
            .getVisitLogs(
                effectiveOrgId,
                selectedSiteId || undefined,
                connectedRegionId || undefined,
                selectedCity || undefined
            )
            .then((res) => setVisitLogs(res.data))
            .catch((err) => {
                console.error('Error fetching visit logs:', err);
                showError('Logs Error', 'Failed to load visit history.');
            });
    }, [organizationId, selectedSiteId, selectedCity, isAdmin, connectedRegionId]);

    const filteredPatrolLogs = patrolLogs?.filter(log =>
        selectedSiteId ? log.siteId === selectedSiteId : sites.some(s => s._id === log.siteId)
    );
    const filteredVisitLogs = visitLogs?.filter(log =>
        selectedSiteId ? log.siteId === selectedSiteId : sites.some(s => s._id === log.siteId)
    );

    // Mock "Current Guard" - in a real app, this would be a specialized query
    const currentGuard = filteredPatrolLogs?.length ? filteredPatrolLogs[0].userName : "No guard active";
    const lastPatrol = filteredPatrolLogs?.length ? new Date(filteredPatrolLogs[0].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "None today";

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => setIsMenuOpen(true)} style={styles.menuBtn}>
                    <Menu color="white" size={24} />
                </TouchableOpacity>
                <Text style={styles.title}>{isAdmin ? "Global Monitor" : "System Monitor"}</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                        <LogOut color="#ef4444" size={16} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Premium Menu Overlay */}
            {isMenuOpen && (
                <View style={styles.menuOverlay}>
                    <SafeAreaView style={{ flex: 1 }}>
                        <View style={styles.menuHeader}>
                            <Text style={styles.menuTitle}>Navigation</Text>
                            <TouchableOpacity onPress={() => setIsMenuOpen(false)} style={styles.closeBtn}>
                                <X color="white" size={24} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.menuContent}>
                            <TouchableOpacity 
                                style={styles.menuItem} 
                                onPress={() => { setIsMenuOpen(false); navigation.getParent()?.navigate('PatrolHistory'); }}
                            >
                                <View style={[styles.menuIcon, { backgroundColor: '#3b82f6' }]}>
                                    <ClipboardList color="white" size={20} />
                                </View>
                                <Text style={styles.menuText}>Patrol history</Text>
                                <ChevronRight color="#475569" size={20} />
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={styles.menuItem} 
                                onPress={() => { setIsMenuOpen(false); navigation.navigate('MainTabs', { screen: 'Attendance' }); }}
                            >
                                <View style={[styles.menuIcon, { backgroundColor: '#10b981' }]}>
                                    <CalendarIcon color="white" size={20} />
                                </View>
                                <Text style={styles.menuText}>Attendance</Text>
                                <ChevronRight color="#475569" size={20} />
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.menuItem} 
                                onPress={() => { setIsMenuOpen(false); navigation.navigate('Issues'); }}
                            >
                                <View style={[styles.menuIcon, { backgroundColor: '#ef4444' }]}>
                                    <ShieldAlert color="white" size={20} />
                                </View>
                                <Text style={styles.menuText}>Issue Tracker</Text>
                                <ChevronRight color="#475569" size={20} />
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.menuItem} 
                                onPress={() => { setIsMenuOpen(false); navigation.navigate('Patrol'); }}
                            >
                                <View style={[styles.menuIcon, { backgroundColor: '#f59e0b' }]}>
                                    <Scan color="white" size={20} />
                                </View>
                                <Text style={styles.menuText}>Patrol</Text>
                                <ChevronRight color="#475569" size={20} />
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                </View>
            )}


            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.scopeSection}>
                    <Text style={styles.scopeRegionLine} numberOfLines={2}>
                        Region · {regionDisplayName}
                    </Text>
                    {cityFilterOptions.length > 1 ? (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.cityChipsRow}
                        >
                            {cityFilterOptions.map((city) => {
                                const on = selectedCity === city;
                                return (
                                    <TouchableOpacity
                                        key={city}
                                        onPress={() => {
                                            setSelectedCity(city);
                                            setLastSelection(connectedRegionId, city);
                                        }}
                                        style={[styles.cityChip, on && styles.cityChipActive]}
                                    >
                                        <Text style={[styles.cityChipText, on && styles.cityChipTextActive]}>{city}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    ) : cityFilterOptions.length === 1 ? (
                        <Text style={styles.scopeCityLine}>City · {cityFilterOptions[0]}</Text>
                    ) : connectedRegionId ? (
                        <Text style={styles.scopeCityLine}>All cities in this region</Text>
                    ) : null}
                </View>

                {/* Quick Actions - Match SG Dashboard */}
                <View style={styles.actionSection}>
                    <Text style={styles.sectionTitle}>Dashboard tools</Text>
                    <View style={styles.toolsRow}>
                        <TouchableOpacity
                            style={[styles.actionCard, styles.toolCardHalf]}
                            onPress={() => navigation.navigate('Enrollment')}
                        >
                            <View style={[styles.actionIconBox, { backgroundColor: '#4338ca' }]}>
                                <User color="white" size={24} />
                            </View>
                            <View style={styles.actionContent}>
                                <Text style={styles.actionTitle}>Enrollment</Text>
                                <Text style={styles.actionSub}>Face setup</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionCard, styles.toolCardHalf]}
                            onPress={() => navigation.navigate('MarkAttendance')}
                        >
                            <View style={[styles.actionIconBox, { backgroundColor: '#10b981' }]}>
                                <CheckCircle color="white" size={24} />
                            </View>
                            <View style={styles.actionContent}>
                                <Text style={styles.actionTitle}>Attendance</Text>
                                <Text style={styles.actionSub}>Check in / out</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                    <View style={[styles.toolsRow, { marginTop: 12 }]}>
                        <TouchableOpacity
                            style={[styles.actionCard, styles.toolCardHalf]}
                            onPress={() => navigation.navigate('Patrol')}
                        >
                            <View style={[styles.actionIconBox, { backgroundColor: '#d97706' }]}>
                                <Scan color="white" size={24} />
                            </View>
                            <View style={styles.actionContent}>
                                <Text style={styles.actionTitle}>Patrol</Text>
                                <Text style={styles.actionSub}>Visit & QR</Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionCard, styles.toolCardHalf]}
                            onPress={() => navigation.navigate('Issues')}
                        >
                            <View style={[styles.actionIconBox, { backgroundColor: '#dc2626' }]}>
                                <ShieldAlert color="white" size={24} />
                            </View>
                            <View style={styles.actionContent}>
                                <Text style={styles.actionTitle}>Issues</Text>
                                <Text style={styles.actionSub}>Tracker</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                <AttendanceWeekView navigation={navigation} />

                {selectedSiteId ? (
                    <View style={styles.activeSiteSection}>
                        <View style={styles.activeSiteHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.activeSiteLabel}>Monitoring Site</Text>
                                <Text style={styles.activeSiteName}>
                                    {sites?.find(s => s._id === selectedSiteId)?.name || 'Unknown Site'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.changeSiteBtn}
                                onPress={() => setSelectedSiteId(null)}
                            >
                                <Text style={styles.changeSiteText}>Change Site</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.statsGrid}>
                            <View style={styles.statCard}>
                                <View style={styles.statIconBox}>
                                    <User color="#3b82f6" size={20} />
                                </View>
                                <View>
                                    <Text style={styles.statLabel}>Current Guard</Text>
                                    <Text style={styles.statValue} numberOfLines={1}>{currentGuard}</Text>
                                </View>
                            </View>
                            <View style={styles.statCard}>
                                <View style={[styles.statIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                                    <Clock color="#10b981" size={20} />
                                </View>
                                <View>
                                    <Text style={styles.statLabel}>Last Patrol</Text>
                                    <Text style={styles.statValue}>{lastPatrol}</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.fullWidthCard}>
                            <View style={styles.cardHeader}>
                                <ClipboardList color="#3b82f6" size={18} />
                                <Text style={styles.cardTitle}>Recent Activity</Text>
                            </View>
                            {Array.isArray(filteredPatrolLogs) && filteredPatrolLogs.length > 0 ? (
                                filteredPatrolLogs.slice(0, 3).map((log, i) => (
                                    <View key={log._id} style={styles.logRow}>
                                        <View style={[styles.logDot, { backgroundColor: log.distance > 100 ? '#ef4444' : '#22c55e' }]} />
                                        <View style={styles.logInfo}>
                                            <Text style={styles.logText}>{log.pointName}</Text>
                                            <Text style={styles.logSubtext}>{log.userName} • {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                        </View>
                                        <ChevronRight size={14} color="#334155" />
                                    </View>
                                ))
                            ) : (
                                <Text style={styles.emptyText}>No recent patrols today.</Text>
                            )}
                        </View>

                        <View style={styles.fullWidthCard}>
                            <View style={styles.cardHeader}>
                                <MapPin color="#3b82f6" size={18} />
                                <Text style={styles.cardTitle}>Visiting Reports</Text>
                            </View>
                            {Array.isArray(filteredVisitLogs) && filteredVisitLogs.length > 0 ? (
                                filteredVisitLogs.slice(0, 3).map((log) => (
                                    <View key={log._id} style={styles.logRow}>
                                        <View style={[styles.logDot, { backgroundColor: '#3b82f6' }]} />
                                        <View style={styles.logInfo}>
                                            <Text style={styles.logText}>{log.userName}</Text>
                                            <Text style={styles.logSubtext}>{new Date(log.createdAt).toLocaleString()}</Text>
                                        </View>
                                        <ChevronRight size={14} color="#334155" />
                                    </View>
                                ))
                            ) : (
                                <Text style={styles.emptyText}>No visiting reports for this site.</Text>
                            )}
                        </View>
                    </View>
                ) : (
                    <View style={styles.siteSelector}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <Text style={styles.sectionTitle}>Sites</Text>
                        </View>

                        <View style={styles.siteGrid}>
                            {sites?.map((site) => (
                                <TouchableOpacity
                                    key={site._id}
                                    style={styles.siteCard}
                                    onPress={() => setSelectedSiteId(site._id)}
                                >
                                    <View style={styles.siteIconBox}>
                                        <Building2 size={24} color="#3b82f6" />
                                    </View>
                                    <View style={styles.siteInfo}>
                                        <Text style={styles.siteNameText} numberOfLines={1}>{site.name}</Text>
                                        <Text style={styles.siteLocationText} numberOfLines={1}>
                                            {[site.locationName, site.city].filter(Boolean).join(' · ') || '—'}
                                        </Text>
                                    </View>
                                    <ChevronRight size={20} color="#334155" />
                                </TouchableOpacity>
                            ))}
                            {(!sites || sites.length === 0) && (
                                <View style={styles.emptyState}>
                                    <Building2 color="#1e293b" size={48} />
                                    <Text style={styles.emptyTitle}>No sites</Text>
                                    <Text style={styles.emptyText}>
                                        {connectedRegionId
                                            ? 'No sites match this region and city. Ask your admin if your assignment looks wrong.'
                                            : isAdmin
                                              ? 'Link a region to your account to focus this list, or add sites in the admin console.'
                                              : 'Your profile needs a region. Contact your administrator.'}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}
            </ScrollView>

            <View style={{ height: insets.bottom }} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 12
    },
    title: { fontSize: 24, fontWeight: 'bold', color: 'white' },
    logoutBtn: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
        gap: 6,
    },
    logoutText: {
        color: '#ef4444',
        fontSize: 13,
        fontWeight: 'bold',
    },
    actionSection: {
        marginBottom: 32,
    },
    actionGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    actionCard: {
        flex: 1,
        backgroundColor: '#0f172a',
        padding: 16,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
        gap: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    actionIconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionContent: {
        alignItems: 'center',
    },
    actionTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    actionSub: {
        color: '#64748b',
        fontSize: 11,
        marginTop: 2,
        textAlign: 'center',
    },
    content: { padding: 24 },
    scopeSection: {
        marginBottom: 20,
        gap: 10,
    },
    scopeRegionLine: {
        color: '#e2e8f0',
        fontSize: 15,
        fontWeight: '700',
    },
    scopeCityLine: {
        color: '#64748b',
        fontSize: 13,
    },
    cityChipsRow: {
        flexDirection: 'row',
        gap: 8,
        paddingVertical: 2,
    },
    siteSelector: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold' as const,
        color: '#475569',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 20
    },
    siteGrid: {
        gap: 12
    },
    siteCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.2)', // Slightly more visible border
        gap: 16,
        width: '100%', // Ensure all cards have the same width
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    siteIconBox: {
        width: 50,
        height: 50,
        borderRadius: 14,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    siteInfo: {
        flex: 1,
    },
    siteNameText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold' as const,
    },
    siteLocationText: {
        color: '#64748b',
        fontSize: 13,
        marginTop: 2,
    },
    activeSiteSection: {
        gap: 16,
    },
    activeSiteHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        padding: 20,
        borderRadius: 28,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#3b82f6',
        gap: 12,
    },
    activeSiteLabel: {
        color: '#3b82f6',
        fontSize: 11,
        fontWeight: 'bold' as const,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
    },
    activeSiteName: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold' as const,
        marginTop: 2,
    },
    changeSiteBtn: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
    },
    changeSiteText: {
        color: '#64748b',
        fontSize: 12,
        fontWeight: '600' as const,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 12
    },
    statCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        gap: 12,
    },
    statIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    statLabel: { color: '#64748b', fontSize: 11, fontWeight: 'bold' as const, textTransform: 'uppercase' },
    statValue: { color: 'white', fontSize: 16, fontWeight: 'bold' as const, marginTop: 2 },
    fullWidthCard: {
        backgroundColor: '#0f172a',
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
    },
    cardTitle: { color: 'white', fontSize: 16, fontWeight: 'bold' as const },
    logRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
        padding: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 16,
    },
    logDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
    logInfo: { flex: 1 },
    logText: { color: 'white', fontSize: 14, fontWeight: '600' as const },
    logSubtext: { color: '#64748b', fontSize: 11, marginTop: 2 },
    regionFilterActive: {
        backgroundColor: '#3b82f6',
        borderColor: '#3b82f6',
    },
    regionIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        marginHorizontal: 24,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        marginTop: 8,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.2)',
    },
    regionIndicatorText: {
        color: '#3b82f6',
        fontSize: 12,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#0f172a',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '70%',
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
    },
    modalClose: {
        fontSize: 16,
        color: '#3b82f6',
        fontWeight: '600',
    },
    regionOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.02)',
    },
    regionOptionSelected: {
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
    },
    regionOptionText: {
        fontSize: 16,
        color: 'white',
    },
    regionOptionTextSelected: {
        color: '#3b82f6',
        fontWeight: 'bold',
    },
    emptyState: { alignItems: 'center', marginTop: 100 },
    emptyTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' as const, marginTop: 24, marginBottom: 8 },
    emptyText: { color: '#64748b', fontSize: 14, textAlign: 'center' },
    modalSub: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 4,
    },
    visitOptionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 20,
        gap: 12,
    },
    visitOptionCard: {
        width: '48%',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
    },
    visitOptionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    visitOptionText: {
        color: 'white',
        fontSize: 15,
        fontWeight: 'bold',
    },
    visitOptionDesc: {
        color: '#64748b',
        fontSize: 11,
        marginTop: 4,
        textAlign: 'center',
    },
    fab: {
        position: 'absolute',
        right: 30,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#10b981',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    // New Attendance Styles
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    viewAllText: {
        fontSize: 12,
        color: '#3b82f6',
        fontWeight: 'bold',
    },
    attendanceMiniCard: {
        width: 160,
        backgroundColor: '#0f172a',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        gap: 8,
    },
    attendanceUserRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    miniUserIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    attendanceName: {
        color: 'white',
        fontSize: 13,
        fontWeight: 'bold',
        flex: 1,
    },
    attendanceStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    attendanceTime: {
        color: '#94a3b8',
        fontSize: 11,
        fontWeight: '600',
    },
    attendanceLoc: {
        color: '#3b82f6',
        fontSize: 11,
        fontWeight: 'bold',
        marginTop: 2,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.2)',
    },
    filterChipText: {
        color: '#3b82f6',
        fontSize: 12,
        fontWeight: '600',
    },
    toolsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    toolCardHalf: {
        flex: 1,
        minWidth: 0,
        backgroundColor: '#1e1b4b',
        borderColor: '#312e81',
    },
    cityChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(15,23,42,0.9)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    cityChipActive: {
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37,99,235,0.2)',
    },
    cityChipText: {
        color: '#94a3b8',
        fontSize: 13,
        fontWeight: '600',
    },
    cityChipTextActive: {
        color: '#fff',
    },
    // Premium Menu Styles
    menuBtn: {
        padding: 8,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    menuOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#020617',
        zIndex: 1000,
    },
    menuHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    menuTitle: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
    },
    closeBtn: {
        padding: 8,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    menuContent: {
        padding: 24,
        gap: 16,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        gap: 16,
    },
    menuIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
    },
});
