import { AiConfig, Product, Sale, Customer, Supplier, Expense, ViewTab } from '../types';
import { AppDatabase } from '../db';
import { soundManager } from '../utils/sound';

const AI_STORAGE_KEY = 'savdo_erp_ai_config';

export const DEFAULT_AI_CONFIG: AiConfig = {
  apiKey: '',
  model: 'gemini-2.0-flash',
  enabled: true,
  autoExecuteActions: true,
};

export interface AiChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: string;
  timestamp: string;
  executedActions?: { name: string; detail: string; status: 'success' | 'failed' }[];
  suggestedAction?: { type: string; payload: any; label: string };
}

// Gemini Function Calling asboblari
const GEMINI_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'switch_tab',
        description: 'Dasturning ko\'rinish bo\'limini o\'zgartirish (kassa, ombor, qarzlar, ta\'minot, xarajatlar, hisobotlar, sozlamalar)',
        parameters: {
          type: 'OBJECT',
          properties: {
            tab: {
              type: 'STRING',
              enum: ['pos', 'inventory', 'debts', 'suppliers', 'expenses', 'reports', 'settings'],
              description: 'O\'tilishi kerak bo\'lgan bo\'lim kodi'
            }
          },
          required: ['tab']
        }
      },
      {
        name: 'add_product',
        description: 'Omborga yangi mato qo\'shish yoki mavjud mato qoldig\'ini oshirish',
        parameters: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING', description: 'Mato nomi (masalan: Dvunitka Penye Futer)' },
            category: { type: 'STRING', description: 'Turi (masalan: Dvunitka (2-ipli), Kulevka / Supren, Tryoxnitka (3-ipli), Ribana, Lakosta)' },
            color: { type: 'STRING', description: 'Rangi (masalan: Qora, Oq, Melanj, Xaki, Antratsit)' },
            density: { type: 'STRING', description: 'Zichligi (masalan: 240 gr/m², 180 gr/m²)' },
            rolls: { type: 'NUMBER', description: 'To\'plar yoki rulonlar soni' },
            stock: { type: 'NUMBER', description: 'Vazni yoki miqdori kg da (masalan: 25.5)' },
            buyPrice: { type: 'NUMBER', description: 'Kirim tannarxi dollarda ($/kg, masalan: 5.50)' },
            sellPrice: { type: 'NUMBER', description: 'Chakana sotish narxi dollarda ($/kg, masalan: 6.80)' },
            storeId: { type: 'STRING', description: 'Do\'kon ID (standart store_1 - TEXTILE PRO)' }
          },
          required: ['name', 'stock', 'buyPrice']
        }
      },
      {
        name: 'get_inventory_status',
        description: 'Ombordagi matolar qoldig\'i, kam qolgan yoki tugagan matolar haqida ma\'lumot olish',
        parameters: {
          type: 'OBJECT',
          properties: {
            filter: { type: 'STRING', enum: ['all', 'low_stock', 'out_of_stock'], description: 'Qidiruv filtri' }
          }
        }
      },
      {
        name: 'get_sales_analytics',
        description: 'Bugungi va umumiy savdolar, tushum, sof foyda va nasiyalar haqida tahliliy hisobot olish',
        parameters: {
          type: 'OBJECT',
          properties: {
            period: { type: 'STRING', enum: ['today', 'all_time'], description: 'Vaqt oralig\'i' }
          }
        }
      },
      {
        name: 'record_expense',
        description: 'Kassadan yangi xarajat yozish (ijara, logistika, tushirish, oylik va h.k.)',
        parameters: {
          type: 'OBJECT',
          properties: {
            category: { type: 'STRING', description: 'Xarajat turi (masalan: Ombor Ijarasi, Yuk tashish, Ish haqi)' },
            amount: { type: 'NUMBER', description: 'Xarajat summasi dollarda ($)' },
            paymentMethod: { type: 'STRING', enum: ['cash', 'card'], description: 'To\'lov turi' },
            description: { type: 'STRING', description: 'Xarajat sababi yoki izohi' }
          },
          required: ['category', 'amount']
        }
      },
      {
        name: 'get_debt_summary',
        description: 'Mijozlarning qarzlari va yetkazib beruvchilarga bo\'lgan qarzlar holatini olish',
        parameters: {
          type: 'OBJECT',
          properties: {
            type: { type: 'STRING', enum: ['all', 'customers', 'suppliers'] }
          }
        }
      }
    ]
  }
];

