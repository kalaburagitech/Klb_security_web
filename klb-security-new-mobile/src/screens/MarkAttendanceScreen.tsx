import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ChevronLeft, CheckCircle, X, User, Clock, MapPin, RefreshCw } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { faceRecognitionService, regionService, attendanceService } from '../services/api';
import { useCustomAuth } from '../context/AuthContext';

export default function MarkAttendanceScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const { organizationId } = useCustomAuth();
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<any>(null);

    const [step, setStep] = useState<'region' | 'city' | 'camera'>('region');
    const [region, setRegion] = useState('');
    const [city, setCity] = useState('');
    const [regions, setRegions] = useState<Array<{ regionId: string; regionName: string; cities?: string[] }>>([]);
    const [showRegionPicker, setShowRegionPicker] = useState(false);
    const [showCityPicker, setShowCityPicker] = useState(false);
    
    const [detectedPerson, setDetectedPerson] = useState<any>(null);
    const [attendanceStatus, setAttendanceStatus] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(false);
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [facing, setFacing] = useState<'front' | 'back'>('front');

    useEffect(() => {
        fetchRegions();
        requestLocationPermission();
    }, []);

    useEffect(() => {
        if (detectedPerson && step === 'camera') {
            checkAttendanceStatus();
        }
    }, [detectedPerson, step]);

    const requestLocationPermission = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({});
                setLocation(loc);
            }
        } catch (error) {
            console.error('Location error:', error);
        }
    };

    const fetchRegions = async () => {
        try {
            const response = await regionService.getRegions();
            setRegions(response.data || []);
        } catch (error) {
            console.error('Error fetching regions:', error);
            Alert.alert('Error', 'Failed to load regions');
        }
    };

    const checkAttendanceStatus = async () => {
        if (!detectedPerson) return;
        
        setCheckingStatus(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const response = await faceRecognitionService.checkAttendance({
                emp_id: detectedPerson.emp_id,
                date: today,
            });
            // Handle different response formats
            const data = response.data;
            if (typeof data === 'string') {
                // If response is a string, parse it or set default
                setAttendanceStatus({ checked_in: false, checkInTime: undefined, checkOutTime: undefined });
            } else {
                // Check if person has checked in but not checked out
                const hasCheckedIn = data.checkInTime !== undefined && data.checkInTime !== null;
                const hasCheckedOut = data.checkOutTime !== undefined && data.checkOutTime !== null;
                const isCheckedIn = hasCheckedIn && !hasCheckedOut;
                
                setAttendanceStatus({
                    checked_in: isCheckedIn,
                    checkInTime: data.checkInTime,
                    checkOutTime: data.checkOutTime,
                });
            }
        } catch (error: any) {
            console.error('Error checking attendance:', error);
            // If error, assume not checked in (allows check-in)
            setAttendanceStatus({ checked_in: false, checkInTime: undefined, checkOutTime: undefined });
        } finally {
            setCheckingStatus(false);
        }
    };

    const handleFaceDetected = async (imageUri: string) => {
        setLoading(true);
        try {
            const formData = new FormData();
            const filename = imageUri.split('/').pop() || 'face.jpg';
            formData.append('file', {
                uri: imageUri,
                name: filename,
                type: 'image/jpeg',
            } as any);
            formData.append('region', region);
            formData.append('city', city);
            formData.append('emp_id', ''); // Let API search all

            const response = await faceRecognitionService.recognize(formData);
            
            if (response.data.success && response.data.matches && response.data.matches.length > 0) {
                const match = response.data.matches[0];
                setDetectedPerson({
                    emp_id: match.emp_id,
                    emp_code: match.emp_code,
                    name: match.name,
                    match_score: match.match_score,
                    face_encoding_id: match.face_encoding_id,
                });
            } else {
                Alert.alert('No Match', 'Face not recognized. Please try again.');
            }
        } catch (error: any) {
            console.error('Recognition error:', error);
            Alert.alert('Error', error.response?.data?.detail || 'Failed to recognize face');
        } finally {
            setLoading(false);
        }
    };

    const captureAndRecognize = async () => {
        if (!cameraRef.current) return;
        
        try {
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.8,
                base64: false,
            });
            if (photo && photo.uri) {
                await handleFaceDetected(photo.uri);
            }
        } catch (error) {
            console.error('Capture error:', error);
            Alert.alert('Error', 'Failed to capture image');
        }
    };

    const handleMarkAttendance = async (action: 'check_in' | 'check_out') => {
        if (!detectedPerson) return;

        setLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            
            // Get current location if available
            let lat: number | undefined;
            let lon: number | undefined;
            let accuracy: number | undefined;
            
            if (location) {
                lat = location.coords.latitude;
                lon = location.coords.longitude;
                accuracy = location.coords.accuracy || undefined;
            } else {
                try {
                    const loc = await Location.getCurrentPositionAsync({});
                    lat = loc.coords.latitude;
                    lon = loc.coords.longitude;
                    accuracy = loc.coords.accuracy || undefined;
                } catch (error) {
                    console.error('Location error:', error);
                }
            }

            const response = await faceRecognitionService.markAttendance({
                emp_id: detectedPerson.emp_id,
                status: 'present',
                action,
                date: today,
                latitude: lat,
                longitude: lon,
                location_accuracy: accuracy,
            });

            if (response.data) {
                // Save to web API
                try {
                    const selectedRegion = regions.find(r => r.regionId === region);
                    // Get existing record to preserve check-in time when checking out
                    let existingCheckInTime: number | undefined;
                    if (action === 'check_out') {
                        try {
                            const existingRecords = await attendanceService.list({
                                empId: detectedPerson.emp_id,
                                date: today,
                            });
                            const existingRecord = existingRecords.data?.[0];
                            existingCheckInTime = existingRecord?.checkInTime;
                        } catch (error) {
                            console.error('Error fetching existing record:', error);
                        }
                    }

                    await attendanceService.create({
                        empId: detectedPerson.emp_id,
                        name: detectedPerson.name,
                        date: today,
                        checkInTime: action === 'check_in' ? Date.now() : existingCheckInTime,
                        checkOutTime: action === 'check_out' ? Date.now() : undefined,
                        status: 'present',
                        latitude: lat,
                        longitude: lon,
                        locationAccuracy: accuracy,
                        region: regions.find(r => r.regionId === region)?.regionName || region,
                        city: city,
                        organizationId,
                    });
                } catch (error) {
                    console.error('Error saving to web API:', error);
                    // Don't fail the whole process if web API fails
                }

                // Wait a moment for the API to process, then refresh attendance status
                setTimeout(async () => {
                    await checkAttendanceStatus();
                }, 800);

                Alert.alert(
                    'Success',
                    `Successfully ${action === 'check_in' ? 'checked in' : 'checked out'}`,
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                            setTimeout(() => {
                                navigation.navigate('MainTabs');
                            }, 300);
                        }
                        }
                    ]
                );
            }
        } catch (error: any) {
            console.error('Mark attendance error:', error);
            Alert.alert('Error', error.response?.data?.detail || 'Failed to mark attendance');
        } finally {
            setLoading(false);
        }
    };

    if (!permission) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centerContainer}>
                    <Text style={styles.text}>Loading camera permissions...</Text>
                </View>
                <View style={{ height: insets.bottom }} />
            </SafeAreaView>
        );
    }

    if (step === 'region') {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <ChevronLeft color="white" size={24} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Mark Attendance</Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <Text style={styles.sectionTitle}>Select Region</Text>
                    <Text style={styles.sectionSubtitle}>Choose the region for attendance marking</Text>

                    <TouchableOpacity
                        style={styles.regionButton}
                        onPress={() => setShowRegionPicker(true)}
                    >
                        <View style={styles.regionButtonContent}>
                            <Text style={[styles.regionButtonText, !region && styles.regionPlaceholder]}>
                                {region ? regions.find(r => r.regionId === region)?.regionName || 'Select region' : 'Select region'}
                            </Text>
                            <ChevronLeft color="#64748b" size={20} style={{ transform: [{ rotate: '-90deg' }] }} />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.continueButton, !region && styles.disabled]}
                        onPress={() => {
                            if (region) {
                                setStep('city');
                            }
                        }}
                        disabled={!region}
                    >
                        <Text style={styles.continueButtonText}>Continue to Select City</Text>
                    </TouchableOpacity>
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
                                {regions.map((r) => (
                                    <TouchableOpacity
                                        key={r.regionId}
                                        style={[styles.regionOption, region === r.regionId && styles.regionOptionSelected]}
                                        onPress={() => {
                                            setRegion(r.regionId);
                                            setCity(''); // Reset city
                                            setShowRegionPicker(false);
                                        }}
                                    >
                                        <Text style={[styles.regionOptionText, region === r.regionId && styles.regionOptionTextSelected]}>
                                            {r.regionName}
                                        </Text>
                                        {region === r.regionId && <CheckCircle color="#2563eb" size={20} />}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
                <View style={{ height: insets.bottom }} />
            </SafeAreaView>
        );
    }

    if (step === 'city') {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => setStep('region')} style={styles.backButton}>
                        <ChevronLeft color="white" size={24} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Select City</Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={styles.sectionTitle}>Select City</Text>
                        <TouchableOpacity onPress={() => setStep('region')}>
                            <Text style={{ color: '#2563eb', fontSize: 12 }}>Change Region</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.sectionSubtitle}>Choose the city for attendance marking</Text>

                    <TouchableOpacity
                        style={styles.regionButton}
                        onPress={() => setShowCityPicker(true)}
                    >
                        <View style={styles.regionButtonContent}>
                            <Text style={[styles.regionButtonText, !city && styles.regionPlaceholder]}>
                                {city || 'Select city'}
                            </Text>
                            <ChevronLeft color="#64748b" size={20} style={{ transform: [{ rotate: '-90deg' }] }} />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.continueButton, !city && styles.disabled]}
                        onPress={() => {
                            if (city) {
                                if (!permission?.granted) {
                                    requestPermission().then((result) => {
                                        if (result.granted) {
                                            setStep('camera');
                                        } else {
                                            Alert.alert('Permission Required', 'Camera permission is needed for face recognition');
                                        }
                                    });
                                } else {
                                    setStep('camera');
                                }
                            }
                        }}
                        disabled={!city}
                    >
                        <Text style={styles.continueButtonText}>Continue to Recognize</Text>
                    </TouchableOpacity>
                </ScrollView>

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
                                {regions.find(r => r.regionId === region)?.cities?.map((c) => (
                                    <TouchableOpacity
                                        key={c}
                                        style={[styles.regionOption, city === c && styles.regionOptionSelected]}
                                        onPress={() => {
                                            setCity(c);
                                            setShowCityPicker(false);
                                        }}
                                    >
                                        <Text style={[styles.regionOptionText, city === c && styles.regionOptionTextSelected]}>
                                            {c}
                                        </Text>
                                        {city === c && <CheckCircle color="#2563eb" size={20} />}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
                <View style={{ height: insets.bottom }} />
            </SafeAreaView>
        );
    }

    if (step === 'camera' && !permission.granted) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centerContainer}>
                    <Text style={styles.text}>Camera permission is required</Text>
                    <TouchableOpacity style={styles.button} onPress={requestPermission}>
                        <Text style={styles.buttonText}>Grant Permission</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.button, { marginTop: 12, backgroundColor: '#64748b' }]} onPress={() => setStep('region')}>
                        <Text style={styles.buttonText}>Back</Text>
                    </TouchableOpacity>
                </View>
                <View style={{ height: insets.bottom }} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <CameraView
                ref={cameraRef}
                style={StyleSheet.absoluteFillObject}
                facing={facing}
            />
            <View style={styles.cameraOverlay}>
                <View style={styles.cameraHeader}>
                    <TouchableOpacity onPress={() => { setStep('city'); setDetectedPerson(null); setAttendanceStatus(null); }} style={styles.iconBtn}>
                        <ChevronLeft color="white" size={24} />
                    </TouchableOpacity>
                    <Text style={styles.cameraTitle}>Face Recognition</Text>
                    <TouchableOpacity 
                        onPress={() => setFacing(facing === 'front' ? 'back' : 'front')} 
                        style={styles.cameraSwitchBtn}
                    >
                        <RefreshCw color="white" size={20} />
                        <Text style={styles.cameraSwitchText}>{facing === 'front' ? 'Front' : 'Back'}</Text>
                    </TouchableOpacity>
                </View>

                {detectedPerson ? (
                    <View style={styles.detectedContainer}>
                        <View style={styles.detectedCard}>
                            <View style={styles.detectedHeader}>
                                <User color="#2563eb" size={32} />
                                <Text style={styles.detectedTitle}>Person Detected</Text>
                            </View>
                            
                            <View style={styles.detectedInfo}>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Name:</Text>
                                    <Text style={styles.infoValue}>{detectedPerson.name}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Employee ID:</Text>
                                    <Text style={styles.infoValue}>{detectedPerson.emp_id}</Text>
                                </View>
                                {detectedPerson.emp_code && (
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Employee Code:</Text>
                                        <Text style={styles.infoValue}>{detectedPerson.emp_code}</Text>
                                    </View>
                                )}
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Match Score:</Text>
                                    <Text style={styles.infoValue}>{detectedPerson.match_score}%</Text>
                                </View>
                            </View>

                            {checkingStatus ? (
                                <View style={styles.statusChecking}>
                                    <ActivityIndicator color="#2563eb" />
                                    <Text style={styles.statusCheckingText}>Checking attendance status...</Text>
                                </View>
                            ) : attendanceStatus ? (
                                <View style={styles.attendanceStatus}>
                                    {attendanceStatus.checked_in ? (
                                        <>
                                            <View style={styles.statusBadge}>
                                                <Clock color="#10b981" size={20} />
                                                <Text style={styles.statusText}>Already Checked In</Text>
                                            </View>
                                            <TouchableOpacity
                                                style={[styles.actionButton, styles.checkOutButton]}
                                                onPress={() => handleMarkAttendance('check_out')}
                                                disabled={loading}
                                            >
                                                {loading ? (
                                                    <ActivityIndicator color="white" />
                                                ) : (
                                                    <>
                                                        <X color="white" size={20} />
                                                        <Text style={styles.actionButtonText}>Check Out</Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                        </>
                                    ) : (
                                        <>
                                            <View style={styles.statusBadge}>
                                                <CheckCircle color="#f59e0b" size={20} />
                                                <Text style={styles.statusText}>Not Checked In</Text>
                                            </View>
                                            <TouchableOpacity
                                                style={[styles.actionButton, styles.checkInButton]}
                                                onPress={() => handleMarkAttendance('check_in')}
                                                disabled={loading}
                                            >
                                                {loading ? (
                                                    <ActivityIndicator color="white" />
                                                ) : (
                                                    <>
                                                        <CheckCircle color="white" size={20} />
                                                        <Text style={styles.actionButtonText}>Check In</Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                        </>
                                    )}
                                </View>
                            ) : null}

                            <TouchableOpacity
                                style={styles.retryButton}
                                onPress={() => {
                                    setDetectedPerson(null);
                                    setAttendanceStatus(null);
                                }}
                            >
                                <Text style={styles.retryButtonText}>Try Again</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <View style={styles.cameraContent}>
                        <View style={styles.faceFrame}>
                            <View style={[styles.frameCorner, styles.topLeft]} />
                            <View style={[styles.frameCorner, styles.topRight]} />
                            <View style={[styles.frameCorner, styles.bottomLeft]} />
                            <View style={[styles.frameCorner, styles.bottomRight]} />
                        </View>
                        <Text style={styles.instructionText}>Position your face within the frame</Text>
                    </View>
                )}

                <View style={styles.cameraFooter}>
                    {!detectedPerson && !loading && (
                        <TouchableOpacity
                            style={styles.captureButton}
                            onPress={captureAndRecognize}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.captureButtonText}>Capture & Recognize</Text>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            <View style={{ height: insets.bottom }} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#020617',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
    },
    scrollContent: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
        marginTop: 8,
        marginBottom: 8,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 24,
    },
    regionButton: {
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
    },
    regionButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    regionButtonText: {
        color: 'white',
        fontSize: 16,
    },
    regionPlaceholder: {
        color: '#64748b',
    },
    continueButton: {
        backgroundColor: '#2563eb',
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
    },
    disabled: {
        opacity: 0.5,
    },
    continueButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#0f172a',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
    },
    modalClose: {
        fontSize: 16,
        color: '#2563eb',
        fontWeight: '600',
    },
    regionOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    regionOptionSelected: {
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
    },
    regionOptionText: {
        fontSize: 16,
        color: 'white',
    },
    regionOptionTextSelected: {
        color: '#2563eb',
        fontWeight: '600',
    },
    cameraOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    cameraHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingHorizontal: 20,
    },
    iconBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraSwitchBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
    },
    cameraSwitchText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    cameraTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    cameraContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    faceFrame: {
        width: 280,
        height: 280,
        position: 'relative',
    },
    frameCorner: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderColor: '#2563eb',
    },
    topLeft: {
        top: 0,
        left: 0,
        borderTopWidth: 4,
        borderLeftWidth: 4,
    },
    topRight: {
        top: 0,
        right: 0,
        borderTopWidth: 4,
        borderRightWidth: 4,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 4,
        borderRightWidth: 4,
    },
    instructionText: {
        color: 'white',
        fontSize: 16,
        marginTop: 20,
        textAlign: 'center',
    },
    cameraFooter: {
        paddingBottom: 60,
        alignItems: 'center',
    },
    captureButton: {
        backgroundColor: '#2563eb',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 24,
    },
    captureButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    detectedContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    detectedCard: {
        backgroundColor: '#0f172a',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    detectedHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    detectedTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
        marginTop: 12,
    },
    detectedInfo: {
        marginBottom: 20,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    infoLabel: {
        fontSize: 14,
        color: '#64748b',
    },
    infoValue: {
        fontSize: 14,
        color: 'white',
        fontWeight: '600',
    },
    statusChecking: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    statusCheckingText: {
        color: '#64748b',
        marginTop: 12,
    },
    attendanceStatus: {
        marginTop: 20,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        marginBottom: 16,
    },
    statusText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 16,
        gap: 8,
        marginBottom: 12,
    },
    checkInButton: {
        backgroundColor: '#10b981',
    },
    checkOutButton: {
        backgroundColor: '#ef4444',
    },
    actionButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    retryButton: {
        padding: 12,
        alignItems: 'center',
    },
    retryButtonText: {
        color: '#64748b',
        fontSize: 14,
    },
    text: {
        color: 'white',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
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
        fontSize: 16,
    },
});
