import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, Image, StyleSheet } from 'react-native';
import { ClipboardList, MapPin, CheckCircle, ChevronLeft, Camera, Check, ShieldAlert } from 'lucide-react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useCustomAuth } from '../context/AuthContext';
import { logService } from '../services/api';
import { uploadImage } from '../services/upload';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function VisitForm({ route, navigation }: any) {
    const insets = useSafeAreaInsets();
    const { customUser } = useCustomAuth();
    const currentUser = customUser;

    const { siteId, siteName, qrCode, organizationId, isManual } = route.params || {};
    const [remark, setRemark] = useState('');
    const [loading, setLoading] = useState(false);
    const [location, setLocation] = useState<any>(null);
    const [image, setImage] = useState<string | null>(null);
    const [reportIssue, setReportIssue] = useState(false);
    const [issueTitle, setIssueTitle] = useState('');
    const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
    
    const createDualLog = async (data: any) => { return logService.createDualLog(data); };

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission denied', 'Location permission is required for visit logs.');
                return;
            }
            let loc = await Location.getCurrentPositionAsync({});
            setLocation(loc);
        })();
    }, []);

    const handleImageCapture = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permission denied", "Camera access is needed to take proof photos.");
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.4,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const handleSubmit = async () => {
        if (!location) {
            Alert.alert("Error", "Waiting for GPS signal...");
            return;
        }

        if (!remark && !image) {
            Alert.alert("Evidence Required", "Please provide notes or a photo.");
            return;
        }

        setLoading(true);
        try {
            if (!currentUser?._id) {
                Alert.alert("Error", "User not found. Please log in again.");
                return;
            }

            let storageId = undefined;
            if (image) {
                storageId = await uploadImage(image);
            }

            const res = await createDualLog({
                userId: currentUser._id,
                siteId: siteId,
                qrCode: isManual ? "MANUAL_VISIT" : (qrCode || "QR_VISIT"),
                comment: remark,
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                organizationId: organizationId || currentUser.organizationId,
                imageId: storageId,
                issueDetails: reportIssue ? { title: issueTitle || "Visit Issue", priority } : undefined,
            });

            console.log("[VisitForm] Submit Success:", res.data);
            Alert.alert("Success", "Visit logged successfully!");
            navigation.navigate("MainTabs");
        } catch (error) {
            Alert.alert("Error", "Failed to submit visit log.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ChevronLeft color="white" size={24} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerLabel}>Submit Visit Log</Text>
                    <Text style={styles.headerTitle}>{isManual ? "Manual Visit" : "Officer Visit"}</Text>
                    <Text style={styles.siteSubtitle}>{siteName}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.card}>
                    <TouchableOpacity onPress={handleImageCapture} style={styles.imageContainer}>
                        {image ? (
                            <View style={styles.previewWrapper}>
                                <Image source={{ uri: image }} style={styles.previewImage} />
                                <View style={styles.checkBadge}>
                                    <Check color="white" size={14} />
                                </View>
                                <View style={styles.changeLabel}>
                                    <Text style={styles.changeText}>Change Photo</Text>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.placeholderWrapper}>
                                <View style={styles.iconBox}>
                                    <Camera color="#64748b" size={32} />
                                </View>
                                <Text style={styles.placeholderText}>Capture Photo Proof</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={[styles.infoRow, styles.card]}>
                    <ClipboardList color="#3b82f6" size={20} />
                    <View style={styles.infoTextContainer}>
                        <Text style={styles.infoLabel}>QR Identifier</Text>
                        <Text style={styles.infoValue}>{qrCode || (isManual ? "Manual Entry" : "Scanned")}</Text>
                    </View>
                </View>

                <View style={[styles.infoRow, styles.card, { justifyContent: 'space-between' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <MapPin color={location ? "#10b981" : "#64748b"} size={20} />
                        <Text style={styles.infoLabel}>GPS Coordinates</Text>
                    </View>
                    <Text style={[styles.statusTag, location ? styles.statusCaptured : styles.statusLocating]}>
                        {location ? "Captured" : "Locating..."}
                    </Text>
                </View>

                <View style={[styles.card, styles.inputSection]}>
                    <Text style={styles.sectionTitle}>Notes / Observations</Text>
                    <TextInput
                        multiline
                        numberOfLines={4}
                        placeholder="Add visit notes here..."
                        placeholderTextColor="#475569"
                        style={styles.textInput}
                        value={remark}
                        onChangeText={setRemark}
                    />
                </View>

                <View style={[styles.card, styles.issueSection]}>
                    <View style={styles.issueHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <ShieldAlert color={reportIssue ? "#f43f5e" : "#64748b"} size={20} />
                            <Text style={styles.infoLabel}>Report an Issue?</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => setReportIssue(!reportIssue)}
                            style={[styles.switch, reportIssue && styles.switchActive]}
                        >
                            <View style={[styles.thumb, reportIssue && styles.thumbActive]} />
                        </TouchableOpacity>
                    </View>

                    {reportIssue && (
                        <View style={styles.issueDetails}>
                            <Text style={styles.sectionTitle}>Issue Title</Text>
                            <TextInput
                                placeholder="Broken CCTV, Door Unlocked etc."
                                placeholderTextColor="#475569"
                                style={styles.innerInput}
                                value={issueTitle}
                                onChangeText={setIssueTitle}
                            />

                            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Priority</Text>
                            <View style={styles.priorityGrid}>
                                {["Low", "Medium", "High"].map((p: any) => (
                                    <TouchableOpacity
                                        key={p}
                                        onPress={() => setPriority(p)}
                                        style={[
                                            styles.priorityBtn,
                                            priority === p && styles.priorityBtnActive,
                                            priority === p && p === 'High' && styles.priorityBtnHigh
                                        ]}
                                    >
                                        <Text style={[
                                            styles.priorityText,
                                            priority === p && styles.priorityTextActive
                                        ]}>{p}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}
                </View>

                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={loading}
                    style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <CheckCircle color="white" size={22} />
                            <Text style={styles.submitBtnText}>Submit Visit Log</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
            <View style={{ height: insets.bottom }} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    header: { padding: 24, flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
    headerLabel: { color: '#64748b', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 2 },
    headerTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
    siteSubtitle: { color: '#3b82f6', fontSize: 14, fontWeight: '600', marginTop: 4 },
    scrollContent: { padding: 24, gap: 16, paddingBottom: 60 },
    card: { backgroundColor: '#0f172a', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
    imageContainer: { minHeight: 160, justifyContent: 'center', alignItems: 'center' },
    previewWrapper: { width: '100%', height: 200, position: 'relative' },
    previewImage: { width: '100%', height: '100%' },
    checkBadge: { position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius: 14, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center' },
    changeLabel: { position: 'absolute', bottom: 12, left: 12, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    changeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    placeholderWrapper: { alignItems: 'center' },
    iconBox: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    placeholderText: { color: '#64748b', fontSize: 12, fontWeight: '600' },
    infoRow: { padding: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
    infoTextContainer: { flex: 1 },
    infoLabel: { color: 'white', fontSize: 14, fontWeight: 'bold' },
    infoValue: { color: '#64748b', fontSize: 10, textTransform: 'uppercase', marginTop: 2 },
    statusTag: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
    statusCaptured: { color: '#10b981' },
    statusLocating: { color: '#64748b' },
    inputSection: { padding: 20 },
    sectionTitle: { color: '#64748b', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 1 },
    textInput: { color: 'white', fontSize: 16, minHeight: 100, textAlignVertical: 'top' },
    issueSection: { padding: 20 },
    issueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    switch: { width: 44, height: 24, borderRadius: 12, backgroundColor: '#1e293b', padding: 2 },
    switchActive: { backgroundColor: '#f43f5e' },
    thumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'white' },
    thumbActive: { alignSelf: 'flex-end' },
    issueDetails: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    innerInput: { color: 'white', fontSize: 14, backgroundColor: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    priorityGrid: { flexDirection: 'row', gap: 8 },
    priorityBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    priorityBtnActive: { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: '#3b82f6' },
    priorityBtnHigh: { backgroundColor: 'rgba(244, 63, 94, 0.15)', borderColor: '#f43f5e' },
    priorityText: { color: '#64748b', fontSize: 12, fontWeight: 'bold' },
    priorityTextActive: { color: 'white' },
    submitBtn: { backgroundColor: '#2563eb', height: 64, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 12 },
    submitBtnDisabled: { backgroundColor: '#1e293b', opacity: 0.5 },
    submitBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});
