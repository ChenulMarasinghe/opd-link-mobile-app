import {
    createPatientProfile,
    getPatientProfile,
    PatientLanguage,
    PatientProfile,
    PatientProfileUpdates,
    updatePatientProfile,
} from '@/services/profileService';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import LogoutButton from '../../components/LogoutButton';

const PATIENT_ID = 'patient_demo';

type EditableDetails = Pick<PatientProfile, 'fullName' | 'phone' | 'email' | 'nicNumber'>;
type EditableFieldErrors = Record<keyof EditableDetails, string | null>;

interface ProfileSettingsScreenProps {
  onBack?: () => void;
  onOpenClinicStatus?: () => void;
}

const EMPTY_DETAILS: EditableDetails = {
  fullName: '',
  phone: '',
  email: '',
  nicNumber: '',
};

const EMPTY_FIELD_ERRORS: EditableFieldErrors = {
  fullName: null,
  phone: null,
  email: null,
  nicNumber: null,
};

function validateFullName(value: string): string | null {
  const name = value.trim();
  if (!name) return 'Enter your full name.';
  if (!/^[A-Za-z]+(?: +[A-Za-z]+)*$/.test(name)) {
    return 'Use letters and spaces only.';
  }
  return null;
}

function validatePhone(value: string): string | null {
  if (!value) return 'Enter your contact number.';
  if (!/^07\d{8}$/.test(value)) return 'Enter 10 digits starting with 07.';
  return null;
}

function validateEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return 'Enter your email address.';
  if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
    return 'Enter a valid email address.';
  }
  return null;
}

function validateNicNumber(value: string): string | null {
  const nicNumber = value.trim().toUpperCase();
  if (!nicNumber) return 'Enter your NIC or ID number.';
  if (!/^\d{12}$/.test(nicNumber) && !/^\d{9}[VX]$/.test(nicNumber)) {
    return 'Enter a valid NIC or ID number.';
  }
  return null;
}

