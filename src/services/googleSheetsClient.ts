export interface GoogleSheetsClientConfig {
  enabled: boolean;
  apiUrl: string;        // Server URL (bo'sh bo'lsa avtomatik /api ga ulanadi)
  apiKey?: string;       // API xavfsizlik kaliti (ixtiyoriy)
  sheetId?: string;      // Google Sheets ID (jadvalni to'g'ridan-to'g'ri ochish uchun)
  autoSync: boolean;
  lastSyncedAt?: string;
  lastSyncStatus?: 'success' | 'error' | 'idle' | 'syncing';
  lastErrorMessage?: string;
}

export const DEFAULT_SHEETS_CONFIG: GoogleSheetsClientConfig = {
  enabled: true,
  apiUrl: '', // Bo'sh bo'lsa joriy sayt /api/... ga so'rov yuboradi
  apiKey: '',
  sheetId: '1bscKFPAB5tkeEgqp7OZyRZvDO6fVqd5SIltkTEtQntg',
  autoSync: true,
  lastSyncStatus: 'idle',
};

const SHEETS_CONFIG_KEY = 'savdo_erp_google_sheets_config';

class GoogleSheetsClientService {
  private config: GoogleSheetsClientConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  public getConfig(): GoogleSheetsClientConfig {
    return { ...this.config };
  }

  public saveConfig(newConfig: Partial<GoogleSheetsClientConfig>): GoogleSheetsClientConfig {
    this.config = {
      ...this.config,
      ...newConfig,
    };
    try {
      localStorage.setItem(SHEETS_CONFIG_KEY, JSON.stringify(this.config));
      window.dispatchEvent(new CustomEvent('erp_sheets_config_changed', { detail: this.config }));
    } catch (e) {
      console.error('Error saving sheets config:', e);
    }
    return this.config;
  }

  private loadConfig(): GoogleSheetsClientConfig {
    try {
      const raw = localStorage.getItem(SHEETS_CONFIG_KEY);
      if (raw) {
        return { ...DEFAULT_SHEETS_CONFIG, ...JSON.parse(raw) };
      }
    } catch (e) {
      console.error('Error loading sheets config:', e);
    }
    return DEFAULT_SHEETS_CONFIG;
  }

