import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { parseSpreadsheetText, convertToGoogleSheetsCsvUrl } from './src/utils/spreadsheetSync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, 'central-sync-data.json');
const BACKUP_PARSED_FILE = path.join(__dirname, 'parsed-sheet-data.json');
export const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vReX157LTj_RETKc9vFI40-e-FeAWoH2HaN5VprAWNju_gPpWvEB-W72QJ4oEOohP9clWRLXWmQe_R_/pub?output=csv";

interface CentralSyncData {
  sheetUrl: string;
  lastSyncedAt: string | null;
  lastUpdated: number;
  entries: any[];
  steamData: Record<string, number>;
  rowCount: number;
  mergeMode: 'replace' | 'merge';
}

function loadCentralData(): CentralSyncData {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.entries) && parsed.entries.length >= 200) {
        return {
          sheetUrl: parsed.sheetUrl || DEFAULT_SHEET_URL,
          lastSyncedAt: parsed.lastSyncedAt || null,
          lastUpdated: parsed.lastUpdated || Date.now(),
          entries: parsed.entries,
          steamData: parsed.steamData || {},
          rowCount: parsed.entries.length,
          mergeMode: parsed.mergeMode || 'replace',
        };
      }
    }
  } catch (err) {
    console.error('Error reading central-sync-data.json:', err);
  }

  // Fallback to parsed-sheet-data.json if central-sync-data is empty or small
  try {
    if (fs.existsSync(BACKUP_PARSED_FILE)) {
      const backup = JSON.parse(fs.readFileSync(BACKUP_PARSED_FILE, 'utf-8'));
      if (backup && Array.isArray(backup.entries) && backup.entries.length >= 200) {
        return {
          sheetUrl: DEFAULT_SHEET_URL,
          lastSyncedAt: new Date().toLocaleString('id-ID'),
          lastUpdated: Date.now(),
          entries: backup.entries,
          steamData: backup.steamData || {},
          rowCount: backup.entries.length,
          mergeMode: 'replace',
        };
      }
    }
  } catch (err) {
    console.error('Error reading backup parsed file:', err);
  }

  return {
    sheetUrl: DEFAULT_SHEET_URL,
    lastSyncedAt: null,
    lastUpdated: Date.now(),
    entries: [],
    steamData: {},
    rowCount: 0,
    mergeMode: 'replace',
  };
}

function saveCentralData(data: CentralSyncData) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing central-sync-data.json:', err);
  }
}

let centralState: CentralSyncData = loadCentralData();

