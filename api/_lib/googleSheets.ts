import { google, sheets_v4 } from 'googleapis';

export interface GoogleSheetsConfig {
  sheetId: string;
  clientEmail: string;
  privateKey: string;
}

export const SHEET_NAMES = {
  PRODUCTS: 'Tovarlar',
  SALES: 'Savdolar',
  CUSTOMERS: 'Mijozlar',
  EXPENSES: 'Xarajatlar',
  SUPPLIERS: 'Yetkazib_beruvchilar',
  DEBT_HISTORY: 'Qarz_Tarixi',
  SYNC_LOG: 'Sinxronizatsiya_Logi',
  SETTINGS: 'Sozlamalar',
} as const;

export const SHEET_HEADERS: Record<string, string[]> = {
  [SHEET_NAMES.PRODUCTS]: [
    'ID', 'Shtrix-kod', 'Partiya', 'Nomi', 'Kategoriya', 'Birlik',
    'Zichlik', 'Rangi', 'Rulonlar', 'Tannarx ($)', 'Sotish ($)',
    'Ulgurji ($)', 'Qoldiq', 'Min qoldiq', "Do'kon", 'Yaratilgan', 'Yangilangan'
  ],
  [SHEET_NAMES.SALES]: [
    'ID', 'Chek raqami', 'Sana', "Do'kon", 'Mijoz', 'Kassir', 'To\'lov turi',
    'Jami ($)', 'Chegirma ($)', 'To\'langan ($)', 'So\'m ekvivalenti',
    'Naqd ($)', 'Karta ($)', 'Nasiya ($)', 'Sof foyda ($)', 'Tovarlar ro\'yxati'
  ],
  [SHEET_NAMES.CUSTOMERS]: [
    'ID', 'Ism', 'Telefon', 'Manzil', 'Balans ($)', 'Izoh', "Do'kon", 'Qo\'shilgan', 'Yangilangan'
  ],
  [SHEET_NAMES.EXPENSES]: [
    'ID', 'Sana', 'Kategoriya', 'Summa ($)', 'To\'lov turi', 'Izoh', "Do'kon", 'Kiritilgan'
  ],
  [SHEET_NAMES.SUPPLIERS]: [
    'ID', 'Ism', 'Telefon', 'Kompaniya', 'Qarzimiz ($)', 'Izoh', "Do'kon", 'Qo\'shilgan'
  ],
  [SHEET_NAMES.DEBT_HISTORY]: [
    'ID', 'Sana', 'Turi', 'Nomi', 'Amal', 'Summa ($)', 'To\'lov turi', 'Izoh', "Do'kon"
  ],
  [SHEET_NAMES.SYNC_LOG]: [
    'ID', 'Vaqt', 'Amal', 'Bo\'lim', "Do'kon", 'Tavsif', 'Status', 'Xatolik'
  ],
  [SHEET_NAMES.SETTINGS]: [
    'Kalit', 'Qiymat', 'Yangilangan'
  ]
};

export class GoogleSheetsService {
  private sheetsClient: sheets_v4.Sheets | null = null;
  private config: GoogleSheetsConfig | null = null;

  public getConfig(): GoogleSheetsConfig {
    if (this.config) return this.config;

    let clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
    let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
    const sheetId = process.env.GOOGLE_SHEET_ID || '';

    // If GOOGLE_SERVICE_ACCOUNT_KEY JSON is provided
    const jsonKeyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (jsonKeyRaw) {
      try {
        let parsed: any;
        if (jsonKeyRaw.trim().startsWith('{')) {
          parsed = JSON.parse(jsonKeyRaw);
        } else {
          // Attempt base64 decode
          const decoded = Buffer.from(jsonKeyRaw, 'base64').toString('utf8');
          parsed = JSON.parse(decoded);
        }
        if (parsed.client_email) clientEmail = parsed.client_email;
        if (parsed.private_key) privateKey = parsed.private_key;
      } catch (err) {
        console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY JSON:', err);
      }
    }

    // Format private key correctly (replace escaped \n with actual newlines)
    if (privateKey) {
      privateKey = privateKey.replace(/\\n/g, '\n');
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
      }
    }

