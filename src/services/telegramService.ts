import { Sale, TelegramConfig } from '../types';
import { formatUSD, formatMoney, usdToUzs, formatDateTime } from '../utils/formatters';
import { getCachedRate } from '../utils/currency';

const STORAGE_KEY = 'erp_telegram_config';

export const DEFAULT_TELEGRAM_CONFIG: TelegramConfig = {
  enabled: true,
  botToken: '8696144685:AAHp8MZCDOdwAdBxwUE8ZE8uoI8vhUKEfbs',
  chatId: '7239051384',
  notifyOnSale: true,
  notifyOnDebtPayment: true,
};

class TelegramNotificationService {
  private config: TelegramConfig = DEFAULT_TELEGRAM_CONFIG;

  constructor() {
    this.loadConfig();
  }

  loadConfig(): TelegramConfig {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.config = { 
          ...DEFAULT_TELEGRAM_CONFIG, 
          ...parsed,
          botToken: parsed.botToken || DEFAULT_TELEGRAM_CONFIG.botToken,
          chatId: parsed.chatId || DEFAULT_TELEGRAM_CONFIG.chatId,
          enabled: parsed.enabled ?? true
        };
      } else {
        this.config = { ...DEFAULT_TELEGRAM_CONFIG };
      }
    } catch (e) {
      console.error('Failed to load telegram config:', e);
    }
    return this.config;
  }

  saveConfig(newConfig: TelegramConfig) {
    this.config = { ...newConfig };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch (e) {
      console.error('Failed to save telegram config:', e);
    }
  }

  getConfig(): TelegramConfig {
    return { ...this.config };
  }

  isConfigured(): boolean {
    return Boolean(
      this.config.enabled &&
      this.config.botToken.trim() &&
      this.config.chatId.trim()
    );
  }

  /**
   * Telegram Botga xabar yuborish
   */
  async sendMessage(text: string, customToken?: string, customChatId?: string): Promise<{ success: boolean; message: string }> {
    const token = (customToken || this.config.botToken || '').trim();
    const chatId = (customChatId || this.config.chatId || '').trim();

    if (!token || !chatId) {
      return { success: false, message: "Bot Token yoki Chat ID kiritilmagan" };
    }

    try {
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML',
        }),
      });

      const data = await response.json();

      if (data.ok) {
        return { success: true, message: "Telegram botga test xabari muvaffaqiyatli yuborildi! 🎉" };
      } else {
        return { 
          success: false, 
          message: data.description || "Telegram API xatolik qaytardi. Bot token yoki Chat ID ni tekshiring." 
        };
      }
    } catch (error: any) {
      console.error('Telegram send error:', error);
      return { 
        success: false, 
        message: error.message || "Telegram serveriga ulanishda xatolik yuz berdi" 
      };
    }
  }

  /**
   * Test xabarini yuborish
   */
  async testConnection(botToken: string, chatId: string): Promise<{ success: boolean; message: string }> {
    const testMsg = `🔔 <b>TEXTILE PRO ERP — Telegram Bot Ulash</b>\n\n` +
      `✅ <b>Aloqa muvaffaqiyatli o'rnatildi!</b>\n` +
      `🕒 Vaqt: <code>${new Date().toLocaleString('uz-UZ')}</code>\n\n` +
      `Endi barcha yangi savdolar va qarzdorlardan tushgan to'lovlar ushbu botga avtomatik tarzda kelib turadi.`;

    return this.sendMessage(testMsg, botToken, chatId);
  }

  /**
   * Yangi savdo haqida Telegramga bildirishnoma yuborish
   */
  async notifySale(sale: Sale): Promise<void> {
    if (!this.isConfigured() || !this.config.notifyOnSale) return;

    try {
      const rate = sale.exchangeRate || getCachedRate().sellRate || 12800;
      const totalUzs = sale.finalAmountUZS || usdToUzs(sale.finalAmount, rate);

      // Tovarlar ro'yxati (maksimum 10 ta)
      const itemsList = sale.items.slice(0, 10).map((item, idx) => {
        const unitLabel = item.unit === 'kg' ? `${item.quantity} kg` : `${item.quantity} dona`;
        return `${idx + 1}. <b>${this.escapeHtml(item.name)}</b> (${unitLabel}) — ${formatUSD(item.total)}`;
      }).join('\n');

      const extraItems = sale.items.length > 10 ? `\n<i>...va yana ${sale.items.length - 10} ta tovar</i>` : '';

      // To'lov shakllari
      const paymentParts: string[] = [];
      if (sale.paidCash > 0) {
        if (sale.paidUsdCash && sale.paidUsdCash > 0 && sale.paidUzsCash && sale.paidUzsCash > 0) {
          paymentParts.push(`💵 Naqd: $${sale.paidUsdCash.toFixed(2)} + ${formatMoney(sale.paidUzsCash)}`);
        } else if (sale.paidUzsCash && sale.paidUzsCash > 0) {
          paymentParts.push(`💵 Naqd (so'm): ${formatMoney(sale.paidUzsCash)}`);
        } else {
          paymentParts.push(`💵 Naqd: ${formatUSD(sale.paidCash)}`);
        }
      }
      if (sale.paidCard > 0) {
        paymentParts.push(`💳 Karta: ${formatUSD(sale.paidCard)}`);
      }
      if (sale.paidDebt > 0) {
        paymentParts.push(`⚠️ Nasiya (Qarz): ${formatUSD(sale.paidDebt)}`);
      }

      const text = 
        `🛍 <b>YANGI SAVDO BAJARILDI!</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🧾 <b>Chek:</b> <code>#${sale.receiptNumber}</code>\n` +
        `🕒 <b>Sana:</b> ${formatDateTime(sale.createdAt)}\n` +
        `👤 <b>Kassir:</b> ${this.escapeHtml(sale.cashierName || 'Kassir')}\n` +
        (sale.customerName ? `🏷 <b>Mijoz:</b> ${this.escapeHtml(sale.customerName)}\n` : '') +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📦 <b>Matolar:</b>\n${itemsList}${extraItems}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `💰 <b>JAMI SUMMA:</b> <b>${formatUSD(sale.finalAmount)}</b> (≈ ${formatMoney(totalUzs)})\n` +
        (sale.discountAmount > 0 ? `✂️ Chegirma: -${formatUSD(sale.discountAmount)}\n` : '') +
        (paymentParts.length > 0 ? `💳 <b>To'lov turi:</b>\n${paymentParts.join('\n')}\n` : '') +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🏢 <b>TEXTILE PRO ERP</b>`;

      await this.sendMessage(text);
    } catch (e) {
      console.error('Failed to notify sale to Telegram:', e);
    }
  }

  /**
   * Qarzdor mijozdan pul tushganda bildirishnoma yuborish
   */
  async notifyDebtPayment(
    customerName: string,
    amountUSD: number,
    paymentMethod: 'cash' | 'card',
    notes?: string,
    remainingDebtUSD?: number
  ): Promise<void> {
    if (!this.isConfigured() || !this.config.notifyOnDebtPayment) return;

    try {
      const rate = getCachedRate().sellRate || 12800;
      const amountUZS = usdToUzs(amountUSD, rate);

      const payMethodStr = paymentMethod === 'cash' ? '💵 Naqd pul' : '💳 Karta / O\'tkazma';
      const remainingStr = remainingDebtUSD !== undefined 
        ? `\n📉 <b>Qolgan qarzi:</b> ${formatUSD(Math.max(0, remainingDebtUSD))} (≈ ${formatMoney(usdToUzs(Math.max(0, remainingDebtUSD), rate))})` 
        : '';

      const text = 
        `💸 <b>QARZDAN PUL TUSHDI!</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 <b>Mijoz:</b> <b>${this.escapeHtml(customerName)}</b>\n` +
        `💰 <b>Qabul qilingan summa:</b> <b>${formatUSD(amountUSD)}</b>\n` +
        `🇺🇿 <b>So'mda:</b> ${formatMoney(amountUZS)}\n` +
        `💳 <b>To'lov shakli:</b> ${payMethodStr}\n` +
        (notes ? `📝 <b>Izoh:</b> ${this.escapeHtml(notes)}\n` : '') +
        remainingStr + `\n` +
        `🕒 <b>Vaqt:</b> ${formatDateTime(new Date().toISOString())}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🏢 <b>TEXTILE PRO ERP</b>`;

      await this.sendMessage(text);
    } catch (e) {
      console.error('Failed to notify debt payment to Telegram:', e);
    }
  }

  private escapeHtml(str: string): string {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

export const telegramService = new TelegramNotificationService();
