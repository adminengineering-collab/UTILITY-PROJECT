import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, 'central-sync-data.json');

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
      if (parsed && typeof parsed === 'object') {
        return {
          sheetUrl: parsed.sheetUrl || '',
          lastSyncedAt: parsed.lastSyncedAt || null,
          lastUpdated: parsed.lastUpdated || Date.now(),
          entries: Array.isArray(parsed.entries) ? parsed.entries : [],
          steamData: parsed.steamData || {},
          rowCount: Array.isArray(parsed.entries) ? parsed.entries.length : (parsed.rowCount || 0),
          mergeMode: parsed.mergeMode || 'replace',
        };
      }
    }
  } catch (err) {
    console.error('Error reading central-sync-data.json:', err);
  }

  return {
    sheetUrl: '',
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

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '25mb' }));

  // Status check for lightweight polling
  app.get('/api/sync/status', (_req, res) => {
    res.json({
      success: true,
      hasData: centralState.entries.length > 0,
      sheetUrl: centralState.sheetUrl,
      lastSyncedAt: centralState.lastSyncedAt,
      lastUpdated: centralState.lastUpdated,
      rowCount: centralState.rowCount || centralState.entries.length,
      mergeMode: centralState.mergeMode,
    });
  });

  // Get full synchronized dataset for all visitors
  app.get('/api/sync/data', (_req, res) => {
    res.json({
      success: true,
      sheetUrl: centralState.sheetUrl,
      lastSyncedAt: centralState.lastSyncedAt,
      lastUpdated: centralState.lastUpdated,
      entries: centralState.entries,
      steamData: centralState.steamData,
      rowCount: centralState.entries.length,
      mergeMode: centralState.mergeMode,
    });
  });

  // Update central sync data (called when a user syncs spreadsheet or updates URL)
  app.post('/api/sync/save', (req, res) => {
    try {
      const { sheetUrl, entries, steamData, lastSyncedAt, mergeMode } = req.body;

      if (typeof sheetUrl === 'string') {
        centralState.sheetUrl = sheetUrl.trim();
      }
      if (Array.isArray(entries)) {
        centralState.entries = entries;
        centralState.rowCount = entries.length;
      }
      if (steamData && typeof steamData === 'object') {
        centralState.steamData = steamData;
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
      if (typeof sheetUrl === 'string') {
        centralState.sheetUrl = sheetUrl.trim();
      }
      if (mergeMode) {
        centralState.mergeMode = mergeMode;
      }
      centralState.lastUpdated = Date.now();
      saveCentralData(centralState);
      res.json({ success: true, sheetUrl: centralState.sheetUrl, mergeMode: centralState.mergeMode });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Reset central data
  app.post('/api/sync/reset', (_req, res) => {
    centralState = {
      sheetUrl: '',
      lastSyncedAt: null,
      lastUpdated: Date.now(),
      entries: [],
      steamData: {},
      rowCount: 0,
      mergeMode: 'replace',
    };
    saveCentralData(centralState);
    res.json({ success: true, message: 'Data terpusat berhasil di-reset.' });
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
  });
}

startServer();
