import {
  addDoc,
  collection,
  doc,
  getDocsFromServer,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "./firebase";

export type BackupType = "automatic" | "manual";
export type BackupStatus = "pending" | "running" | "completed" | "failed";

export interface BackupComponent {
  name: string;
  status: "pending" | "running" | "completed" | "failed";
}

export interface BackupRecord {
  id: string;
  type: BackupType;
  status: BackupStatus;
  startedAt: Timestamp;
  completedAt?: Timestamp;
  sizeMB?: number;
  storageUsedMB?: number;
  storageLimitMB?: number;
  components: BackupComponent[];
  createdAt: Timestamp;
}

export interface CreateBackupInput {
  type: BackupType;
  status: BackupStatus;
  startedAt: Timestamp;
  completedAt?: Timestamp;
  sizeMB?: number;
  storageUsedMB?: number;
  storageLimitMB?: number;
  components: BackupComponent[];
}

const backupCollection = collection(db, "backups");
let simulationRunning = false;

const asTimestamp = (value: unknown): Timestamp | undefined =>
  value instanceof Timestamp ? value : undefined;

const isBackupStatus = (value: unknown): value is BackupStatus =>
  value === "pending" ||
  value === "running" ||
  value === "completed" ||
  value === "failed";

function parseBackup(id: string, data: Record<string, unknown>): BackupRecord | null {
  const startedAt = asTimestamp(data.startedAt);
  const createdAt = asTimestamp(data.createdAt);
  if (
    (data.type !== "automatic" && data.type !== "manual") ||
    !isBackupStatus(data.status) ||
    !startedAt ||
    !createdAt
  ) {
    return null;
  }

  return {
    id,
    type: data.type,
    status: data.status,
    startedAt,
    completedAt: asTimestamp(data.completedAt),
    sizeMB: typeof data.sizeMB === "number" ? data.sizeMB : undefined,
    storageUsedMB:
      typeof data.storageUsedMB === "number" ? data.storageUsedMB : undefined,
    storageLimitMB:
      typeof data.storageLimitMB === "number" ? data.storageLimitMB : undefined,
    components: Array.isArray(data.components)
      ? data.components.flatMap((component) => {
          if (
            !component ||
            typeof component !== "object" ||
            !("name" in component) ||
            !("status" in component) ||
            typeof component.name !== "string" ||
            !isBackupStatus(component.status)
          ) {
            return [];
          }
          return [{ name: component.name, status: component.status }];
        })
      : [],
    createdAt,
  };
}

export async function getLatestBackup(): Promise<BackupRecord | null> {
  const snapshot = await getDocsFromServer(
    query(backupCollection, orderBy("createdAt", "desc"), limit(1))
  );
  const document = snapshot.docs[0];
  return document ? parseBackup(document.id, document.data()) : null;
}

export async function getBackupHistory(maxResults = 20): Promise<BackupRecord[]> {
  const snapshot = await getDocsFromServer(
    query(backupCollection, orderBy("createdAt", "desc"), limit(maxResults))
  );
  return snapshot.docs.flatMap((document) => {
    const record = parseBackup(document.id, document.data());
    return record ? [record] : [];
  });
}

export async function createBackupRecord(
  backup: CreateBackupInput
): Promise<string> {
  const reference = await addDoc(backupCollection, {
    ...backup,
    createdAt: serverTimestamp(),
  });

  if (backup.status === "running") {
    await addSystemActivity("Backup started", "info");
  }
  return reference.id;
}

export async function updateBackupStatus(
  id: string,
  status: BackupStatus,
  values: Partial<Pick<
    CreateBackupInput,
    "sizeMB" | "storageUsedMB" | "storageLimitMB" | "components"
  >> = {}
): Promise<void> {
  await updateDoc(doc(db, "backups", id), {
    status,
    ...values,
    completedAt: status === "completed" || status === "failed"
      ? serverTimestamp()
      : null,
  });

  if (status === "completed") await addSystemActivity("Backup completed", "success");
  if (status === "failed") await addSystemActivity("Backup failed", "critical");
}

export async function getNextBackupTime(): Promise<Timestamp | null> {
  const latest = await getLatestBackup();
  if (!latest) return null;
  const next = latest.startedAt.toDate();
  next.setDate(next.getDate() + 1);
  return Timestamp.fromDate(next);
}

export async function simulateBackup(): Promise<string> {
  if (simulationRunning) {
    throw new Error("A backup simulation is already running.");
  }

  simulationRunning = true;
  let id: string | null = null;
  const components: BackupComponent[] = [
    { name: "Patient Data", status: "running" },
    { name: "Appointment Data", status: "running" },
    { name: "Queue Data", status: "running" },
    { name: "System Configuration", status: "running" },
  ];

  try {
    id = await createBackupRecord({
      type: "manual",
      status: "running",
      startedAt: Timestamp.now(),
      components,
    });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await updateBackupStatus(id, "completed", {
      sizeMB: 4800,
      storageUsedMB: 4800,
      storageLimitMB: 10000,
      components: components.map((component) => ({
        ...component,
        status: "completed",
      })),
    });
    return id;
  } catch (error) {
    if (id) {
      try {
        await updateBackupStatus(id, "failed", {
          components: components.map((component) => ({
            ...component,
            status: "failed",
          })),
        });
      } catch (statusError) {
        console.error("Unable to mark the failed backup simulation.", statusError);
      }
    }
    simulationRunning = false;
    throw error;
  } finally {
    simulationRunning = false;
  }
}

async function addSystemActivity(
  title: string,
  status: "success" | "warning" | "critical" | "info"
) {
  await addDoc(collection(db, "systemActivities"), {
    type: "backup",
    title,
    status,
    createdAt: serverTimestamp(),
  });
}

export function formatMegabytes(value: number | undefined): string {
  if (value === undefined) return "--";
  if (value >= 1000) return `${(value / 1000).toFixed(1)} GB`;
  return `${value} MB`;
}