  private getBaseUrl(): string {
    const custom = (this.config.apiUrl || '').trim().replace(/\/+$/, '');
    if (custom && (custom.startsWith('http://') || custom.startsWith('https://'))) {
      return custom;
    }
    // Standart Vercel yoki bitta domenda ishlaganda
    return '';
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.config.apiKey && this.config.apiKey.trim()) {
      headers['Authorization'] = `Bearer ${this.config.apiKey.trim()}`;
      headers['x-api-key'] = this.config.apiKey.trim();
    }
    return headers;
  }

  // Server va Google Sheets ulanishini sinash (Health check)
  public async testConnection(): Promise<{
    success: boolean;
    message: string;
    latencyMs?: number;
    details?: any;
  }> {
    const baseUrl = this.getBaseUrl();
    const endpoint = `${baseUrl}/api/health`;

    try {
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data) {
        if (data.status === 'online_connected') {
          return {
            success: true,
            message: data.message || 'Google Sheets bazasi bilan aloqa faol va tayyor!',
            latencyMs: data.latencyMs,
            details: data,
          };
        } else if (data.status === 'online_waiting_config') {
          return {
            success: false,
            message: data.message || 'API server ishlayapti, ammo Google Service Account yoki Sheet ID kiritilmagan.',
            details: data,
          };
        } else {
          return {
            success: false,
            message: data.message || 'Serverga ulanishda xatolik yuz berdi.',
            details: data,
          };
        }
      } else {
        return {
          success: false,
          message: data?.error || `Server xatosi: HTTP ${res.status}`,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: `API serverga ulanib bo'lmadi: ${err.message || 'Tarmoq xatosi'}. Server manzili to'g'riligini tekshiring.`,
      };
    }
  }

  // Google Sheets da jadvallarni avtomatik yaratish (Initialize structure)
  public async initializeSheets(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    const baseUrl = this.getBaseUrl();
    const endpoint = `${baseUrl}/api/sheets/init`;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: this.getHeaders(),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        return {
          success: true,
          message: data.message || 'Jadvallar va sarlavhalar muvaffaqiyatli yaratildi!',
          details: data.details,
        };
      } else {
        return {
          success: false,
          message: data?.error || `Jadvallarni yaratib bo'lmadi (HTTP ${res.status})`,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: `Xatolik: ${err.message || 'Tarmoq xatosi'}`,
      };
    }
  }

  // Google Sheets statistikalarini olish
  public async getStats(): Promise<{
    success: boolean;
    stats?: {
      productsCount: number;
      salesCount: number;
      customersCount: number;
      expensesCount: number;
      suppliersCount: number;
    };
    error?: string;
  }> {
    const baseUrl = this.getBaseUrl();
    const endpoint = `${baseUrl}/api/sheets/stats`;

    try {
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        return { success: true, stats: data.stats };
      } else {
        return { success: false, error: data?.error || 'Statistikani olib bo\'lmadi' };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Tarmoq xatosi' };
    }
  }

  // Hamma mahalliy ma'lumotlarni Google Sheets ga eksport qilish
  public async exportAllToSheets(payload: {
    products: any[];
    sales: any[];
    customers: any[];
    suppliers: any[];
    expenses: any[];
    debtTransactions: any[];
  }): Promise<{
    success: boolean;
    message: string;
    counts?: any;
  }> {
    const baseUrl = this.getBaseUrl();
    const endpoint = `${baseUrl}/api/backup/export`;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        this.saveConfig({
          lastSyncedAt: new Date().toISOString(),
          lastSyncStatus: 'success',
          lastErrorMessage: undefined,
        });
        return {
          success: true,
          message: data.message || 'Barcha ma\'lumotlar muvaffaqiyatli Google Sheetsga yuklandi!',
          counts: data.counts,
        };
      } else {
        const errorMsg = data?.error || `Eksport qilib bo'lmadi (HTTP ${res.status})`;
        this.saveConfig({
          lastSyncStatus: 'error',
          lastErrorMessage: errorMsg,
        });
        return { success: false, message: errorMsg };
      }
    } catch (err: any) {
      const errorMsg = `Xatolik: ${err.message || 'Tarmoq xatosi'}`;
      this.saveConfig({
        lastSyncStatus: 'error',
        lastErrorMessage: errorMsg,
      });
      return { success: false, message: errorMsg };
    }
  }

  // Google Sheets dan barcha ma'lumotlarni import qilib olish
  public async importAllFromSheets(): Promise<{
    success: boolean;
    message: string;
    data?: {
      products: any[];
      customers: any[];
      expenses: any[];
      suppliers: any[];
      sales?: any[];
    };
  }> {
    const baseUrl = this.getBaseUrl();
    const endpoint = `${baseUrl}/api/backup/import`;

    try {
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        return {
          success: true,
          message: data.message || 'Ma\'lumotlar yuklab olindi.',
          data: data.data,
        };
      } else {
        return {
          success: false,
          message: data?.error || `Yuklab olib bo'lmadi (HTTP ${res.status})`,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: `Xatolik: ${err.message || 'Tarmoq xatosi'}`,
      };
    }
  }

  // Google Sheets hujjatini brauzerda yangi tabda ochish
  public openGoogleSheet(): void {
    const sheetId = this.config.sheetId?.trim();
    if (sheetId) {
      window.open(`https://docs.google.com/spreadsheets/d/${sheetId}/edit`, '_blank');
    } else {
      window.open('https://docs.google.com/spreadsheets/', '_blank');
    }
  }
}

export const googleSheetsClient = new GoogleSheetsClientService();
