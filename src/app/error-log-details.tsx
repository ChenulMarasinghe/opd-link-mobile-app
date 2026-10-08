import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useEffect, useState } from "react";
import { SymbolView } from "expo-symbols";
import { ThemedText } from "@/components/themed-text";
import { getErrorById, type ErrorLog } from "@/services/errorLogService";

export default function ErrorLogDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [error, setError] = useState<ErrorLog | null>(null);

  useEffect(() => {
    if (!id) return;
    void getErrorById(id).then(setError).catch((loadError) => {
      console.error("Unable to load error log details.", loadError);
    });
  }, [id]);

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
            {error.resolvedAt ? <ThemedText style={styles.meta}>Resolved: {formatDateTime(error.resolvedAt)}</ThemedText> : null}
            {error.errorCode ? <ThemedText style={styles.meta}>Code: {error.errorCode}</ThemedText> : null}
            {error.source ? <ThemedText style={styles.meta}>Source: {error.source}</ThemedText> : null}
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
});
