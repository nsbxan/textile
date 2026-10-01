import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

// -------------------------------------------------------------
// 1. CONSTANTS & CONFIGURATION
// -------------------------------------------------------------
const SHEET_NAMES = {
  PRODUCTS: 'Tovarlar',
  SALES: 'Savdolar',
  CUSTOMERS: 'Mijozlar',
  EXPENSES: 'Xarajatlar',
  SUPPLIERS: 'Yetkazib_beruvchilar',
  DEBT_HISTORY: 'Qarz_Tarixi',
  SYNC_LOG: 'Sinxronizatsiya_Logi',
  SETTINGS: 'Sozlamalar',
} as const;

const SHEET_HEADERS: Record<string, string[]> = {
  [SHEET_NAMES.PRODUCTS]: [
    'ID', 'Shtrix-kod', 'Partiya', 'Nomi', 'Kategoriya', 'Birlik',
    'Zichlik', 'Rangi', 'Rulonlar', 'Tannarx ($)', 'Sotish ($)',
    'Ulgurji ($)', 'Qoldiq', 'Min qoldiq', "Do'kon", 'Yaratilgan', 'Yangilangan'
  ],
  [SHEET_NAMES.SALES]: [
    'ID', 'Chek raqami', 'Sana', "Do'kon", 'Mijoz', 'Kassir', "To'lov turi",
    'Jami ($)', 'Chegirma ($)', "To'langan ($)", "So'm ekvivalenti",
    'Naqd ($)', 'Karta ($)', 'Nasiya ($)', 'Sof foyda ($)', "Tovarlar ro'yxati"
  ],
  [SHEET_NAMES.CUSTOMERS]: [
    'ID', 'Ism', 'Telefon', 'Manzil', 'Balans ($)', 'Izoh', "Do'kon", "Qo'shilgan", 'Yangilangan'
  ],
  [SHEET_NAMES.EXPENSES]: [
    'ID', 'Sana', 'Kategoriya', 'Summa ($)', "To'lov turi", 'Izoh', "Do'kon", 'Kiritilgan'
  ],
  [SHEET_NAMES.SUPPLIERS]: [
    'ID', 'Ism', 'Telefon', 'Kompaniya', 'Qarzimiz ($)', 'Izoh', "Do'kon", "Qo'shilgan"
  ],
  [SHEET_NAMES.DEBT_HISTORY]: [
    'ID', 'Sana', 'Turi', 'Nomi', 'Amal', 'Summa ($)', "To'lov turi", 'Izoh', "Do'kon"
  ],
  [SHEET_NAMES.SYNC_LOG]: [
    'ID', 'Vaqt', 'Amal', "Bo'lim", "Do'kon", 'Tavsif', 'Status', 'Xatolik'
  ],
  [SHEET_NAMES.SETTINGS]: [
    'Kalit', 'Qiymat', 'Yangilangan'
  ]
};

