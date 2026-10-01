import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleOptions, authenticateRequest, sendJson, sendError } from '../_lib/authMiddleware';
import { googleSheetsService, SHEET_NAMES } from '../_lib/googleSheets';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  if (req.method !== 'GET') {
    return sendError(res, 405, 'Faqat GET metodi qabul qilinadi.');
  }

  if (!authenticateRequest(req, res)) return;

  try {
    // 1. Fetch products
    const productRows = await googleSheetsService.getRows(SHEET_NAMES.PRODUCTS);
    const products = productRows.filter(r => r && r[0]).map(r => ({
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

    // 2. Fetch customers
    const customerRows = await googleSheetsService.getRows(SHEET_NAMES.CUSTOMERS);
    const customers = customerRows.filter(r => r && r[0]).map(r => ({
      id: r[0],
      name: r[1] || '',
      phone: r[2] || '',
      address: r[3] || '',
      balance: Number(r[4]) || 0,
      notes: r[5] || '',
      storeId: r[6] || 'store_1',
      createdAt: r[7] || new Date().toISOString(),
      updatedAt: r[8] || new Date().toISOString(),
    }));

    // 3. Fetch expenses
    const expenseRows = await googleSheetsService.getRows(SHEET_NAMES.EXPENSES);
    const expenses = expenseRows.filter(r => r && r[0]).map(r => ({
      id: r[0],
      date: r[1] || '',
      category: r[2] || '',
      amount: Number(r[3]) || 0,
      paymentMethod: r[4] || 'cash',
      description: r[5] || '',
      storeId: r[6] || 'store_1',
      createdAt: r[7] || new Date().toISOString(),
    }));

    // 4. Fetch suppliers
    const supplierRows = await googleSheetsService.getRows(SHEET_NAMES.SUPPLIERS);
    const suppliers = supplierRows.filter(r => r && r[0]).map(r => ({
      id: r[0],
      name: r[1] || '',
      phone: r[2] || '',
      company: r[3] || '',
      balance: Number(r[4]) || 0,
      notes: r[5] || '',
      storeId: r[6] || 'store_1',
      createdAt: r[7] || new Date().toISOString(),
    }));

    return sendJson(res, 200, {
      success: true,
      message: 'Ma\'lumotlar Google Sheets bazasidan muvaffaqiyatli yuklab olindi.',
      data: {
        products,
        customers,
        expenses,
        suppliers,
      },
    });
  } catch (err: any) {
    console.error('Import from sheets error:', err);
    return sendError(res, 500, `Google Sheetsdan yuklab olishda xatolik: ${err.message || 'Noma\'lum'}`);
  }
}
