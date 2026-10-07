import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";

import { db } from "./firebase";
import { getErrorSummary } from "./errorLogService";

export type OverallStatus = "operational" | "warning" | "critical";

export type SystemActivityType =
  | "backup"
  | "database"
  | "api"
  | "notification"
  | "authentication"
  | "maintenance"
  | "system";

export type SystemActivityStatus =
  | "success"
  | "warning"
  | "critical"
  | "info";

export interface SystemActivity {
  id: string;
  type: SystemActivityType;
  title: string;
  description?: string;
  status: SystemActivityStatus;
  createdAt: Timestamp;
}

export interface SystemHealth {
  overallStatus: OverallStatus;
  uptimePercentage: number;
  lastUpdated: Timestamp | null;
}

export interface ErrorLogRecord {
  id: string;
  severity: string;
  status: string;
}

export interface BackupRecord {
  id: string;
  status: string;
  createdAt: Timestamp;
}

export interface MaintenanceRecord {
  id: string;
  status?: string;
  createdAt: Timestamp;
}

export interface ITDashboardData {
  systemHealth: SystemHealth | null;
  unresolvedCriticalErrors: number;
  latestBackup: BackupRecord | null;
  latestMaintenance: MaintenanceRecord | null;
  recentActivities: SystemActivity[];
}

const isTimestamp = (value: unknown): value is Timestamp =>
  value instanceof Timestamp;

const asTimestamp = (value: unknown): Timestamp | null =>
  isTimestamp(value) ? value : null;

const asString = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.trim() ? value : fallback;

const asNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const isOverallStatus = (value: unknown): value is OverallStatus =>
  value === "operational" || value === "warning" || value === "critical";

const isActivityType = (value: unknown): value is SystemActivityType =>
  value === "backup" ||
  value === "database" ||
  value === "api" ||
  value === "notification" ||
  value === "authentication" ||
  value === "maintenance" ||
  value === "system";

const isActivityStatus = (value: unknown): value is SystemActivityStatus =>
  value === "success" ||
  value === "warning" ||
  value === "critical" ||
  value === "info";

export async function getDashboardData(): Promise<ITDashboardData> {
  const [
    healthSnapshot,
    errorSummary,
    backupSnapshot,
    maintenanceSnapshot,
    activitySnapshot,
  ] = await Promise.all([
    getDoc(doc(db, "systemHealth", "current")),
    getErrorSummary(),
    getDocs(query(collection(db, "backups"), orderBy("createdAt", "desc"), limit(1))),
    getDocs(
      query(collection(db, "maintenance"), orderBy("createdAt", "desc"), limit(1))
    ),
    getDocs(
      query(
        collection(db, "systemActivities"),
        orderBy("createdAt", "desc"),
        limit(3)
      )
    ),
  ]);

  const healthData = healthSnapshot.exists() ? healthSnapshot.data() : null;
  const systemHealth = healthData
    ? {
        overallStatus: isOverallStatus(healthData.overallStatus)
          ? healthData.overallStatus
          : "operational",
        uptimePercentage: asNumber(healthData.uptimePercentage, 0),
        lastUpdated: asTimestamp(healthData.lastUpdated),
      }
    : null;

  const unresolvedCriticalErrors = errorSummary.critical;

  const latestBackupDocument = backupSnapshot.docs[0];
  const latestBackupTimestamp = latestBackupDocument
    ? asTimestamp(latestBackupDocument.data().createdAt)
    : null;
  const latestBackup =
    latestBackupDocument && latestBackupTimestamp
      ? {
          id: latestBackupDocument.id,
          status: asString(latestBackupDocument.data().status, "Unknown"),
          createdAt: latestBackupTimestamp,
        }
      : null;

  const latestMaintenanceDocument = maintenanceSnapshot.docs[0];
  const latestMaintenanceTimestamp = latestMaintenanceDocument
    ? asTimestamp(latestMaintenanceDocument.data().createdAt)
    : null;
  const latestMaintenance =
    latestMaintenanceDocument && latestMaintenanceTimestamp
      ? {
          id: latestMaintenanceDocument.id,
          status:
            typeof latestMaintenanceDocument.data().status === "string"
              ? latestMaintenanceDocument.data().status
              : undefined,
          createdAt: latestMaintenanceTimestamp,
        }
      : null;

  const recentActivities = activitySnapshot.docs.flatMap((activityDocument) => {
    const data = activityDocument.data();
    const createdAt = asTimestamp(data.createdAt);

    if (
      !createdAt ||
      !isActivityType(data.type) ||
      !isActivityStatus(data.status) ||
      typeof data.title !== "string"
    ) {
      return [];
    }

    return [{
      id: activityDocument.id,
      type: data.type,
      title: data.title,
      description: typeof data.description === "string" ? data.description : undefined,
      status: data.status,
      createdAt,
    }];
  });

  return {
    systemHealth,
    unresolvedCriticalErrors,
    latestBackup,
    latestMaintenance,
    recentActivities,
  };
}
