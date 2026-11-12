import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AppProvider, useApp } from './src/context/AppContext';
import { theme } from './src/constants/theme';
import StockNotificationModal from './src/components/StockNotificationModal';

import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import POSScreen from './src/screens/POSScreen';
import ProductsScreen from './src/screens/ProductsScreen';
import CustomersScreen from './src/screens/CustomersScreen';
import ServicesRepairsScreen from './src/screens/ServicesRepairsScreen';
import ExpensesScreen from './src/screens/ExpensesScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  const {
    t,
    products = [],
    customers = [],
    repairs = [],
    openStockModal,
    currentUser,
    logout,
    refreshAllFromFirebase,
    isRTL,
  } = useApp();

  const lowStockCount = (products || []).filter(
    (p) => Number(p.stock || 0) <= Number(p.minStock || 5)
  ).length;
  const customersWithDebtCount = (customers || []).filter((c) => (c.debt || 0) > 0).length;
  const pendingRepairsCount = (repairs || []).filter((r) => r.status !== 'delivered' && r.status !== 'cancelled').length;

  const handleLogout = () => {
    const confirmMsg = isRTL ? 'هل تريد تسجيل الخروج؟' : 'Voulez-vous vous déconnecter ?';
    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' && window.confirm ? window.confirm(confirmMsg) : true;
      if (confirmed) logout();
      return;
    }
    Alert.alert(
      isRTL ? 'تسجيل الخروج' : 'Déconnexion',
      confirmMsg,
      [
        { text: t('cancel'), style: 'cancel' },
        { text: isRTL ? 'خروج' : 'Déconnexion', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 17,
        },
        headerRight: () => (
          <View style={styles.headerRightContainer}>
            {/* User Pill */}
            {currentUser && (
              <View style={styles.userBadge}>
                <Ionicons name="person-circle" size={16} color="#ffffff" />
                <Text style={styles.userBadgeText}>@{currentUser.username}</Text>
              </View>
            )}

            {/* Low stock notification bell */}
            <TouchableOpacity style={styles.headerIconBtn} onPress={openStockModal}>
              <Ionicons name="notifications" size={19} color="#ffffff" />
              {lowStockCount > 0 && (
                <View style={styles.headerBellBadge}>
                  <Text style={styles.headerBellBadgeText}>{lowStockCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Logout button */}
            <TouchableOpacity style={styles.headerIconBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={19} color="#ffffff" />
            </TouchableOpacity>
          </View>
        ),
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 26 : 8,
          paddingTop: 8,
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        listeners={{
          tabPress: () => refreshAllFromFirebase(),
        }}
        options={{
          title: t('dashboard'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="POS"
        component={POSScreen}
        listeners={{
          tabPress: () => refreshAllFromFirebase(),
        }}
        options={{
          title: t('pos'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="barcode-outline" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Products"
        component={ProductsScreen}
        listeners={{
          tabPress: () => refreshAllFromFirebase(),
        }}
        options={{
          title: t('products'),
          tabBarBadge: lowStockCount > 0 ? lowStockCount : undefined,
          tabBarBadgeStyle: { backgroundColor: theme.colors.warning },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Customers"
        component={CustomersScreen}
        listeners={{
          tabPress: () => refreshAllFromFirebase(),
        }}
        options={{
          title: t('customers'),
          tabBarBadge: customersWithDebtCount > 0 ? customersWithDebtCount : undefined,
          tabBarBadgeStyle: { backgroundColor: theme.colors.danger },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="ServicesRepairs"
        component={ServicesRepairsScreen}
        listeners={{
          tabPress: () => refreshAllFromFirebase(),
        }}
        options={{
          title: t('servicesRepairs'),
          tabBarBadge: pendingRepairsCount > 0 ? pendingRepairsCount : undefined,
          tabBarBadgeStyle: { backgroundColor: '#8b5cf6' },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="construct-outline" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        listeners={{
          tabPress: () => refreshAllFromFirebase(),
        }}
        options={{
          title: t('reports'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function NavigationRoot() {
  const { t } = useApp();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.primary,
          },
          headerTintColor: '#ffffff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ServicesRepairs"
          component={ServicesRepairsScreen}
          options={{ title: t('servicesRepairs') }}
        />
        <Stack.Screen
          name="Expenses"
          component={ExpensesScreen}
          options={{ title: t('expenses') }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: t('settings') }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function MainAppContent() {
  const { stockModalVisible, closeStockModal, currentUser } = useApp();

  if (!currentUser) {
    return <LoginScreen />;
  }

  return (
    <View style={{ flex: 1 }}>
      <NavigationRoot />
      <StockNotificationModal
        visible={stockModalVisible}
        onClose={closeStockModal}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <MainAppContent />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.full,
    marginRight: 6,
  },
  userBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  headerIconBtn: {
    padding: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginLeft: 6,
  },
  headerBellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: theme.colors.danger,
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  headerBellBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },
});
