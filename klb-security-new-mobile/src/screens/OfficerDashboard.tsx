import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Building2, User, Clock, ClipboardList, ChevronRight, MapPin, Search, LogOut, X, CheckCircle, Scan, ShieldAlert, Plus, QrCode, GraduationCap, SunMoon } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
// import { useQuery } from 'convex/react';
// import { api } from '../services/convex';
import { siteService, logService, regionService, attendanceService } from '../services/api';
import { useCustomAuth } from '../context/AuthContext';
import { usePatrolStore } from '../store/usePatrolStore';
import { TextInput, Alert, Modal } from 'react-native';
import { isAdministrativeRole } from '../utils/roleUtils';
import { showError } from '../utils/toastUtils';

export default function OfficerDashboard() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const { organizationId, userId, logout, customUser } = useCustomAuth();
    const role = (customUser?.role || '');
    const isAdmin = isAdministrativeRole(role);
    const isOfficer = isAdmin; // For UI mapping to 'Monitoring Dashboard' title
    const [selectedSiteId, setSelectedSiteId] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');

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
    const { lastRegionId, lastCity, setLastSelection } = usePatrolStore();
    const [selectedRegionId, setSelectedRegionId] = useState<string | null>(lastRegionId || customUser?.regionId || null);
    const [selectedCity, setSelectedCity] = useState<string | null>(lastCity || customUser?.city || null);
    const [showRegionPicker, setShowRegionPicker] = useState(false);
    const [showCityPicker, setShowCityPicker] = useState(false);
    const [patrolLogs, setPatrolLogs] = useState<any[]>([]);
    const [visitLogs, setVisitLogs] = useState<any[]>([]);
    const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
    const [showVisitMenu, setShowVisitMenu] = useState(false);

    React.useEffect(() => {
        regionService.getRegions()
            .then(res => setRegions(res.data || []))
            .catch(err => console.error("Error fetching regions:", err));
    }, []);

    React.useEffect(() => {
        if (organizationId && userId) {
            // Backend handle: listSitesByUser now returns all sites for Admins/Officers
            const fetchPromise = siteService.getSitesByUser(userId as string, selectedRegionId || undefined, selectedCity || undefined);

            fetchPromise
                .then(res => {
                    setSites(res.data || []);
                })
                .catch(err => {
                    console.error("Error fetching sites:", err);
                    showError("Sync Error", "Failed to load sites. Please check your connection.");
                    setSites([]);
                });
        }
    }, [organizationId, userId, isAdmin, selectedRegionId, selectedCity]);

    React.useEffect(() => {
        if (organizationId) {
            // Fetch logs based on current filters (site, region, city)
            logService.getPatrolLogs(
                organizationId as string, 
                selectedSiteId || undefined,
                selectedRegionId || undefined,
                selectedCity || undefined
            )
                .then(res => setPatrolLogs(res.data))
                .catch(err => {
                    console.error("Error fetching patrol logs:", err);
                    showError("Logs Error", "Failed to load patrol history.");
                });
 
            logService.getVisitLogs(
                organizationId as string, 
                selectedSiteId || undefined,
                selectedRegionId || undefined,
                selectedCity || undefined
            )
                .then(res => setVisitLogs(res.data))
                .catch(err => {
                    console.error("Error fetching visit logs:", err);
                    showError("Logs Error", "Failed to load visit history.");
                });
 
            // Attendance filtering - using region filter if available
            attendanceService.list({ 
                organizationId: organizationId as string,
                region: selectedRegionId || undefined, // Backend uses 'region' field
            })
                .then((res: any) => {
                    let logs = res.data || [];
                    // Additional frontend filter for city since attendance table might not be fully indexed for it
                    if (selectedCity) {
                        logs = logs.filter((l: any) => l.city === selectedCity);
                    }
                    setAttendanceLogs(logs);
                })
                .catch((err: any) => console.error("Error fetching attendance logs:", err));
        }
    }, [organizationId, selectedSiteId, selectedRegionId, selectedCity]);

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
                <Text style={styles.title}>{isOfficer ? `Monitoring  [${role}]` : `Officer  [${role}]`}</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                        <LogOut color="#ef4444" size={16} />
                        <Text style={styles.logoutText}>Logout</Text>
                    </TouchableOpacity>
                </View>
            </View>


            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.searchSection}>
                    <View style={styles.searchContainer}>
                        <Search color="#64748b" size={18} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder={isAdmin ? "Search all organization sites..." : "Search assigned sites..."}
                            placeholderTextColor="#64748b"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery !== "" && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Text style={{ color: '#64748b', fontSize: 12 }}>Clear</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Quick Actions - Match SG Dashboard */}
                <View style={styles.actionSection}>
                    <Text style={styles.sectionTitle}>Dashboard Tools</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                        <TouchableOpacity
                            style={[styles.actionCard, { backgroundColor: '#1e1b4b', borderColor: '#312e81', width: 140 }]}
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
                            style={[styles.actionCard, { backgroundColor: '#1e1b4b', borderColor: '#312e81', width: 140 }]}
                            onPress={() => navigation.navigate('MarkAttendance')}
                        >
                            <View style={[styles.actionIconBox, { backgroundColor: '#10b981' }]}>
                                <CheckCircle color="white" size={24} />
                            </View>
                            <View style={styles.actionContent}>
                                <Text style={styles.actionTitle}>Attendance</Text>
                                <Text style={styles.actionSub}>In/Out</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionCard, { backgroundColor: '#1e1b4b', borderColor: '#312e81', width: 140 }]}
                            onPress={() => navigation.navigate('IssueReview', {
                                regionId: selectedRegionId,
                                city: selectedCity
                            })}
                        >
                            <View style={[styles.actionIconBox, { backgroundColor: '#ef4444' }]}>
                                <ShieldAlert color="white" size={24} />
                            </View>
                            <View style={styles.actionContent}>
                                <Text style={styles.actionTitle}>Issues</Text>
                                <Text style={styles.actionSub}>Review</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionCard, { backgroundColor: '#1e1b4b', borderColor: '#312e81', width: 140 }]}
                            onPress={() => setShowVisitMenu(true)}
                        >
                            <View style={[styles.actionIconBox, { backgroundColor: '#3b82f6' }]}>
                                <QrCode color="white" size={24} />
                            </View>
                            <View style={styles.actionContent}>
                                <Text style={styles.actionTitle}>Visits</Text>
                                <Text style={styles.actionSub}>QR & Checks</Text>
                            </View>
                        </TouchableOpacity>
                    </ScrollView>
                </View>

                {/* Recent Staff Attendance - Only for Monitoring Dashboard */}
                {isOfficer && Array.isArray(attendanceLogs) && attendanceLogs.length > 0 && (
                    <View style={[styles.actionSection, { marginBottom: 24 }]}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Recent Staff Attendance</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Attendance')}>
                                <Text style={styles.viewAllText}>View All</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                            {attendanceLogs.slice(0, 5).map((log, i) => (
                                <View key={log._id || i} style={styles.attendanceMiniCard}>
                                    <View style={styles.attendanceUserRow}>
                                        <View style={styles.miniUserIcon}>
                                            <User color="#2563eb" size={14} />
                                        </View>
                                        <Text style={styles.attendanceName} numberOfLines={1}>{log.name}</Text>
                                    </View>
                                    <View style={styles.attendanceStatusRow}>
                                        <Clock color="#64748b" size={10} />
                                        <Text style={styles.attendanceTime}>
                                            {log.checkOutTime ? 'Out: ' : 'In: '}
                                            {new Date(log.checkOutTime || log.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </View>
                                    <Text style={styles.attendanceLoc} numberOfLines={1}>{log.city || log.region}</Text>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}

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
                            <Text style={styles.sectionTitle}>{isOfficer ? 'Monitor Organisation Sites' : 'Select Site to Monitor'}</Text>
                            <TouchableOpacity
                                onPress={() => setShowRegionPicker(true)}
                                style={[styles.regionFilterBtn, selectedRegionId ? styles.regionFilterActive : {}]}
                            >
                                <MapPin color={selectedRegionId ? "white" : "#64748b"} size={20} />
                            </TouchableOpacity>
                        </View>

                        {(selectedRegionId || selectedCity) && (
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                                {selectedRegionId && (
                                    <View style={styles.filterChip}>
                                        <Text style={styles.filterChipText}>
                                            {regions.find(r => r.regionId === selectedRegionId)?.regionName}
                                        </Text>
                                        <TouchableOpacity onPress={() => {
                                            setSelectedRegionId(null);
                                            setSelectedCity(null);
                                            setLastSelection(null, null);
                                        }}>
                                            <X color="#3b82f6" size={14} />
                                        </TouchableOpacity>
                                    </View>
                                )}
                                {selectedCity && (
                                    <View style={styles.filterChip}>
                                        <Text style={styles.filterChipText}>{selectedCity}</Text>
                                        <TouchableOpacity onPress={() => {
                                            setSelectedCity(null);
                                            setLastSelection(selectedRegionId, null);
                                        }}>
                                            <X color="#3b82f6" size={14} />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        )}

                        <View style={styles.siteGrid}>
                            {sites?.filter(site => site.name.toLowerCase().includes(searchQuery.toLowerCase())).map(site => (
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
                                        <Text style={styles.siteLocationText} numberOfLines={1}>{site.locationName}</Text>
                                    </View>
                                    <ChevronRight size={20} color="#334155" />
                                </TouchableOpacity>
                            ))}
                            {sites?.filter(site => site.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                                <View style={styles.emptyState}>
                                    <Search color="#1e293b" size={64} />
                                    <Text style={styles.emptyTitle}>No Sites Found</Text>
                                    <Text style={styles.emptyText}>Try searching with a different name.</Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}
            </ScrollView>

            <Modal
                visible={showRegionPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowRegionPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Region</Text>
                            <TouchableOpacity onPress={() => setShowRegionPicker(false)}>
                                <Text style={styles.modalClose}>Done</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            <TouchableOpacity
                                style={[styles.regionOption, !selectedRegionId && styles.regionOptionSelected]}
                                onPress={() => {
                                    setSelectedRegionId(null);
                                    setShowRegionPicker(false);
                                }}
                            >
                                <Text style={[styles.regionOptionText, !selectedRegionId && styles.regionOptionTextSelected]}>
                                    All Regions
                                </Text>
                            </TouchableOpacity>
                            {regions.map((r) => (
                                <TouchableOpacity
                                    key={r.regionId}
                                    style={[styles.regionOption, selectedRegionId === r.regionId && styles.regionOptionSelected]}
                                    onPress={() => {
                                        setSelectedRegionId(r.regionId);
                                        setSelectedCity(null);
                                        setLastSelection(r.regionId, null);
                                        setShowRegionPicker(false);
                                        setShowCityPicker(true);
                                    }}
                                >
                                    <Text style={[styles.regionOptionText, selectedRegionId === r.regionId && styles.regionOptionTextSelected]}>
                                        {r.regionName}
                                    </Text>
                                    {selectedRegionId === r.regionId && <CheckCircle color="#3b82f6" size={20} />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
            <Modal
                visible={showCityPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowCityPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select City</Text>
                            <TouchableOpacity onPress={() => setShowCityPicker(false)}>
                                <Text style={styles.modalClose}>Done</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            <TouchableOpacity
                                style={[styles.regionOption, !selectedCity && styles.regionOptionSelected]}
                                onPress={() => {
                                    setSelectedCity(null);
                                    setLastSelection(selectedRegionId, null);
                                    setShowCityPicker(false);
                                }}
                            >
                                <Text style={[styles.regionOptionText, !selectedCity && styles.regionOptionTextSelected]}>
                                    All Cities
                                </Text>
                            </TouchableOpacity>
                            {regions.find(r => r.regionId === selectedRegionId)?.cities?.map((city: string) => (
                                <TouchableOpacity
                                    key={city}
                                    style={[styles.regionOption, selectedCity === city && styles.regionOptionSelected]}
                                    onPress={() => {
                                        setSelectedCity(city);
                                        setLastSelection(selectedRegionId, city);
                                        setShowCityPicker(false);
                                    }}
                                >
                                    <Text style={[styles.regionOptionText, selectedCity === city && styles.regionOptionTextSelected]}>
                                        {city}
                                    </Text>
                                    {selectedCity === city && <CheckCircle color="#3b82f6" size={20} />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
            <Modal
                visible={showVisitMenu}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowVisitMenu(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Visit Operations</Text>
                                <Text style={styles.modalSub}>Select activity to perform</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowVisitMenu(false)}>
                                <X color="#64748b" size={24} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.visitOptionsGrid}>
                            <TouchableOpacity
                                style={styles.visitOptionCard}
                                onPress={() => {
                                    setShowVisitMenu(false);
                                    navigation.navigate('SiteSelection', { isVisit: true, visitType: 'setup' });
                                }}
                            >
                                <View style={[styles.visitOptionIcon, { backgroundColor: '#3b82f6' }]}>
                                    <QrCode color="white" size={24} />
                                </View>
                                <Text style={styles.visitOptionText}>QR Tool</Text>
                                <Text style={styles.visitOptionDesc}>Configure sites</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.visitOptionCard}
                                onPress={() => {
                                    setShowVisitMenu(false);
                                    navigation.navigate('SiteSelection', { isVisit: true, visitType: 'Trainer' });
                                }}
                            >
                                <View style={[styles.visitOptionIcon, { backgroundColor: '#8b5cf6' }]}>
                                    <GraduationCap color="white" size={24} />
                                </View>
                                <Text style={styles.visitOptionText}>Trainer</Text>
                                <Text style={styles.visitOptionDesc}>Activity training</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.visitOptionCard}
                                onPress={() => {
                                    setShowVisitMenu(false);
                                    navigation.navigate('SiteSelection', { isVisit: true, visitType: 'SiteCheckDay' });
                                }}
                            >
                                <View style={[styles.visitOptionIcon, { backgroundColor: '#f59e0b' }]}>
                                    <SunMoon color="white" size={24} />
                                </View>
                                <Text style={styles.visitOptionText}>Day Check</Text>
                                <Text style={styles.visitOptionDesc}>Day shift audit</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.visitOptionCard}
                                onPress={() => {
                                    setShowVisitMenu(false);
                                    navigation.navigate('SiteSelection', { isVisit: true, visitType: 'SiteCheckNight' });
                                }}
                            >
                                <View style={[styles.visitOptionIcon, { backgroundColor: '#1e293b' }]}>
                                    <Clock color="white" size={24} />
                                </View>
                                <Text style={styles.visitOptionText}>Night Check</Text>
                                <Text style={styles.visitOptionDesc}>Night shift audit</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            <View style={{ height: insets.bottom }} />

            {/* WhatsApp Style FAB */}
            <TouchableOpacity
                style={[styles.fab, { bottom: insets.bottom + 20 }]}
                onPress={() => setShowVisitMenu(true)}
                activeOpacity={0.8}
            >
                <Plus color="white" size={32} />
            </TouchableOpacity>
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
    title: { fontSize: 24, fontWeight: 'bold', color: 'white' }, // Reduced font size for multi-word titles
    regionFilterBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.2)',
    },
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
    searchSection: {
        marginBottom: 20,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        height: 52,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        color: 'white',
        fontSize: 15,
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
});
