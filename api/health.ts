import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleOptions, authenticateRequest, sendJson, sendError } from './_lib/authMiddleware';
import { googleSheetsService } from './_lib/googleSheets';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  if (req.method !== 'GET') {
    return sendError(res, 405, 'Faqat GET metodi qo\'llab-quvvatlanadi.');
  }

  const startTime = Date.now();

  try {
    const config = googleSheetsService.getConfig();
    const hasConfig = !!(config.sheetId && (config.clientEmail || process.env.GOOGLE_SERVICE_ACCOUNT_KEY));

    if (!hasConfig) {
      return sendJson(res, 200, {
        success: true,
        status: 'online_waiting_config',
        message: 'Server API muvaffaqiyatli ishlamoqda, ammo Google Sheets sozlamalari (Service Account / Sheet ID) kiritilmagan.',
        latencyMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
    }

    // Google Sheets ulanishini sinash
    const testResult = await googleSheetsService.testConnection();

    return sendJson(res, 200, {
      success: true,
      status: 'online_connected',
      message: `Google Sheets bazasi bilan aloqa muvaffaqiyatli o'rnatildi: "${testResult.spreadsheetTitle}"`,
      spreadsheetTitle: testResult.spreadsheetTitle,
      sheetNames: testResult.sheetNames,
      latencyMs: testResult.latencyMs,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Health check error:', err);
    return sendJson(res, 200, {
      success: false,
      status: 'error',
      message: `Server onlayn, ammo Google Sheets ga ulanib bo'lmadi: ${err.message || 'Noma\'lum xatolik'}`,
      latencyMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  }
}
