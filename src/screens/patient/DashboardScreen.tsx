<<<<<<< HEAD
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import {
  Appointment, Opd, subscribeOpds, subscribeUpcomingAppointments,
} from "../../services/dashboard";
import {
  formatDate, formatLongDate, formatTime, nowMinutes, toMinutes,
} from "../../utils/datetime";

const MAX_UPCOMING = 3;

// ---- OPD status logic -------------------------------------------------
type SessionView = { label: string; state: "past" | "current" | "future" };

function getOpdStatus(opd: Opd, nowMin: number) {
  const sessions: SessionView[] = (opd.sessions ?? []).map((s) => {
    const [start, end] = s.split("-");
    const state =
      nowMin >= toMinutes(end) ? "past"
      : nowMin >= toMinutes(start) ? "current"
      : "future";
    return { label: `${formatTime(start)} - ${formatTime(end)}`, state };
  });

  const firstStart = opd.sessions?.[0]?.split("-")[0];
  const isOpen = !opd.closedToday && sessions.some((s) => s.state === "current");
  const allDone = opd.closedToday || sessions.every((s) => s.state === "past");

  return {
    sessions: opd.closedToday ? [] : sessions,
    isOpen,
    opensTomorrow: allDone && firstStart ? `Opens tomorrow at ${formatTime(firstStart)}` : null,
  };
}

// ---- Small components -------------------------------------------------
function UpcomingCard({ a }: { a: Appointment }) {
  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push({
        pathname: "/appointment-details",
        params: { id: a.id, returnTo: "/dashboard" },
      })}
    >
      <View style={styles.upIcon}>
        <Ionicons name="arrow-up-circle-outline" size={44} color="#7B83F4" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.upTitle}>Upcoming Appointment</Text>
        <Text style={styles.upText}>{a.specialty} · {a.doctorName}</Text>
        <Text style={styles.upText}>{formatDate(a.date)}  |  {a.timeSlot}</Text>
      </View>
      <Ionicons name="chevron-forward" size={26} color="#7B83F4" />
    </Pressable>
  );
}

