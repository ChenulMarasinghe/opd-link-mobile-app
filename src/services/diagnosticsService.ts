import {
  doc,
  getDocFromServer,
  Timestamp,
} from "firebase/firestore";

import { type Role } from "./auth";
import { db } from "./firebase";
import {
  recordDiagnosticFailure,
  type ErrorSeverity,
} from "./errorLogService";

export type DiagnosticStatus =
  | "healthy"
  | "warning"
  | "critical"
  | "unavailable";

export interface DiagnosticCheck {
  status: DiagnosticStatus;
  message: string;
  responseTimeMs?: number;
}

export interface DiagnosticsResult {
  backend: DiagnosticCheck;
  database: DiagnosticCheck;
  apiResponseTime: DiagnosticCheck;
  overallHealth: DiagnosticStatus;
  checkedAt: Timestamp;
}

const SLOW_RESPONSE_THRESHOLD_MS = 500;
const CRITICAL_RESPONSE_THRESHOLD_MS = 1500;

function getResponseStatus(responseTimeMs: number): DiagnosticStatus {
  if (responseTimeMs >= CRITICAL_RESPONSE_THRESHOLD_MS) return "critical";
  if (responseTimeMs >= SLOW_RESPONSE_THRESHOLD_MS) return "warning";
  return "healthy";
}

function getOverallHealth(
  backend: DiagnosticCheck,
  database: DiagnosticCheck,
  apiResponseTime: DiagnosticCheck
): DiagnosticStatus {
  if (
    [backend, database, apiResponseTime].some(
      (check) => check.status === "unavailable" || check.status === "critical"
    )
  ) {
    return "critical";
  }
  if (
    [backend, database, apiResponseTime].some(
      (check) => check.status === "warning"
    )
  ) {
    return "warning";
  }
  return "healthy";
}

function getFailureSeverity(status: DiagnosticStatus): ErrorSeverity {
  return status === "critical" || status === "unavailable"
    ? "critical"
    : "warning";
}

export async function runSystemDiagnostics(
  role: Role | null | undefined
): Promise<DiagnosticsResult> {
  if (role !== "it") {
    throw new Error("Only authorized IT Supporters can run diagnostics.");
  }

  const startedAt = Date.now();
  const checkedAt = Timestamp.now();

  try {
    // This is the app's real backend boundary: a server-only Firestore read.
    // A missing document is still a successful connectivity check.
    await getDocFromServer(doc(db, "systemHealth", "current"));
    const responseTimeMs = Date.now() - startedAt;
    const responseStatus = getResponseStatus(responseTimeMs);

    const backend: DiagnosticCheck = {
      status: "healthy",
      message: "Firebase services are responding.",
    };
    const database: DiagnosticCheck = {
      status: "healthy",
      message: "Firestore connection is available.",
    };
    const apiResponseTime: DiagnosticCheck = {
      status: responseStatus,
      message:
        responseStatus === "healthy"
          ? "Response time is within the healthy range."
          : responseStatus === "warning"
            ? "Response is slower than expected."
            : "Response time is critically slow.",
      responseTimeMs,
    };
    const result = {
      backend,
      database,
      apiResponseTime,
      overallHealth: getOverallHealth(backend, database, apiResponseTime),
      checkedAt,
    };

    if (result.overallHealth !== "healthy") {
      await recordDiagnosticFailure(
        "response-time",
        apiResponseTime.message,
        getFailureSeverity(apiResponseTime.status)
      ).catch((logError) => {
        console.error("Unable to record the diagnostics failure.", logError);
      });
    }
    return result;
  } catch (error) {
    const responseTimeMs = Date.now() - startedAt;
    const message =
      "The diagnostics request could not reach Firebase services.";
    const result: DiagnosticsResult = {
      backend: {
        status: "unavailable",
        message,
      },
      database: {
        status: "unavailable",
        message: "Firestore connection could not be verified.",
      },
      apiResponseTime: {
        status: "unavailable",
        message: "No response was received.",
        responseTimeMs,
      },
      overallHealth: "critical",
      checkedAt,
    };

    console.error("System diagnostics request failed.", error);
    await recordDiagnosticFailure("connectivity", message, "critical").catch(
      (logError) => {
        console.error("Unable to record the diagnostics failure.", logError);
      }
    );
    return result;
  }
}
