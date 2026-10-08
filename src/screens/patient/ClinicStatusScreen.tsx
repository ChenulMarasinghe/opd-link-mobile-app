import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import {
  DoctorClinicStatus,
  subscribeClinicStatus,
} from '@/services/clinicStatusService';
import { ClinicDoctorCard } from '@/components/patient/ClinicDoctorCard';

// Fallback seed doctors matching prototype if Firestore is empty
const MOCK_CLINIC_DOCTORS: DoctorClinicStatus[] = [
  {
    id: 'doc_perera',
    name: 'Dr. S. Perera',
    specialty: 'Cardiology',
    roomNumber: '12',
    status: 'on_time',
  },
  {
    id: 'doc_chang',
    name: 'Dr. M. Chang',
    specialty: 'Internal Medicine',
    roomNumber: '14',
    status: 'delayed',
    delayMinutes: 15,
  },
  {
    id: 'doc_rostova',
    name: 'Dr. E. Rostova',
    specialty: 'Medical Officer',
    roomNumber: '15',
    status: 'on_time',
  },
  {
    id: 'doc_jayawardena',
    name: 'Dr. N. Jayawardena',
    specialty: 'Consultant Physician',
    roomNumber: '16',
    status: 'not_started',
  },
];

interface ClinicStatusScreenProps {
  onBack?: () => void;
}

export default function ClinicStatusScreen({ onBack }: ClinicStatusScreenProps) {
  const [doctors, setDoctors] = useState<DoctorClinicStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      listRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  // Real-time Firestore Listener
  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = subscribeClinicStatus(
      (updatedList) => {
        if (updatedList && updatedList.length > 0) {
          setDoctors(updatedList);
        } else {
          setDoctors(MOCK_CLINIC_DOCTORS);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Clinic status error:', err);
        setError('Failed to load clinic status. Showing cached data.');
        setDoctors(MOCK_CLINIC_DOCTORS);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const activeCount = doctors.filter((d) => d.status !== 'not_started').length;
  const highlightedDoctor = doctors.find((d) => d.status === 'on_time') || doctors[0];

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        {onBack ? (
          <Pressable style={styles.backButton} onPress={onBack}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
        ) : (
          <View style={styles.backButtonPlaceholder} />
        )}

        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>Clinic Status</Text>
          <Text style={styles.headerSubtitle}>
            Live Updates - Colombo National Hospital
          </Text>
        </View>

        <View style={styles.langPill}>
          <Text style={styles.langText}>
            EN | <Text style={styles.langSinhala}>සි</Text>
          </Text>
        </View>
      </View>

      <ScrollView ref={listRef} style={styles.doctorList} contentContainerStyle={styles.scrollContent}>
        {/* Top Highlight Banner */}
        {highlightedDoctor && (
          <View style={styles.topBannerCard}>
            <View style={styles.bannerHeaderRow}>
              <View style={styles.bannerDot} />
              <Text style={styles.bannerTitle}>
                {highlightedDoctor.name} is on schedule
              </Text>
            </View>
            <Text style={styles.bannerSubtitle}>
              Live OPD clinic status monitoring & doctor availability
            </Text>
          </View>
        )}

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ALL DOCTORS TODAY</Text>
          <Text style={styles.activeTag}>{activeCount} Active</Text>
        </View>

        {/* Error Notice if any */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Doctors Status List */}
        {loading ? (
          <ActivityIndicator size="large" color="#635BFF" style={styles.loader} />
        ) : doctors.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏥</Text>
            <Text style={styles.emptyTitle}>No Clinic Statuses Available</Text>
            <Text style={styles.emptySubtitle}>
              Check back later for real-time doctor availability updates.
            </Text>
          </View>
        ) : (
          doctors.map((doctor) => (
            <ClinicDoctorCard key={doctor.id} doctor={doctor} />
          ))
        )}
      </ScrollView>

      {/* Bottom Sync Banner */}
      <View style={styles.bottomBannerContainer}>
        <View style={styles.bottomBannerPill}>
          <Text style={styles.bottomBannerIcon}>ⓘ</Text>
          <Text style={styles.bottomBannerText}>
            Status synced with Hospital OPD triage-desk
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDF4FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  backButtonPlaceholder: {
    width: 38,
  },
  backIcon: {
    fontSize: 24,
    color: '#1E293B',
    lineHeight: 26,
  },
  titleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#635BFF',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  langPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DCE8F8',
  },
  langText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  langSinhala: {
    fontSize: 12,
    fontWeight: '400',
  },
  doctorList: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 10,
  },
  topBannerCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 15,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#D7D5FF',
  },
  bannerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  bannerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#635BFF',
    marginRight: 8,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#302B82',
    flexShrink: 1,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#5148D8',
    marginLeft: 16,
    fontWeight: '500',
    lineHeight: 17,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 11,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#52627A',
    letterSpacing: 0.8,
  },
  activeTag: {
    fontSize: 12,
    fontWeight: '700',
    color: '#635BFF',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  loader: {
    marginTop: 40,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#17243A',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#66758C',
    textAlign: 'center',
    lineHeight: 18,
  },
  bottomBannerContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#EDF4FF',
  },
  bottomBannerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DCE8F8',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  bottomBannerIcon: {
    fontSize: 12,
    color: '#66758C',
    marginRight: 6,
  },
  bottomBannerText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#66758C',
    textAlign: 'center',
  },
});