function OpdCard({ opd, nowMin }: { opd: Opd; nowMin: number }) {
  const s = getOpdStatus(opd, nowMin);
  return (
    <View style={styles.opdCard}>
      <View style={styles.opdTop}>
        <Text style={styles.opdName}>{opd.name}</Text>
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: s.isOpen ? "#10B981" : "#EF4444" }]} />
          <Text style={[styles.status, { color: s.isOpen ? "#10B981" : "#EF4444" }]}>
            {s.isOpen ? "Open" : "Closed"}
          </Text>
        </View>
      </View>

      {s.opensTomorrow ? (
        <Text style={styles.opensTomorrow}>{s.opensTomorrow}</Text>
      ) : (
        <View style={styles.sessionWrap}>
          {s.sessions.map((x) => (
            <Text
              key={x.label}
              style={[
                styles.session,
                x.state === "past" && styles.sessionPast,
                x.state === "current" && styles.sessionCurrent,
              ]}
            >
              {x.label}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

// ---- Screen -----------------------------------------------------------
export default function DashboardScreen() {
  const { user, profile } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [opds, setOpds] = useState<Opd[] | null>(null);
  const [now, setNow] = useState(new Date());
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  // refresh the open/closed status every minute
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubA = subscribeUpcomingAppointments(
      user.uid, MAX_UPCOMING, setAppointments, () => setAppointments([])
    );
    const unsubO = subscribeOpds(setOpds, () => setOpds([]));
    return () => { unsubA(); unsubO(); };
  }, [user]);

  const firstName = profile?.name?.split(" ")[0] ?? "";
  const nowMin = nowMinutes(now);

  return (
    <ScrollView ref={scrollRef} style={styles.screen} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brand}>
          <Image source={require("../../../assets/images/logo.png")} style={styles.brandLogo} resizeMode="contain" />
          <Text style={styles.brandText}>
            <Text style={{ color: "#1E4E9C" }}>OPD </Text>
            <Text style={{ color: "#0F8F6B" }}>Link</Text>
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.langPill}>
            <Text style={styles.langText}>{(profile?.language ?? "en").toUpperCase()}</Text>
          </View>
          <Pressable style={styles.avatarSmall} onPress={() => router.push("/profile")}>
            <Text style={styles.avatarSmallText}>{firstName.charAt(0).toUpperCase()}</Text>
          </Pressable>
        </View>
      </View>

      {/* Greeting */}
      <View style={styles.greetRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{firstName.charAt(0).toUpperCase()}</Text>
        </View>
        <View>
          <Text style={styles.hello}>Hello, {firstName}</Text>
          <Text style={styles.helloSub}>Your health matters to us</Text>
        </View>
      </View>

      {/* Upcoming appointments */}
      {appointments === null ? (
        <ActivityIndicator style={{ marginVertical: 24 }} color="#7B83F4" />
      ) : appointments.length === 0 ? (
        <View style={styles.card}>
          <View style={{ flex: 1 }}>
            <Text style={styles.upTitle}>No upcoming appointments</Text>
            <Text style={styles.upText}>Tap &quot;Book an Appointment&quot; to get started.</Text>
          </View>
        </View>
      ) : (
        appointments.map((a) => <UpcomingCard key={a.id} a={a} />)
      )}

      {/* Actions */}
      <Text style={styles.sectionTitle}>What would you like to do ?</Text>
      <View style={styles.actions}>
        <Pressable style={[styles.actionBtn, { backgroundColor: "#7B83F4" }]} onPress={() => router.push("/book-appointment")}>
          <Ionicons name="calendar-outline" size={30} color="#fff" />
          <Text style={styles.actionText}>Book an Appointment</Text>
        </Pressable>
      </View>
      <View style={styles.actions}>
        <Pressable style={[styles.actionBtn, { backgroundColor: "#0F8F6B" }]} onPress={() => router.push("/upcoming-appointments")}>
          <Ionicons name="calendar-number-outline" size={30} color="#fff" />
          <Text style={styles.actionText}>My Appointments</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, { backgroundColor: "#F59E0B" }]} onPress={() => router.push("/clinic-status")}>
          <Ionicons name="medical-outline" size={30} color="#fff" />
          <Text style={styles.actionText}>Clinic Status</Text>
        </Pressable>
      </View>

      {/* OPD availability (display only) */}
      <Text style={styles.sectionTitle}>OPD Availability</Text>
      <View style={styles.dateRow}>
        <Text style={styles.dateLabel}>Today&apos;s OPD Status</Text>
        <Text style={styles.dateLabel}>{formatLongDate(now)}</Text>
      </View>

      <View pointerEvents="none">
        {opds === null ? (
          <ActivityIndicator style={{ marginVertical: 16 }} color="#7B83F4" />
        ) : opds.length === 0 ? (
          <Text style={styles.empty}>No OPD information available.</Text>
        ) : (
          opds.map((o) => <OpdCard key={o.id} opd={o} nowMin={nowMin} />)
        )}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#E8F1FF" },
  content: { padding: 20, paddingTop: 48, paddingBottom: 32, gap: 14 },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandLogo: { width: 36, height: 36 },
  brandText: { fontSize: 26, fontWeight: "800" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  langPill: { backgroundColor: "#fff", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6 },
  langText: { fontWeight: "700", fontSize: 12, color: "#111827" },
  avatarSmall: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#7B83F4", alignItems: "center", justifyContent: "center" },
  avatarSmallText: { color: "#fff", fontWeight: "700" },

  greetRow: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 4 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#7B83F4", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  avatarText: { color: "#fff", fontSize: 28, fontWeight: "700" },
  hello: { fontSize: 22, fontWeight: "700", color: "#111827" },
  helloSub: { fontSize: 13, color: "#6B7280" },

  card: { backgroundColor: "#fff", borderRadius: 22, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  upIcon: { width: 48, alignItems: "center" },
  upTitle: { fontSize: 17, fontWeight: "700", color: "#7B83F4", marginBottom: 4 },
  upText: { fontSize: 14, color: "#374151", fontWeight: "500" },

  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#111827", marginTop: 8 },
  actions: { flexDirection: "row", gap: 14 },
  actionBtn: { flex: 1, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 8, minHeight: 76 },
  actionText: { flex: 1, color: "#fff", fontWeight: "700", fontSize: 15 },

  dateRow: { flexDirection: "row", justifyContent: "space-between" },
  dateLabel: { fontSize: 13, color: "#4B5563", fontWeight: "500" },

  opdCard: { backgroundColor: "#fff", borderRadius: 18, padding: 14, marginBottom: 10, gap: 6 },
  opdTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  opdName: { fontSize: 17, fontWeight: "700", color: "#111827" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  status: { fontSize: 17, fontWeight: "700" },
  sessionWrap: { flexDirection: "row", flexWrap: "wrap", columnGap: 24, rowGap: 4 },
  session: { fontSize: 14, color: "#111827" },
  sessionPast: { textDecorationLine: "line-through", color: "#6B7280" },
  sessionCurrent: { color: "#10B981", fontWeight: "600" },
  opensTomorrow: { fontSize: 14, color: "#EF4444" },
  empty: { color: "#6B7280", textAlign: "center", marginVertical: 12 },
});
=======
import { Text, View } from "react-native";
import LogoutButton from "../../components/LogoutButton";

export default function Screen() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
      <Text>patient-dashboard (placeholder)</Text>
      <LogoutButton />
    </View>
  );
}
>>>>>>> parent of 1bdecc6 (refactor: structure app around IT screens)