// Server-side direct Google Sheets live synchronizer
async function syncServerFromSpreadsheet(overrideUrl?: string): Promise<boolean> {
  const targetUrl = (overrideUrl || centralState.sheetUrl || DEFAULT_SHEET_URL).trim();
  if (!targetUrl) return false;

  try {
    const csvUrl = convertToGoogleSheetsCsvUrl(targetUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(`${csvUrl}${csvUrl.includes('?') ? '&' : '?'}_t=${Date.now()}`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[Server Sync] Google Sheet HTTP ${res.status}`);
      return false;
    }

    const text = await res.text();
    const parsed = parseSpreadsheetText(text);

    if (parsed.entries && parsed.entries.length > 0) {
      centralState.sheetUrl = targetUrl;
      centralState.entries = parsed.entries;
      centralState.steamData = parsed.steamData || {};
      centralState.rowCount = parsed.entries.length;
      centralState.lastSyncedAt = new Date().toLocaleString('id-ID');
      centralState.lastUpdated = Date.now();
      saveCentralData(centralState);
      console.log(`[Server Sync] Successfully synced ${parsed.entries.length} rows from Google Sheets.`);
      return true;
    }
  } catch (err: any) {
    console.error('[Server Sync] Failed to fetch Google Sheet:', err.message);
  }
  return false;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '25mb' }));

  // Status check for lightweight polling
  app.get('/api/sync/status', (_req, res) => {
    res.json({
      success: true,
      hasData: centralState.entries.length > 0,
      sheetUrl: centralState.sheetUrl || DEFAULT_SHEET_URL,
      lastSyncedAt: centralState.lastSyncedAt,
      lastUpdated: centralState.lastUpdated,
      rowCount: centralState.entries.length,
      mergeMode: centralState.mergeMode,
    });
  });

  // Get full synchronized dataset for all visitors
  app.get('/api/sync/data', (_req, res) => {
    res.json({
      success: true,
      sheetUrl: centralState.sheetUrl || DEFAULT_SHEET_URL,
      lastSyncedAt: centralState.lastSyncedAt,
      lastUpdated: centralState.lastUpdated,
      entries: centralState.entries,
      steamData: centralState.steamData,
      rowCount: centralState.entries.length,
      mergeMode: centralState.mergeMode,
    });
  });

  // Force refresh directly from Google Sheets
  app.post('/api/sync/refresh', async (req, res) => {
    const { sheetUrl } = req.body || {};
    const ok = await syncServerFromSpreadsheet(sheetUrl);
    res.json({
      success: ok,
      rowCount: centralState.entries.length,
      lastUpdated: centralState.lastUpdated,
      lastSyncedAt: centralState.lastSyncedAt,
      sheetUrl: centralState.sheetUrl,
    });
  });

  // Update central sync data (called when a client syncs or updates data)
  app.post('/api/sync/save', (req, res) => {
    try {
      const { sheetUrl, entries, steamData, lastSyncedAt, mergeMode } = req.body;

      if (typeof sheetUrl === 'string' && sheetUrl.trim()) {
        centralState.sheetUrl = sheetUrl.trim();
      }
      if (Array.isArray(entries) && entries.length > 0) {
        // Prevent accidental downgrades from stale browser tabs (e.g., 105 entries overriding 292 entries)
        if (centralState.entries.length >= 200 && entries.length < 150) {
          console.warn(`[Sync Guard] Rejected save: Server has ${centralState.entries.length} rows, incoming client had only ${entries.length}`);
        } else {
          centralState.entries = entries;
          centralState.rowCount = entries.length;
        }
      }
      if (steamData && typeof steamData === 'object' && Object.keys(steamData).length > 0) {
        centralState.steamData = { ...centralState.steamData, ...steamData };
      }
      if (lastSyncedAt) {
        centralState.lastSyncedAt = lastSyncedAt;
      }
      if (mergeMode) {
        centralState.mergeMode = mergeMode;
      }

      centralState.lastUpdated = Date.now();
      saveCentralData(centralState);

      res.json({
        success: true,
        rowCount: centralState.entries.length,
        lastUpdated: centralState.lastUpdated,
        lastSyncedAt: centralState.lastSyncedAt,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Gagal menyimpan data terpusat.' });
    }
  });

  // Update only config (sheetUrl, auto-merge mode)
  app.post('/api/sync/config', (req, res) => {
    try {
      const { sheetUrl, mergeMode } = req.body;
      if (typeof sheetUrl === 'string' && sheetUrl.trim()) {
        centralState.sheetUrl = sheetUrl.trim();
      }
      if (mergeMode) {
        centralState.mergeMode = mergeMode;
      }
      centralState.lastUpdated = Date.now();
      saveCentralData(centralState);

      // Trigger background sync with the new sheet URL immediately
      syncServerFromSpreadsheet(centralState.sheetUrl).catch(console.error);

      res.json({ success: true, sheetUrl: centralState.sheetUrl, mergeMode: centralState.mergeMode });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Reset central data back to default official sheet
  app.post('/api/sync/reset', async (_req, res) => {
    centralState.sheetUrl = DEFAULT_SHEET_URL;
    await syncServerFromSpreadsheet(DEFAULT_SHEET_URL);
    res.json({
      success: true,
      message: 'Data terpusat berhasil di-reset ke template resmi.',
      rowCount: centralState.entries.length,
    });
  });

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
    // Initial sync from Google Sheets on boot
    syncServerFromSpreadsheet().catch(console.error);
    // Background auto-sync every 30 seconds
    setInterval(() => {
      syncServerFromSpreadsheet().catch(console.error);
    }, 30000);
  });
}

startServer();
