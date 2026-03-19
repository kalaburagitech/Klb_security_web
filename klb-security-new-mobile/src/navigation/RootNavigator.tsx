import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabNavigator from './TabNavigator';
import SiteSelection from '../screens/SiteSelection';
import PatrolStart from '../screens/PatrolStart';
import QRScanner from '../screens/QRScanner';
import PatrolForm from '../screens/PatrolForm';
import VisitForm from '../screens/VisitForm';
import IncidentReport from '../screens/IncidentReport';
import SignInScreen from '../screens/auth/SignInScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import CreatePointScreen from '../screens/CreatePointScreen';
import IssueReview from '../screens/IssueReview';
import OfficerDashboard from '../screens/OfficerDashboard';
import QRManagement from '../screens/QRManagement';
import VisitingReport from '../screens/VisitingReport';
import EnrollmentScreen from '../screens/EnrollmentScreen';
import MarkAttendanceScreen from '../screens/MarkAttendanceScreen';
import SplashScreen from '../screens/SplashScreen';

const Stack = createNativeStackNavigator();

import { useCustomAuth } from '../context/AuthContext';

export default function RootNavigator() {
    const { isCustomSignedIn, isLoading: isCustomLoading } = useCustomAuth();
    const [splashDone, setSplashDone] = React.useState(false);

    if (!splashDone) {
        return <SplashScreen onFinish={() => setSplashDone(true)} />;
    }

    if (isCustomLoading) return null;

    const authenticated = isCustomSignedIn;

    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
            }}
        >
            {authenticated ? (
                <>
                    <Stack.Screen name="MainTabs" component={TabNavigator} />
                    <Stack.Screen name="SiteSelection" component={SiteSelection} />
                    <Stack.Screen name="PatrolStart" component={PatrolStart} />
                    <Stack.Screen name="QRScanner" component={QRScanner} />
                    <Stack.Screen name="PatrolForm" component={PatrolForm} />
                    <Stack.Screen name="VisitForm" component={VisitForm} />
                    <Stack.Screen name="IncidentReport" component={IncidentReport} />
                    <Stack.Screen name="CreatePoint" component={CreatePointScreen} />
                    <Stack.Screen name="QRManagement" component={QRManagement} />
                    <Stack.Screen name="VisitingReport" component={VisitingReport} />
                    <Stack.Screen name="IssueReview" component={IssueReview} />
                    <Stack.Screen name="Enrollment" component={EnrollmentScreen} />
                    <Stack.Screen name="MarkAttendance" component={MarkAttendanceScreen} />
                </>
            ) : (
                <>
                    <Stack.Screen name="SignIn" component={SignInScreen} />
                </>
            )}
        </Stack.Navigator>
    );
}
