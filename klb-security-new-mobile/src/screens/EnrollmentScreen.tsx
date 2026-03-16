import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ChevronLeft, Camera, CheckCircle, ChevronDown, RefreshCw } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { faceRecognitionService, regionService, enrollmentService } from '../services/api';
import { useCustomAuth } from '../context/AuthContext';

export default function EnrollmentScreen() {
    const navigation = useNavigation<any>();
    const { organizationId } = useCustomAuth();
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<any>(null);

    const [name, setName] = useState('');
    const [region, setRegion] = useState('');
    const [empId, setEmpId] = useState('');
    const [empCode, setEmpCode] = useState('');
    const [empRank, setEmpRank] = useState('');
    const [description, setDescription] = useState('');
    const [regions, setRegions] = useState<Array<{ regionId: string; regionName: string }>>([]);
    const [showRegionPicker, setShowRegionPicker] = useState(false);
    
    const [capturedImages, setCapturedImages] = useState<string[]>([]);
    const [isCapturing, setIsCapturing] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [showCamera, setShowCamera] = useState(false);
    const [loading, setLoading] = useState(false);
    const [facing, setFacing] = useState<'front' | 'back'>('front');

    useEffect(() => {
        fetchRegions();
    }, []);

    const fetchRegions = async () => {
        try {
            const response = await regionService.getRegions();
            setRegions(response.data || []);
            if (response.data && response.data.length > 0) {
                setRegion(response.data[0].regionId);
            }
        } catch (error) {
            console.error('Error fetching regions:', error);
            Alert.alert('Error', 'Failed to load regions');
        }
    };

    const captureFrames = async () => {
        if (!cameraRef.current) return;

        if (!permission?.granted) {
            const result = await requestPermission();
            if (!result.granted) {
                Alert.alert('Permission Required', 'Camera permission is needed to capture images');
                return;
            }
        }

        setIsCapturing(true);
        setCapturedImages([]);
        let currentCountdown = 5;
        setCountdown(currentCountdown);

        const countdownInterval = setInterval(() => {
            currentCountdown -= 1;
            setCountdown(currentCountdown);
            if (currentCountdown <= 0) {
                clearInterval(countdownInterval);
                setCountdown(null);
                
                // Capture 3 frames at intervals
                const captured: string[] = [];
                const captureFrames = async () => {
                    for (let i = 0; i < 3; i++) {
                        try {
                            if (cameraRef.current) {
                                const photo = await cameraRef.current.takePictureAsync({
                                    quality: 0.8,
                                    base64: false,
                                });
                                if (photo && photo.uri) {
                                    captured.push(photo.uri);
                                    setCapturedImages([...captured]);
                                }
                            }
                            if (i < 2) {
                                await new Promise(resolve => setTimeout(resolve, 1000));
                            }
                        } catch (error) {
                            console.error(`Error capturing frame ${i + 1}:`, error);
                        }
                    }
                    setIsCapturing(false);
                    setShowCamera(false);
                };
                captureFrames();
            }
        }, 1000);
    };

    const handleSubmit = async () => {
        if (!name.trim() || !region || !empId.trim() || !empRank.trim()) {
            Alert.alert('Validation Error', 'Please fill in all required fields (Name, Region, Employee ID, Employee Rank)');
            return;
        }

        if (capturedImages.length !== 3) {
            Alert.alert('Validation Error', 'Please capture exactly 3 images');
            return;
        }

        setLoading(true);
        try {
            // Create FormData for batch_enroll API
            const formData = new FormData();
            
            // Add images
            for (let i = 0; i < capturedImages.length; i++) {
                const imageUri = capturedImages[i];
                const filename = imageUri.split('/').pop() || `image_${i}.jpg`;
                const fileType = 'image/jpeg';
                
                formData.append('files', {
                    uri: imageUri,
                    name: filename,
                    type: fileType,
                } as any);
            }

            // Add other fields
            formData.append('name', name);
            formData.append('region', region);
            formData.append('emp_id', empId);
            if (empCode) formData.append('emp_code', empCode);
            formData.append('emp_rank', empRank);
            if (description) formData.append('description', description);
            formData.append('sort_by_filename', 'true');

            // Call batch_enroll API
            const response = await faceRecognitionService.batchEnroll(formData);
            
            if (response.data.success) {
                // Save to web API
                try {
                    const selectedRegion = regions.find(r => r.regionId === region);
                    await enrollmentService.create({
                        name,
                        empId,
                        empCode: empCode || null,
                        empRank,
                        region: selectedRegion?.regionName || region,
                        description: description || null,
                        faceEncodingIds: response.data.results?.map((r: any) => r.face_encoding_id) || [],
                        enrolledAt: Date.now(),
                        organizationId,
                    });
                } catch (error) {
                    console.error('Error saving to web API:', error);
                    // Don't fail the whole process if web API fails
                }

                Alert.alert('Success', 'Person enrolled successfully!', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                throw new Error('Enrollment failed');
            }
        } catch (error: any) {
            console.error('Enrollment error:', error);
            Alert.alert('Error', error.response?.data?.detail || error.message || 'Failed to enroll person');
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
            </SafeAreaView>
        );
    }

    if (showCamera && !permission.granted) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centerContainer}>
                    <Text style={styles.text}>Camera permission is required</Text>
                    <TouchableOpacity style={styles.button} onPress={requestPermission}>
                        <Text style={styles.buttonText}>Grant Permission</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.button, { marginTop: 12, backgroundColor: '#64748b' }]} onPress={() => setShowCamera(false)}>
                        <Text style={styles.buttonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    if (showCamera) {
        return (
            <SafeAreaView style={styles.container}>
                <CameraView
                    ref={cameraRef}
                    style={StyleSheet.absoluteFillObject}
                    facing={facing}
                />
                <View style={styles.cameraOverlay}>
                    <View style={styles.cameraHeader}>
                        <TouchableOpacity onPress={() => { setShowCamera(false); setIsCapturing(false); setCountdown(null); }} style={styles.iconBtn}>
                            <ChevronLeft color="white" size={24} />
                        </TouchableOpacity>
                        <Text style={styles.cameraTitle}>Capture Images</Text>
                        <TouchableOpacity 
                            onPress={() => setFacing(facing === 'front' ? 'back' : 'front')} 
                            style={styles.cameraSwitchBtn}
                        >
                            <RefreshCw color="white" size={20} />
                            <Text style={styles.cameraSwitchText}>{facing === 'front' ? 'Front' : 'Back'}</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.cameraContent}>
                        {isCapturing && countdown !== null && (
                            <View style={styles.countdownContainer}>
                                <Text style={styles.countdownText}>{countdown}</Text>
                                <Text style={styles.countdownSubtext}>Preparing to capture...</Text>
                            </View>
                        )}
                        {!isCapturing && countdown === null && (
                            <View style={styles.capturePrompt}>
                                <Text style={styles.promptText}>Ready to capture 3 frames</Text>
                                <Text style={styles.promptSubtext}>Click the button below to start</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.cameraFooter}>
                        {!isCapturing && (
                            <TouchableOpacity style={styles.captureButton} onPress={captureFrames}>
                                <Camera color="white" size={32} />
                            </TouchableOpacity>
                        )}
                        {capturedImages.length > 0 && (
                            <View style={styles.previewContainer}>
                                <Text style={styles.previewText}>Captured: {capturedImages.length}/3</Text>
                            </View>
                        )}
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ChevronLeft color="white" size={24} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Enrollment</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.sectionTitle}>Person Details</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Name *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter person name"
                        placeholderTextColor="#64748b"
                        value={name}
                        onChangeText={setName}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Region *</Text>
                    <TouchableOpacity
                        style={styles.input}
                        onPress={() => setShowRegionPicker(true)}
                    >
                        <View style={styles.regionSelector}>
                            <Text style={[styles.regionText, !region && styles.regionPlaceholder]}>
                                {region ? regions.find(r => r.regionId === region)?.regionName || 'Select region' : 'Select region'}
                            </Text>
                            <ChevronDown color="#64748b" size={20} />
                        </View>
                    </TouchableOpacity>
                </View>

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

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Employee ID *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter employee ID"
                        placeholderTextColor="#64748b"
                        value={empId}
                        onChangeText={setEmpId}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Employee Code</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter employee code (optional)"
                        placeholderTextColor="#64748b"
                        value={empCode}
                        onChangeText={setEmpCode}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Employee Rank *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter employee rank"
                        placeholderTextColor="#64748b"
                        value={empRank}
                        onChangeText={setEmpRank}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Enter description (optional)"
                        placeholderTextColor="#64748b"
                        multiline
                        numberOfLines={4}
                        value={description}
                        onChangeText={setDescription}
                    />
                </View>

                <Text style={styles.sectionTitle}>Face Images</Text>
                <Text style={styles.sectionSubtitle}>Capture 3 frames for face recognition</Text>

                {capturedImages.length > 0 && (
                    <View style={styles.imagePreviewContainer}>
                        {capturedImages.map((uri, index) => (
                            <View key={index} style={styles.imagePreview}>
                                <Image source={{ uri }} style={styles.previewImage} />
                                <Text style={styles.imageLabel}>Frame {index + 1}</Text>
                            </View>
                        ))}
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.captureButtonLarge, capturedImages.length === 3 && styles.captureButtonComplete]}
                    onPress={() => setShowCamera(true)}
                    disabled={isCapturing}
                >
                    {capturedImages.length === 3 ? (
                        <>
                            <CheckCircle color="white" size={24} />
                            <Text style={styles.captureButtonText}>3 Images Captured</Text>
                        </>
                    ) : (
                        <>
                            <Camera color="white" size={24} />
                            <Text style={styles.captureButtonText}>
                                {capturedImages.length > 0 ? `Capture More (${capturedImages.length}/3)` : 'Click to Capture Images'}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.submitButton, loading && styles.disabled]}
                    onPress={handleSubmit}
                    disabled={loading || capturedImages.length !== 3}
                >
                    {loading ? (
                        <>
                            <ActivityIndicator color="white" />
                            <Text style={styles.submitButtonText}>Enrolling...</Text>
                        </>
                    ) : (
                        <Text style={styles.submitButtonText}>Submit Enrollment</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
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
        marginBottom: 16,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 16,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#cbd5e1',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 16,
        color: 'white',
        fontSize: 16,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    regionSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    regionText: {
        color: 'white',
        fontSize: 16,
    },
    regionPlaceholder: {
        color: '#64748b',
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
    imagePreviewContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    imagePreview: {
        flex: 1,
        alignItems: 'center',
    },
    previewImage: {
        width: '100%',
        height: 120,
        borderRadius: 12,
        backgroundColor: '#0f172a',
    },
    imageLabel: {
        color: '#64748b',
        fontSize: 12,
        marginTop: 4,
    },
    captureButtonLarge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2563eb',
        padding: 18,
        borderRadius: 16,
        marginBottom: 20,
        gap: 12,
    },
    captureButtonComplete: {
        backgroundColor: '#10b981',
    },
    captureButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    submitButton: {
        backgroundColor: '#2563eb',
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 12,
        marginBottom: 40,
    },
    disabled: {
        opacity: 0.5,
    },
    submitButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
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
    countdownContainer: {
        alignItems: 'center',
    },
    countdownText: {
        fontSize: 72,
        fontWeight: 'bold',
        color: 'white',
    },
    countdownSubtext: {
        fontSize: 16,
        color: '#cbd5e1',
        marginTop: 12,
    },
    capturePrompt: {
        alignItems: 'center',
    },
    promptText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 8,
    },
    promptSubtext: {
        fontSize: 14,
        color: '#cbd5e1',
    },
    cameraFooter: {
        paddingBottom: 60,
        alignItems: 'center',
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#2563eb',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: 'white',
    },
    previewContainer: {
        marginTop: 20,
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 12,
    },
    previewText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
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
