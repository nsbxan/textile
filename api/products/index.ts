import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleOptions, authenticateRequest, sendJson, sendError } from '../_lib/authMiddleware';
import { googleSheetsService, SHEET_NAMES } from '../_lib/googleSheets';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  if (!authenticateRequest(req, res)) return;

  if (req.method === 'GET') {
    try {
      const rows = await googleSheetsService.getRows(SHEET_NAMES.PRODUCTS);
      const products = rows.filter(r => r && r[0]).map(r => ({
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
        storeId: r[14] || '',
        createdAt: r[15] || '',
        updatedAt: r[16] || '',
      }));

      return sendJson(res, 200, { success: true, count: products.length, products });
    } catch (err: any) {
      return sendError(res, 500, `Mahsulotlarni o'qishda xatolik: ${err.message || 'Noma\'lum'}`);
    }
  }

  if (req.method === 'POST') {
    try {
      const p = req.body;
      if (!p || !p.name) {
        return sendError(res, 400, "Mahsulot nomi kiritilishi shart.");
      }

      const id = p.id || `prod_${Date.now()}`;
      const row = [
        id,
        p.barcode || '',
        p.batchNumber || '',
        p.name || '',
        p.category || '',
        p.unit || 'kg',
        p.density || '',
        p.color || '',
        p.rolls || 0,
        p.buyPrice || 0,
        p.sellPrice || 0,
        p.wholesalePrice || 0,
        p.stock || 0,
        p.minStock || 0,
        p.storeId || '',
        p.createdAt || new Date().toISOString(),
        p.updatedAt || new Date().toISOString(),
      ];

      const op = await googleSheetsService.upsertRowById(SHEET_NAMES.PRODUCTS, id, row);
      return sendJson(res, 200, {
        success: true,
        action: op,
        productId: id,
        message: op === 'inserted' ? 'Mahsulot muvaffaqiyatli saqlandi' : 'Mahsulot yangilandi',
      });
    } catch (err: any) {
      return sendError(res, 500, `Mahsulotni saqlashda xatolik: ${err.message || 'Noma\'lum'}`);
    }
  }

  return sendError(res, 405, 'Faqat GET yoki POST metodlari qo\'llab-quvvatlanadi.');
}
