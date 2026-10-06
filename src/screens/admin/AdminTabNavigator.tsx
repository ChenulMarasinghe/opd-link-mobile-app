import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AdminDashboard from '@/screens/admin/AdminDashboard';
import AppointmentManagement from '@/screens/admin/AppointmentManagement';
import QueueManagement from '@/screens/admin/QueueManagement';
import ManageOPD from '@/screens/admin/ManageOPD';

type Tab = 'overview' | 'appointments' | 'queues' | 'manage';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: '⊞' },
  { key: 'appointments', label: 'Appts', icon: '📅' },
  { key: 'queues', label: 'Queues', icon: '〰' },
  { key: 'manage', label: 'Manage', icon: '⚙' },
];

export default function AdminTabNavigator() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const renderScreen = () => {
    switch (activeTab) {
      case 'overview':
        return <AdminDashboard />;
      case 'appointments':
        return <AppointmentManagement />;
      case 'queues':
        return <QueueManagement />;
      case 'manage':
        return <ManageOPD />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.screenArea}>{renderScreen()}</View>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <SafeAreaView edges={['bottom']} style={styles.tabBarInner}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tabItem}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.tabIcon, isActive && styles.tabIconActive]}
                >
                  {tab.icon}
                </Text>
                <Text
                  style={[styles.tabLabel, isActive && styles.tabLabelActive]}
                >
                  {tab.label}
                </Text>
                {isActive && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
            );
          })}
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  screenArea: { flex: 1 },

  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#EAEDF3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  tabBarInner: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 0 : 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    gap: 2,
    position: 'relative',
  },
  tabIcon: {
    fontSize: 20,
    color: '#9CA3AF',
  },
  tabIconActive: {
    color: '#5B6CF8',
  },
  tabLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#5B6CF8',
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    top: -8,
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#5B6CF8',
  },
});
