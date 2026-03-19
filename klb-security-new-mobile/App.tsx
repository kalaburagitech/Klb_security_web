import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
// import { ConvexProvider, ConvexReactClient } from 'convex/react';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/context/AuthContext';

// import { CONVEX_URL } from './src/services/api';

// Initialize Convex Client
// const convex = new ConvexReactClient(CONVEX_URL);

import Toast from 'react-native-toast-message';
import { toastConfig } from './src/utils/toastUtils';

export default function App() {
  return (
    <AuthProvider>
      <View style={{ flex: 1, backgroundColor: '#020617' }}>
        <NavigationContainer>
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
      </View>
      <Toast config={toastConfig} />
    </AuthProvider>
  );
}
