import { FuelEntry } from '../types/boiler';

export interface CentralSyncResponse {
  success: boolean;
  sheetUrl?: string;
  lastSyncedAt?: string | null;
  lastUpdated?: number;
  entries?: FuelEntry[];
  steamData?: Record<string, number>;
  rowCount?: number;
  mergeMode?: 'replace' | 'merge';
  error?: string;
}

export async function fetchCentralStatus(): Promise<{
  success: boolean;
  hasData: boolean;
  sheetUrl: string;
  lastSyncedAt: string | null;
  lastUpdated: number;
  rowCount: number;
  mergeMode: 'replace' | 'merge';
}> {
  try {
    const res = await fetch('/api/sync/status', { cache: 'no-store' });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    return await res.json();
  } catch {
    return {
      success: false,
      hasData: false,
      sheetUrl: '',
      lastSyncedAt: null,
      lastUpdated: 0,
      rowCount: 0,
      mergeMode: 'replace',
    };
  }
}

export async function fetchCentralData(): Promise<CentralSyncResponse> {
  try {
    const res = await fetch('/api/sync/data', { cache: 'no-store' });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function saveCentralDataToServer(payload: {
  sheetUrl?: string;
  entries: FuelEntry[];
  steamData: Record<string, number>;
  lastSyncedAt?: string | null;
  mergeMode?: 'replace' | 'merge';
}): Promise<{ success: boolean; rowCount?: number; lastUpdated?: number; error?: string }> {
  try {
    const res = await fetch('/api/sync/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    return await res.json();
  } catch (err: any) {
    console.error('saveCentralDataToServer failed:', err);
    return { success: false, error: err.message };
  }
}

export async function saveCentralConfigToServer(payload: {
  sheetUrl?: string;
  mergeMode?: 'replace' | 'merge';
}): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/sync/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function resetCentralDataOnServer(): Promise<{ success: boolean }> {
  try {
    const res = await fetch('/api/sync/reset', { method: 'POST' });
    return await res.json();
  } catch {
    return { success: false };
  }
}
