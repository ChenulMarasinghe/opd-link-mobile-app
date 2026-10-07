import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { broadcastDelay, updateQueueStatus, getDoctors } from '@/services/adminService';
import type { Doctor } from '@/services/adminService';

const TODAY = new Date().toISOString().split('T')[0];

const DELAY_OPTIONS = [5, 10, 15, 20, 30, 45, 60];

const MESSAGE_TEMPLATES = [
  'Doctor is delayed due to an emergency case.',
  'Doctor is attending an urgent consultation.',
  'Session will start shortly. Thank you for your patience.',
  'Technical issue causing a brief delay.',
];

export default function BroadcastDelay() {
  const params = useLocalSearchParams<{
    doctorId?: string;
    doctorName?: string;
  }>();

  const [doctorsList, setDoctorsList] = useState<Doctor[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>(params.doctorId || '');
  const [selectedDocName, setSelectedDocName] = useState<string>(params.doctorName || '');
  const [showDoctorPicker, setShowDoctorPicker] = useState(false);

  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);

  React.useEffect(() => {
    getDoctors().then((docs) => {
      setDoctorsList(docs);
      if (!params.doctorId && docs.length > 0) {
        setSelectedDocId(docs[0].id || '');
        setSelectedDocName(docs[0].name);
      }
    });
  }, [params.doctorId]);

  const activeDocId = selectedDocId || params.doctorId || (doctorsList[0]?.id ?? '');
  const activeDocName = selectedDocName || params.doctorName || (doctorsList[0]?.name ?? 'Doctor');
  const activeDoctor = doctorsList.find((d) => d.id === activeDocId) || doctorsList[0];

  const handleTemplateSelect = (msg: string) => {
    setCustomMessage(msg);
  };

  const handleBroadcast = async () => {
    if (!selectedMinutes) {
      Alert.alert('Select Delay', 'Please select the delay duration first.');
      return;
    }

    if (!activeDocId) {
      Alert.alert('Select Doctor', 'Please select a doctor to broadcast delay for.');
      return;
    }

    const message =
      customMessage.trim() ||
      `${activeDocName} session is delayed by ${selectedMinutes} minutes. We apologize for the inconvenience.`;

    setSaving(true);
    try {
      await Promise.all([
        broadcastDelay({
          doctorId: activeDocId,
          doctorName: activeDocName,
          message,
          minutes: selectedMinutes,
        }),
        updateQueueStatus(activeDocId, TODAY, 'delayed', selectedMinutes),
      ]);
      setSent(true);
    } catch (e) {
      Alert.alert('Error', 'Failed to broadcast delay. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (sent) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Text style={styles.successIconText}>📢</Text>
          </View>
          <Text style={styles.successTitle}>Delay Broadcast Sent!</Text>
          <Text style={styles.successSubtitle}>
            All patients waiting for {activeDocName} have been notified of a +{selectedMinutes}m delay.
          </Text>
          <View style={styles.successDetails}>
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>Doctor:</Text>
              <Text style={styles.successValue}>{activeDocName}</Text>
            </View>
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>Delay:</Text>
              <Text style={styles.successValue}>+{selectedMinutes} minutes</Text>
            </View>
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>Status:</Text>
              <View style={styles.sentBadge}>
                <Text style={styles.sentBadgeText}>✓ Notification Sent</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sendAnotherBtn}
            onPress={() => {
              setSent(false);
              setSelectedMinutes(null);
              setCustomMessage('');
            }}
          >
            <Text style={styles.sendAnotherText}>Send Another Update</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Broadcast Delay</Text>
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Doctor Card */}
          <TouchableOpacity
            style={styles.doctorCard}
            onPress={() => setShowDoctorPicker(!showDoctorPicker)}
            activeOpacity={0.8}
          >
            <View style={styles.doctorAvatar}>
              <Text style={styles.avatarText}>
                {activeDocName ? activeDocName.charAt(0) : 'D'}
              </Text>
            </View>
            <View style={styles.doctorInfo}>
              <Text style={styles.doctorName}>{activeDocName}</Text>
              <Text style={styles.doctorSub}>
                {activeDoctor ? `${activeDoctor.room} • ${activeDoctor.department}` : 'Broadcasting a delay notification'}
              </Text>
            </View>
            <View style={styles.broadcastBadge}>
              <Text style={styles.broadcastBadgeText}>
                {showDoctorPicker ? '▲ Close' : '▼ Change'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Doctor Picker Dropdown */}
          {showDoctorPicker && (
            <View style={styles.doctorPickerDropdown}>
              {doctorsList.map((doc) => (
                <TouchableOpacity
                  key={doc.id}
                  style={[
                    styles.doctorPickerItem,
                    doc.id === activeDocId && styles.doctorPickerItemActive,
                  ]}
                  onPress={() => {
                    setSelectedDocId(doc.id || '');
                    setSelectedDocName(doc.name);
                    setShowDoctorPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.doctorPickerName,
                      doc.id === activeDocId && styles.doctorPickerNameActive,
                    ]}
                  >
                    {doc.name}
                  </Text>
                  <Text style={styles.doctorPickerDept}>
                    {doc.department} • {doc.room}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Delay Duration */}
          <Text style={styles.sectionTitle}>Select Delay Duration</Text>
          <View style={styles.delayGrid}>
            {DELAY_OPTIONS.map((min) => (
              <TouchableOpacity
                key={min}
                style={[
                  styles.delayOption,
                  selectedMinutes === min && styles.delayOptionActive,
                ]}
                onPress={() => setSelectedMinutes(min)}
              >
                <Text
                  style={[
                    styles.delayOptionNum,
                    selectedMinutes === min && styles.delayOptionNumActive,
                  ]}
                >
                  +{min}
                </Text>
                <Text
                  style={[
                    styles.delayOptionLabel,
                    selectedMinutes === min && styles.delayOptionLabelActive,
                  ]}
                >
                  mins
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Message Templates */}
          <Text style={styles.sectionTitle}>Message Template</Text>
          <View style={styles.templatesWrap}>
            {MESSAGE_TEMPLATES.map((msg) => (
              <TouchableOpacity
                key={msg}
                style={[
                  styles.templateChip,
                  customMessage === msg && styles.templateChipActive,
                ]}
                onPress={() => handleTemplateSelect(msg)}
              >
                <Text
                  style={[
                    styles.templateChipText,
                    customMessage === msg && styles.templateChipTextActive,
                  ]}
                >
                  {msg}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Message */}
          <Text style={styles.sectionTitle}>Custom Message</Text>
          <View style={styles.messageCard}>
            <TextInput
              style={styles.messageInput}
              placeholder={`e.g. ${activeDocName} session is delayed due to an emergency. We apologize for the inconvenience.`}
              placeholderTextColor="#B0B4BA"
              value={customMessage}
              onChangeText={setCustomMessage}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{customMessage.length} / 200</Text>
          </View>

          {/* Preview */}
          {selectedMinutes && (
            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>📱 Notification Preview</Text>
              <View style={styles.previewNotif}>
                <Text style={styles.previewNotifTitle}>OPD Delay Alert</Text>
                <Text style={styles.previewNotifBody}>
                  {customMessage.trim() ||
                    `${activeDocName} session is delayed by ${selectedMinutes} minutes. We apologize for the inconvenience.`}
                </Text>
                <Text style={styles.previewNotifTime}>Just now</Text>
              </View>
            </View>
          )}

          {/* Broadcast Button */}
          <TouchableOpacity
            style={[styles.broadcastBtn, (!selectedMinutes || saving) && styles.broadcastBtnDisabled]}
            onPress={handleBroadcast}
            disabled={!selectedMinutes || saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.broadcastBtnText}>
                📢 Broadcast Delay {selectedMinutes ? `(+${selectedMinutes}m)` : ''}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F6FA' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#EAEDF3',
    gap: 12,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 16, color: '#5B6CF8', fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1A1D2E' },

  scroll: { flex: 1 },

  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  doctorAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#5B6CF8' },
  doctorInfo: { flex: 1 },
  doctorName: { fontSize: 15, fontWeight: '700', color: '#1A1D2E' },
  doctorSub: { fontSize: 12, color: '#8B90A7', marginTop: 2 },
  broadcastBadge: {
    backgroundColor: '#FFF3E8',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  broadcastBadgeText: { fontSize: 11, color: '#EA580C', fontWeight: '700' },
  doctorPickerDropdown: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: -8,
    marginBottom: 12,
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#EAEDF3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  doctorPickerItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  doctorPickerItemActive: {
    backgroundColor: '#EEF2FF',
  },
  doctorPickerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1D2E',
  },
  doctorPickerNameActive: {
    color: '#5B6CF8',
  },
  doctorPickerDept: {
    fontSize: 11,
    color: '#8B90A7',
    marginTop: 2,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    paddingHorizontal: 16,
    marginBottom: 10,
    marginTop: 4,
  },

  delayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 16,
  },
  delayOption: {
    width: '13%',
    minWidth: 52,
    aspectRatio: 0.9,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  delayOptionActive: {
    backgroundColor: '#5B6CF8',
    borderColor: '#5B6CF8',
  },
  delayOptionNum: { fontSize: 16, fontWeight: '800', color: '#374151' },
  delayOptionNumActive: { color: '#fff' },
  delayOptionLabel: { fontSize: 10, color: '#9CA3AF', marginTop: 1 },
  delayOptionLabelActive: { color: 'rgba(255,255,255,0.8)' },

  templatesWrap: { paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  templateChip: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  templateChipActive: { backgroundColor: '#EEF2FF', borderColor: '#5B6CF8' },
  templateChipText: { fontSize: 13, color: '#4B5563', lineHeight: 18 },
  templateChipTextActive: { color: '#5B6CF8' },

  messageCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  messageInput: {
    fontSize: 14,
    color: '#1A1D2E',
    minHeight: 90,
    lineHeight: 20,
  },
  charCount: { fontSize: 11, color: '#B0B4BA', textAlign: 'right', marginTop: 6 },

  previewCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  previewTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 10 },
  previewNotif: {
    backgroundColor: '#F8F9FB',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#5B6CF8',
  },
  previewNotifTitle: { fontSize: 13, fontWeight: '700', color: '#1A1D2E', marginBottom: 4 },
  previewNotifBody: { fontSize: 12, color: '#4B5563', lineHeight: 18 },
  previewNotifTime: { fontSize: 10, color: '#9CA3AF', marginTop: 6 },

  broadcastBtn: {
    backgroundColor: '#5B6CF8',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#5B6CF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  broadcastBtnDisabled: { opacity: 0.5, shadowOpacity: 0 },
  broadcastBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  cancelBtn: { alignItems: 'center', paddingVertical: 12 },
  cancelBtnText: { fontSize: 14, color: '#8B90A7' },

  // Success State
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successIconText: { fontSize: 36 },
  successTitle: { fontSize: 22, fontWeight: '800', color: '#1A1D2E', marginBottom: 8, textAlign: 'center' },
  successSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  successDetails: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    width: '100%',
    gap: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  successRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  successLabel: { fontSize: 13, color: '#8B90A7' },
  successValue: { fontSize: 14, fontWeight: '600', color: '#1A1D2E' },
  sentBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sentBadgeText: { fontSize: 12, color: '#16A34A', fontWeight: '700' },
  doneBtn: {
    backgroundColor: '#5B6CF8',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 48,
    marginBottom: 12,
  },
  doneBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  sendAnotherBtn: { padding: 8 },
  sendAnotherText: { fontSize: 13, color: '#5B6CF8', fontWeight: '600' },

  bottomSpacer: { height: 100 },
});
