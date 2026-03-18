import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ClipboardList, Building2, ChevronRight, Search, MapPin } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { siteService, regionService } from '../services/api';
import { useCustomAuth } from '../context/AuthContext';

export default function VisitingReport() {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { userId } = useCustomAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [sites, setSites] = useState<any[]>([]);
    const [regions, setRegions] = useState<any[]>([]);
    const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
    const [selectedCity, setSelectedCity] = useState<string | null>(null);
    const [showRegionPicker, setShowRegionPicker] = useState(false);
    const [showCityPicker, setShowCityPicker] = useState(false);
    const [step, setStep] = useState<'region' | 'city' | 'site'>('region');
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
        regionService.getRegions()
            .then(res => setRegions(res.data || []))
            .catch(err => console.error("Error fetching regions:", err));
    }, []);

    useEffect(() => {
        if (userId && step === 'site') {
            setLoading(true);
            siteService.getSitesByUser(userId, selectedRegionId || undefined, selectedCity || undefined)
                .then(res => {
                    setSites(res.data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Error fetching sites:", err);
                    setLoading(false);
                });
        }
    }, [userId, step, selectedRegionId, selectedCity]);

    const filteredSites = sites?.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.locationName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSiteSelect = (site: any) => {
        navigation.navigate('PatrolStart', {
            isVisit: true,
            selectedSite: site 
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft color="white" size={24} />
                </TouchableOpacity>
                <Text style={styles.title}>Visiting Report</Text>
            </View>

            {step === 'region' ? (
                <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 20 }}>
                    <Text style={styles.sectionLabel}>Select Region</Text>
                    <TouchableOpacity
                        style={styles.regionSelectorBtn}
                        onPress={() => setShowRegionPicker(true)}
                    >
                        <Text style={[styles.regionBtnText, !selectedRegionId && { color: '#64748b' }]}>
                            {selectedRegionId ? regions.find(r => r.regionId === selectedRegionId)?.regionName : "Choose a region..."}
                        </Text>
                        <ChevronRight color="#64748b" size={20} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.continueBtn, !selectedRegionId && { opacity: 0.5 }]}
                        onPress={() => selectedRegionId && setStep('city')}
                        disabled={!selectedRegionId}
                    >
                        <Text style={styles.continueBtnText}>Continue to Select City</Text>
                    </TouchableOpacity>
                </View>
            ) : step === 'city' ? (
                <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 20 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                         <Text style={styles.sectionLabel}>Select City</Text>
                         <TouchableOpacity onPress={() => setStep('region')}>
                            <Text style={{ color: '#3b82f6', fontSize: 12 }}>Change Region</Text>
                        </TouchableOpacity>
                    </View>
                   
                    <TouchableOpacity
                        style={styles.regionSelectorBtn}
                        onPress={() => setShowCityPicker(true)}
                    >
                        <Text style={[styles.regionBtnText, !selectedCity && { color: '#64748b' }]}>
                            {selectedCity || "Choose a city..."}
                        </Text>
                        <ChevronRight color="#64748b" size={20} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.continueBtn, !selectedCity && { opacity: 0.5 }]}
                        onPress={() => selectedCity && setStep('site')}
                        disabled={!selectedCity}
                    >
                        <Text style={styles.continueBtnText}>View Sites for Visiting</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    <View style={styles.searchSection}>
                        <View style={styles.searchBar}>
                            <Search color="#64748b" size={20} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search sites for visiting..."
                                placeholderTextColor="#475569"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>
                    </View>

                    <ScrollView contentContainerStyle={styles.content}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Text style={styles.sectionLabel}>Assigned Sites</Text>
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <TouchableOpacity onPress={() => setStep('city')}>
                                    <Text style={{ color: '#3b82f6', fontSize: 12 }}>Change City</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setStep('region')}>
                                    <Text style={{ color: '#3b82f6', fontSize: 12 }}>Change Region</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        
                        {loading ? (
                            <ActivityIndicator color="#3b82f6" size="large" style={{ marginTop: 40 }} />
                        ) : filteredSites?.length === 0 ? (
                            <Text style={{ color: '#64748b', textAlign: 'center', marginTop: 40 }}>No sites found in this region.</Text>
                        ) : filteredSites?.map((site) => (
                            <TouchableOpacity
                                key={site._id}
                                style={styles.siteCard}
                                onPress={() => handleSiteSelect(site)}
                            >
                                <View style={styles.siteIconBox}>
                                    <Building2 color="#3b82f6" size={24} />
                                </View>
                                <View style={styles.siteInfo}>
                                    <Text style={styles.siteName}>{site.name}</Text>
                                    <View style={styles.locationInfo}>
                                        <MapPin color="#64748b" size={12} />
                                        <Text style={styles.locationText}>{site.locationName}</Text>
                                    </View>
                                </View>
                                <ChevronRight color="#1e293b" size={20} />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </>
            )}

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
                                    style={[styles.regionOption, selectedRegionId === r.regionId && styles.regionOptionSelected]}
                                    onPress={() => {
                                        setSelectedRegionId(r.regionId);
                                        setSelectedCity(null); // Reset city when region changes
                                        setShowRegionPicker(false);
                                    }}
                                >
                                    <Text style={[styles.regionOptionText, selectedRegionId === r.regionId && styles.regionOptionTextSelected]}>
                                        {r.regionName}
                                    </Text>
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
                            {regions.find(r => r.regionId === selectedRegionId)?.cities?.map((city: string) => (
                                <TouchableOpacity
                                    key={city}
                                    style={[styles.regionOption, selectedCity === city && styles.regionOptionSelected]}
                                    onPress={() => {
                                        setSelectedCity(city);
                                        setShowCityPicker(false);
                                    }}
                                >
                                    <Text style={[styles.regionOptionText, selectedCity === city && styles.regionOptionTextSelected]}>
                                        {city}
                                    </Text>
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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 24, gap: 16 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', color: 'white' },
    searchSection: { paddingHorizontal: 24, marginBottom: 16 },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    searchInput: { flex: 1, color: 'white', fontSize: 16 },
    content: { padding: 24, gap: 16 },
    sectionLabel: { fontSize: 12, fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    siteCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        gap: 16,
    },
    siteIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(59, 130, 246, 0.1)', justifyContent: 'center', alignItems: 'center' },
    siteInfo: { flex: 1 },
    siteName: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    locationInfo: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    locationText: { color: '#64748b', fontSize: 12 },
    regionSelectorBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#0f172a',
        padding: 20,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.2)',
        marginBottom: 24,
    },
    regionBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    continueBtn: {
        backgroundColor: '#2563eb',
        paddingVertical: 18,
        borderRadius: 18,
        alignItems: 'center',
    },
    continueBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#0f172a',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingBottom: 40,
        maxHeight: '60%',
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
        color: '#3b82f6',
        fontSize: 16,
        fontWeight: '600',
    },
    regionOption: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.02)',
    },
    regionOptionSelected: {
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
    },
    regionOptionText: {
        color: 'white',
        fontSize: 16,
    },
    regionOptionTextSelected: {
        color: '#3b82f6',
        fontWeight: 'bold',
    },
});
