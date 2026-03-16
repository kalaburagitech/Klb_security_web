import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// import { useQuery } from 'convex/react';
// import { api } from '../services/convex';
import { siteService } from '../services/api';
import { Building2, Search, MapPin, ChevronRight, ArrowLeft } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { usePatrolStore } from '../store/usePatrolStore';
import { useCustomAuth } from '../context/AuthContext';

export default function SiteSelection() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();    const { userId, customUser } = useCustomAuth();
    const [sites, setSites] = useState<any[]>([]);

    React.useEffect(() => {
        if (userId) {
            const fetchSites = async () => {
                try {
                    // SGs only see their assigned sites, SOs see all (or by org)
                    const response = customUser?.role === 'SG' 
                        ? await siteService.getSitesByUser(userId)
                        : await siteService.getAllSites();
                    setSites(response.data);
                } catch (error) {
                    console.error("Error fetching sites:", error);
                }
            };
            fetchSites();
        }
    }, [userId, customUser?.role]);
    const [searchQuery, setSearchQuery] = useState('');
    const setCurrentSite = usePatrolStore((state) => state.setCurrentSite);

    const filteredSites = sites?.filter(site =>
        site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        site.locationName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const isVisit = route.params?.isVisit;

    const handleSelectSite = (site: any) => {
        setCurrentSite(site);
        navigation.navigate('PatrolStart', { 
            isVisit: isVisit,
            selectedSite: site 
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.backgroundOrbs} pointerEvents="none">
                <View style={styles.orbA} />
                <View style={styles.orbB} />
            </View>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft color="white" size={24} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.title}>Select Site</Text>
                    <Text style={styles.subTitle}>Choose a location to start patrol</Text>
                </View>
            </View>

            <View style={styles.searchContainer}>
                <Search color="#94a3b8" size={18} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by site or location"
                    placeholderTextColor="#64748b"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <FlatList
                data={filteredSites}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.siteItem}
                        onPress={() => handleSelectSite(item)}
                    >
                        <View style={styles.iconContainer}>
                            <Building2 color="#3b82f6" size={22} />
                        </View>
                        <View style={styles.info}>
                            <Text style={styles.siteName}>{item.name}</Text>
                            <View style={styles.locationRow}>
                                <MapPin color="#94a3b8" size={14} />
                                <Text style={styles.location}>{item.locationName}</Text>
                            </View>
                            <View style={styles.badgeRow}>
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>Ready</Text>
                                </View>
                                <Text style={styles.badgeSub}>Patrol zone active</Text>
                            </View>
                        </View>
                        <ChevronRight color="#334155" size={20} />
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No sites found matching your search</Text>
                    </View>
                }
            />
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
        backgroundColor: 'rgba(59, 130, 246, 0.16)',
        top: -120,
        right: -60,
    },
    orbB: {
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: 'rgba(148, 163, 184, 0.1)',
        bottom: -100,
        left: -40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 24,
        gap: 16,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#0f172a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
    },
    subTitle: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        marginHorizontal: 24,
        paddingHorizontal: 16,
        borderRadius: 18,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        height: 56,
        color: 'white',
        fontSize: 16,
    },
    listContent: {
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    siteItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        padding: 16,
        borderRadius: 26,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        gap: 16,
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 18,
        backgroundColor: 'rgba(59, 130, 246, 0.16)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    info: {
        flex: 1,
    },
    siteName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    location: {
        fontSize: 14,
        color: '#64748b',
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
    },
    badge: {
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        color: '#10b981',
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    badgeSub: {
        color: '#94a3b8',
        fontSize: 11,
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 64,
    },
    emptyText: {
        color: '#64748b',
        fontSize: 16,
    },
});
