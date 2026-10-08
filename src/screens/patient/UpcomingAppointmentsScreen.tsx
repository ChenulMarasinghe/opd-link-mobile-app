import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import type { Appointment } from "../../services/dashboard";
import {
  cancelAppointment, deleteAppointment, isPastAppointment,
  submitFeedback, subscribeMyAppointments, subscribeMyFeedback,
} from "../../services/myAppointments";
import { formatDate, slotToMinutes } from "../../utils/datetime";

type Tab = "upcoming" | "past";

const statusInfo = (a: Appointment) => {
  if (a.status === "cancelled") return { label: "Cancelled", color: "#EF4444" };
  if (a.status === "completed") return { label: "Completed", color: "#10B981" };
  return { label: "Missed", color: "#6B7280" };
};

export default function UpcomingAppointmentsScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === "past" ? "past" : "upcoming");
  const [all, setAll] = useState<Appointment[] | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [now, setNow] = useState(new Date());
  const listRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      listRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  // rating dialog
  const [rateFor, setRateFor] = useState<Appointment | null>(null);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (params.tab === "past" || params.tab === "upcoming") setTab(params.tab);
  }, [params.tab]);

  // move appointments from Upcoming to Past as time passes
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!user) return;
    const u1 = subscribeMyAppointments(user.uid, setAll, () => setAll([]));
    const u2 = subscribeMyFeedback(user.uid, setRatings);
    return () => { u1(); u2(); };
  }, [user]);

  const { upcoming, past } = useMemo(() => {
    const list = all ?? [];
    const up = list
      .filter((a) => a.status === "confirmed" && !isPastAppointment(a))
      .sort((a, b) => a.date.localeCompare(b.date) || slotToMinutes(a.timeSlot) - slotToMinutes(b.timeSlot));
    const pa = list
      .filter((a) => a.status !== "confirmed" || isPastAppointment(a))
      .sort((a, b) => b.date.localeCompare(a.date) || slotToMinutes(b.timeSlot) - slotToMinutes(a.timeSlot));
    return { upcoming: up, past: pa };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, now]);

  const shown = tab === "upcoming" ? upcoming : past;

  const onCancel = (a: Appointment) =>
    Alert.alert("Cancel appointment", `Cancel your visit with ${a.doctorName} on ${formatDate(a.date)} at ${a.timeSlot}?`, [
      { text: "Keep it", style: "cancel" },
      {
        text: "Yes, cancel",
        style: "destructive",
        onPress: async () => {
          try { await cancelAppointment(a.id); }
          catch { Alert.alert("Could not cancel", "Please try again."); }
        },
      },
    ]);

  const onDelete = (a: Appointment) =>
    Alert.alert("Delete from history", "This removes the appointment record. This cannot be undone.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try { await deleteAppointment(a.id); }
          catch { Alert.alert("Could not delete", "Please try again."); }
        },
      },
    ]);

  const openRate = (a: Appointment) => { setRateFor(a); setStars(0); setComment(""); };

  const onSubmitRating = async () => {
    if (!user || !rateFor) return;
    if (stars < 1) { Alert.alert("Choose a rating", "Tap the stars to rate your visit."); return; }
    try {
      setSaving(true);
      await submitFeedback(rateFor, user.uid, stars, comment);
      setRateFor(null);
    } catch {
      Alert.alert("Could not save", "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const openDetails = (a: Appointment) =>
    router.push({
      pathname: "/appointment-details",
      params: { id: a.id, returnTo: "/upcoming-appointments" },
    });

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>My Appointments</Text>

      {/* Upcoming / Past toggle */}
      <View style={styles.toggle}>
        {(["upcoming", "past"] as Tab[]).map((t) => (
          <Pressable key={t} style={[styles.toggleBtn, tab === t && styles.toggleActive]} onPress={() => setTab(t)}>
            <Text style={[styles.toggleText, tab === t && styles.toggleTextActive]}>
              {t === "upcoming" ? `Upcoming (${upcoming.length})` : `Past (${past.length})`}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView ref={listRef} contentContainerStyle={styles.list}>
        {all === null ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#7B83F4" />
        ) : shown.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>
              {tab === "upcoming" ? "No upcoming appointments" : "No past appointments"}
            </Text>
            {tab === "upcoming" && (
              <Pressable style={styles.primaryBtn} onPress={() => router.push("/book-appointment")}>
                <Text style={styles.primaryText}>Book an Appointment</Text>
              </Pressable>
            )}
          </View>
        ) : (
          shown.map((a) => {
            const s = statusInfo(a);
            const rated = ratings[a.id];
            return (
              <Pressable key={a.id} style={styles.card} onPress={() => openDetails(a)}>
                <View style={styles.cardTop}>
                  <Text style={styles.specialty}>{a.specialty}</Text>
                  {tab === "past" && (
                    <View style={[styles.chip, { backgroundColor: s.color + "22" }]}>
                      <Text style={[styles.chipText, { color: s.color }]}>{s.label}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.doctor}>{a.doctorName}</Text>
                <View style={styles.metaRow}>
                  <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                  <Text style={styles.meta}>{formatDate(a.date)}  |  {a.timeSlot}</Text>
                </View>
                {!!a.roomNumber && (
                  <View style={styles.metaRow}>
                    <Ionicons name="location-outline" size={16} color="#6B7280" />
                    <Text style={styles.meta}>Room {a.roomNumber}</Text>
                  </View>
                )}

                {tab === "upcoming" ? (
                  <View style={styles.actions}>
                    <Pressable style={[styles.smallBtn, styles.outlineBtn]} onPress={() => openDetails(a)}>
                      <Text style={styles.outlineText}>View details</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.actions}>
                    {a.status !== "cancelled" &&
                      (rated ? (
                        <View style={styles.ratedRow}>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Ionicons key={n} name={n <= rated ? "star" : "star-outline"} size={18} color="#F59E0B" />
                          ))}
                        </View>
                      ) : (
                        <Pressable style={[styles.smallBtn, styles.outlineBtn]} onPress={() => openRate(a)}>
                          <Text style={styles.outlineText}>Rate visit</Text>
                        </Pressable>
                      ))}
                    <Pressable style={[styles.smallBtn, styles.dangerBtn]} onPress={() => onDelete(a)}>
                      <Text style={styles.dangerText}>Delete</Text>
                    </Pressable>
                  </View>
                )}
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* Rating dialog */}
      <Modal visible={!!rateFor} transparent animationType="fade" onRequestClose={() => setRateFor(null)}>
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Rate your visit</Text>
            <Text style={styles.modalSub}>{rateFor?.doctorName}</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setStars(n)}>
                  <Ionicons name={n <= stars ? "star" : "star-outline"} size={38} color="#F59E0B" />
                </Pressable>
              ))}
            </View>
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment (optional)"
              multiline
              maxLength={200}
              value={comment}
              onChangeText={setComment}
            />
            <View style={styles.actions}>
              <Pressable style={[styles.smallBtn, styles.outlineBtn]} onPress={() => setRateFor(null)}>
                <Text style={styles.outlineText}>Close</Text>
              </Pressable>
              <Pressable style={[styles.smallBtn, styles.solidBtn]} onPress={onSubmitRating} disabled={saving}>
                <Text style={styles.solidText}>{saving ? "Saving..." : "Submit"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#E8F1FF", paddingTop: 52 },
  title: { fontSize: 24, fontWeight: "800", color: "#111827", textAlign: "center", marginBottom: 14 },

  toggle: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 14, marginHorizontal: 20, padding: 4 },
  toggleBtn: { flex: 1, paddingVertical: 11, borderRadius: 11, alignItems: "center" },
  toggleActive: { backgroundColor: "#7B83F4" },
  toggleText: { fontWeight: "700", color: "#6B7280" },
  toggleTextActive: { color: "#fff" },

  list: { padding: 20, gap: 14, paddingBottom: 40 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 16, gap: 6 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  specialty: { fontSize: 17, fontWeight: "700", color: "#7B83F4", flex: 1 },
  chip: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  chipText: { fontSize: 12, fontWeight: "700" },
  doctor: { fontSize: 15, fontWeight: "600", color: "#111827" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  meta: { fontSize: 14, color: "#4B5563" },

  actions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 10, marginTop: 8 },
  smallBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
  outlineBtn: { borderWidth: 1, borderColor: "#7B83F4" },
  outlineText: { color: "#7B83F4", fontWeight: "700" },
  dangerBtn: { backgroundColor: "#FEE2E2" },
  dangerText: { color: "#DC2626", fontWeight: "700" },
  solidBtn: { backgroundColor: "#7B83F4" },
  solidText: { color: "#fff", fontWeight: "700" },
  ratedRow: { flexDirection: "row", marginRight: "auto" },

  emptyBox: { alignItems: "center", marginTop: 60, gap: 10 },
  emptyTitle: { fontSize: 16, color: "#6B7280", fontWeight: "600" },
  primaryBtn: { backgroundColor: "#7B83F4", borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
  primaryText: { color: "#fff", fontWeight: "700" },

  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 24 },
  modal: { backgroundColor: "#fff", borderRadius: 20, padding: 20, gap: 10 },
  modalTitle: { fontSize: 20, fontWeight: "800", textAlign: "center" },
  modalSub: { textAlign: "center", color: "#6B7280" },
  starsRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginVertical: 6 },
  commentInput: { borderWidth: 1, borderColor: "#ccc", borderRadius: 12, padding: 12, minHeight: 80, textAlignVertical: "top" },
});