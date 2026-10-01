import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleOptions, authenticateRequest, sendJson, sendError } from '../_lib/authMiddleware';
import { googleSheetsService, SHEET_NAMES } from '../_lib/googleSheets';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  if (!authenticateRequest(req, res)) return;

  if (req.method === 'GET') {
    try {
      const rows = await googleSheetsService.getRows(SHEET_NAMES.SALES);
      const sales = rows.filter(r => r && r[0]).map(r => ({
        id: r[0],
        receiptNumber: r[1] || '',
        createdAt: r[2] || '',
        storeId: r[3] || '',
        customerName: r[4] || '',
        cashierName: r[5] || '',
        paymentMethod: r[6] || 'cash',
        subtotal: Number(r[7]) || 0,
        discountAmount: Number(r[8]) || 0,
        finalAmount: Number(r[9]) || 0,
        finalAmountUZS: Number(r[10]) || 0,
        paidCash: Number(r[11]) || 0,
        paidCard: Number(r[12]) || 0,
        paidDebt: Number(r[13]) || 0,
        profit: Number(r[14]) || 0,
        itemsSummary: r[15] || '',
      }));

      return sendJson(res, 200, { success: true, count: sales.length, sales });
    } catch (err: any) {
      return sendError(res, 500, `Savdolar ro'yxatini olishda xatolik: ${err.message || 'Noma\'lum'}`);
    }
  }

  if (req.method === 'POST') {
    try {
      const s = req.body;
      if (!s || !s.receiptNumber) {
        return sendError(res, 400, "Chek raqami (receiptNumber) kiritilishi shart.");
      }

      const id = s.id || `sale_${Date.now()}`;
      const itemsList = Array.isArray(s.items)
        ? s.items.map((i: any) => `${i.name} (${i.quantity} ${i.unit || 'kg'})`).join('; ')
        : s.itemsSummary || '';

      const row = [
        id,
        s.receiptNumber,
        s.createdAt || new Date().toISOString(),
        s.storeId || 'store_1',
        s.customerName || '',
        s.cashierName || '',
        s.paymentMethod || 'cash',
        s.subtotal || 0,
        s.discountAmount || 0,
        s.finalAmount || 0,
        s.finalAmountUZS || 0,
        s.paidCash || 0,
        s.paidCard || 0,
        s.paidDebt || 0,
        s.profit || 0,
        itemsList,
      ];

      await googleSheetsService.appendRows(SHEET_NAMES.SALES, [row]);
      return sendJson(res, 200, {
        success: true,
        saleId: id,
        message: 'Savdo cheki Google Sheets bazasiga muvaffaqiyatli saqlandi',
      });
    } catch (err: any) {
      return sendError(res, 500, `Savdoni saqlashda xatolik: ${err.message || 'Noma\'lum'}`);
    }
  }

  return sendError(res, 405, 'Faqat GET yoki POST metodlari qo\'llab-quvvatlanadi.');
}
