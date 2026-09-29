import { SyncEvent, SyncActionType, ServerSyncConfig } from '../types';

const SYNC_STORAGE_KEY = 'savdo_erp_sync_events';

export const DEFAULT_SERVER_SYNC_CONFIG: ServerSyncConfig = {
  enabled: true,
  serverUrl: '', // Foydalanuvchi oxirida beradigan server manzili
  apiKey: '',
  autoSync: true,
  syncIntervalSec: 10,
  lastSyncedAt: undefined,
  lastSyncStatus: 'waiting_server_url',
  lastErrorMessage: undefined,
};

class ServerSyncManager {
  private syncTimer: any = null;
  private isSyncing = false;

  constructor() {
    this.initAutoSync();
  }

  // Barcha saqlangan hodisalar (audit log / navbat)
  public getEvents(): SyncEvent[] {
    try {
      const raw = localStorage.getItem(SYNC_STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      console.error('Error reading sync events:', e);
      return [];
    }
  }

  // Hali serverga yetkazilmagan hodisalar
  public getPendingEvents(): SyncEvent[] {
    return this.getEvents().filter(e => !e.synced);
  }

  public getPendingCount(): number {
    return this.getPendingEvents().length;
  }

  // Yangi hodisani navbatga yozish (barcha o'zgarishlar shu orqali qayd etiladi)
  public recordEvent(data: {
    action: SyncActionType;
    entity: SyncEvent['entity'];
    entityId?: string;
    storeId: string;
    deviceStoreId: string;
    description: string;
    payload: any;
  }): SyncEvent {
    const events = this.getEvents();
    const newEvent: SyncEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      action: data.action,
      entity: data.entity,
      entityId: data.entityId,
      storeId: data.storeId,
      deviceStoreId: data.deviceStoreId,
      description: data.description,
      payload: data.payload,
      timestamp: new Date().toISOString(),
      synced: false,
      retryCount: 0,
    };

    // Eng yangi hodisalar boshiga qo'shiladi
    events.unshift(newEvent);

    // Xotirani to'ldirib yubormaslik uchun oxirgi 5,000 ta hodisa saqlanadi
    const trimmed = events.slice(0, 5000);
    try {
      localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(trimmed));
      window.dispatchEvent(new CustomEvent('erp_sync_changed', { detail: { newEvent, pendingCount: this.getPendingCount() } }));
    } catch (err) {
      console.error('Error writing sync event:', err);
    }

    // Agar server URL ulangan bo'lsa, fon rejimida serverga jo'natishga urinadi
    this.triggerSyncDebounced();

