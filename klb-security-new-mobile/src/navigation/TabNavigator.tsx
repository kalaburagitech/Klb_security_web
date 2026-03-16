import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/tabs/HomeScreen';
import HistoryScreen from '../screens/tabs/HistoryScreen';
import AttendanceHistoryScreen from '../screens/tabs/AttendanceHistoryScreen';
import OfficerDashboard from '../screens/OfficerDashboard';
import QRManagement from '../screens/QRManagement';
import IssueReview from '../screens/IssueReview';
import VisitingReport from '../screens/VisitingReport';
import { Home, Scan, History, ShieldAlert, Settings, ClipboardList, Calendar } from 'lucide-react-native';
import { View, TouchableOpacity, Text } from 'react-native';
import { useCustomAuth } from '../context/AuthContext';

const Tab = createBottomTabNavigator();

export default function TabNavigator({ navigation }: any) {
    const { customUser } = useCustomAuth();
    const isSO = customUser?.role === 'SO' || customUser?.role === 'Officer' || customUser?.role === 'Security Officer';

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#0f172a',
                    borderTopColor: 'rgba(255,255,255,0.05)',
                    height: 80,
                    paddingBottom: 20,
                    paddingTop: 10,
                },
                tabBarActiveTintColor: '#2563eb',
                tabBarInactiveTintColor: '#64748b',
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: 'bold',
                },
            }}
        >
            <Tab.Screen
                name="Home"
                component={isSO ? OfficerDashboard : HomeScreen}
                options={{
                    tabBarIcon: ({ color }) => <Home color={color} size={24} />,
                    tabBarLabel: isSO ? "Dashboard" : "Home"
                }}
            />

            {isSO ? (
                <>
                    <Tab.Screen
                        name="QRTools"
                        component={QRManagement}
                        options={{
                            tabBarIcon: ({ color }) => <Settings color={color} size={24} />,
                            tabBarLabel: "QR Tools",
                        }}
                    />
                    <Tab.Screen
                        name="Issues"
                        component={IssueReview}
                        options={{
                            tabBarIcon: ({ color }) => <ShieldAlert color={color} size={24} />,
                            tabBarLabel: "Issues",
                        }}
                    />
                </>
            ) : (
                <Tab.Screen
                    name="Visiting"
                    component={VisitingReport}
                    options={{
                        tabBarIcon: ({ color }) => <ClipboardList color={color} size={24} />,
                        tabBarLabel: "Visiting",
                    }}
                />
            )}

            <Tab.Screen
                name="History"
                component={HistoryScreen}
                options={{
                    tabBarIcon: ({ color }) => <History color={color} size={24} />,
                    tabBarLabel: "History"
                }}
            />
            <Tab.Screen
                name="Attendance"
                component={AttendanceHistoryScreen}
                options={{
                    tabBarIcon: ({ color }) => <Calendar color={color} size={24} />,
                    tabBarLabel: "Attendance"
                }}
            />
        </Tab.Navigator>
    );
}