export default function ProfileSettingsScreen({
  onBack,
  onOpenClinicStatus,
}: ProfileSettingsScreenProps) {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [draft, setDraft] = useState<EditableDetails>(EMPTY_DETAILS);
  const [fieldErrors, setFieldErrors] = useState<EditableFieldErrors>(EMPTY_FIELD_ERRORS);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [savingSetting, setSavingSetting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setLoading(true);
      setLoadError(null);

      try {
        let loadedProfile = await getPatientProfile(PATIENT_ID);
        if (!loadedProfile) {
          loadedProfile = await createPatientProfile(PATIENT_ID);
        }

        if (isMounted) {
          setProfile(loadedProfile);
          setDraft({
            fullName: loadedProfile.fullName,
            phone: loadedProfile.phone,
            email: loadedProfile.email,
            nicNumber: loadedProfile.nicNumber,
          });
          setEditing(!loadedProfile.fullName && !loadedProfile.phone && !loadedProfile.email);
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(error instanceof Error ? error.message : 'Failed to load profile.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [retryCount]);

  const startEditing = () => {
    if (!profile) return;
    setDraft({
      fullName: profile.fullName,
      phone: profile.phone,
      email: profile.email,
      nicNumber: profile.nicNumber,
    });
    setFeedback(null);
    setFieldErrors(EMPTY_FIELD_ERRORS);
    setEditing(true);
  };

  const cancelEditing = () => {
    if (!profile) return;
    setDraft({
      fullName: profile.fullName,
      phone: profile.phone,
      email: profile.email,
      nicNumber: profile.nicNumber,
    });
    setFeedback(null);
    setFieldErrors(EMPTY_FIELD_ERRORS);
    setEditing(false);
  };

  const saveProfile = async () => {
    const updates: EditableDetails = {
      fullName: draft.fullName.trim(),
      phone: draft.phone,
      email: draft.email.trim(),
      nicNumber: draft.nicNumber.trim().toUpperCase(),
    };
    const errors: EditableFieldErrors = {
      fullName: validateFullName(updates.fullName),
      phone: validatePhone(updates.phone),
      email: validateEmail(updates.email),
      nicNumber: validateNicNumber(updates.nicNumber),
    };

    setFieldErrors(errors);
    setFeedback(null);
    if (Object.values(errors).some(Boolean)) return;

    setSaving(true);

    try {
      await updatePatientProfile(PATIENT_ID, updates);
      setProfile((current) => current ? { ...current, ...updates } : current);
      setEditing(false);
      setFieldErrors(EMPTY_FIELD_ERRORS);
      setFeedback({ type: 'success', message: 'Profile updated successfully.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to update profile.',
      });
    } finally {
      setSaving(false);
    }
  };

  const saveSetting = async (updates: PatientProfileUpdates) => {
    if (!profile || savingSetting) return;

    const previousProfile = profile;
    setProfile({ ...profile, ...updates });
    setSavingSetting(true);
    setFeedback(null);

    try {
      await updatePatientProfile(PATIENT_ID, updates);
      setFeedback({ type: 'success', message: 'Setting updated.' });
    } catch (error) {
      setProfile(previousProfile);
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to update setting.',
      });
    } finally {
      setSavingSetting(false);
    }
  };

  const chooseLanguage = (language: PatientLanguage) => {
    if (profile?.language !== language) saveSetting({ language });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {onBack ? (
          <Pressable style={styles.backButton} onPress={onBack} accessibilityLabel="Go back">
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
        ) : (
          <View style={styles.backButtonPlaceholder} />
        )}

        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>Profile &amp; Settings</Text>
        </View>

        <Pressable
          style={styles.langPill}
          onPress={() => chooseLanguage(profile?.language === 'en' ? 'si' : 'en')}
          disabled={!profile || savingSetting}
        >
          <Text style={styles.langText}>{profile?.language === 'si' ? 'සි | EN' : 'EN | සි'}</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <ActivityIndicator size="large" color="#635BFF" style={styles.loader} />
        ) : loadError ? (
          <View style={styles.messageCard}>
            <Text style={styles.errorText}>{loadError}</Text>
            <Pressable style={styles.retryButton} onPress={() => setRetryCount((count) => count + 1)}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : profile ? (
          <>
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                <View style={styles.avatarHead} />
                <View style={styles.avatarBody} />
              </View>
              <View style={styles.profileSummary}>
                <Text style={styles.profileName} numberOfLines={1}>
                  {profile.fullName || 'Name not set'}
                </Text>
                <Text style={styles.patientId}>Patient ID: {profile.patientId}</Text>
              </View>
              {editing ? (
                <View style={styles.editActions}>
                  <Pressable style={styles.cancelButton} onPress={cancelEditing} disabled={saving}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={styles.editProfileButton} onPress={saveProfile} disabled={saving}>
                    {saving ? (
                      <ActivityIndicator size="small" color="#635BFF" />
                    ) : (
                      <Text style={styles.editText}>Save</Text>
                    )}
                  </Pressable>
                </View>
              ) : (
                <Pressable style={styles.editProfileButton} onPress={startEditing}>
                  <Text style={styles.editText}>Edit Profile</Text>
                </Pressable>
              )}
            </View>

            <Text style={styles.sectionLabel}>PERSONAL INFORMATION</Text>
            <View style={styles.infoCard}>
              <ProfileField
                label="Full Name"
                value={editing ? draft.fullName : profile.fullName}
                placeholder="Enter full name"
                editing={editing}
                error={fieldErrors.fullName}
                onChangeText={(fullName) => {
                  setDraft((current) => ({ ...current, fullName }));
                  if (fieldErrors.fullName) {
                    setFieldErrors((current) => ({ ...current, fullName: validateFullName(fullName) }));
                  }
                }}
                autoCapitalize="words"
              />
              <ProfileField
                label="Contact Number"
                value={editing ? draft.phone : profile.phone}
                placeholder="Enter contact number"
                editing={editing}
                error={fieldErrors.phone}
                onChangeText={(value) => {
                  const phone = value.replace(/\D/g, '').slice(0, 10);
                  setDraft((current) => ({ ...current, phone }));
                  if (fieldErrors.phone) {
                    setFieldErrors((current) => ({ ...current, phone: validatePhone(phone) }));
                  }
                }}
                keyboardType="phone-pad"
              />
              <ProfileField
                label="Email"
                value={editing ? draft.email : profile.email}
                placeholder="Enter email address"
                editing={editing}
                error={fieldErrors.email}
                onChangeText={(email) => {
                  setDraft((current) => ({ ...current, email }));
                  if (fieldErrors.email) {
                    setFieldErrors((current) => ({ ...current, email: validateEmail(email) }));
                  }
                }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <ProfileField
                label="NIC / ID Number"
                value={editing ? draft.nicNumber : profile.nicNumber}
                placeholder="Enter NIC or ID number"
                editing={editing}
                error={fieldErrors.nicNumber}
                onChangeText={(value) => {
                  const nicNumber = value.toUpperCase();
                  setDraft((current) => ({ ...current, nicNumber }));
                  if (fieldErrors.nicNumber) {
                    setFieldErrors((current) => ({ ...current, nicNumber: validateNicNumber(nicNumber) }));
                  }
                }}
                autoCapitalize="characters"
                last
              />
            </View>

            <Text style={styles.sectionLabel}>PREFERENCES</Text>
            <View style={styles.preferencesCard}>
              <View style={styles.languageRow}>
                <Text style={styles.preferenceLabel}>Language</Text>
                <View style={styles.languageOptions}>
                  <Pressable
                    style={[styles.languageOption, profile.language === 'en' && styles.languageSelected]}
                    onPress={() => chooseLanguage('en')}
                    disabled={savingSetting}
                  >
                    <Text style={[styles.languageText, profile.language === 'en' && styles.languageTextSelected]}>EN</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.languageOption, profile.language === 'si' && styles.languageSelected]}
                    onPress={() => chooseLanguage('si')}
                    disabled={savingSetting}
                  >
                    <Text style={[styles.languageText, profile.language === 'si' && styles.languageTextSelected]}>සිංහල</Text>
                  </Pressable>
                </View>
              </View>
              <PreferenceSwitch
                label="Notifications"
                value={profile.notificationsEnabled}
                onValueChange={(notificationsEnabled) => saveSetting({ notificationsEnabled })}
                disabled={savingSetting}
              />
              <PreferenceSwitch
                label="SMS Token Updates"
                value={profile.smsTokenUpdatesEnabled}
                onValueChange={(smsTokenUpdatesEnabled) => saveSetting({ smsTokenUpdatesEnabled })}
                disabled={savingSetting}
                last
              />
            </View>

            <Text style={styles.sectionLabel}>SUPPORT</Text>
            <View style={styles.supportCard}>
              <SupportRow label="Help & FAQ" />
              <SupportRow label="Contact Hospital" />
              <SupportRow label="Clinic Status" onPress={onOpenClinicStatus} last />
            </View>

            <View style={styles.logoutContainer}>
              <LogoutButton />
            </View>

            {feedback && (
              <Text style={feedback.type === 'success' ? styles.successText : styles.errorText}>
                {feedback.message}
              </Text>
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

interface ProfileFieldProps {
  label: string;
  value: string;
  placeholder: string;
  editing: boolean;
  error: string | null;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  last?: boolean;
}

function ProfileField({
  label,
  value,
  placeholder,
  editing,
  error,
  onChangeText,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  last = false,
}: ProfileFieldProps) {
  return (
    <View style={[styles.infoField, !last && styles.rowDivider]}>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        {editing ? (
          <TextInput
            style={[styles.infoInput, error && styles.infoInputInvalid]}
            value={value}
            placeholder={placeholder}
            placeholderTextColor="#94A3B8"
            onChangeText={onChangeText}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            autoCorrect={false}
          />
        ) : (
          <Text style={styles.infoValue} numberOfLines={1}>
            {value || 'Not provided'}
          </Text>
        )}
      </View>
      {editing && error !== null && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

interface PreferenceSwitchProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled: boolean;
  last?: boolean;
}

function PreferenceSwitch({ label, value, onValueChange, disabled, last = false }: PreferenceSwitchProps) {
  return (
    <View style={[styles.preferenceRow, !last && styles.rowDivider]}>
      <Text style={styles.preferenceLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: '#CBD5E1', true: '#C4B5FD' }}
        thumbColor={value ? '#635BFF' : '#F8FAFC'}
      />
    </View>
  );
}

interface SupportRowProps {
  label: string;
  onPress?: () => void;
  last?: boolean;
}

function SupportRow({ label, onPress, last = false }: SupportRowProps) {
  const content = (
    <>
      <Text style={styles.supportLabel}>{label}</Text>
      <Text style={styles.supportChevron}>›</Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable style={[styles.supportRow, !last && styles.rowDivider]} onPress={onPress}>
        {content}
      </Pressable>
    );
  }

  return <View style={[styles.supportRow, !last && styles.rowDivider]}>{content}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDF4FF',
  },
  header: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    backgroundColor: '#EDF4FF',
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
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  langPill: {
    minWidth: 46,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DCE8F8',
    alignItems: 'center',
  },
  langText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1E293B',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 28,
  },
  scrollView: {
    flex: 1,
  },
  loader: {
    marginTop: 48,
  },
  profileCard: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E8F4',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarHead: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#635BFF',
    marginBottom: 2,
  },
  avatarBody: {
    width: 19,
    height: 9,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    backgroundColor: '#635BFF',
  },
  profileSummary: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#17243A',
  },
  patientId: {
    marginTop: 2,
    fontSize: 10,
    color: '#66758C',
  },
  editText: {
    color: '#5148D8',
    fontSize: 11,
    fontWeight: '700',
  },
  editProfileButton: {
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 11,
    borderRadius: 11,
    backgroundColor: '#EEF2FF',
  },
  cancelButton: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cancelText: {
    color: '#66758C',
    fontSize: 10,
    fontWeight: '600',
  },
  sectionLabel: {
    marginLeft: 6,
    marginBottom: 7,
    marginTop: 2,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#68778D',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E8F4',
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 14,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  infoRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  infoField: {
    paddingVertical: 3,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EAF0F7',
  },
  infoLabel: {
    flex: 1,
    fontSize: 11,
    color: '#66758C',
  },
  infoValue: {
    flex: 1.4,
    fontSize: 11,
    fontWeight: '600',
    color: '#25344B',
    textAlign: 'right',
  },
  infoInput: {
    flex: 1.5,
    minHeight: 40,
    paddingHorizontal: 9,
    paddingVertical: 7,
    fontSize: 11,
    color: '#25344B',
    textAlign: 'right',
    backgroundColor: '#F8FAFF',
    borderWidth: 1,
    borderColor: '#DCE4F0',
    borderRadius: 9,
  },
  infoInputInvalid: {
    borderColor: '#DC2626',
  },
  fieldError: {
    marginLeft: '40%',
    marginTop: 2,
    marginBottom: 5,
    fontSize: 10,
    lineHeight: 14,
    color: '#B91C1C',
  },
  preferencesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E8F4',
    paddingHorizontal: 14,
    paddingVertical: 3,
    marginBottom: 14,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  languageRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EAF0F7',
  },
  preferenceRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  preferenceLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#52627A',
  },
  languageOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  languageOption: {
    minWidth: 42,
    minHeight: 30,
    paddingHorizontal: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#DCE4F0',
    backgroundColor: '#FFFFFF',
  },
  languageSelected: {
    backgroundColor: '#635BFF',
    borderColor: '#635BFF',
  },
  languageText: {
    fontSize: 10,
    color: '#52627A',
  },
  languageTextSelected: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  supportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E8F4',
    paddingHorizontal: 14,
    paddingVertical: 3,
    marginBottom: 14,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  supportRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  supportLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#25344B',
  },
  supportChevron: {
    fontSize: 21,
    color: '#8A97AA',
    lineHeight: 24,
  },
  logoutContainer: {
    minHeight: 48,
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#DCE8F8',
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  messageCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginTop: 12,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 6,
  },
  successText: {
    color: '#047857',
    fontSize: 10,
    textAlign: 'center',
    marginVertical: 8,
  },
  retryButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
  },
  retryText: {
    color: '#635BFF',
    fontSize: 11,
    fontWeight: '700',
  },
});