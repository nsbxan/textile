import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleOptions, setCorsHeaders, sendJson } from './_lib/authMiddleware';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  setCorsHeaders(res);

  return sendJson(res, 200, {
    service: 'Savdo ERP - Google Sheets API Server',
    status: 'online',
    version: '1.0.0',
    documentation: {
      health: 'GET /api/health',
      initSheets: 'POST /api/sheets/init',
      sheetStats: 'GET /api/sheets/stats',
      syncEvents: 'POST /api/sync/events',
      products: 'GET, POST /api/products',
      sales: 'GET, POST /api/sales',
      exportAll: 'POST /api/backup/export',
      importAll: 'GET /api/backup/import',
    },
    message: 'Google Sheets Database API server muvaffaqiyatli ishga tushgan.',
  });
}
