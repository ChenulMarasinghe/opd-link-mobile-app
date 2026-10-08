import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import {
  checkInAppointment, DelayDoc, fetchQueueOnce, notifyTurnApproaching,
  QueueAppointment, QueueDoc, subscribeDelay, subscribeQueue,
} from "../../services/queueStatus";
import { cancelAppointment, subscribeMyAppointments } from "../../services/myAppointments";
import { slotToMinutes, toISODate } from "../../utils/datetime";

const formatWait = (min: number) => {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
};

const clock = (d: Date) =>
  d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function QueueStatusScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ id?: string; returnTo?: string; returnId?: string }>();
  const today = useMemo(() => toISODate(new Date()), []);

  const [all, setAll] = useState<QueueAppointment[] | null>(null);
  const [queue, setQueue] = useState<QueueDoc | null>(null);
  const [queueLoaded, setQueueLoaded] = useState(false);
  const [delay, setDelay] = useState<DelayDoc | null>(null);
  const [updated, setUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const notifiedFor = useRef<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  // today's confirmed appointments
  useEffect(() => {
    if (!user) return;
    return subscribeMyAppointments(
      user.uid,
      (items) => setAll(items as QueueAppointment[]),
      () => setAll([])
    );
  }, [user]);

  const todays = useMemo(
    () =>
      (all ?? [])
        .filter((a) => a.status === "confirmed" && a.date === today)
        .sort((a, b) => slotToMinutes(a.timeSlot) - slotToMinutes(b.timeSlot)),
    [all, today]
  );

  const appt = params.id ? todays.find((a) => a.id === params.id) ?? null : null;
  const doctorId = appt?.doctorId;

  // live queue + delay for the selected appointment's doctor
  useEffect(() => {
    if (!doctorId) return;
    setQueueLoaded(false);
    const u1 = subscribeQueue(
      doctorId, today,
      (q) => { setQueue(q); setQueueLoaded(true); setUpdated(new Date()); },
      () => { setQueue(null); setQueueLoaded(true); }
    );
    const u2 = subscribeDelay(doctorId, setDelay);
    return () => { u1(); u2(); };
  }, [doctorId, today]);

  // ---- derived values ----
  const myToken = appt?.tokenNumber;
  const current = queue?.currentToken ?? 0;
  const avg = queue?.avgMinutes ?? 10;
  const delayMin = delay?.minutes ?? 0;

  type Phase = "noToken" | "notStarted" | "waiting" | "now" | "passed";
  let phase: Phase = "waiting";
  if (!myToken) phase = "noToken";
  else if (!queue) phase = "notStarted";
  else if (myToken === current) phase = "now";
  else if (myToken < current) phase = "passed";

  const ahead = myToken && phase === "waiting" ? Math.max(0, myToken - current - 1) : 0;
  const estimate = phase === "waiting" ? (ahead + 1) * avg + delayMin : 0;
  const nextToken =
    queue && (queue.lastToken == null || current + 1 <= queue.lastToken) ? current + 1 : null;

  // create a notification once when the turn is close
  useEffect(() => {
    if (!user || !appt || phase !== "waiting" || ahead > 2) return;
    if (notifiedFor.current === appt.id) return;
    notifiedFor.current = appt.id;
    notifyTurnApproaching(user.uid, appt, ahead).catch(() => {});
  }, [user, appt, phase, ahead]);

  const onRefresh = async () => {
    if (!doctorId) return;
    try {
      setRefreshing(true);
      setQueue(await fetchQueueOnce(doctorId, today));
      setUpdated(new Date());
    } catch {
      Alert.alert("Could not refresh", "Check your connection and try again.");
    } finally {
      setRefreshing(false);
    }
  };

  const onCheckIn = async () => {
    if (!appt) return;
    try { await checkInAppointment(appt.id); }
    catch { Alert.alert("Could not check in", "Please try again."); }
  };

  const onLeave = () => {
    if (!appt) return;
    Alert.alert("Leave queue", "This cancels your appointment for today. Continue?", [
      { text: "Stay", style: "cancel" },
      {
        text: "Leave queue",
        style: "destructive",
        onPress: async () => {
          try {
            await cancelAppointment(appt.id);
            router.replace("/(patient)/dashboard");
          } catch {
            Alert.alert("Could not leave", "Please try again.");
          }
        },
      },
    ]);
  };

  const goBack = () =>
    params.returnTo === "/appointment-details" && params.returnId
      ? router.replace({ pathname: "/appointment-details", params: { id: params.returnId } })
      : router.replace("/upcoming-appointments");

  // ---- render ----
  const header = (
    <View style={styles.header}>
      <Pressable onPress={goBack} hitSlop={12}>
        <Ionicons name="chevron-back" size={28} color="#111827" />
      </Pressable>
      <Text style={styles.title}>Queue Status</Text>
      <View style={{ width: 28 }} />
    </View>
  );

  if (all === null) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#7B83F4" /></View>;
  }

  if (!appt) {
    return (
      <View style={styles.screen}>
        <View style={{ padding: 20, paddingTop: 52 }}>{header}</View>
        <View style={styles.center}>
          <Ionicons name="ticket-outline" size={52} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No appointment today</Text>
          <Text style={styles.emptySub}>Your queue status appears here on the day of your visit.</Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.push("/book-appointment")}>
            <Text style={styles.primaryText}>Book an Appointment</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const banner: { text: string; color: string; bg: string } | null =
    phase === "now"
      ? { text: "It's your turn! Please go to the consultation room.", color: "#047857", bg: "#D1FAE5" }
      : phase === "passed"
      ? { text: "Your token has passed. Please ask the reception desk.", color: "#B91C1C", bg: "#FEE2E2" }
      : phase === "notStarted"
      ? { text: "The queue has not started yet. Please wait for the doctor to begin.", color: "#92400E", bg: "#FEF3C7" }
      : phase === "noToken"
      ? { text: "Your token has not been assigned yet. Please ask the reception desk.", color: "#92400E", bg: "#FEF3C7" }
      : queue?.status === "paused"
      ? { text: "The queue is paused for now.", color: "#92400E", bg: "#FEF3C7" }
      : null;

  return (
    <ScrollView ref={scrollRef} style={styles.screen} contentContainerStyle={styles.content}>
      {header}

      {/* doctor */}
      <View style={styles.card}>
        <Text style={styles.specialty}>{appt.specialty}</Text>
        <Text style={styles.doctor}>{appt.doctorName}</Text>
        <Text style={styles.meta}>
          {appt.timeSlot}{appt.roomNumber ? `  |  Room ${appt.roomNumber}` : ""}
        </Text>
      </View>

      {banner && (
        <View style={[styles.banner, { backgroundColor: banner.bg }]}>
          <Text style={[styles.bannerText, { color: banner.color }]}>{banner.text}</Text>
        </View>
      )}

      {delay && (
        <View style={[styles.banner, { backgroundColor: "#FFEDD5" }]}>
          <Ionicons name="time-outline" size={20} color="#C2410C" />
          <Text style={[styles.bannerText, { color: "#C2410C" }]}>
            {delay.message}{delay.minutes ? ` (about ${delay.minutes} min)` : ""}
          </Text>
        </View>
      )}

      {/* your token */}
      <View style={styles.tokenBox}>
        <Text style={styles.tokenLabel}>Your Token</Text>
        <Text style={styles.tokenNumber}>{myToken ?? "—"}</Text>
      </View>

      {/* current / next */}
      <View style={styles.twoCol}>
        <View style={styles.colBox}>
          <Text style={styles.colLabel}>Current</Text>
          <Text style={styles.colValue}>{!queueLoaded ? "…" : queue ? current : "—"}</Text>
        </View>
        <View style={styles.colBox}>
          <Text style={styles.colLabel}>Next</Text>
          <Text style={styles.colValue}>{!queueLoaded ? "…" : nextToken ?? "—"}</Text>
        </View>
      </View>

      {/* ahead + wait */}
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Patients Ahead</Text>
          <Text style={styles.infoValue}>{phase === "waiting" ? ahead : "—"}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Estimated Waiting Time</Text>
          <Text style={styles.infoValue}>
            {phase === "waiting" ? formatWait(estimate) : phase === "now" ? "Now" : "—"}
          </Text>
        </View>
      </View>

      {/* actions */}
      <Pressable style={styles.refreshBtn} onPress={onRefresh} disabled={refreshing}>
        <Ionicons name="refresh" size={20} color="#7B83F4" />
        <Text style={styles.refreshText}>{refreshing ? "Refreshing..." : "Refresh Status"}</Text>
      </Pressable>
      <Text style={styles.updated}>
        <Text style={{ color: "#10B981" }}>● Live</Text>
        {updated ? `   Last updated ${clock(updated)}` : ""}
      </Text>

      {appt.checkedIn ? (
        <View style={[styles.banner, { backgroundColor: "#D1FAE5" }]}>
          <Ionicons name="checkmark-circle" size={20} color="#047857" />
          <Text style={[styles.bannerText, { color: "#047857" }]}>You have checked in.</Text>
        </View>
      ) : (
        <Pressable style={styles.primaryBtn} onPress={onCheckIn}>
          <Text style={styles.primaryText}>I'm here (check in)</Text>
        </Pressable>
      )}

      <Pressable style={styles.dangerBtn} onPress={onLeave}>
        <Text style={styles.dangerText}>Leave queue</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#E8F1FF" },
  content: { padding: 20, paddingTop: 52, paddingBottom: 40, gap: 14 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10, padding: 24, backgroundColor: "#E8F1FF" },

  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 20, fontWeight: "800", color: "#111827" },

  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#374151" },
  emptySub: { color: "#6B7280", textAlign: "center" },

  pill: { backgroundColor: "#fff", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8 },
  pillActive: { backgroundColor: "#7B83F4" },
  pillText: { color: "#4B5563", fontWeight: "600", fontSize: 13 },
  pillTextActive: { color: "#fff" },

  card: { backgroundColor: "#fff", borderRadius: 20, padding: 16, gap: 4 },
  specialty: { fontSize: 17, fontWeight: "700", color: "#7B83F4" },
  doctor: { fontSize: 15, fontWeight: "600", color: "#111827" },
  meta: { fontSize: 14, color: "#4B5563" },

  banner: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, padding: 12 },
  bannerText: { flex: 1, fontWeight: "600", fontSize: 14 },

  tokenBox: { backgroundColor: "#fff", borderRadius: 22, borderWidth: 2, borderColor: "#7B83F4", paddingVertical: 18, alignItems: "center" },
  tokenLabel: { fontSize: 15, color: "#6B7280", fontWeight: "600" },
  tokenNumber: { fontSize: 72, fontWeight: "800", color: "#7B83F4", lineHeight: 84 },

  twoCol: { flexDirection: "row", gap: 14 },
  colBox: { flex: 1, backgroundColor: "#fff", borderRadius: 20, paddingVertical: 16, alignItems: "center" },
  colLabel: { fontSize: 14, color: "#6B7280", fontWeight: "600" },
  colValue: { fontSize: 38, fontWeight: "800", color: "#111827" },

  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  infoLabel: { fontSize: 15, color: "#374151", fontWeight: "500" },
  infoValue: { fontSize: 20, fontWeight: "800", color: "#111827" },
  divider: { height: 1, backgroundColor: "#E5E7EB" },

  refreshBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 2, borderColor: "#7B83F4", borderRadius: 14, paddingVertical: 12, backgroundColor: "#fff" },
  refreshText: { color: "#7B83F4", fontWeight: "700", fontSize: 15 },
  updated: { textAlign: "center", color: "#6B7280", fontSize: 12 },

  primaryBtn: { backgroundColor: "#7B83F4", borderRadius: 12, padding: 14, alignItems: "center" },
  primaryText: { color: "#fff", fontWeight: "700" },
  dangerBtn: { backgroundColor: "#FEE2E2", borderRadius: 12, padding: 14, alignItems: "center" },
  dangerText: { color: "#DC2626", fontWeight: "700" },
});
