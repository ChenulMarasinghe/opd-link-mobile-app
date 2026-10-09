import { useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminDashboard from '@/screens/admin/AdminDashboard';
import AddDepartmentScreen from '@/screens/admin/AddDepartmentScreen';
import AddDoctorScreen from '@/screens/admin/AddDoctorScreen';
import AdminProfileScreen from '@/screens/admin/AdminProfileScreen';
import BroadcastDelay from '@/screens/admin/BroadcastDelay';
import ManageOPD from '@/screens/admin/ManageOPD';
import QueueManagement from '@/screens/admin/QueueManagement';
import StaffManagement from '@/screens/admin/StaffManagement';
import type { Doctor } from '@/services/adminService';

type Tab = 'overview' | 'appointments' | 'manages' | 'profile';
type ManagementPage = 'home' | 'departments' | 'doctors' | 'staff' | 'queue';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: '⌂' },
  { key: 'appointments', label: 'Appts', icon: '▦' },
  { key: 'manages', label: 'Manages', icon: '+' },
  { key: 'profile', label: 'Profile', icon: '●' },
];

export default function AdminTabNavigator() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [managementPage, setManagementPage] = useState<ManagementPage>('home');
  const [broadcastDoctor, setBroadcastDoctor] = useState<{ doctor: Doctor; isDemo: boolean } | null>(null);

  const renderScreen = () => {
    if (activeTab === 'manages' && managementPage === 'queue' && broadcastDoctor) {
      return <BroadcastDelay
        doctor={broadcastDoctor.doctor}
        doctorId={broadcastDoctor.doctor.id}
        doctorName={broadcastDoctor.doctor.name}
        isDemo={broadcastDoctor.isDemo}
        onDone={() => setBroadcastDoctor(null)}
      />;
    }
    switch (activeTab) {
      case 'overview': return <AdminDashboard />;
      case 'appointments': return <QueueManagement showQueueCreator={false} />;
      case 'manages':
        if (managementPage === 'home') return <ManagementHome onSelect={setManagementPage} />;
        if (managementPage === 'departments') return <AddDepartmentScreen onBack={() => setManagementPage('home')} />;
        if (managementPage === 'doctors') return <AddDoctorScreen onBack={() => setManagementPage('home')} />;
        if (managementPage === 'staff') return <StaffManagement onBack={() => setManagementPage('home')} />;
        if (managementPage === 'queue') {
          return <QueueManagement onBack={() => setManagementPage('home')} />;
        }
        return <ManageOPD />;
      case 'profile': return <AdminProfileScreen />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.screenArea}>{renderScreen()}</View>
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
                  setBroadcastDoctor(null);
                  if (tab.key === 'manages') setManagementPage('home');
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={tab.label}
              >
                <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>{tab.icon}</Text>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
                {isActive && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
            );
          })}
        </SafeAreaView>
      </View>
    </View>
  );
}

function ManagementHome({ onSelect }: { onSelect: (page: ManagementPage) => void }) {
  const actions: { label: string; icon: string; page: ManagementPage }[] = [
    { label: 'Add departments', icon: '+', page: 'departments' },
    { label: 'Add doctors', icon: '+', page: 'doctors' },
    { label: 'Add nurse or senior consultant', icon: '+', page: 'staff' },
    { label: 'Make a queue', icon: '+', page: 'queue' },
  ];
  return (
    <SafeAreaView edges={['top']} style={styles.hub}>
      <Text style={styles.hubTitle}>Manages</Text>
      <Text style={styles.hubSubtitle}>Choose what you want to manage</Text>
      <View style={styles.actionList}>
        {actions.map((action) => (
          <TouchableOpacity key={action.page} style={styles.actionButton} onPress={() => onSelect(action.page)} accessibilityRole="button">
            <Text style={styles.actionIcon}>{action.icon}</Text>
            <Text style={styles.actionLabel}>{action.label}</Text>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  screenArea: { flex: 1 },
  hub: { flex: 1, backgroundColor: '#F5F6FA', padding: 20 },
  hubTitle: { color: '#20243A', fontSize: 25, fontWeight: '800' },
  hubSubtitle: { color: '#7B8193', marginTop: 5, marginBottom: 22 },
  actionList: { gap: 12 },
  actionButton: { minHeight: 68, paddingHorizontal: 16, borderRadius: 15, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 14, elevation: 1 },
  actionIcon: { width: 34, height: 34, lineHeight: 34, textAlign: 'center', color: '#5365D9', backgroundColor: '#E9ECFF', borderRadius: 17, fontSize: 22, fontWeight: '700' },
  actionLabel: { flex: 1, color: '#30364D', fontSize: 15, fontWeight: '700' },
  actionArrow: { color: '#8B91A4', fontSize: 26 },
  tabBar: {
    backgroundColor: '#6B7DEB', borderTopWidth: 0, shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 10,
  },
  tabBarInner: { flexDirection: 'row', paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 0 : 10 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 8, gap: 2, position: 'relative' },
  tabIcon: { fontSize: 20, color: 'rgba(255,255,255,0.8)' },
  tabIconActive: { color: '#ffffff' },
  tabLabel: { fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  tabLabelActive: { color: '#ffffff', fontWeight: '700' },
  tabIndicator: { position: 'absolute', top: -8, width: 28, height: 3, borderRadius: 2, backgroundColor: '#ffffff' },
});
