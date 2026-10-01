import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleOptions, authenticateRequest, sendJson, sendError } from '../_lib/authMiddleware';
import { googleSheetsService } from '../_lib/googleSheets';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return sendError(res, 405, 'Faqat POST metodi qabul qilinadi.');
  }

  if (!authenticateRequest(req, res)) return;

  try {
    const result = await googleSheetsService.initializeSheets();
    return sendJson(res, 200, {
      success: true,
      message: `Google Sheets jadvallari muvaffaqiyatli sozlandi va sarlavhalar kiritildi!`,
      details: result,
    });
  } catch (err: any) {
    console.error('Error initializing sheets:', err);
    return sendError(res, 500, `Jadvallarni yaratishda xatolik yuz berdi: ${err.message || 'Noma\'lum xato'}`);
  }
}
