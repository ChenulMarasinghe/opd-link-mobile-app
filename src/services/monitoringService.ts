import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

import { db } from "./firebase";

export type ServiceStatus = "operational" | "warning" | "down";
export type OverallStatus = "operational" | "warning" | "critical";

export interface MonitoringServiceStatuses {
  appointment: ServiceStatus;
  queue: ServiceStatus;
  notification: ServiceStatus;
  authentication: ServiceStatus;
  database: ServiceStatus;
}

export interface MonitoringResult {
  overallStatus: OverallStatus;
  availability: {
    percentage: number;
    period: string;
    change: number | null;
  };
  responseTime: number | null;
  databaseUsage: string;
  services: MonitoringServiceStatuses;
  lastUpdated: Timestamp;
}

type SystemHealthData = {
  overallStatus?: unknown;
  availability?: {
    percentage?: unknown;
    period?: unknown;
    change?: unknown;
  };
};

type MonitoringSnapshotData = {
  overallStatus?: unknown;
};

const isOverallStatus = (value: unknown): value is OverallStatus =>
  value === "operational" || value === "warning" || value === "critical";

const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

async function getSnapshotAvailability(): Promise<number | null> {
  try {
    const snapshot = await getDocs(
      query(
        collection(db, "monitoringSnapshots"),
        orderBy("checkedAt", "desc"),
        limit(100)
      )
    );
    if (snapshot.empty) return null;

    const operationalCount = snapshot.docs.filter((entry) => {
      const data = entry.data() as MonitoringSnapshotData;
      return data.overallStatus === "operational";
    }).length;
    return (operationalCount / snapshot.size) * 100;
  } catch (error) {
    console.error("Unable to calculate monitoring snapshot availability.", error);
    return null;
  }
}

const getServiceStatus = async (
  collectionName: string
): Promise<ServiceStatus> => {
  try {
    await getDocs(query(collection(db, collectionName), limit(1)));
    return "operational";
  } catch (error) {
    console.error(`Unable to check ${collectionName} service.`, error);
    return "down";
  }
};

function getAuthenticationStatus(): ServiceStatus {
  return "operational";
}

function calculateOverallStatus(
  services: MonitoringServiceStatuses
): OverallStatus {
  if (services.database === "down") return "critical";
  if (Object.values(services).some((status) => status === "down")) {
    return "warning";
  }
  if (Object.values(services).some((status) => status === "warning")) {
    return "warning";
  }
  return "operational";
}

export async function runMonitoringChecks(
  saveSnapshot = false
): Promise<MonitoringResult> {
  const healthReference = doc(db, "systemHealth", "current");
  const databaseCheckStartedAt = Date.now();

  let healthData: SystemHealthData = {};
  let responseTime: number | null = null;
  let databaseStatus: ServiceStatus = "operational";

  try {
    const healthSnapshot = await getDoc(healthReference);
    responseTime = Date.now() - databaseCheckStartedAt;
    healthData = healthSnapshot.exists()
      ? (healthSnapshot.data() as SystemHealthData)
      : {};
  } catch (error) {
    databaseStatus = "down";
    console.error("Unable to read system health from Firestore.", error);
  }

  const services: MonitoringServiceStatuses = {
    appointment: await getServiceStatus("appointments"),
    queue: await getServiceStatus("queues"),
    notification: await getServiceStatus("notifications"),
    authentication: getAuthenticationStatus(),
    database: databaseStatus,
  };

  const checkedStatus = calculateOverallStatus(services);
  const storedStatus = isOverallStatus(healthData.overallStatus)
    ? healthData.overallStatus
    : "operational";
  const overallStatus =
    checkedStatus === "critical"
      ? "critical"
      : storedStatus === "critical"
        ? "critical"
        : checkedStatus === "warning" || storedStatus === "warning"
          ? "warning"
          : "operational";
  const now = Timestamp.now();
  const snapshotAvailability = await getSnapshotAvailability();
  const availabilityPercentage =
    snapshotAvailability ??
    asNumber(healthData.availability?.percentage) ??
    (overallStatus === "operational" ? 100 : 0);

  const result: MonitoringResult = {
    overallStatus,
    availability: {
      percentage: availabilityPercentage,
      period:
        typeof healthData.availability?.period === "string"
          ? healthData.availability.period
          : "Current check",
      change: asNumber(healthData.availability?.change),
    },
    responseTime,
    databaseUsage: databaseStatus === "operational" ? "Connected" : "Unavailable",
    services,
    lastUpdated: now,
  };

  if (saveSnapshot) {
    try {
      await addDoc(collection(db, "monitoringSnapshots"), {
        overallStatus: result.overallStatus,
        services: result.services,
        responseTime: result.responseTime,
        checkedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Unable to save monitoring snapshot.", error);
    }
  }

  return result;
}
