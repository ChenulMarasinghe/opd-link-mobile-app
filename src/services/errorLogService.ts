import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocsFromServer,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "./firebase";

export type ErrorSeverity = "critical" | "warning" | "info";
export type ErrorStatus = "open" | "investigating" | "resolved";

export interface ErrorLog {
  id: string;
  title: string;
  message: string;
  severity: ErrorSeverity;
  service: string;
  status: ErrorStatus;
  errorCode?: string;
  source?: string;
  createdAt: Timestamp;
  resolvedAt?: Timestamp;
}

export interface CreateErrorLogInput {
  title: string;
  message: string;
  severity: ErrorSeverity;
  service: string;
  status: ErrorStatus;
  errorCode?: string;
  source?: string;
}

export interface ErrorSummary {
  critical: number;
  warnings: number;
  resolved: number;
}

const errorLogsCollection = collection(db, "errorLogs");

const isSeverity = (value: unknown): value is ErrorSeverity =>
  value === "critical" || value === "warning" || value === "info";

const isStatus = (value: unknown): value is ErrorStatus =>
  value === "open" || value === "investigating" || value === "resolved";

const asTimestamp = (value: unknown): Timestamp | undefined => {
  if (value instanceof Timestamp) return value;

  if (
    value &&
    typeof value === "object" &&
    "seconds" in value &&
    "nanoseconds" in value &&
    typeof value.seconds === "number" &&
    typeof value.nanoseconds === "number"
  ) {
    return new Timestamp(value.seconds, value.nanoseconds);
  }

  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : Timestamp.fromDate(date);
  }

  return undefined;
};

function parseErrorLog(
  id: string,
  data: Record<string, unknown>,
  fallbackStatus: ErrorStatus = "open"
): ErrorLog | null {
  const createdAt = asTimestamp(data.createdAt) ?? Timestamp.fromMillis(0);
  const severity = isSeverity(data.severity) ? data.severity : undefined;
  if (!severity) {
    return null;
  }

  const resolvedAt = asTimestamp(data.resolvedAt);
  return {
    id,
    title: typeof data.title === "string" && data.title.trim() ? data.title : "Untitled error",
    message: typeof data.message === "string" && data.message.trim() ? data.message : "No error description available.",
    severity,
    service: typeof data.service === "string" && data.service.trim() ? data.service : "System",
    status: isStatus(data.status) ? data.status : fallbackStatus,
    ...(typeof data.errorCode === "string" ? { errorCode: data.errorCode } : {}),
    ...(typeof data.source === "string" ? { source: data.source } : {}),
    createdAt,
    ...(resolvedAt ? { resolvedAt } : {}),
  };
}

export async function getErrorLogs(maxResults = 20): Promise<ErrorLog[]> {
  const snapshot = await getDocsFromServer(
    query(errorLogsCollection, orderBy("createdAt", "desc"), limit(maxResults))
  );
  return parseErrorLogDocuments(snapshot.docs);
}

export async function getErrorLogsByCategory(
  category: "critical" | "warning" | "resolved"
): Promise<ErrorLog[]> {
  const field = category === "resolved" ? "status" : "severity";
  const value = category === "resolved" ? "resolved" : category;
  const snapshot = await getDocsFromServer(
    query(errorLogsCollection, where(field, "==", value))
  );

  return parseErrorLogDocuments(snapshot.docs, category === "resolved" ? "resolved" : "open")
    .filter((log) => category === "resolved" || log.status !== "resolved")
    .sort((first, second) => second.createdAt.toMillis() - first.createdAt.toMillis());
}

function parseErrorLogDocuments(
  documents: Array<{ id: string; data: () => Record<string, unknown> }>,
  fallbackStatus: ErrorStatus = "open"
) {
  return documents.flatMap((errorDocument) => {
    const parsed = parseErrorLog(errorDocument.id, errorDocument.data(), fallbackStatus);
    if (!parsed) {
      console.warn(
        `Skipping error log document "${errorDocument.id}" because its severity is missing or invalid.`
      );
    }
    return parsed ? [parsed] : [];
  });
}

export async function getErrorSummary(): Promise<ErrorSummary> {
  // Keep each query constrained to one field so this works without a
  // composite index. Firestore automatically indexes individual fields.
  const [critical, warnings, resolved] = await Promise.all([
    getDocsFromServer(
      query(errorLogsCollection, where("severity", "==", "critical"))
    ),
    getDocsFromServer(
      query(errorLogsCollection, where("severity", "==", "warning"))
    ),
    getDocsFromServer(
      query(errorLogsCollection, where("status", "==", "resolved"))
    ),
  ]);

  return {
    critical: critical.docs.filter((entry) => entry.data().status !== "resolved")
      .length,
    warnings: warnings.docs.filter((entry) => entry.data().status !== "resolved")
      .length,
    resolved: resolved.size,
  };
}

export async function getErrorById(id: string): Promise<ErrorLog | null> {
  const snapshot = await getDoc(doc(db, "errorLogs", id));
  return snapshot.exists() ? parseErrorLog(snapshot.id, snapshot.data()) : null;
}

export async function updateErrorStatus(
  id: string,
  status: ErrorStatus
): Promise<void> {
  await updateDoc(doc(db, "errorLogs", id), {
    status,
    resolvedAt: status === "resolved" ? serverTimestamp() : null,
  });
}

export async function createErrorLog(error: CreateErrorLogInput): Promise<string> {
  const reference = await addDoc(errorLogsCollection, {
    ...error,
    createdAt: serverTimestamp(),
    ...(error.status === "resolved" ? { resolvedAt: serverTimestamp() } : {}),
  });
  return reference.id;
}

export async function recordDiagnosticFailure(
  category: "connectivity" | "response-time",
  message: string,
  severity: ErrorSeverity
): Promise<void> {
  await setDoc(
    doc(db, "errorLogs", `diagnostics-${category}`),
    {
      title: `System diagnostics: ${category}`,
      message,
      severity,
      service: "System Diagnostics",
      status: "open",
      errorCode: `DIAGNOSTIC_${category.replace("-", "_").toUpperCase()}`,
      source: "system-diagnostics",
      createdAt: serverTimestamp(),
      resolvedAt: null,
    },
    { merge: true }
  );
}
