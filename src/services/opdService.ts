import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export interface OpdDepartment {
  id: string;
  name: string;
  closedToday: boolean | null;
  order: number;
  sessions: string[];
  weeklySessions?: Record<string, string[]>;
}

export function toOpdDepartment(id: string, data: Record<string, unknown>): OpdDepartment | null {
  if (typeof data.name !== 'string' || !data.name.trim()) return null;

  const rawOrder = typeof data.order === 'number' || typeof data.order === 'string'
    ? Number(data.order)
    : Number.NaN;

  return {
    id,
    name: data.name,
    closedToday: typeof data.closedToday === 'boolean' ? data.closedToday : null,
    order: Number.isFinite(rawOrder) ? rawOrder : Number.MAX_SAFE_INTEGER,
    sessions: Array.isArray(data.sessions)
      ? data.sessions.filter((session): session is string => typeof session === 'string')
      : [],
    weeklySessions: data.weeklySessions && typeof data.weeklySessions === 'object'
      ? data.weeklySessions as Record<string, string[]>
      : undefined,
  };
}

export async function fetchOpdDepartments(): Promise<OpdDepartment[]> {
  try {
    const snapshot = await getDocs(collection(db, 'opds'));
    const departments: OpdDepartment[] = [];

    snapshot.docs.forEach((document) => {
      const department = toOpdDepartment(document.id, document.data());
      if (!department) {
        console.warn(`Skipping OPD document ${document.id}: missing name.`);
        return;
      }

      departments.push(department);
    });

    return departments.sort(
      (first, second) => first.order - second.order || first.name.localeCompare(second.name)
    );
  } catch (error) {
    console.error('Error fetching OPD departments:', error);
    throw new Error('Failed to load OPD departments.');
  }
}

export async function fetchOpdDepartment(opdId: string): Promise<OpdDepartment | null> {
  try {
    const snapshot = await getDoc(doc(db, 'opds', opdId));
    return snapshot.exists() ? toOpdDepartment(snapshot.id, snapshot.data()) : null;
  } catch (error) {
    console.error('Error fetching OPD department:', error);
    throw new Error('Failed to load OPD department.');
  }
}
