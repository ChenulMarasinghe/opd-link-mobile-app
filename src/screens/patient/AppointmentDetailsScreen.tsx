import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import {
  AppointmentDetail, subscribeAppointment, updateAppointmentNote,
} from "../../services/appointmentDetails";
import {
  cancelAppointment, deleteAppointment, isPastAppointment,
} from "../../services/myAppointments";
import { formatDate, toISODate } from "../../utils/datetime";

const weekday = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long" });
};

const getStatus = (a: AppointmentDetail) => {
  if (a.status === "cancelled") return { label: "Cancelled", color: "#EF4444" };
  if (a.status === "completed") return { label: "Completed", color: "#10B981" };
  if (isPastAppointment(a)) return { label: "Missed", color: "#6B7280" };
  return { label: "Upcoming", color: "#7B83F4" };
};

function Row({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={20} color="#7B83F4" />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function AppointmentDetailsScreen() {
  const { user } = useAuth();
  const { id, returnTo } = useLocalSearchParams<{ id: string; returnTo?: string }>();
  const [appt, setAppt] = useState<AppointmentDetail | null | undefined>(undefined);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  useEffect(() => {
    if (!id) { setAppt(null); return; }
    return subscribeAppointment(id, setAppt, () => setAppt(null));
  }, [id]);

  useEffect(() => {
    if (appt) setNote(appt.patientNote ?? "");
  }, [appt?.patientNote]);

  const goBack = () =>
    router.replace(returnTo === "/upcoming-appointments" ? "/upcoming-appointments" : "/dashboard");

  // Not found, or belongs to another patient
  if (appt === undefined) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#7B83F4" /></View>;
  }
  if (appt === null || appt.patientId !== user?.uid) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color="#9CA3AF" />
        <Text style={styles.notFound}>Appointment not found</Text>
        <Pressable style={styles.primaryBtn} onPress={goBack}>
          <Text style={styles.primaryText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const status = getStatus(appt);
  const isUpcoming = status.label === "Upcoming";
  const isToday = appt.date === toISODate(new Date());
  const noteChanged = note.trim() !== (appt.patientNote ?? "");

  const onSaveNote = async () => {
    try {
      setSaving(true);
      await updateAppointmentNote(appt.id, note);
      Alert.alert("Saved", "Your note has been updated.");
    } catch {
      Alert.alert("Could not save", "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const onCancel = () =>
    Alert.alert("Cancel appointment", `Cancel your visit with ${appt.doctorName} on ${formatDate(appt.date)} at ${appt.timeSlot}?`, [
      { text: "Keep it", style: "cancel" },
      {
        text: "Yes, cancel",
        style: "destructive",
        onPress: async () => {
          try { await cancelAppointment(appt.id); }
          catch { Alert.alert("Could not cancel", "Please try again."); }
        },
      },
    ]);

  const onDelete = () =>
    Alert.alert("Delete from history", "This removes the appointment record. This cannot be undone.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAppointment(appt.id);
            router.replace({ pathname: "/upcoming-appointments", params: { tab: "past" } });
          } catch {
            Alert.alert("Could not delete", "Please try again.");
          }
        },
      },
    ]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView ref={scrollRef} style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={goBack} hitSlop={12}>
            <Ionicons name="chevron-back" size={28} color="#111827" />
          </Pressable>
          <Text style={styles.title}>Appointment Details</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Summary card */}
        <View style={styles.summary}>
          <View style={[styles.chip, { backgroundColor: status.color + "22" }]}>
            <Text style={[styles.chipText, { color: status.color }]}>{status.label}</Text>
          </View>
          <Text style={styles.specialty}>{appt.specialty}</Text>
          <Text style={styles.doctor}>{appt.doctorName}</Text>
          <View style={styles.dateBox}>
            <Text style={styles.dateDay}>{weekday(appt.date)}</Text>
            <Text style={styles.dateMain}>{formatDate(appt.date)}</Text>
            <Text style={styles.dateTime}>{appt.timeSlot}</Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.card}>
          <Row icon="person-outline" label="Patient" value={appt.patientName} />
          <Row icon="call-outline" label="Contact number" value={appt.patientPhone} />
          <Row icon="location-outline" label="Room number" value={appt.roomNumber ? `Room ${appt.roomNumber}` : undefined} />
          <Row icon="medkit-outline" label="Doctor" value={appt.doctorName} />
          <Row
            icon="ticket-outline"
            label="Token number"
            value={typeof appt.tokenNumber === "number" ? String(appt.tokenNumber) : undefined}
          />
          <Row icon="document-text-outline" label="Booking Reference ID" value={appt.id} />
          <Row
            icon="time-outline"
            label="Booked on"
            value={appt.createdAt?.toDate ? appt.createdAt.toDate().toLocaleString() : undefined}
          />
        </View>

        {/* Note (Update) */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Reason for visit / note</Text>
          {isUpcoming ? (
            <>
              <TextInput
                style={styles.noteInput}
                placeholder="e.g. Follow-up for blood pressure, bring previous reports"
                multiline
                maxLength={250}
                value={note}
                onChangeText={setNote}
              />
              <Text style={styles.counter}>{note.length}/250</Text>
              <Pressable
                style={[styles.primaryBtn, (!noteChanged || saving) && { opacity: 0.5 }]}
                onPress={onSaveNote}
                disabled={!noteChanged || saving}
              >
                <Text style={styles.primaryText}>{saving ? "Saving..." : "Save note"}</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.rowValue}>{appt.patientNote || "No note added."}</Text>
          )}
        </View>

        {/* Actions */}
        {isUpcoming && isToday && (
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: "#5BC8E8" }]}
            onPress={() => router.push({
              pathname: "/queue-status",
              params: { id: appt.id, returnTo: "/appointment-details", returnId: appt.id },
            })}
          >
            <Text style={styles.primaryText}>View queue status</Text>
          </Pressable>
        )}
        {isUpcoming ? (
          <Pressable style={styles.dangerBtn} onPress={onCancel}>
            <Text style={styles.dangerText}>Cancel appointment</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.dangerBtn} onPress={onDelete}>
            <Text style={styles.dangerText}>Delete from history</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#E8F1FF" },
  content: { padding: 20, paddingTop: 52, paddingBottom: 40, gap: 14 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, backgroundColor: "#E8F1FF" },
  notFound: { fontSize: 16, color: "#6B7280", fontWeight: "600" },

  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 20, fontWeight: "800", color: "#111827" },

  summary: { backgroundColor: "#fff", borderRadius: 22, padding: 18, alignItems: "center", gap: 6 },
  chip: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 4 },
  chipText: { fontWeight: "700", fontSize: 13 },
  specialty: { fontSize: 20, fontWeight: "800", color: "#7B83F4", textAlign: "center" },
  doctor: { fontSize: 16, fontWeight: "600", color: "#111827" },
  dateBox: { marginTop: 8, backgroundColor: "#EEF2FF", borderRadius: 16, paddingVertical: 12, paddingHorizontal: 28, alignItems: "center" },
  dateDay: { fontSize: 13, color: "#6B7280" },
  dateMain: { fontSize: 20, fontWeight: "800", color: "#111827" },
  dateTime: { fontSize: 18, fontWeight: "700", color: "#7B83F4" },

  card: { backgroundColor: "#fff", borderRadius: 20, padding: 16, gap: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowLabel: { fontSize: 12, color: "#6B7280" },
  rowValue: { fontSize: 15, color: "#111827", fontWeight: "500" },

  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  noteInput: { borderWidth: 1, borderColor: "#ccc", borderRadius: 12, padding: 12, minHeight: 90, textAlignVertical: "top" },
  counter: { alignSelf: "flex-end", fontSize: 12, color: "#9CA3AF" },

  primaryBtn: { backgroundColor: "#7B83F4", borderRadius: 12, padding: 14, alignItems: "center" },
  primaryText: { color: "#fff", fontWeight: "700" },
  dangerBtn: { backgroundColor: "#FEE2E2", borderRadius: 12, padding: 14, alignItems: "center" },
  dangerText: { color: "#DC2626", fontWeight: "700" },
});