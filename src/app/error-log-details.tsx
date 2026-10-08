import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useEffect, useState } from "react";
import { SymbolView } from "expo-symbols";
import { ThemedText } from "@/components/themed-text";
import { getErrorById, updateErrorStatus, type ErrorLog } from "@/services/errorLogService";

export default function ErrorLogDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [error, setError] = useState<ErrorLog | null>(null);
  const [resolving, setResolving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void getErrorById(id).then(setError).catch((loadError) => {
      console.error("Unable to load error log details.", loadError);
    });
  }, [id]);

  const resolveError = async () => {
    if (!id || !error || error.status === "resolved" || resolving) return;

    setResolving(true);
    setActionError(null);
    try {
      await updateErrorStatus(id, "resolved");
      router.replace("/error-logs");
    } catch (resolveError) {
      console.error("Unable to resolve error log.", resolveError);
      setActionError("Unable to mark this error as resolved. Please try again.");
    } finally {
      setResolving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <SymbolView name={{ ios: "chevron.left", android: "arrow_back", web: "arrow_back" }} size={15} tintColor="#18233A" />
        </Pressable>
        <ThemedText style={styles.heading}>Error Details</ThemedText>
        {error ? (
          <View style={styles.card}>
            <ThemedText style={styles.title}>{error.title}</ThemedText>
            <ThemedText style={styles.detail}>{error.message}</ThemedText>
            <ThemedText style={styles.meta}>Service: {error.service}</ThemedText>
            <ThemedText style={styles.meta}>Severity: {error.severity}</ThemedText>
            <ThemedText style={styles.meta}>Status: {error.status}</ThemedText>
            <ThemedText style={styles.meta}>Type: {error.service} · {error.severity} error</ThemedText>
            {error.resolvedAt ? <ThemedText style={styles.meta}>Resolved: {formatDateTime(error.resolvedAt)}</ThemedText> : null}
            {error.errorCode ? <ThemedText style={styles.meta}>Code: {error.errorCode}</ThemedText> : null}
            {error.source ? <ThemedText style={styles.meta}>Source: {error.source}</ThemedText> : null}
            {actionError ? <ThemedText style={styles.actionError}>{actionError}</ThemedText> : null}
            {error.status !== "resolved" ? (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: resolving }}
                disabled={resolving}
                onPress={() => void resolveError()}
                style={({ pressed }) => [styles.resolveButton, (pressed || resolving) && styles.pressed]}>
                <ThemedText style={styles.resolveButtonText}>
                  {resolving ? "Resolving..." : "Mark as Resolved"}
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <ThemedText style={styles.detail}>Error log not found.</ThemedText>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatDateTime(timestamp: ErrorLog["createdAt"]) {
  return timestamp.toDate().toLocaleString();
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#EAF4FF" },
  content: { padding: 16 },
  backButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  heading: { color: "#18233A", fontSize: 20, fontWeight: "800", marginBottom: 16 },
  card: { backgroundColor: "#FFF", borderRadius: 15, padding: 16 },
  title: { color: "#18233A", fontSize: 16, fontWeight: "700" },
  detail: { color: "#536681", fontSize: 12, marginTop: 8 },
  meta: { color: "#536681", fontSize: 11, marginTop: 10 },
  resolveButton: { alignItems: "center", backgroundColor: "#0AAB83", borderRadius: 10, marginTop: 16, paddingVertical: 10 },
  resolveButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  actionError: { color: "#F04444", fontSize: 11, marginTop: 12 },
  pressed: { opacity: 0.75 },
});