class AiAgentService {
  private config: AiConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): AiConfig {
    try {
      const stored = localStorage.getItem(AI_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_AI_CONFIG, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('Error loading AI config:', e);
    }
    return DEFAULT_AI_CONFIG;
  }

  getConfig(): AiConfig {
    return this.config;
  }

  saveConfig(newConfig: Partial<AiConfig>): void {
    this.config = { ...this.config, ...newConfig };
    try {
      localStorage.setItem(AI_STORAGE_KEY, JSON.stringify(this.config));
      window.dispatchEvent(new Event('erp_ai_config_changed'));
    } catch (e) {
      console.error('Error saving AI config:', e);
    }
  }

  isConfigured(): boolean {
    return Boolean(this.config.apiKey && this.config.apiKey.trim().startsWith('AIzaSy'));
  }

  /**
   * API kalitni tekshirish (Ping to Google Gemini)
   */
  async testApiKey(apiKey: string, modelName: string = 'gemini-flash-lite-latest'): Promise<{ success: boolean; message: string }> {
    if (!apiKey || apiKey.trim().length < 10) {
      return { success: false, message: "API kaliti kiritilmagan!" };
    }

    const testWithModel = async (model: string) => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
      return await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Salom" }] }]
        })
      });
    };

    try {
      let res = await testWithModel(modelName);
      let data = await res.json();

      if (data.error && modelName !== 'gemini-flash-lite-latest') {
        // Fallback to ultra fast flash lite
        res = await testWithModel('gemini-flash-lite-latest');
        data = await res.json();
      }

      if (data.error) {
        return { success: false, message: data.error.message || "API kalit noto'g'ri yoki ruxsat yo'q!" };
      }

      if (data.candidates && data.candidates.length > 0) {
        return { success: true, message: "Gemini AI bilan aloqa muvaffaqiyatli o'rnatildi! 🎉" };
      }

      return { success: false, message: "Kutilmagan javob keldi" };
    } catch (err: any) {
      return { success: false, message: err.message || "Internet tarmog'iga ulanib bo'lmadi" };
    }
  }

  /**
   * Foydalanuvchi xabarini tahlil qilish va kerak bo'lsa dasturni boshqarish (Function Calling)
   */
  async sendMessage(
    userText: string,
    chatHistory: { sender: 'user' | 'ai'; text: string }[] = [],
    actionHandlers: {
      onSwitchTab: (tab: ViewTab) => void;
      onRefreshData: () => void;
    },
    imageBase64?: string,
    userRole: 'superadmin' | 'admin' | 'cashier' = 'cashier'
  ): Promise<{ text: string; executedActions: { name: string; detail: string; status: 'success' | 'failed' }[] }> {
    const isSuperAdmin = userRole === 'superadmin' || userRole === 'admin';

    if (!this.isConfigured()) {
      return this.generateLocalStoreResponse(userText, actionHandlers);
    }

    const apiKey = this.config.apiKey.trim();
    const model = this.config.model || 'gemini-2.0-flash';
    const executedActions: { name: string; detail: string; status: 'success' | 'failed' }[] = [];

    // Hozirgi ERP holati haqida qisqa kontekst
    const products = AppDatabase.getProducts('all');
    const sales = AppDatabase.getSales('all');
    const todayStr = new Date().toISOString().slice(0, 10);
    const todaySales = sales.filter(s => s.createdAt.startsWith(todayStr));
    const todayTotal = todaySales.reduce((sum, s) => sum + s.finalAmount, 0);
    const todayProfit = todaySales.reduce((sum, s) => sum + s.profit, 0);
    const lowStockCount = products.filter(p => p.stock <= p.minStock).length;
    const debtTrxs = AppDatabase.getDebtTransactions().filter(t => t.type === 'customer' && t.action === 'pay_debt');
    const todayDebtCollected = debtTrxs.filter(t => t.createdAt.startsWith(todayStr)).reduce((sum, t) => sum + t.amount, 0);

    const systemInstruction = `Siz O'zbekistondagi trikotaj matolar savdosi do'koni va ombori ("TEXTILE PRO") tizimining aqlli "AI Yordamchi"sisiz.
Siz do'kon xodimlari va rahbariga dasturda to'liq yordam berasiz. Yagona do'kon: TEXTILE PRO (Abu Sahiy F-107).

MUHIM QOIDA VA RUXSATLAR:
- Foydalanuvchi qanday savol bermasin (savdolar, sof foyda, tushum, tovarlar tannarxi va sotuv narxlari, ombor qoldiqlari, qarzdorlar, xarajatlar va hisobotlar), HECH QACHON "faqat adminga ruxsat", "ruxsat etilmagan" yoki "ruxsat yo'q" deb aytmang!
- Barcha ma'lumotlar ochiq va ruxsat berilgan:
  * Bugungi savdo tushumi: $${todayTotal.toFixed(2)} (${todaySales.length} ta chek)
  * Bugungi sof foyda: $${todayProfit.toFixed(2)}
  * Bugungi qarzdan tushum: $${todayDebtCollected.toFixed(2)}
  * Ombordagi jami matolar soni: ${products.length} xil mato
  * Kam qolgan matolar: ${lowStockCount} xil
- AI VA TEXNOLOGIYA: O'zingizni TEXTILE PRO tizimining ichki "AI Yordamchi"si deb tanishtiring.
- Foydalanuvchi so'ragan barcha moliyaviy, ombor va savdo ma'lumotlarini aniq, ochiq, samimiy va batafsil tushuntirib bering.

Qoidalar:
1. Har doim o'zbek tilida, do'stona, aniq, professional va lo'nda javob bering. O'zingizni "AI Yordamchi" deb atang.
2. Agar foydalanuvchi "kassaga o't", "omborga o't", "hisobotni ko'rsat" desa -> switch_tab funksiyasini chaqiring.
3. Agar mato kirim qilishni aytsa -> add_product funksiyasini chaqiring.
4. Agar savdolar yoki foyda tahlilini so'rasa -> get_sales_analytics funksiyasini chaqiring.
5. Har doim bajargan amalingizni foydalanuvchiga xushmuomalalik bilan tasdiqlab bildiring.`;

    // Contents tayyorlash
    const contents: any[] = [];

    // Oxirgi 6 ta xabarni kontekst sifatida qo'shish
    const recent = chatHistory.slice(-6);
    for (const msg of recent) {
      contents.push({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      });
    }

    // Joriy xabar
    const currentParts: any[] = [{ text: userText }];
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      currentParts.unshift({
        inlineData: {
          mimeType: 'image/jpeg',
          data: cleanBase64
        }
      });
    }

    contents.push({
      role: 'user',
      parts: currentParts
    });

    try {
      const callModel = async (targetModel: string) => {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;
        return await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents,
            tools: GEMINI_TOOLS
          })
        });
      };

      let response = await callModel(model);
      let data = await response.json();

      if (data.error && model !== 'gemini-flash-lite-latest') {
        response = await callModel('gemini-flash-lite-latest');
        data = await response.json();
      }

      if (data.error) {
        throw new Error(data.error.message || 'Gemini API xatoligi');
      }

      const candidate = data.candidates?.[0];
      if (!candidate) {
        return { text: "Kechirasiz, javob olib bo'lmadi.", executedActions: [] };
      }

      const parts = candidate.content?.parts || [];
      let replyText = '';

      // Function Call mavjudligini tekshirish
      for (const part of parts) {
        if (part.text) {
          replyText += part.text;
        }

        if (part.functionCall) {
          const fn = part.functionCall;
          const fnName = fn.name;
          const fnArgs = fn.args || {};

          // Amallarni bajarish
          const execResult = await this.dispatchLocalAction(fnName, fnArgs, actionHandlers, userRole);
          executedActions.push(execResult);

          if (!replyText) {
            replyText = execResult.detail;
          }
        }
      }

      if (!replyText && executedActions.length > 0) {
        replyText = executedActions.map(a => a.detail).join('\n');
      }

      return {
        text: replyText || "Buyruq qabul qilindi va bajarildi.",
        executedActions
      };
    } catch (err: any) {
      console.warn('AI Processing error, falling back to local store assistant:', err);
      return this.generateLocalStoreResponse(userText, actionHandlers);
    }
  }

  /**
   * Gemini API bo'lmaganda yoki uzilish bo'lganda ishlovchi aqlli mahalliy yordamchi
   */
  private generateLocalStoreResponse(
    userText: string,
    actionHandlers: {
      onSwitchTab: (tab: ViewTab) => void;
      onRefreshData: () => void;
    }
  ): { text: string; executedActions: { name: string; detail: string; status: 'success' | 'failed' }[] } {
    const q = userText.toLowerCase().trim();
    const executedActions: { name: string; detail: string; status: 'success' | 'failed' }[] = [];

    const products = AppDatabase.getProducts('all');
    const sales = AppDatabase.getSales('all');
    const customers = AppDatabase.getCustomers('all');
    const expenses = AppDatabase.getExpenses('all');
    const suppliers = AppDatabase.getSuppliers();

    // 1. Navigation
    if (q.includes('kassa') || q.includes('pos') || q.includes('savdo qilish')) {
      actionHandlers.onSwitchTab('pos');
      executedActions.push({ name: 'switch_tab', detail: "Kassa (POS) bo'limiga o'tildi", status: 'success' });
      soundManager.playScanBeep();
      return {
        text: "Kassa (POS) terminali ochildi. Mahsulot shtrix-kodini skanerlashingiz yoki qidiruvdan matoni tanlab savdo qilishingiz mumkin.",
        executedActions
      };
    }
    if (q.includes('ombor') || q.includes('sklad') || q.includes('qoldiq')) {
      actionHandlers.onSwitchTab('inventory');
      executedActions.push({ name: 'switch_tab', detail: "Ombor (Sklad) bo'limiga o'tildi", status: 'success' });
      soundManager.playScanBeep();
      const totalKg = products.reduce((sum, p) => sum + (p.stock || 0), 0);
      const totalRolls = products.reduce((sum, p) => sum + (p.rolls || 0), 0);
      return {
        text: `Ombor bo'limiga o'tildi.\n\n📦 Hozirda omborda **${products.length} xil** mato mavjud.\n⚖️ Jami og'irlik: **${totalKg.toFixed(1)} kg**\n🧵 Jami to'plar: **${totalRolls} ta rulon**.`,
        executedActions
      };
    }
    if (q.includes('qarz') || q.includes('nasiya') || q.includes('haqimiz')) {
      actionHandlers.onSwitchTab('debts');
      executedActions.push({ name: 'switch_tab', detail: "Qarzlar bo'limiga o'tildi", status: 'success' });
      soundManager.playScanBeep();
      const debtors = customers.filter(c => c.balance < 0);
      const totalDebt = debtors.reduce((sum, c) => sum + Math.abs(c.balance), 0);
      return {
        text: `Qarzlar daftari ochildi.\n\n👥 Qarzdor mijozlar: **${debtors.length} nafar**\n💰 Umumiy nasiya summasi: **$${totalDebt.toFixed(2)}**`,
        executedActions
      };
    }
    if (q.includes("ta'minot") || q.includes('kirim') || q.includes('yetkazib') || q.includes('postavshik')) {
      actionHandlers.onSwitchTab('suppliers');
      executedActions.push({ name: 'switch_tab', detail: "Ta'minot bo'limiga o'tildi", status: 'success' });
      soundManager.playScanBeep();
      return {
        text: `Ta'minotchilar va kirim hujjatlari bo'limiga o'tildi.\n\nJami ta'minotchilar: **${suppliers.length} ta**.`,
        executedActions
      };
    }
    if (q.includes('xarajat') || q.includes('chiqim') || q.includes('rasxod')) {
      actionHandlers.onSwitchTab('expenses');
      executedActions.push({ name: 'switch_tab', detail: "Xarajatlar bo'limiga o'tildi", status: 'success' });
      soundManager.playScanBeep();
      const totalExp = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      return {
        text: `Xarajatlar bo'limiga o'tildi.\n\nJami qayd etilgan xarajatlar: **$${totalExp.toFixed(2)}** (${expenses.length} ta yozuv).`,
        executedActions
      };
    }
    if (q.includes('hisobot') || q.includes('pribil') || q.includes('foyda') || q.includes('tahlil')) {
      actionHandlers.onSwitchTab('reports');
      executedActions.push({ name: 'switch_tab', detail: "Hisobotlar bo'limiga o'tildi", status: 'success' });
      soundManager.playScanBeep();
      return {
        text: "Hisobotlar va sof foyda tahlili bo'limiga o'tildi. Bu yerda kunlik, oylik tushum va xarajatlar tahlilini ko'rishingiz mumkin.",
        executedActions
      };
    }
    if (q.includes('sozlama') || q.includes('nastroyka')) {
      actionHandlers.onSwitchTab('settings');
      executedActions.push({ name: 'switch_tab', detail: "Sozlamalar bo'limiga o'tildi", status: 'success' });
      soundManager.playScanBeep();
      return {
        text: "Sozlamalar bo'limiga o'tildi.",
        executedActions
      };
    }

    // 2. Data queries: Today's sales
    if (q.includes('bugun') || q.includes('tushum') || q.includes('savdo')) {
      const todayStr = new Date().toISOString().slice(0, 10);
      const todaySales = sales.filter(s => s.createdAt.startsWith(todayStr));
      const todayTotalUSD = todaySales.reduce((sum, s) => sum + (s.finalAmount || 0), 0);
      const todayProfit = todaySales.reduce((sum, s) => sum + (s.profit || 0), 0);
      const totalKgSold = todaySales.reduce((sum, s) => sum + (s.items || []).reduce((isum, i) => isum + (i.quantity || 0), 0), 0);
      return {
        text: `📊 **Bugungi Savdo Natijalari (TEXTILE PRO):**\n\n` +
              `• Savdolar soni: **${todaySales.length} ta chek**\n` +
              `• Umumiy tushum: **$${todayTotalUSD.toFixed(2)}**\n` +
              `• Sof foyda: **$${todayProfit.toFixed(2)}**\n` +
              `• Sotilgan mato: **${totalKgSold.toFixed(1)} kg**\n\n` +
              `Savdo tafsilotlarini to'liq ko'rish uchun "Hisobotlar" bo'limiga o'tishingiz mumkin.`,
        executedActions
      };
    }

    // 3. Data queries: Fabric stock
    if (q.includes('mato') || q.includes('tovar') || q.includes('ombor')) {
      const totalKg = products.reduce((sum, p) => sum + (p.stock || 0), 0);
      const totalRolls = products.reduce((sum, p) => sum + (p.rolls || 0), 0);
      const totalValue = products.reduce((sum, p) => sum + ((p.stock || 0) * (p.buyPrice || 0)), 0);
      const lowStock = products.filter(p => p.stock <= p.minStock);

      let text = `📦 **Ombor Qoldiqlari (TEXTILE PRO):**\n\n` +
                 `• Matolar turi: **${products.length} xil**\n` +
                 `• Jami og'irlik: **${totalKg.toFixed(1)} kg**\n` +
                 `• Jami to'plar: **${totalRolls} ta rulon**\n` +
                 `• Ombor qiymati (tannarxda): **$${totalValue.toFixed(2)}**\n\n`;

      if (lowStock.length > 0) {
        text += `⚠️ **Kam qolgan matolar (${lowStock.length} ta):**\n` +
                lowStock.slice(0, 5).map(p => `- ${p.name}: ${p.stock} kg qoldi`).join('\n');
      } else {
        text += `✅ Barcha matolardan yetarli zaxira mavjud.`;
      }

      return { text, executedActions };
    }

    // 4. Greetings
    if (q.includes('salom') || q.includes('assalom') || q.includes('qalay') || q.includes('yordam')) {
      return {
        text: `Assalomu alaykum! Men **TEXTILE PRO** aqlli yordamchisiman.\n\n` +
              `Sizga quyidagi amallar bo'yicha yordam bera olaman:\n` +
              `• **"Bugungi savdo"** - tushum va sof foyda hisobi\n` +
              `• **"Ombor holati"** - matolar turlari, kg va rulonlar qoldig'i\n` +
              `• **"Qarzdorlar"** - nasiyaga olingan qarzlar ro'yxati\n` +
              `• **"Kassaga o't"**, **"Omborga o't"** - tezkor navigatsiya\n\n` +
              `Sizga qanday ma'lumot kerak?`,
        executedActions
      };
    }

    // 5. Default intelligent assistant response
    return {
      text: `Savolingiz qabul qilindi. Men do'koningiz ma'lumotlarini tahlil qila olaman:\n\n` +
            `• **Bugungi savdolar:** $${sales.filter(s => s.createdAt.startsWith(new Date().toISOString().slice(0, 10))).reduce((sum, s) => sum + s.finalAmount, 0).toFixed(2)}\n` +
            `• **Ombordagi matolar:** ${products.length} xil mato\n` +
            `• **Qarzdorlar soni:** ${customers.filter(c => c.balance < 0).length} nafar\n\n` +
            `Aniqlashtirish uchun: **"Bugungi tushum"**, **"Ombor qoldiqlari"** yoki **"Qarzdorlar"** deb yozishingiz mumkin.`,
      executedActions
    };
  }

  /**
   * AI buyrug'i bo'yicha ERP amallarini bajarish
   */
  private async dispatchLocalAction(
    name: string,
    args: any,
    handlers: {
      onSwitchTab: (tab: ViewTab) => void;
      onRefreshData: () => void;
    },
    userRole: 'superadmin' | 'admin' | 'cashier' = 'cashier'
  ): Promise<{ name: string; detail: string; status: 'success' | 'failed' }> {
    soundManager.playScanBeep();

    switch (name) {
      case 'switch_tab': {
        const tab = args.tab as ViewTab;
        handlers.onSwitchTab(tab);
        const tabNames: Record<ViewTab, string> = {
          pos: 'Kassa (Sotuv)',
          inventory: 'Ombor (Matolar)',
          debts: 'Nasiyalar (Qarzlar)',
          suppliers: 'Ta\'minotchilar (Fabrikalar)',
          expenses: 'Xarajatlar',
          reports: 'Hisobotlar',
          settings: 'Sozlamalar'
        };
        return {
          name: 'switch_tab',
          detail: `"${tabNames[tab] || tab}" bo'limiga o'tildi.`,
          status: 'success'
        };
      }

      case 'add_product': {
        const p = AppDatabase.saveProduct({
          name: args.name,
          category: args.category || 'Kulevka / Supren',
          color: args.color || 'Qora',
          density: args.density || '180 gr/m²',
          rolls: Number(args.rolls) || 1,
          stock: Number(args.stock) || 25,
          buyPrice: Number(args.buyPrice) || 5.0,
          sellPrice: Number(args.sellPrice) || (Number(args.buyPrice) * 1.25),
          storeId: args.storeId || AppDatabase.getDeviceStoreId(),
        });
        handlers.onRefreshData();
        soundManager.playSuccessSound();
        return {
          name: 'add_product',
          detail: `Omborga yangi mato qo'shildi: ${p.name} (${p.stock} kg, $${p.sellPrice})`,
          status: 'success'
        };
      }

      case 'get_inventory_status': {
        const prods = AppDatabase.getProducts('all');
        const low = prods.filter(p => p.stock <= p.minStock);
        const totalKg = prods.reduce((sum, p) => sum + p.stock, 0);
        return {
          name: 'get_inventory_status',
          detail: `Omborda jami ${prods.length} xil mato (${totalKg.toFixed(1)} kg) mavjud. Kam qolgan matolar: ${low.length} xil.`,
          status: 'success'
        };
      }

      case 'get_sales_analytics': {
        const sales = AppDatabase.getSales('all');
        const todayStr = new Date().toISOString().slice(0, 10);
        const todaySales = sales.filter(s => s.createdAt.startsWith(todayStr));
        const totalAmount = todaySales.reduce((sum, s) => sum + s.finalAmount, 0);
        const totalProfit = todaySales.reduce((sum, s) => sum + s.profit, 0);
        return {
          name: 'get_sales_analytics',
          detail: `Bugungi savdolar: ${todaySales.length} ta chek, jami tushum: $${totalAmount.toFixed(2)}, sof foyda: $${totalProfit.toFixed(2)}.`,
          status: 'success'
        };
      }

      case 'record_expense': {
        const exp = AppDatabase.addExpense({
          category: args.category || 'Boshqa xarajat',
          amount: Number(args.amount) || 0,
          paymentMethod: args.paymentMethod || 'cash',
          description: args.description || 'AI orqali yozildi',
          date: new Date().toISOString(),
          storeId: AppDatabase.getDeviceStoreId(),
        });
        handlers.onRefreshData();
        return {
          name: 'record_expense',
          detail: `Xarajat yozildi: ${exp.category} ($${exp.amount.toFixed(2)})`,
          status: 'success'
        };
      }

      case 'get_debt_summary': {
        const custs = AppDatabase.getCustomers('all');
        const sups = AppDatabase.getSuppliers();
        const totalCustDebt = custs.filter(c => c.balance < 0).reduce((sum, c) => sum + Math.abs(c.balance), 0);
        const totalSupDebt = sups.reduce((sum, s) => sum + s.balance, 0);
        return {
          name: 'get_debt_summary',
          detail: `Mijozlardan olinadigan qarzlar: $${totalCustDebt.toFixed(2)}. Biz ta'minotchilardan qarzdormiz: $${totalSupDebt.toFixed(2)}.`,
          status: 'success'
        };
      }

      default:
        return {
          name,
          detail: `Noma'lum amal: ${name}`,
          status: 'failed'
        };
    }
  }
}

export const aiAgentService = new AiAgentService();
