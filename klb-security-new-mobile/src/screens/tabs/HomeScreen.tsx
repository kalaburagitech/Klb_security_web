import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Building2, CheckCircle, LogOut, Scan, ShieldAlert } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useCustomAuth } from '../../context/AuthContext';
import { AttendanceWeekView } from '../../components/AttendanceWeekView';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isSmallScreen = SCREEN_WIDTH < 375;

export default function HomeScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const { customUser, logout } = useCustomAuth();
    const [refreshing, setRefreshing] = useState(false);
    const [weekRefresh, setWeekRefresh] = useState(0);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.backgroundOrbs} pointerEvents="none">
                <View style={styles.orbA} />
                <View style={styles.orbB} />
            </View>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                            setTimeout(() => setRefreshing(false), 800);
                        }}
                        tintColor="#2563eb"
                    />
                }
            >
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.greeting} numberOfLines={1}>
                            Home
                        </Text>
                        <Text style={styles.subGreeting} numberOfLines={1}>
                            {customUser?.name ? `Hi, ${customUser.name}` : 'Welcome'}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => logout()} style={styles.logoutBtn}>
                        <LogOut color="#ef4444" size={16} />
                        {!isSmallScreen && <Text style={styles.logoutText}>Log Out</Text>}
                    </TouchableOpacity>
                </View>

                <View style={styles.actionContainer}>
                    <TouchableOpacity
                        style={[styles.actionBar, styles.attendanceBar]}
                        onPress={() => navigation.navigate('MarkAttendance')}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: '#10b981' }]}>
                            <CheckCircle color="white" size={isSmallScreen ? 20 : 24} />
                        </View>
                        <View style={styles.actionContent}>
                            <Text style={styles.actionTitle} numberOfLines={1}>
                                Attendance
                            </Text>
                            <Text style={styles.actionSub} numberOfLines={2}>
                                Check in or check out with face verification
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBar, styles.enrollBar]}
                        onPress={() => navigation.navigate('Enrollment')}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: '#3b82f6' }]}>
                            <Building2 color="white" size={isSmallScreen ? 20 : 24} />
                        </View>
                        <View style={styles.actionContent}>
                            <Text style={styles.actionTitle} numberOfLines={1}>
                                Enrollment
                            </Text>
                            <Text style={styles.actionSub} numberOfLines={2}>
                                Register face for attendance recognition
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={styles.quickRow}>
                    <TouchableOpacity
                        style={[styles.quickHalf, styles.patrolQuick]}
                        onPress={() => navigation.navigate('Patrol')}
                    >
                        <View style={[styles.quickIcon, { backgroundColor: 'rgba(245, 158, 11, 0.25)' }]}>
                            <Scan color="#fbbf24" size={isSmallScreen ? 20 : 22} />
                        </View>
                        <Text style={styles.quickTitle}>Patrol</Text>
                        <Text style={styles.quickSub} numberOfLines={2}>
                            Site visit & QR points
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.quickHalf, styles.issuesQuick]}
                        onPress={() => navigation.navigate('Issues')}
                    >
                        <View style={[styles.quickIcon, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                            <ShieldAlert color="#f87171" size={isSmallScreen ? 20 : 22} />
                        </View>
                        <Text style={styles.quickTitle}>Issues</Text>
                        <Text style={styles.quickSub} numberOfLines={2}>
                            Report & review issues
                        </Text>
                    </TouchableOpacity>
                </View>

                <AttendanceWeekView navigation={navigation} refreshToken={weekRefresh} />
            </ScrollView>
            <View style={{ height: insets.bottom }} />
        </SafeAreaView>
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
        width: 260,
        height: 260,
        borderRadius: 130,
        backgroundColor: 'rgba(59, 130, 246, 0.14)',
        top: -100,
        left: -60,
    },
    orbB: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        bottom: 80,
        right: -80,
    },
    scrollContent: {
        padding: isSmallScreen ? 16 : 24,
        paddingBottom: 48,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
        gap: 12,
    },
    headerLeft: { flex: 1, minWidth: 0 },
    greeting: {
        fontSize: isSmallScreen ? 24 : 28,
        fontWeight: '800',
        color: 'white',
        letterSpacing: 0.5,
    },
    subGreeting: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 6,
        fontWeight: '600',
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    logoutText: {
        color: '#ef4444',
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    actionContainer: {
        gap: 12,
        marginBottom: 28,
    },
    actionBar: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: isSmallScreen ? 14 : 18,
        borderRadius: 20,
        borderWidth: 1,
        gap: 14,
        minHeight: 76,
    },
    attendanceBar: {
        backgroundColor: 'rgba(6, 78, 59, 0.35)',
        borderColor: 'rgba(16, 185, 129, 0.25)',
    },
    enrollBar: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    quickRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 28,
    },
    quickHalf: {
        flex: 1,
        minWidth: 0,
        padding: isSmallScreen ? 14 : 16,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
        gap: 8,
    },
    patrolQuick: {
        backgroundColor: 'rgba(120, 53, 15, 0.2)',
        borderColor: 'rgba(245, 158, 11, 0.25)',
    },
    issuesQuick: {
        backgroundColor: 'rgba(127, 29, 29, 0.2)',
        borderColor: 'rgba(239, 68, 68, 0.22)',
    },
    quickIcon: {
        width: isSmallScreen ? 44 : 48,
        height: isSmallScreen ? 44 : 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    quickTitle: {
        fontSize: isSmallScreen ? 15 : 16,
        fontWeight: '800',
        color: 'white',
    },
    quickSub: {
        fontSize: 11,
        color: '#94a3b8',
        textAlign: 'center',
        lineHeight: 14,
    },
    actionIcon: {
        width: isSmallScreen ? 48 : 54,
        height: isSmallScreen ? 48 : 54,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionContent: { flex: 1, minWidth: 0 },
    actionTitle: {
        fontSize: isSmallScreen ? 16 : 18,
        fontWeight: '800',
        color: 'white',
    },
    actionSub: {
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 4,
        lineHeight: 17,
    },
});
