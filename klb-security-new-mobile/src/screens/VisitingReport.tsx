import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ClipboardList, Building2, ChevronRight, Search, MapPin } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
// import { useQuery } from 'convex/react';
// import { api } from '../services/convex';
import { siteService } from '../services/api';
import { useCustomAuth } from '../context/AuthContext';
import { useState } from 'react';
import { TextInput } from 'react-native';

export default function VisitingReport() {
    const navigation = useNavigation<any>();
    const { userId } = useCustomAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [sites, setSites] = React.useState<any[]>([]);
    
    React.useEffect(() => {
        if (userId) {
            siteService.getSitesByUser(userId)
                .then(res => setSites(res.data))
                .catch(err => console.error("Error fetching sites:", err));
        }
    }, [userId]);
    const filteredSites = sites?.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.locationName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSiteSelect = (site: any) => {
        navigation.navigate('PatrolStart', {
            isVisit: true,
            selectedSite: site // Pass the site data to PatrolStart
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
                <Text style={styles.sectionLabel}>Assigned Sites</Text>
                {filteredSites?.map((site) => (
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
});
