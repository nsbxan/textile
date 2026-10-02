import { Sale, TelegramConfig, TelegramRecipient } from '../types';
import { formatUSD, formatMoney, usdToUzs, formatDateTime } from '../utils/formatters';
import { getCachedRate } from '../utils/currency';

const STORAGE_KEY = 'erp_telegram_config';

export const DEFAULT_PRIMARY_RECIPIENT: TelegramRecipient = {
  id: 'primary-admin',
  name: "Asosiy Admin (Do'kon Egasi)",
  chatId: '7239051384',
  role: 'admin',
  enabled: true,
  notifyOnSale: true,
  notifyOnDebtPayment: true,
  addedAt: '2026-01-01T00:00:00.000Z',
};

export const DEFAULT_TELEGRAM_CONFIG: TelegramConfig = {
  enabled: true,
  botToken: '8696144685:AAHp8MZCDOdwAdBxwUE8ZE8uoI8vhUKEfbs',
  chatId: '7239051384',
  notifyOnSale: true,
  notifyOnDebtPayment: true,
  recipients: [DEFAULT_PRIMARY_RECIPIENT],
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
        const chatId = parsed.chatId || DEFAULT_TELEGRAM_CONFIG.chatId;

        // Ensure recipients array is properly hydrated
        let recipients: TelegramRecipient[] = Array.isArray(parsed.recipients) && parsed.recipients.length > 0
          ? parsed.recipients
          : [];

        // If no recipients yet, add existing chatId as primary admin
        if (recipients.length === 0 && chatId) {
          recipients.push({
            id: 'primary-admin',
            name: "Asosiy Admin",
            chatId: chatId,
            role: 'admin',
            enabled: true,
            notifyOnSale: parsed.notifyOnSale ?? true,
            notifyOnDebtPayment: parsed.notifyOnDebtPayment ?? true,
            addedAt: new Date().toISOString(),
          });
        }

        this.config = {
          ...DEFAULT_TELEGRAM_CONFIG,
          ...parsed,
          botToken: parsed.botToken || DEFAULT_TELEGRAM_CONFIG.botToken,
          chatId: chatId,
          enabled: parsed.enabled ?? true,
          recipients,
        };
      } else {
        this.config = { ...DEFAULT_TELEGRAM_CONFIG };
      }
    } catch (e) {
      console.error('Failed to load telegram config:', e);
      this.config = { ...DEFAULT_TELEGRAM_CONFIG };
    }
    return this.config;
  }

  saveConfig(newConfig: Partial<TelegramConfig>) {
    this.config = {
      ...this.config,
      ...newConfig,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch (e) {
      console.error('Failed to save telegram config:', e);
    }
    return this.config;
  }

  getConfig(): TelegramConfig {
    return {
      ...this.config,
      recipients: [...(this.config.recipients || [])],
    };
  }

  getRecipients(): TelegramRecipient[] {
    return this.config.recipients || [];
  }

  /**
   * Yangi qabul qiluvchi foydalanuvchi qo'shish
   */
  addRecipient(recipient: Omit<TelegramRecipient, 'id' | 'addedAt'>): TelegramRecipient {
    const newRecipient: TelegramRecipient = {
      ...recipient,
      id: `tg_user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      chatId: recipient.chatId.trim(),
      name: recipient.name.trim() || 'Telegram User',
      enabled: recipient.enabled ?? true,
      notifyOnSale: recipient.notifyOnSale ?? true,
      notifyOnDebtPayment: recipient.notifyOnDebtPayment ?? true,
      addedAt: new Date().toISOString(),
    };

    const currentRecipients = this.getRecipients();

    // Check if chatId already exists
    const existingIndex = currentRecipients.findIndex(r => r.chatId === newRecipient.chatId);
    let updatedRecipients: TelegramRecipient[];

    if (existingIndex >= 0) {
      // Update existing
      updatedRecipients = [...currentRecipients];
      updatedRecipients[existingIndex] = {
        ...updatedRecipients[existingIndex],
        ...newRecipient,
        id: updatedRecipients[existingIndex].id,
      };
    } else {
      updatedRecipients = [...currentRecipients, newRecipient];
    }

    this.saveConfig({ recipients: updatedRecipients });
    return newRecipient;
  }

  /**
   * Foydalanuvchini tahrirlash
   */
  updateRecipient(id: string, updates: Partial<TelegramRecipient>): TelegramRecipient[] {
    const current = this.getRecipients();
    const updated = current.map(r => (r.id === id ? { ...r, ...updates } : r));
    this.saveConfig({ recipients: updated });
    return updated;
  }

  /**
   * Foydalanuvchini o'chirish
   */
  removeRecipient(id: string): TelegramRecipient[] {
    const current = this.getRecipients();
    const filtered = current.filter(r => r.id !== id);
    this.saveConfig({ recipients: filtered });
    return filtered;
  }

  /**
   * Foydalanuvchi faolligini yoqish/o'chirish
   */
  toggleRecipient(id: string, enabled?: boolean): TelegramRecipient[] {
    const current = this.getRecipients();
    const updated = current.map(r => {
      if (r.id === id) {
        return { ...r, enabled: enabled !== undefined ? enabled : !r.enabled };
      }
      return r;
    });
    this.saveConfig({ recipients: updated });
    return updated;
  }

  isConfigured(): boolean {
    const hasToken = Boolean(this.config.enabled && this.config.botToken.trim());
    const hasRecipients = (this.config.recipients || []).some(r => r.enabled && r.chatId.trim());
    const hasLegacyChatId = Boolean(this.config.chatId && this.config.chatId.trim());
    return hasToken && (hasRecipients || hasLegacyChatId);
  }

  /**
   * Bot ma'lumotlarini tekshirish (getMe)
   */
  async getBotInfo(customToken?: string): Promise<{ success: boolean; botName?: string; username?: string; message?: string }> {
    const token = (customToken || this.config.botToken || '').trim();
    if (!token) return { success: false, message: 'Bot Token kiritilmagan' };

    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data = await res.json();
      if (data.ok && data.result) {
        return {
          success: true,
          botName: data.result.first_name,
          username: data.result.username,
        };
      }
      return { success: false, message: data.description || 'Bot topilmadi' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Tarmoq xatosi' };
    }
  }

  /**
   * Botga yozgan va /start bosgan foydalanuvchilarni avtomatik qidirib topish
   */
  async fetchBotUpdates(customToken?: string): Promise<{
    success: boolean;
    users: Array<{ chatId: string; name: string; username?: string; lastMessage?: string; date?: string }>;
    message?: string;
  }> {
    const token = (customToken || this.config.botToken || '').trim();
    if (!token) {
      return { success: false, users: [], message: 'Bot Token kiritilmagan' };
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=-50&timeout=0`);
      const data = await res.json();

      if (!data.ok) {
        return {
          success: false,
          users: [],
          message: data.description || 'Telegram getUpdates xatolik qaytardi',
        };
      }

      const updates = data.result || [];
      const userMap = new Map<string, { chatId: string; name: string; username?: string; lastMessage?: string; date?: string }>();

      for (const item of updates) {
        const msg = item.message || item.edited_message || item.channel_post;
        if (!msg) continue;

        const chat = msg.chat;
        const from = msg.from;
        if (!chat || !chat.id) continue;

        const chatId = String(chat.id);
        const nameParts = [from?.first_name, from?.last_name].filter(Boolean);
        const name = nameParts.length > 0 ? nameParts.join(' ') : (chat.title || chat.username || 'Foydalanuvchi');
        const username = from?.username || chat.username;
        const lastMessage = msg.text || (msg.caption ? `[Media: ${msg.caption}]` : '[Xabar]');
        const date = msg.date ? new Date(msg.date * 1000).toISOString() : new Date().toISOString();

        userMap.set(chatId, {
          chatId,
          name,
          username,
          lastMessage,
          date,
        });
      }

      const users = Array.from(userMap.values());
      return {
        success: true,
        users,
        message: users.length > 0
          ? `${users.length} ta foydalanuvchi topildi.`
          : "Hozircha botga yangi xabar yozgan foydalanuvchilar topilmadi. Xodim t.me/" + (await this.getBotInfo(token)).username + " ga kirib /start bosishi kerak.",
      };
    } catch (err: any) {
      console.error('Error fetching bot updates:', err);
      return {
        success: false,
        users: [],
        message: `Xatolik: ${err.message || 'Tarmoq xatosi'}`,
      };
    }
  }

  /**
   * Bitta foydalanuvchiga Telegram xabar yuborish
   */
  async sendMessage(text: string, customToken?: string, customChatId?: string): Promise<{ success: boolean; message: string }> {
    const token = (customToken || this.config.botToken || '').trim();
    const chatId = (customChatId || this.config.chatId || '').trim();

    if (!token || !chatId) {
      return { success: false, message: 'Bot Token yoki Chat ID kiritilmagan' };
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
        return { success: true, message: 'Telegram botga test xabari muvaffaqiyatli yuborildi! 🎉' };
      } else {
        return {
          success: false,
          message: data.description || 'Telegram API xatolik qaytardi. Bot token yoki Chat ID ni tekshiring.',
        };
      }
    } catch (error: any) {
      console.error('Telegram send error:', error);
      return {
        success: false,
        message: error.message || 'Telegram serveriga ulanishda xatolik yuz berdi',
      };
    }
  }

  /**
   * Barcha faol qabul qiluvchilarga (yoki filtrlangan userlarga) xabar tarqatish
   */
  async sendMessageToAll(
    text: string,
    filter?: (recipient: TelegramRecipient) => boolean
  ): Promise<{ success: boolean; total: number; sent: number; failed: number }> {
    if (!this.config.enabled || !this.config.botToken.trim()) {
      return { success: false, total: 0, sent: 0, failed: 0 };
    }

    let targetRecipients = (this.config.recipients || []).filter(r => r.enabled && r.chatId.trim());

    // Qo'shimcha: agar chatId maydonida vergul bilan bir nechta ID yozilgan bo'lsa (masalan: 12345, 67890)
    if (this.config.chatId && this.config.chatId.trim()) {
      const rawChatIds = this.config.chatId.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
      for (const cId of rawChatIds) {
        if (!targetRecipients.some(r => r.chatId === cId)) {
          targetRecipients.push({
            id: `legacy_${cId}`,
            name: `Foydalanuvchi (${cId})`,
            chatId: cId,
            enabled: true,
            notifyOnSale: this.config.notifyOnSale ?? true,
            notifyOnDebtPayment: this.config.notifyOnDebtPayment ?? true,
            addedAt: new Date().toISOString(),
          });
        }
      }
    }

    if (filter) {
      targetRecipients = targetRecipients.filter(filter);
    }

    if (targetRecipients.length === 0) {
      return { success: false, total: 0, sent: 0, failed: 0 };
    }

    const token = this.config.botToken.trim();
    let sent = 0;
    let failed = 0;

    const promises = targetRecipients.map(async (recipient) => {
      try {
        const res = await this.sendMessage(text, token, recipient.chatId);
        if (res.success) {
          sent++;
        } else {
          failed++;
          console.warn(`Failed to send telegram message to ${recipient.name} (${recipient.chatId}):`, res.message);
        }
      } catch (err) {
        failed++;
        console.error(`Error sending telegram message to ${recipient.name}:`, err);
      }
    });

    await Promise.allSettled(promises);

    return {
      success: sent > 0,
      total: targetRecipients.length,
      sent,
      failed,
    };
  }

  /**
   * Barcha ulangan foydalanuvchilarga test xabarini yuborish
   */
  async testAllConnections(botToken?: string): Promise<{ success: boolean; total: number; sent: number; failed: number; message: string }> {
    const token = (botToken || this.config.botToken || '').trim();
    if (!token) {
      return { success: false, total: 0, sent: 0, failed: 0, message: "Bot Token kiritilmagan" };
    }

    const testMsg =
      `🔔 <b>TEXTILE PRO ERP — Telegram Bot Ulash</b>\n\n` +
      `✅ <b>Aloqa muvaffaqiyatli o'rnatildi!</b>\n` +
      `🕒 Vaqt: <code>${new Date().toLocaleString('uz-UZ')}</code>\n\n` +
      `Ushbu Telegram akkaunt TEXTILE PRO ERP tizimiga muvaffaqiyatli ulandi. Endi barcha yangi savdo va to'lov xabarlari kelib turadi.`;

    const broadcast = await this.sendMessageToAll(testMsg);
    if (broadcast.sent > 0) {
      return {
        ...broadcast,
        message: `Test xabari barcha ${broadcast.sent} ta foydalanuvchiga muvaffaqiyatli yuborildi! 🎉` + (broadcast.failed > 0 ? ` (${broadcast.failed} tasiga yetib bormadi)` : ''),
      };
    } else {
      return {
        ...broadcast,
        message: "Birorta ham foydalanuvchiga xabar yuborib bo'lmadi. Bot token va Chat ID larni tekshiring.",
      };
    }
  }

  /**
   * Aloqani tekshirish (Test xabarini yuborish)
   */
  async testConnection(botToken: string, chatId: string, recipientName?: string): Promise<{ success: boolean; message: string }> {
    const greetingName = recipientName ? ` ${recipientName}` : '';
    const testMsg =
      `🔔 <b>TEXTILE PRO ERP — Telegram Bot Ulash</b>\n\n` +
      `✅ <b>Salom${greetingName}! Aloqa muvaffaqiyatli o'rnatildi!</b>\n` +
      `🕒 Vaqt: <code>${new Date().toLocaleString('uz-UZ')}</code>\n` +
      `🆔 Chat ID: <code>${chatId}</code>\n\n` +
      `Endi yangi savdolar va qarzdorlardan tushgan to'lovlar ushbu botga avtomatik tarzda kelib turadi.`;

    return this.sendMessage(testMsg, botToken, chatId);
  }

  /**
   * Yangi savdo haqida Telegramga bildirishnoma yuborish (Barcha userlarga)
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

      await this.sendMessageToAll(text, recipient => recipient.notifyOnSale !== false);
    } catch (e) {
      console.error('Failed to notify sale to Telegram:', e);
    }
  }

  /**
   * Qarzdor mijozdan pul tushganda bildirishnoma yuborish (Barcha userlarga)
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

      const payMethodStr = paymentMethod === 'cash' ? '💵 Naqd pul' : "💳 Karta / O'tkazma";
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

      await this.sendMessageToAll(text, recipient => recipient.notifyOnDebtPayment !== false);
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