// -------------------------------------------------------------
// 2. GOOGLE SHEETS CLIENT CREATION
// -------------------------------------------------------------
function getGoogleCredentials() {
  let clientEmail = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim().replace(/^["']|["']$/g, '');
  let privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').trim();
  let sheetId = (process.env.GOOGLE_SHEET_ID || '').trim().replace(/^["']|["']$/g, '');

  const jsonKeyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (jsonKeyRaw) {
    try {
      let parsed: any;
      if (jsonKeyRaw.trim().startsWith('{')) {
        parsed = JSON.parse(jsonKeyRaw);
      } else {
        const decoded = Buffer.from(jsonKeyRaw, 'base64').toString('utf8');
        parsed = JSON.parse(decoded);
      }
      if (parsed.client_email) clientEmail = parsed.client_email;
      if (parsed.private_key) privateKey = parsed.private_key;
      if (parsed.sheet_id && !sheetId) sheetId = parsed.sheet_id;
    } catch (err) {
      console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY:', err);
    }
  }

  if (privateKey) {
    if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
      privateKey = privateKey.slice(1, -1);
    }
    privateKey = privateKey.replace(/\\n/g, '\n').replace(/\r\n/g, '\n');
  }

  // Default fallback sheet ID if not configured in environment
  if (!sheetId) {
    sheetId = '1bscKFPAB5tkeEgqp7OZyRZvDO6fVqd5SIltkTEtQntg';
  }

  return { sheetId, clientEmail, privateKey };
}

function getSheetsApi() {
  const { sheetId, clientEmail, privateKey } = getGoogleCredentials();

  if (!sheetId) {
    throw new Error("GOOGLE_SHEET_ID sozlanmagan. Iltimos Vercel Environment Variables bo'limida jadval ID sini kiriting.");
  }
  if (!clientEmail || !privateKey) {
    throw new Error("Google Service Account hisobi (GOOGLE_SERVICE_ACCOUNT_EMAIL yoki GOOGLE_PRIVATE_KEY) sozlanmagan.");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  return { sheets, sheetId };
}

// -------------------------------------------------------------
// 3. CORS & RESPONSE HELPERS
// -------------------------------------------------------------
function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-api-key'
  );
}

function sendJson(res: VercelResponse, code: number, data: any) {
  setCorsHeaders(res);
  res.status(code).json(data);
}

function sendError(res: VercelResponse, code: number, error: string, details?: any) {
  setCorsHeaders(res);
  res.status(code).json({
    success: false,
    error,
    details: details ? (typeof details === 'object' ? details.message || details : String(details)) : undefined,
  });
}

// -------------------------------------------------------------
// 4. MAIN CATCH-ALL ROUTER HANDLER
// -------------------------------------------------------------
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Parse body if it arrived as a raw string
  if (req.body && typeof req.body === 'string') {
    try {
      (req as any).body = JSON.parse(req.body);
    } catch {}
  }

  // Determine path
  const url = new URL(req.url || '/', 'http://localhost');
  let pathname = url.pathname.replace(/\/+$/, '') || '/api';

  // 1. Check if rewritten query parameter exists
  const routeParam = req.query?.__route || req.query?.path || req.query?.route;
  if (routeParam) {
    const cleanRoute = Array.isArray(routeParam) ? routeParam.join('/') : String(routeParam);
    pathname = `/api/${cleanRoute.replace(/^\/+/, '').replace(/\/+$/, '')}`;
  }

  // 2. Also check Vercel matched headers
  const matchedPath = (req.headers['x-matched-path'] || req.headers['x-now-route-matches']) as string | undefined;
  if (pathname === '/api' && typeof matchedPath === 'string' && matchedPath.startsWith('/api/')) {
    pathname = matchedPath.split('?')[0].replace(/\/+$/, '');
  }

  // Normalize subpaths (e.g. /health -> /api/health)
  if (!pathname.startsWith('/api')) {
    pathname = `/api${pathname}`;
  }

  try {
    // ---------------------------------------------------------
    // ROUTE: GET /api/health
    // ---------------------------------------------------------
    if (pathname === '/api/health' || pathname === '/health') {
      const startTime = Date.now();
      const { sheetId, clientEmail, privateKey } = getGoogleCredentials();

      if (!sheetId || (!clientEmail && !process.env.GOOGLE_SERVICE_ACCOUNT_KEY)) {
        return sendJson(res, 200, {
          success: false,
          status: 'online_waiting_config',
          message: 'Server API muvaffaqiyatli ishlamoqda, ammo Google Sheets sozlamalari (Service Account / Sheet ID) kiritilmagan.',
          latencyMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        });
      }

      try {
        const { sheets } = getSheetsApi();
        const response = await sheets.spreadsheets.get({
          spreadsheetId: sheetId,
          fields: 'properties.title,sheets.properties.title',
        });

        const spreadsheetTitle = response.data.properties?.title || 'Google Sheet';
        const sheetNames = (response.data.sheets || []).map(s => s.properties?.title || '').filter(Boolean);

        return sendJson(res, 200, {
          success: true,
          status: 'online_connected',
          message: `Google Sheets bazasi bilan aloqa muvaffaqiyatli o'rnatildi: "${spreadsheetTitle}"`,
          spreadsheetTitle,
          sheetNames,
          latencyMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        });
      } catch (err: any) {
        return sendJson(res, 200, {
          success: false,
          status: 'error',
          message: `Google Sheets ga ulanishda xatolik: ${err.message || 'Noma\'lum xatolik'}`,
          latencyMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // ---------------------------------------------------------
    // ROUTE: POST /api/sheets/init
    // ---------------------------------------------------------
    if (pathname === '/api/sheets/init' || pathname === '/sheets/init') {
      const { sheets, sheetId } = getSheetsApi();

      const currentMeta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
      const existingSheets = (currentMeta.data.sheets || []).map(s => s.properties?.title || '');
      const targetSheetNames = Object.values(SHEET_NAMES);
      const sheetsToCreate = targetSheetNames.filter(name => !existingSheets.includes(name));

      if (sheetsToCreate.length > 0) {
        const requests = sheetsToCreate.map(title => ({
          addSheet: {
            properties: {
              title,
              gridProperties: { frozenRowCount: 1 },
            },
          },
        }));
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: sheetId,
          requestBody: { requests },
        });
      }

      for (const sheetName of targetSheetNames) {
        const headers = SHEET_HEADERS[sheetName];
        if (!headers) continue;
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
            requestBody: { values: [headers] },
          });
        }
      }

      return sendJson(res, 200, {
        success: true,
        message: 'Google Sheets jadvallari va sarlavhalari muvaffaqiyatli sozlandi!',
      });
    }

    // ---------------------------------------------------------
    // ROUTE: GET /api/sheets/stats
    // ---------------------------------------------------------
    if (pathname === '/api/sheets/stats' || pathname === '/sheets/stats') {
      const { sheets, sheetId } = getSheetsApi();
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

      return sendJson(res, 200, {
        success: true,
        stats: {
          productsCount,
          salesCount,
          customersCount,
          expensesCount,
          suppliersCount,
        },
      });
    }

    // ---------------------------------------------------------
    // ROUTE: POST /api/backup/export (PUSH ALL LOCAL DATA TO SHEETS)
    // ---------------------------------------------------------
    if (pathname === '/api/backup/export' || pathname === '/backup/export') {
      const { sheets, sheetId } = getSheetsApi();
      const { products, sales, customers, suppliers, expenses, debtTransactions } = req.body || {};

      let exportedCounts = {
        products: 0,
        sales: 0,
        customers: 0,
        suppliers: 0,
        expenses: 0,
        debtTransactions: 0,
      };

      // 1. Export Products
      if (Array.isArray(products) && products.length > 0) {
        const rows = products.map((p: any) => [
          p.id, p.barcode || '', p.batchNumber || '', p.name || '', p.category || '',
          p.unit || 'kg', p.density || '', p.color || '', p.rolls || 0, p.buyPrice || 0,
          p.sellPrice || 0, p.wholesalePrice || 0, p.stock || 0, p.minStock || 0,
          p.storeId || '', p.createdAt || new Date().toISOString(), p.updatedAt || new Date().toISOString(),
        ]);
        await sheets.spreadsheets.values.clear({
          spreadsheetId: sheetId,
          range: `${SHEET_NAMES.PRODUCTS}!A2:Q`,
        });
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `${SHEET_NAMES.PRODUCTS}!A2`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: rows },
        });
        exportedCounts.products = rows.length;
      }

      // 2. Export Sales
      if (Array.isArray(sales) && sales.length > 0) {
        const rows = sales.map((s: any) => {
          const itemsList = Array.isArray(s.items)
            ? s.items.map((i: any) => `${i.name} (${i.quantity} ${i.unit || 'kg'})`).join('; ')
            : '';
          return [
            s.id, s.receiptNumber || '', s.createdAt || new Date().toISOString(), s.storeId || '',
            s.customerName || '', s.cashierName || '', s.paymentMethod || 'cash',
            s.subtotal || 0, s.discountAmount || 0, s.finalAmount || 0, s.finalAmountUZS || 0,
            s.paidCash || 0, s.paidCard || 0, s.paidDebt || 0, s.profit || 0, itemsList,
          ];
        });
        await sheets.spreadsheets.values.clear({
          spreadsheetId: sheetId,
          range: `${SHEET_NAMES.SALES}!A2:P`,
        });
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `${SHEET_NAMES.SALES}!A2`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: rows },
        });
        exportedCounts.sales = rows.length;
      }

      // 3. Export Customers
      if (Array.isArray(customers) && customers.length > 0) {
        const rows = customers.map((c: any) => [
          c.id, c.name || '', c.phone || '', c.address || '', c.balance || 0,
          c.notes || '', c.storeId || '', c.createdAt || new Date().toISOString(),
          c.updatedAt || new Date().toISOString(),
        ]);
        await sheets.spreadsheets.values.clear({
          spreadsheetId: sheetId,
          range: `${SHEET_NAMES.CUSTOMERS}!A2:I`,
        });
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `${SHEET_NAMES.CUSTOMERS}!A2`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: rows },
        });
        exportedCounts.customers = rows.length;
      }

      // 4. Export Suppliers
      if (Array.isArray(suppliers) && suppliers.length > 0) {
        const rows = suppliers.map((sup: any) => [
          sup.id, sup.name || '', sup.phone || '', sup.company || '', sup.balance || 0,
          sup.notes || '', sup.storeId || '', sup.createdAt || new Date().toISOString(),
        ]);
        await sheets.spreadsheets.values.clear({
          spreadsheetId: sheetId,
          range: `${SHEET_NAMES.SUPPLIERS}!A2:H`,
        });
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `${SHEET_NAMES.SUPPLIERS}!A2`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: rows },
        });
        exportedCounts.suppliers = rows.length;
      }

      // 5. Export Expenses
      if (Array.isArray(expenses) && expenses.length > 0) {
        const rows = expenses.map((e: any) => [
          e.id, e.date || new Date().toISOString().split('T')[0], e.category || '',
          e.amount || 0, e.paymentMethod || 'cash', e.description || '', e.storeId || '',
          e.createdAt || new Date().toISOString(),
        ]);
        await sheets.spreadsheets.values.clear({
          spreadsheetId: sheetId,
          range: `${SHEET_NAMES.EXPENSES}!A2:H`,
        });
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `${SHEET_NAMES.EXPENSES}!A2`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: rows },
        });
        exportedCounts.expenses = rows.length;
      }

      // 6. Export Debt Transactions
      if (Array.isArray(debtTransactions) && debtTransactions.length > 0) {
        const rows = debtTransactions.map((d: any) => [
          d.id, d.createdAt || new Date().toISOString(), d.type || 'customer',
          d.entityName || '', d.action || 'pay_debt', d.amount || 0,
          d.paymentMethod || 'cash', d.notes || '', d.storeId || '',
        ]);
        await sheets.spreadsheets.values.clear({
          spreadsheetId: sheetId,
          range: `${SHEET_NAMES.DEBT_HISTORY}!A2:I`,
        });
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `${SHEET_NAMES.DEBT_HISTORY}!A2`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: rows },
        });
        exportedCounts.debtTransactions = rows.length;
      }

      return sendJson(res, 200, {
        success: true,
        message: 'Barcha ma\'lumotlar muvaffaqiyatli Google Sheets bazasiga yuklandi!',
        counts: exportedCounts,
      });
    }

    // ---------------------------------------------------------
    // ROUTE: GET /api/backup/import (PULL ALL DATA FROM SHEETS)
    // ---------------------------------------------------------
    if (pathname === '/api/backup/import' || pathname === '/backup/import') {
      const { sheets, sheetId } = getSheetsApi();

      // Products
      let products: any[] = [];
      try {
        const pRes = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: `${SHEET_NAMES.PRODUCTS}!A2:Q` });
        products = (pRes.data.values || []).filter(r => r && r[0]).map(r => ({
          id: r[0],
          barcode: r[1] || '',
          batchNumber: r[2] || '',
          name: r[3] || '',
          category: r[4] || '',
          unit: r[5] || 'kg',
          density: r[6] || '',
          color: r[7] || '',
          rolls: Number(r[8]) || 0,
          buyPrice: Number(r[9]) || 0,
          sellPrice: Number(r[10]) || 0,
          wholesalePrice: Number(r[11]) || 0,
          stock: Number(r[12]) || 0,
          minStock: Number(r[13]) || 0,
          storeId: r[14] || 'store_1',
          createdAt: r[15] || new Date().toISOString(),
          updatedAt: r[16] || new Date().toISOString(),
        }));
      } catch (e) {}

      // Customers
      let customers: any[] = [];
      try {
        const cRes = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: `${SHEET_NAMES.CUSTOMERS}!A2:I` });
        customers = (cRes.data.values || []).filter(r => r && r[0]).map(r => ({
          id: r[0],
          name: r[1] || '',
          phone: (r[2] || '').replace(/^'/, ''),
          address: r[3] || '',
          balance: Number(r[4]) || 0,
          notes: r[5] || '',
          storeId: r[6] || 'store_1',
          createdAt: r[7] || new Date().toISOString(),
          updatedAt: r[8] || new Date().toISOString(),
        }));
      } catch (e) {}

      // Sales
      let sales: any[] = [];
      try {
        const sRes = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: `${SHEET_NAMES.SALES}!A2:P` });
        sales = (sRes.data.values || []).filter(r => r && r[0]).map(r => ({
          id: r[0],
          receiptNumber: r[1] || '',
          createdAt: r[2] || new Date().toISOString(),
          storeId: r[3] || 'store_1',
          customerName: r[4] || '',
          cashierName: r[5] || 'Kassir',
          paymentMethod: r[6] || 'cash',
          subtotal: Number(r[7]) || 0,
          discountAmount: Number(r[8]) || 0,
          finalAmount: Number(r[9]) || 0,
          finalAmountUZS: Number(r[10]) || 0,
          paidCash: Number(r[11]) || 0,
          paidCard: Number(r[12]) || 0,
          paidDebt: Number(r[13]) || 0,
          profit: Number(r[14]) || 0,
          items: [],
        }));
      } catch (e) {}

      // Suppliers
      let suppliers: any[] = [];
      try {
        const supRes = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: `${SHEET_NAMES.SUPPLIERS}!A2:H` });
        suppliers = (supRes.data.values || []).filter(r => r && r[0]).map(r => ({
          id: r[0],
          name: r[1] || '',
          phone: (r[2] || '').replace(/^'/, ''),
          company: r[3] || '',
          balance: Number(r[4]) || 0,
          notes: r[5] || '',
          storeId: r[6] || 'store_1',
          createdAt: r[7] || new Date().toISOString(),
        }));
      } catch (e) {}

      // Expenses
      let expenses: any[] = [];
      try {
        const eRes = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: `${SHEET_NAMES.EXPENSES}!A2:H` });
        expenses = (eRes.data.values || []).filter(r => r && r[0]).map(r => ({
          id: r[0],
          date: r[1] || '',
          category: r[2] || '',
          amount: Number(r[3]) || 0,
          paymentMethod: r[4] || 'cash',
          description: r[5] || '',
          storeId: r[6] || 'store_1',
          createdAt: r[7] || new Date().toISOString(),
        }));
      } catch (e) {}

      return sendJson(res, 200, {
        success: true,
        message: 'Ma\'lumotlar muvaffaqiyatli yuklab olindi.',
        data: {
          products,
          customers,
          sales,
          suppliers,
          expenses,
        },
      });
    }

    // ---------------------------------------------------------
    // ROUTE: POST /api/sync/events
    // ---------------------------------------------------------
    if (pathname === '/api/sync/events' || pathname === '/sync/events') {
      const { events } = req.body || {};
      if (!Array.isArray(events) || events.length === 0) {
        return sendJson(res, 200, { success: true, processedCount: 0 });
      }

      const { sheets, sheetId } = getSheetsApi();
      const processedIds: string[] = [];

      for (const evt of events) {
        try {
          if (evt.action === 'PRODUCT_SAVED' && evt.payload?.id) {
            const p = evt.payload;
            const row = [
              p.id, p.barcode || '', p.batchNumber || '', p.name || '', p.category || '',
              p.unit || 'kg', p.density || '', p.color || '', p.rolls || 0, p.buyPrice || 0,
              p.sellPrice || 0, p.wholesalePrice || 0, p.stock || 0, p.minStock || 0,
              p.storeId || 'store_1', p.createdAt || evt.timestamp, p.updatedAt || new Date().toISOString(),
            ];
            await sheets.spreadsheets.values.append({
              spreadsheetId: sheetId,
              range: `${SHEET_NAMES.PRODUCTS}!A1`,
              valueInputOption: 'USER_ENTERED',
              insertDataOption: 'INSERT_ROWS',
              requestBody: { values: [row] },
            });
          }

          if (evt.action === 'SALE_CREATED' && evt.payload?.id) {
            const s = evt.payload;
            const itemsList = Array.isArray(s.items)
              ? s.items.map((i: any) => `${i.name} (${i.quantity} ${i.unit || 'kg'})`).join('; ')
              : '';
            const row = [
              s.id, s.receiptNumber || '', s.createdAt || evt.timestamp, s.storeId || 'store_1',
              s.customerName || '', s.cashierName || '', s.paymentMethod || 'cash',
              s.subtotal || 0, s.discountAmount || 0, s.finalAmount || 0, s.finalAmountUZS || 0,
              s.paidCash || 0, s.paidCard || 0, s.paidDebt || 0, s.profit || 0, itemsList,
            ];
            await sheets.spreadsheets.values.append({
              spreadsheetId: sheetId,
              range: `${SHEET_NAMES.SALES}!A1`,
              valueInputOption: 'USER_ENTERED',
              insertDataOption: 'INSERT_ROWS',
              requestBody: { values: [row] },
            });
          }

          processedIds.push(evt.id);
        } catch (itemErr) {
          console.error('Error handling sync event:', itemErr);
        }
      }

      return sendJson(res, 200, {
        success: true,
        processedCount: processedIds.length,
        syncedIds: processedIds,
      });
    }

    // ---------------------------------------------------------
    // DEFAULT ROUTE: /api
    // ---------------------------------------------------------
    return sendJson(res, 200, {
      service: 'Savdo ERP - Google Sheets API Server',
      status: 'online',
      version: '1.2.0',
      routes: [
        'GET /api/health',
        'POST /api/sheets/init',
        'GET /api/sheets/stats',
        'POST /api/backup/export',
        'GET /api/backup/import',
        'POST /api/sync/events',
      ],
      message: 'Google Sheets Database API server muvaffaqiyatli ishga tushgan.',
    });
  } catch (err: any) {
    console.error('API Error:', err);
    return sendJson(res, 200, {
      success: false,
      status: 'error',
      message: `Xatolik: ${err.message || 'Noma\'lum xatolik'}`,
    });
  }
}
