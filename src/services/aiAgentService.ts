import { AiConfig, Product, Sale, Customer, Supplier, Expense, ViewTab } from '../types';
import { AppDatabase } from '../db';
import { soundManager } from '../utils/sound';

const AI_STORAGE_KEY = 'savdo_erp_ai_config';

export const DEFAULT_AI_CONFIG: AiConfig = {
  apiKey: 'AQ.Ab8RN6LIZ9gPlf5BBrO-z_tYGy78wtfuV_lFNWFVWcZ6zTecPQ',
  model: 'gemini-flash-lite-latest',
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
    return Boolean(this.config.apiKey && this.config.apiKey.trim().length > 10);
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
      return {
        text: isSuperAdmin
          ? "Iltimos, avval AI API kalitini kiriting. API kalitini kiritgach, men butun ERP dasturida buyruqlaringiz bo'yicha yordam bera olaman."
          : "AI xizmati hozircha faol emas. Iltimos, do'kon ma'muriga (Admin) murojaat qiling.",
        executedActions: []
      };
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
      console.error('AI Processing error:', err);
      soundManager.playErrorSound();
      return {
        text: isSuperAdmin
          ? `Xatolik yuz berdi: ${err.message || 'AI bilan bog\'lanishda uzilish'}. API kalitni tekshirib ko'ring.`
          : "AI xizmati bilan bog'lanishda vaqtinchalik uzilish yuz berdi. Iltimos, keyinroq qayta urinib ko'ring.",
        executedActions
      };
    }
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
