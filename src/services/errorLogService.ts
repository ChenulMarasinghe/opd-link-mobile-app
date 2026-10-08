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

const asTimestamp = (value: unknown): Timestamp | undefined =>
  value instanceof Timestamp ? value : undefined;

function parseErrorLog(id: string, data: Record<string, unknown>): ErrorLog | null {
  const createdAt = asTimestamp(data.createdAt);
  if (
    typeof data.title !== "string" ||
    typeof data.message !== "string" ||
    typeof data.service !== "string" ||
    !isSeverity(data.severity) ||
    !isStatus(data.status) ||
    !createdAt
  ) {
    return null;
  }

  const resolvedAt = asTimestamp(data.resolvedAt);
  return {
    id,
    title: data.title,
    message: data.message,
    severity: data.severity,
    service: data.service,
    status: data.status,
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
  return snapshot.docs.flatMap((errorDocument) => {
    const parsed = parseErrorLog(errorDocument.id, errorDocument.data());
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