    this.config = { sheetId, clientEmail, privateKey };
    return this.config;
  }

  public getClient(): { sheets: sheets_v4.Sheets; sheetId: string } {
    const config = this.getConfig();

    if (!config.sheetId) {
      throw new Error("GOOGLE_SHEET_ID sozlanmagan. Iltimos Vercel yoki .env sozlamalarida jadval ID sini kiriting.");
    }
    if (!config.clientEmail || !config.privateKey) {
      throw new Error("Google Service Account hisobi (EMAIL yoki PRIVATE_KEY) sozlanmagan. Iltimos Google Service Account kalitini kiriting.");
    }

    if (!this.sheetsClient) {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: config.clientEmail,
          private_key: config.privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.sheetsClient = google.sheets({ version: 'v4', auth });
    }

    return { sheets: this.sheetsClient, sheetId: config.sheetId };
  }

  // Google Sheets bilan aloqani tekshirish
  public async testConnection(): Promise<{
    success: boolean;
    spreadsheetTitle: string;
    sheetNames: string[];
    latencyMs: number;
  }> {
    const startTime = Date.now();
    const { sheets, sheetId } = this.getClient();

    const response = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
      fields: 'properties.title,sheets.properties.title',
    });

    const spreadsheetTitle = response.data.properties?.title || 'Google Sheet';
    const sheetNames = (response.data.sheets || [])
      .map(s => s.properties?.title || '')
      .filter(Boolean);

    const latencyMs = Date.now() - startTime;

    return {
      success: true,
      spreadsheetTitle,
      sheetNames,
      latencyMs,
    };
  }

  // Kerakli sahifalar (varaqlar) va sarlavhalarni avtomatik yaratish
  public async initializeSheets(): Promise<{
    createdSheets: string[];
    existingSheets: string[];
    spreadsheetTitle: string;
  }> {
    const { sheets, sheetId } = this.getClient();

    // 1. Mavjud varaqlarni olish
    const currentMeta = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });
    const spreadsheetTitle = currentMeta.data.properties?.title || 'Google Sheet';
    const existingSheets = (currentMeta.data.sheets || []).map(s => s.properties?.title || '');

    const targetSheetNames = Object.values(SHEET_NAMES);
    const sheetsToCreate = targetSheetNames.filter(name => !existingSheets.includes(name));

    // 2. Yetishmayotgan sahifalarni yaratish
    if (sheetsToCreate.length > 0) {
      const requests = sheetsToCreate.map(title => ({
        addSheet: {
          properties: {
            title,
            gridProperties: {
              frozenRowCount: 1, // Sarlavhani mahkamlash (sticky header)
            },
          },
        },
      }));

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: { requests },
      });
    }

    // 3. Har bir sahifaga sarlavha (Header) qatorini yozish (agar hali yo'q bo'lsa)
    for (const sheetName of targetSheetNames) {
      const headers = SHEET_HEADERS[sheetName];
      if (!headers) continue;

      // Birinchi qatorni tekshirish
      const checkRes = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${sheetName}!A1:Z1`,
      });

      const existingHeader = checkRes.data.values?.[0];
      if (!existingHeader || existingHeader.length === 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `${sheetName}!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [headers],
          },
        });
      }
    }

    return {
      createdSheets: sheetsToCreate,
      existingSheets,
      spreadsheetTitle,
    };
  }

  // Sahifadagi barcha qatorlarni o'qish
  public async getRows(sheetName: string): Promise<any[][]> {
    const { sheets, sheetId } = this.getClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!A2:Z`, // Sarlavhani o'tkazib yuborish
    });
    return res.data.values || [];
  }

  // Qator qo'shish (Append)
  public async appendRows(sheetName: string, rows: any[][]): Promise<void> {
    if (!rows || rows.length === 0) return;
    const { sheets, sheetId } = this.getClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: rows,
      },
    });
  }

  // ID bo'yicha qidirib yangilash yoki yangi qo'shish (Upsert)
  public async upsertRowById(
    sheetName: string,
    id: string,
    rowValues: any[],
    idColIndex = 0
  ): Promise<'updated' | 'inserted'> {
    const { sheets, sheetId } = this.getClient();

    // ID ustunini o'qish
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!A:A`,
    });

    const values = res.data.values || [];
    let foundRowIndex = -1;

    for (let i = 1; i < values.length; i++) {
      if (values[i] && String(values[i][idColIndex]).trim() === String(id).trim()) {
        foundRowIndex = i + 1; // 1-indexed for Sheets
        break;
      }
    }

    if (foundRowIndex > 0) {
      // Mavjud qatorni yangilash
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${sheetName}!A${foundRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [rowValues],
        },
      });
      return 'updated';
    } else {
      // Yangi qator qo'shish
      await this.appendRows(sheetName, [rowValues]);
      return 'inserted';
    }
  }

  // ID bo'yicha qatorni tozalash / o'chirish
  public async deleteRowById(sheetName: string, id: string): Promise<boolean> {
    const { sheets, sheetId } = this.getClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!A:A`,
    });

    const values = res.data.values || [];
    let foundRowIndex = -1;

    for (let i = 1; i < values.length; i++) {
      if (values[i] && String(values[i][0]).trim() === String(id).trim()) {
        foundRowIndex = i + 1;
        break;
      }
    }

    if (foundRowIndex > 0) {
      // Qator ma'lumotlarini bo'shatish yoki belgilash
      await sheets.spreadsheets.values.clear({
        spreadsheetId: sheetId,
        range: `${sheetName}!A${foundRowIndex}:Z${foundRowIndex}`,
      });
      return true;
    }
    return false;
  }

  // Barcha jadvallardagi statistikani olish
  public async getSummaryStats(): Promise<{
    productsCount: number;
    salesCount: number;
    customersCount: number;
    expensesCount: number;
    suppliersCount: number;
  }> {
    const { sheets, sheetId } = this.getClient();

    const fetchCount = async (name: string): Promise<number> => {
      try {
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: `${name}!A2:A`,
        });
        return (res.data.values || []).filter(r => r && r[0]).length;
      } catch {
        return 0;
      }
    };

    const [productsCount, salesCount, customersCount, expensesCount, suppliersCount] = await Promise.all([
      fetchCount(SHEET_NAMES.PRODUCTS),
      fetchCount(SHEET_NAMES.SALES),
      fetchCount(SHEET_NAMES.CUSTOMERS),
      fetchCount(SHEET_NAMES.EXPENSES),
      fetchCount(SHEET_NAMES.SUPPLIERS),
    ]);

    return {
      productsCount,
      salesCount,
      customersCount,
      expensesCount,
      suppliersCount,
    };
  }
}

export const googleSheetsService = new GoogleSheetsService();
