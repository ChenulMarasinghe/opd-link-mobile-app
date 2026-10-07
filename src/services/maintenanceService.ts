import {
  addDoc,
  collection,
  doc,
  getDocs,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "./firebase";

export type MaintenanceStatus =
  | "scheduled"
  | "in-progress"
  | "completed"
  | "cancelled";

export interface MaintenanceRecord {
  id: string;
  title: string;
  description?: string;
  scheduledStart: Timestamp;
  scheduledEnd: Timestamp;
  status: MaintenanceStatus;
  affectedServices: string[];
  createdAt: Timestamp;
}

export interface CreateMaintenanceInput {
  title: string;
  description?: string;
  scheduledStart: Timestamp;
  scheduledEnd: Timestamp;
  status: MaintenanceStatus;
  affectedServices: string[];
}

const maintenanceCollection = collection(db, "maintenance");

const isStatus = (value: unknown): value is MaintenanceStatus =>
  value === "scheduled" ||
  value === "in-progress" ||
  value === "completed" ||
  value === "cancelled";

const asTimestamp = (value: unknown): Timestamp | null =>
  value instanceof Timestamp ? value : null;

function parseMaintenance(
  id: string,
  data: Record<string, unknown>
): MaintenanceRecord | null {
  const scheduledStart = asTimestamp(data.scheduledStart);
  const scheduledEnd = asTimestamp(data.scheduledEnd);
  const createdAt = asTimestamp(data.createdAt);

  if (
    typeof data.title !== "string" ||
    !scheduledStart ||
    !scheduledEnd ||
    !createdAt ||
    !isStatus(data.status)
  ) {
    return null;
  }

  return {
    id,
    title: data.title,
    description:
      typeof data.description === "string" ? data.description : undefined,
    scheduledStart,
    scheduledEnd,
    status: data.status,
    affectedServices: Array.isArray(data.affectedServices)
      ? data.affectedServices.filter(
          (service): service is string => typeof service === "string"
        )
      : [],
    createdAt,
  };
}

export async function getCurrentMaintenance(): Promise<MaintenanceRecord | null> {
  const now = Timestamp.now();
  const snapshot = await getDocs(maintenanceCollection);
  return snapshot.docs
    .map((document) => parseMaintenance(document.id, document.data()))
    .filter(
      (record): record is MaintenanceRecord =>
        record !== null &&
        record.scheduledStart.toMillis() <= now.toMillis() &&
        record.scheduledEnd.toMillis() >= now.toMillis()
    )
    .sort((a, b) => a.scheduledStart.toMillis() - b.scheduledStart.toMillis())[0] ?? null;
}

export async function getNextMaintenance(): Promise<MaintenanceRecord | null> {
  const now = Timestamp.now();
  const snapshot = await getDocs(maintenanceCollection);
  return snapshot.docs
    .map((document) => parseMaintenance(document.id, document.data()))
    .filter(
      (record): record is MaintenanceRecord =>
        record !== null &&
        record.status === "scheduled" &&
        record.scheduledStart.toMillis() > now.toMillis()
    )
    .sort((a, b) => a.scheduledStart.toMillis() - b.scheduledStart.toMillis())[0] ?? null;
}

export async function getMaintenanceHistory(
  maxResults = 20
): Promise<MaintenanceRecord[]> {
  const snapshot = await getDocs(maintenanceCollection);
  return snapshot.docs
    .flatMap((document) => {
      const record = parseMaintenance(document.id, document.data());
      return record ? [record] : [];
    })
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
    .slice(0, maxResults);
}

export async function createMaintenance(
  maintenance: CreateMaintenanceInput
): Promise<string> {
  const reference = await addDoc(maintenanceCollection, {
    ...maintenance,
    createdAt: serverTimestamp(),
  });

  await addSystemActivity(
    "maintenance",
    `Maintenance ${maintenance.status === "scheduled" ? "scheduled" : "created"}`,
    "info"
  );
  return reference.id;
}

export async function updateMaintenanceStatus(
  id: string,
  status: MaintenanceStatus
): Promise<void> {
  await updateDoc(doc(db, "maintenance", id), { status });
  if (status === "in-progress" || status === "completed") {
    await addSystemActivity(
      "maintenance",
      `Maintenance ${status === "in-progress" ? "started" : "completed"}`,
      status === "completed" ? "success" : "info"
    );
  }
}

async function addSystemActivity(
  type: "maintenance" | "backup",
  title: string,
  status: "success" | "warning" | "critical" | "info"
) {
  await addDoc(collection(db, "systemActivities"), {
    type,
    title,
    status,
    createdAt: serverTimestamp(),
  });
}
