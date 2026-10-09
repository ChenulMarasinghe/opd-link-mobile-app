import { useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AdminDashboard from '@/screens/admin/AdminDashboard';
import AppointmentManagement from '@/screens/admin/AppointmentManagement';
import BroadcastDelay from '@/screens/admin/BroadcastDelay';
import ManageOPD from '@/screens/admin/ManageOPD';
import QueueManagement from '@/screens/admin/QueueManagement';
import type { Doctor } from '@/services/adminService';

type Tab = 'overview' | 'appointments' | 'queues' | 'manage';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: '⊞' },
  { key: 'appointments', label: 'Appts', icon: '📅' },
  { key: 'queues', label: 'Queues', icon: '〰' },
  { key: 'manage', label: 'Manage', icon: '⚙' },
];

export default function AdminTabNavigator() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [broadcastDoctor, setBroadcastDoctor] = useState<{
    doctor: Doctor;
    isDemo: boolean;
  } | null>(null);

  const renderScreen = () => {
    if (activeTab === 'queues' && broadcastDoctor) {
      return (
        <BroadcastDelay
          doctor={broadcastDoctor.doctor}
          doctorId={broadcastDoctor.doctor.id}
          doctorName={broadcastDoctor.doctor.name}
          isDemo={broadcastDoctor.isDemo}
          onDone={() => setBroadcastDoctor(null)}
        />
      );
    }

    switch (activeTab) {
      case 'overview':
        return <AdminDashboard />;
      case 'appointments':
        return <AppointmentManagement />;
      case 'queues':
        return (
          <QueueManagement
            onBroadcastDelay={(doctor, isDemo) => setBroadcastDoctor({ doctor, isDemo })}
          />
        );
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
                onPress={() => {
                  setActiveTab(tab.key);
                  if (tab.key !== 'queues') setBroadcastDoctor(null);
                }}
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
    backgroundColor: '#6B7DEB',
    borderTopWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 10,
  },
  tabBarInner: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 0 : 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    gap: 2,
    position: 'relative',
  },
  tabIcon: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.8)',
  },
  tabIconActive: {
    color: '#ffffff',
  },
  tabLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    top: -8,
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#ffffff',
  },
});
