import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleOptions, authenticateRequest, sendJson, sendError } from '../_lib/authMiddleware';
import { googleSheetsService, SHEET_NAMES } from '../_lib/googleSheets';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return sendError(res, 405, 'Faqat POST metodi qabul qilinadi.');
  }

  if (!authenticateRequest(req, res)) return;

  try {
    const { products, sales, customers, suppliers, expenses, debtTransactions } = req.body || {};

    // 1. Ensure sheets are initialized
    await googleSheetsService.initializeSheets();

    let exportedCounts = {
      products: 0,
      sales: 0,
      customers: 0,
      suppliers: 0,
      expenses: 0,
      debtTransactions: 0,
    };

    // 2. Export Products
    if (Array.isArray(products) && products.length > 0) {
      const rows = products.map((p: any) => [
        p.id,
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
      ]);
      for (const row of rows) {
        await googleSheetsService.upsertRowById(SHEET_NAMES.PRODUCTS, row[0], row);
      }
      exportedCounts.products = rows.length;
    }

    // 3. Export Sales
    if (Array.isArray(sales) && sales.length > 0) {
      for (const s of sales) {
        const itemsList = Array.isArray(s.items)
          ? s.items.map((i: any) => `${i.name} (${i.quantity} ${i.unit || 'kg'})`).join('; ')
          : '';
        const row = [
          s.id,
          s.receiptNumber || '',
          s.createdAt || new Date().toISOString(),
          s.storeId || '',
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
        await googleSheetsService.upsertRowById(SHEET_NAMES.SALES, s.id, row);
      }
      exportedCounts.sales = sales.length;
    }

    // 4. Export Customers
    if (Array.isArray(customers) && customers.length > 0) {
      for (const c of customers) {
        const row = [
          c.id,
          c.name || '',
          c.phone || '',
          c.address || '',
          c.balance || 0,
          c.notes || '',
          c.storeId || '',
          c.createdAt || new Date().toISOString(),
          c.updatedAt || new Date().toISOString(),
        ];
        await googleSheetsService.upsertRowById(SHEET_NAMES.CUSTOMERS, c.id, row);
      }
      exportedCounts.customers = customers.length;
    }

    // 5. Export Expenses
    if (Array.isArray(expenses) && expenses.length > 0) {
      for (const e of expenses) {
        const row = [
          e.id,
          e.date || new Date().toISOString().split('T')[0],
          e.category || '',
          e.amount || 0,
          e.paymentMethod || 'cash',
          e.description || '',
          e.storeId || '',
          e.createdAt || new Date().toISOString(),
        ];
        await googleSheetsService.upsertRowById(SHEET_NAMES.EXPENSES, e.id, row);
      }
      exportedCounts.expenses = expenses.length;
    }

    // 6. Export Suppliers
    if (Array.isArray(suppliers) && suppliers.length > 0) {
      for (const sup of suppliers) {
        const row = [
          sup.id,
          sup.name || '',
          sup.phone || '',
          sup.company || '',
          sup.balance || 0,
          sup.notes || '',
          sup.storeId || '',
          sup.createdAt || new Date().toISOString(),
        ];
        await googleSheetsService.upsertRowById(SHEET_NAMES.SUPPLIERS, sup.id, row);
      }
      exportedCounts.suppliers = suppliers.length;
    }

    // 7. Export Debt Transactions
    if (Array.isArray(debtTransactions) && debtTransactions.length > 0) {
      const rows = debtTransactions.map((d: any) => [
        d.id,
        d.createdAt || new Date().toISOString(),
        d.type || 'customer',
        d.entityName || '',
        d.action || 'pay_debt',
        d.amount || 0,
        d.paymentMethod || 'cash',
        d.notes || '',
        d.storeId || '',
      ]);
      await googleSheetsService.appendRows(SHEET_NAMES.DEBT_HISTORY, rows);
      exportedCounts.debtTransactions = rows.length;
    }

    return sendJson(res, 200, {
      success: true,
      message: 'Barcha ma\'lumotlar muvaffaqiyatli Google Sheets bazasiga yuklandi!',
      counts: exportedCounts,
    });
  } catch (err: any) {
    console.error('Export all to sheets error:', err);
    return sendError(res, 500, `Eksport qilishda xatolik: ${err.message || 'Noma\'lum'}`);
  }
}
