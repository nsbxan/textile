import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleOptions, authenticateRequest, sendJson, sendError } from '../_lib/authMiddleware';
import { googleSheetsService, SHEET_NAMES } from '../_lib/googleSheets';

interface SyncEvent {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  storeId: string;
  deviceStoreId?: string;
  description: string;
  payload: any;
  timestamp: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return sendError(res, 405, 'Faqat POST metodi qabul qilinadi.');
  }

  if (!authenticateRequest(req, res)) return;

  try {
    const { events } = req.body || {};

    if (!events || !Array.isArray(events) || events.length === 0) {
      return sendJson(res, 200, {
        success: true,
        message: 'Qayta ishlash uchun hodisalar mavjud emas.',
        processedCount: 0,
      });
    }

    const processedIds: string[] = [];
    const errors: { id: string; error: string }[] = [];
    const syncLogs: any[][] = [];

    for (const evt of events as SyncEvent[]) {
      try {
        switch (evt.action) {
          case 'PRODUCT_SAVED': {
            const p = evt.payload;
            if (p && p.id) {
              const row = [
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
                p.storeId || evt.storeId || '',
                p.createdAt || evt.timestamp,
                p.updatedAt || new Date().toISOString(),
              ];
              await googleSheetsService.upsertRowById(SHEET_NAMES.PRODUCTS, p.id, row);
            }
            break;
          }

          case 'PRODUCT_DELETED': {
            const targetId = evt.entityId || evt.payload?.id;
            if (targetId) {
              await googleSheetsService.deleteRowById(SHEET_NAMES.PRODUCTS, targetId);
            }
            break;
          }

          case 'SALE_CREATED': {
            const s = evt.payload;
            if (s && s.id) {
              const itemsList = Array.isArray(s.items)
                ? s.items.map((i: any) => `${i.name} (${i.quantity} ${i.unit || 'kg'})`).join('; ')
                : '';

              const row = [
                s.id,
                s.receiptNumber || '',
                s.createdAt || evt.timestamp,
                s.storeId || evt.storeId || '',
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
            break;
          }

          case 'CUSTOMER_SAVED': {
            const c = evt.payload;
            if (c && c.id) {
              const row = [
                c.id,
                c.name || '',
                c.phone || '',
                c.address || '',
                c.balance || 0,
                c.notes || '',
                c.storeId || evt.storeId || '',
                c.createdAt || evt.timestamp,
                c.updatedAt || new Date().toISOString(),
              ];
              await googleSheetsService.upsertRowById(SHEET_NAMES.CUSTOMERS, c.id, row);
            }
            break;
          }

          case 'CUSTOMER_DELETED': {
            const targetId = evt.entityId || evt.payload?.id;
            if (targetId) {
              await googleSheetsService.deleteRowById(SHEET_NAMES.CUSTOMERS, targetId);
            }
            break;
          }

          case 'DEBT_PAYMENT': {
            const d = evt.payload;
            if (d && d.id) {
              const row = [
                d.id,
                d.createdAt || evt.timestamp,
                d.type || 'customer',
                d.entityName || '',
                d.action || 'pay_debt',
                d.amount || 0,
                d.paymentMethod || 'cash',
                d.notes || '',
                d.storeId || evt.storeId || '',
              ];
              await googleSheetsService.appendRows(SHEET_NAMES.DEBT_HISTORY, [row]);
            }
            break;
          }

          case 'EXPENSE_ADDED': {
            const e = evt.payload;
            if (e && e.id) {
              const row = [
                e.id,
                e.date || evt.timestamp.split('T')[0],
                e.category || '',
                e.amount || 0,
                e.paymentMethod || 'cash',
                e.description || '',
                e.storeId || evt.storeId || '',
                e.createdAt || evt.timestamp,
              ];
              await googleSheetsService.upsertRowById(SHEET_NAMES.EXPENSES, e.id, row);
            }
            break;
          }

          case 'EXPENSE_DELETED': {
            const targetId = evt.entityId || evt.payload?.id;
            if (targetId) {
              await googleSheetsService.deleteRowById(SHEET_NAMES.EXPENSES, targetId);
            }
            break;
          }

          case 'SUPPLIER_SAVED': {
            const sup = evt.payload;
            if (sup && sup.id) {
              const row = [
                sup.id,
                sup.name || '',
                sup.phone || '',
                sup.company || '',
                sup.balance || 0,
                sup.notes || '',
                sup.storeId || evt.storeId || '',
                sup.createdAt || evt.timestamp,
              ];
              await googleSheetsService.upsertRowById(SHEET_NAMES.SUPPLIERS, sup.id, row);
            }
            break;
          }

          case 'SETTINGS_SAVED': {
            const set = evt.payload;
            if (set) {
              const row = [
                'main_settings',
                JSON.stringify(set),
                new Date().toISOString(),
              ];
              await googleSheetsService.upsertRowById(SHEET_NAMES.SETTINGS, 'main_settings', row);
            }
            break;
          }

          default:
            console.log(`Unhandled sync action: ${evt.action}`);
            break;
        }

        processedIds.push(evt.id);
        syncLogs.push([
          evt.id,
          new Date().toISOString(),
          evt.action,
          evt.entity,
          evt.storeId || '',
          evt.description || '',
          'SUCCESS',
          '',
        ]);
      } catch (itemErr: any) {
        console.error(`Error processing event ${evt.id}:`, itemErr);
        errors.push({ id: evt.id, error: itemErr.message || 'Xatolik' });
        syncLogs.push([
          evt.id,
          new Date().toISOString(),
          evt.action,
          evt.entity,
          evt.storeId || '',
          evt.description || '',
          'FAILED',
          itemErr.message || '',
        ]);
      }
    }

    // Fon rejimida sinxronizatsiya logini Google Sheetsga yozish
    if (syncLogs.length > 0) {
      googleSheetsService.appendRows(SHEET_NAMES.SYNC_LOG, syncLogs).catch(err => {
        console.error('Failed to append sync log to sheets:', err);
      });
    }

    return sendJson(res, 200, {
      success: errors.length === 0,
      processedCount: processedIds.length,
      syncedIds: processedIds,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    console.error('Sync events batch error:', err);
    return sendError(res, 500, `Sinxronizatsiyada xatolik yuz berdi: ${err.message || 'Noma\'lum'}`);
  }
}
