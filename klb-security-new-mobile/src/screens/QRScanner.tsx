import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Zap, ZapOff, Info } from 'lucide-react-native';
// import { useQuery } from 'convex/react';
// import { api } from '../services/convex';
import { siteService } from '../services/api';
import { usePatrolStore } from '../store/usePatrolStore';
import { useCustomAuth } from '../context/AuthContext';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

export default function QRScanner() {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [torch, setTorch] = useState(false);
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { customUser } = useCustomAuth();
    const activeSession = usePatrolStore((state) => state.activeSession);

    const { isVisit, siteId, siteName, mode, pointId, pointName } = route.params || {};

    const [targetSite, setTargetSite] = useState<any>(null);
    useEffect(() => {
        if (mode === 'setup' && siteId) {
            // Using getAllSites for now and filtering since getSiteById isn't in api.ts yet
            siteService.getAllSites()
                .then((res: any) => {
                    const site = res.data.find((s: any) => s._id === siteId);
                    setTargetSite(site);
                })
                .catch((err: any) => console.error("Error fetching site details:", err));
        }
    }, [mode, siteId]);

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371000; // Radius of the earth in meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in meters
    };

    const isPointRecentlyScanned = usePatrolStore((state) => state.isPointRecentlyScanned);

    if (!permission) return <View style={styles.container} />;

    if (!permission.granted) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.text}>We need your permission to show the camera</Text>
                <TouchableOpacity style={styles.button} onPress={requestPermission}>
                    <Text style={styles.buttonText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleBarCodeScanned = async ({ data }: any) => {
        if (scanned) return;
        setScanned(true);

        // Duplicate scan check
        if (!mode && isPointRecentlyScanned(data)) {
            Alert.alert(
                "Duplicate Scan",
                "This point was recently scanned. Please wait before scanning it again.",
                [{ text: "OK", onPress: () => setScanned(false) }]
            );
            return;
        }

        if (mode === 'setup') {
            if (!targetSite) {
                Alert.alert("Error", "Site data not found.");
                setScanned(false);
                return;
            }

            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert("Permission Error", "Location permission is required for setup.");
                    setScanned(false);
                    return;
                }

                const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
                const distance = calculateDistance(
                    location.coords.latitude,
                    location.coords.longitude,
                    targetSite.latitude,
                    targetSite.longitude
                );

                if (distance > 100) {
                    Alert.alert(
                        "Geo-fence Error",
                        `You are too far from the site (${Math.round(distance)}m). You must be within 100m to setup a point.`
                    );
                    setScanned(false);
                    return;
                }

                navigation.navigate('CreatePoint', {
                    mode: 'setup',
                    siteId,
                    pointId,
                    pointName,
                    qrCode: data,
                    lat: location.coords.latitude.toString(),
                    lng: location.coords.longitude.toString()
                });
            } catch (error) {
                console.error(error);
                Alert.alert("Location Error", "Could not verify your location.");
                setScanned(false);
            }
        } else if (isVisit) {
            navigation.navigate('VisitForm', {
                qrCode: data,
                siteId: siteId,
                siteName: siteName,
                organizationId: customUser?.organizationId
            });
        } else {
            // Pass data to PatrolForm for validation and logging
            navigation.navigate('PatrolForm', { qrCode: data });
        }

        // Reset scanned after 2 seconds to allow re-entry if back
        setTimeout(() => setScanned(false), 2000);
    };

    return (
        <View style={styles.container}>
            <CameraView
                style={StyleSheet.absoluteFillObject}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                enableTorch={torch}
            />

            {/* Overlay */}
            <View style={styles.overlay}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                        <ArrowLeft color="white" size={22} />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>{mode === 'setup' ? 'Setup Point' : 'Scan Patrol Point'}</Text>
                        <Text style={styles.headerSubtitle}>
                            {activeSession?.siteName || targetSite?.name || siteName || "Active Site"}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => setTorch(!torch)} style={styles.iconBtn}>
                        {torch ? <Zap color="#f59e0b" size={22} fill="#f59e0b" /> : <ZapOff color="white" size={22} />}
                    </TouchableOpacity>
                </View>

                <View style={styles.scannerOuter}>
                    <View style={styles.scannerInner}>
                        <View style={styles.cornerTopLeft} />
                        <View style={styles.cornerTopRight} />
                        <View style={styles.cornerBottomLeft} />
                        <View style={styles.cornerBottomRight} />
                        <View style={styles.scanLine} />
                    </View>
                    <View style={styles.scanBadge}>
                        <Text style={styles.scanBadgeText}>{scanned ? "Processing..." : "Ready to scan"}</Text>
                    </View>
                </View>

                <View style={styles.footer}>
                    <View style={styles.infoBox}>
                        <Info color="#3b82f6" size={18} />
                        <Text style={styles.infoText}>
                            {mode === 'setup'
                                ? "Scan the QR code to register this point at your current location."
                                : "Align the QR inside the frame. It will capture automatically."}
                        </Text>
                    </View>
                    <View style={styles.sessionPill}>
                        <Text style={styles.sessionInfo}>Session live</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        backgroundColor: '#020617',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'space-between',
        paddingBottom: 60,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingHorizontal: 24,
    },
    headerCenter: {
        alignItems: 'center',
        gap: 2,
    },
    headerTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    headerSubtitle: {
        color: '#cbd5f5',
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    iconBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(2, 6, 23, 0.6)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scannerOuter: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    scannerInner: {
        width: width * 0.7,
        height: width * 0.7,
        borderWidth: 0,
        position: 'relative',
    },
    scanLine: {
        position: 'absolute',
        top: '50%',
        left: 8,
        right: 8,
        height: 2,
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderRadius: 2,
    },
    cornerTopLeft: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 40,
        height: 40,
        borderTopWidth: 4,
        borderLeftWidth: 4,
        borderColor: '#2563eb',
    },
    cornerTopRight: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 40,
        height: 40,
        borderTopWidth: 4,
        borderRightWidth: 4,
        borderColor: '#2563eb',
    },
    cornerBottomLeft: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: 40,
        height: 40,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
        borderColor: '#2563eb',
    },
    cornerBottomRight: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 40,
        height: 40,
        borderBottomWidth: 4,
        borderRightWidth: 4,
        borderColor: '#2563eb',
    },
    footer: {
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(2, 6, 23, 0.7)',
        padding: 16,
        borderRadius: 16,
        gap: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    infoText: {
        color: 'white',
        fontSize: 14,
        flex: 1,
    },
    sessionPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    sessionInfo: {
        color: '#34d399',
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    text: {
        color: 'white',
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 24,
    },
    button: {
        backgroundColor: '#2563eb',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    scanBadge: {
        marginTop: 16,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 14,
        backgroundColor: 'rgba(2, 6, 23, 0.7)',
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.3)',
    },
    scanBadgeText: {
        color: '#cbd5f5',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
