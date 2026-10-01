import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleOptions, authenticateRequest, sendJson, sendError } from '../_lib/authMiddleware';
import { googleSheetsService } from '../_lib/googleSheets';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  if (req.method !== 'GET') {
    return sendError(res, 405, 'Faqat GET metodi qabul qilinadi.');
  }

  if (!authenticateRequest(req, res)) return;

  try {
    const stats = await googleSheetsService.getSummaryStats();
    return sendJson(res, 200, {
      success: true,
      stats,
    });
  } catch (err: any) {
    console.error('Error fetching sheet stats:', err);
    return sendError(res, 500, `Statistikani yuklashda xatolik: ${err.message || 'Noma\'lum xato'}`);
  }
}