    return newEvent;
  }

  // Hodisalarni sinxronlangan deb belgilash
  public markEventsSynced(ids: string[]): void {
    if (!ids || ids.length === 0) return;
    const set = new Set(ids);
    const now = new Date().toISOString();
    const events = this.getEvents().map(e => {
      if (set.has(e.id)) {
        return { ...e, synced: true, syncedAt: now, error: undefined };
      }
      return e;
    });

    try {
      localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(events));
      window.dispatchEvent(new CustomEvent('erp_sync_changed', { detail: { pendingCount: this.getPendingCount() } }));
    } catch (e) {
      console.error('Error updating synced events:', e);
    }
  }

  // Hodisalarga xatolik qayd etish
  public markEventsFailed(ids: string[], errorMessage: string): void {
    const set = new Set(ids);
    const events = this.getEvents().map(e => {
      if (set.has(e.id)) {
        return { 
          ...e, 
          retryCount: (e.retryCount || 0) + 1, 
          error: errorMessage 
        };
      }
      return e;
    });

    try {
      localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(events));
      window.dispatchEvent(new CustomEvent('erp_sync_changed', { detail: { pendingCount: this.getPendingCount() } }));
    } catch (e) {
      console.error('Error updating failed events:', e);
    }
  }

  // Serverga ulanishni sinash (Ping / Health check)
  public async testConnection(serverUrl: string, apiKey?: string): Promise<{ success: boolean; message: string; latency?: number }> {
    if (!serverUrl || !serverUrl.trim()) {
      return { 
        success: false, 
        message: "Server manzili (URL) kiritilmagan. Server tayyor bo'lgach manzilni kiriting." 
      };
    }

    const cleanUrl = serverUrl.trim().replace(/\/+$/, '');
    const startTime = performance.now();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey.trim()}`;
      }

      // 1. Health yoki Ping endpointini sinash
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const resp = await fetch(`${cleanUrl}/api/health`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      }).catch(async () => {
        // Agar /api/health bo'lmasa, ildiz yoki /api ga so'rov yuborish
        return await fetch(`${cleanUrl}/`, {
          method: 'GET',
          headers,
          signal: controller.signal,
        });
      });

      clearTimeout(timeoutId);
      const latency = Math.round(performance.now() - startTime);

      if (resp && resp.ok) {
        return { 
          success: true, 
          message: `Server bilan aloqa muvaffaqiyatli o'rnatildi (${latency} ms). Barcha o'zgarishlar serverga yoziladi.`, 
          latency 
        };
      } else {
        return { 
          success: false, 
          message: `Server javob berdi (${resp?.status || 'Noma\'lum'}), ammo xizmat tayyor emas.` 
        };
      }
    } catch (err: any) {
      const latency = Math.round(performance.now() - startTime);
      if (err.name === 'AbortError') {
        return { success: false, message: 'Serverdan javob kutish vaqti tugadi (Timeout).' };
      }
      return { 
        success: false, 
        message: `Serverga ulanib bo'lmadi: ${err.message || 'Tarmoq xatosi'}. Server manzili to'g'riligini tekshiring.` 
      };
    }
  }

  // Hamma to'plangan o'zgarishlarni serverga yuklash (Sync dispatch)
  public async syncWithServer(config?: ServerSyncConfig): Promise<{
    success: boolean;
    sentCount: number;
    pendingCount: number;
    error?: string;
  }> {
    if (this.isSyncing) {
      return { success: false, sentCount: 0, pendingCount: this.getPendingCount(), error: 'Sinxronizatsiya allaqachon bajarilmoqda...' };
    }

    const currentConfig = config || this.getCurrentConfig();
    const serverUrl = currentConfig.serverUrl?.trim();

    if (!serverUrl) {
      return {
        success: false,
        sentCount: 0,
        pendingCount: this.getPendingCount(),
        error: 'Server manzili hali kiritilmagan. Barcha o\'zgarishlar mahalliy xotirada xavfsiz saqlanmoqda.',
      };
    }

    const pending = this.getPendingEvents();
    if (pending.length === 0) {
      return { success: true, sentCount: 0, pendingCount: 0 };
    }

    this.isSyncing = true;
    const batch = pending.slice(0, 50); // 50 tadan qismlarga bo'lib jo'natish
    const cleanUrl = serverUrl.replace(/\/+$/, '');

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (currentConfig.apiKey) {
        headers['Authorization'] = `Bearer ${currentConfig.apiKey.trim()}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const resp = await fetch(`${cleanUrl}/api/sync/events`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sourceApp: 'TEXTILE_PRO_ERP',
          events: batch,
          timestamp: new Date().toISOString(),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (resp.ok) {
        const syncedIds = batch.map(e => e.id);
        this.markEventsSynced(syncedIds);
        this.isSyncing = false;
        return {
          success: true,
          sentCount: batch.length,
          pendingCount: this.getPendingCount(),
        };
      } else {
        const errText = await resp.text().catch(() => resp.statusText);
        this.markEventsFailed(batch.map(e => e.id), `Server error: ${resp.status}`);
        this.isSyncing = false;
        return {
          success: false,
          sentCount: 0,
          pendingCount: this.getPendingCount(),
          error: `Server xatosi: ${resp.status} - ${errText.slice(0, 100)}`,
        };
      }
    } catch (err: any) {
      this.isSyncing = false;
      this.markEventsFailed(batch.map(e => e.id), err.message || 'Tarmoq xatosi');
      return {
        success: false,
        sentCount: 0,
        pendingCount: this.getPendingCount(),
        error: `Serverga ulanib bo'lmadi: ${err.message || 'Tarmoq xatosi'}`,
      };
    }
  }

  // Tizimdagi hozirgi sozlamalardan ServerSyncConfig olish
  private getCurrentConfig(): ServerSyncConfig {
    try {
      const raw = localStorage.getItem('savdo_erp_settings');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.serverSync) return parsed.serverSync;
      }
    } catch (e) {
      // ignore
    }
    return DEFAULT_SERVER_SYNC_CONFIG;
  }

  private debounceTimer: any = null;
  private triggerSyncDebounced() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      const cfg = this.getCurrentConfig();
      if (cfg.enabled && cfg.serverUrl && cfg.autoSync) {
        this.syncWithServer(cfg);
      }
    }, 1500);
  }

  private initAutoSync() {
    if (this.syncTimer) clearInterval(this.syncTimer);
    // Har 15 soniyada fonda tekshirish
    this.syncTimer = setInterval(() => {
      const cfg = this.getCurrentConfig();
      if (cfg.enabled && cfg.serverUrl && cfg.autoSync && this.getPendingCount() > 0) {
        this.syncWithServer(cfg);
      }
    }, 15000);
  }

  // Barcha bazani JSON paket ko'rinishida to'liq eksport qilish
  public exportFullBackup(): {
    appName: string;
    version: string;
    exportedAt: string;
    deviceStoreId: string;
    pendingEventsCount: number;
    events: SyncEvent[];
    database: Record<string, any>;
  } {
    const rawKeys = [
      'products',
      'customers',
      'suppliers',
      'sales',
      'expenses',
      'debt_transactions',
      'settings',
      'device_store_id'
    ];

    const database: Record<string, any> = {};
    for (const k of rawKeys) {
      try {
        const val = localStorage.getItem(`savdo_erp_${k}`);
        if (val) database[k] = JSON.parse(val);
      } catch (e) {
        // ignore
      }
    }

    return {
      appName: 'TEXTILE PRO ERP (Trikotaj Matolar Savdosi)',
      version: '2.5.0',
      exportedAt: new Date().toISOString(),
      deviceStoreId: localStorage.getItem('savdo_erp_device_store_id') || 'store_1',
      pendingEventsCount: this.getPendingCount(),
      events: this.getEvents(),
      database,
    };
  }

  // Sinxronlangan eski hodisalarni tozalash (joy ochish uchun)
  public clearSyncedEvents(): void {
    const pendingOnly = this.getPendingEvents();
    try {
      localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(pendingOnly));
      window.dispatchEvent(new CustomEvent('erp_sync_changed', { detail: { pendingCount: pendingOnly.length } }));
    } catch (e) {
      console.error('Error clearing synced events:', e);
    }
  }
}

export const serverSyncService = new ServerSyncManager();
