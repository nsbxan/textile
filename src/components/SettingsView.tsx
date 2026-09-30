import React, { useState } from 'react';
import { 
  Settings, 
  Store, 
  Printer, 
  Volume2, 
  Save, 
  Check, 
  Download, 
  Upload, 
  ShieldCheck, 
  Crown,
  Bot,
  Sparkles,
  Key,
  ExternalLink,
  Trash2,
  Send,
  Bell,
  CheckCircle2,
  AlertCircle,
  Globe,
  Database,
  Cloud,
  Copy
} from 'lucide-react';
import { StoreSettings, AiConfig, TelegramConfig, SupabaseConfig } from '../types';
import { AppDatabase, DEFAULT_STORES } from '../db';
import { aiAgentService, DEFAULT_AI_CONFIG } from '../services/aiAgentService';
import { telegramService } from '../services/telegramService';
import { cloudDb, SUPABASE_SQL_SETUP } from '../services/supabase';
import { AppLanguage } from '../utils/i18n';
import { soundManager } from '../utils/sound';

interface SettingsViewProps {
  settings: StoreSettings;
  onUpdateSettings: (s: StoreSettings) => void;
  onRefreshAll: () => void;
  isLargeText: boolean;
  deviceStoreId?: string;
  onUpdateDeviceStoreId?: (id: string) => void;
  language: AppLanguage;
  onChangeLanguage: (lang: AppLanguage) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onRefreshAll,
  isLargeText,
  language,
  onChangeLanguage,
}) => {
  const [formData, setFormData] = useState<StoreSettings>({ 
    ...settings,
    currentStoreId: 'store_1',
    stores: DEFAULT_STORES,
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  // AI Agent Config state
  const [aiConfig, setAiConfig] = useState<AiConfig>(aiAgentService.getConfig());
  const [aiTesting, setAiTesting] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Telegram Bot Config state
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>(telegramService.getConfig());
  const [telegramTesting, setTelegramTesting] = useState(false);
  const [telegramTestResult, setTelegramTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Supabase Cloud DB Config state
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(
    settings.supabaseConfig || cloudDb.getConfig()
  );
  const [supabaseTesting, setSupabaseTesting] = useState(false);
  const [supabaseTestResult, setSupabaseTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [pushingCloud, setPushingCloud] = useState(false);
  const [pushResult, setPushResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showSql, setShowSql] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    aiAgentService.saveConfig(aiConfig);
    telegramService.saveConfig(telegramConfig);
    cloudDb.saveConfig(supabaseConfig);
    const updatedSettings: StoreSettings = {
      ...formData,
      currentStoreId: 'store_1',
      stores: DEFAULT_STORES,
      aiConfig,
      telegramConfig,
      supabaseConfig,
    };
    AppDatabase.saveSettings(updatedSettings);
    onUpdateSettings(updatedSettings);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleTestSupabase = async () => {
    if (!supabaseConfig.url.trim() || !supabaseConfig.anonKey.trim()) {
      alert("Iltimos, Supabase Project URL va Anon API kalitini kiriting!");
      return;
    }
    setSupabaseTesting(true);
    setSupabaseTestResult(null);
    try {
      const res = await cloudDb.testConnection(supabaseConfig.url, supabaseConfig.anonKey);
      setSupabaseTestResult(res);
      if (res.success) {
        cloudDb.saveConfig(supabaseConfig);
      }
    } finally {
      setSupabaseTesting(false);
    }
  };

  const handlePushAllToCloud = async () => {
    if (!cloudDb.isConfigured()) {
      alert("Avval Supabase URL va API kalitni saqlang va ulanishni tekshiring!");
      return;
    }
    if (!window.confirm("Kompyuteringizdagi barcha tovarlar, savdolar va mijozlar bulutli bazaga yuklanadi. Davom etasizmi?")) {
      return;
    }
    setPushingCloud(true);
    setPushResult(null);
    try {
      const res = await cloudDb.pushAllLocalData({
        products: AppDatabase.getProducts('all'),
        sales: AppDatabase.getSales('all'),
        customers: AppDatabase.getCustomers('all'),
        suppliers: AppDatabase.getSuppliers(),
        expenses: AppDatabase.getExpenses('all'),
        debtTransactions: AppDatabase.getDebtTransactions(),
        settings: AppDatabase.getSettings(),
      });
      setPushResult(res);
    } finally {
      setPushingCloud(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SETUP);
    setCopiedSql(true);
    soundManager.playSuccessSound();
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleTestAi = async () => {
    setAiTesting(true);
    setAiTestResult(null);
    try {
      const res = await aiAgentService.testApiKey(aiConfig.apiKey, aiConfig.model);
      setAiTestResult(res);
    } finally {
      setAiTesting(false);
    }
  };

  const handleTestTelegram = async () => {
    if (!telegramConfig.botToken.trim() || !telegramConfig.chatId.trim()) {
      alert("Iltimos, avval Telegram Bot Token va Chat ID ni kiriting!");
      return;
    }
    setTelegramTesting(true);
    setTelegramTestResult(null);
    try {
      const res = await telegramService.testConnection(telegramConfig.botToken, telegramConfig.chatId);
      setTelegramTestResult(res);
    } finally {
      setTelegramTesting(false);
    }
  };

  const handleExportBackup = async () => {
    const backupJson = AppDatabase.exportFullBackup();
    
    const win = window as unknown as { electronAPI?: { saveBackup: (data: string) => Promise<{ success: boolean; filePath?: string }> } };
    if (win.electronAPI?.saveBackup) {
      const res = await win.electronAPI.saveBackup(backupJson);
      if (res.success) {
        alert(`Zaxira nusxa saqlandi: ${res.filePath}`);
        return;
      }
    }

    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Savdo_ERP_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        if (window.confirm("Barcha ma'lumotlar yangilanadi. Davom etasizmi?")) {
          const success = AppDatabase.importFullBackup(content);
          if (success) {
            alert("Ma'lumotlar bazasi zaxiradan tiklandi!");
            onRefreshAll();
          } else {
            alert("Fayl formati noto'g'ri!");
          }
        }
      }
    };
    reader.readAsText(file);
  };

  const [isClearingAll, setIsClearingAll] = useState(false);

  const handleClearAllData = async () => {
    const confirmed = window.confirm(
      "DIQQAT! Barcha matolar, savdolar, mijozlar, qarzlar va xarajatlar ham brauzerdan, ham Supabase bulutli bazasidan BUTUNLAY O'CHIRILADI.\n\nSayt va barcha ulangan qurilmalar 0 dan toza holatga keladi.\n\nHaqiqatdan ham hamma narsani o'chirib, 0 dan boshlamoqchimisiz?"
    );
    if (!confirmed) return;

    setIsClearingAll(true);
    try {
      const res = await AppDatabase.adminFullReset();
      if (res.success) {
        soundManager.playSuccessSound();
        alert("Barcha ma'lumotlar muvaffaqiyatli o'chirildi! Sayt va bulut 0 dan toza boshlandi.");
        window.location.reload();
      } else {
        alert(res.message);
      }
    } finally {
      setIsClearingAll(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-4">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between glass-panel p-4 rounded-2xl border">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Dastur va Do'kon Sozlamalari
            </h2>
          </div>

          {savedSuccess && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-black animate-in fade-in">
              <Check className="w-4 h-4" />
              <span>Saqlandi!</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Store Info Card */}
          <div className="p-5 rounded-2xl glass-card border space-y-3.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <Store className="w-4 h-4 text-blue-600" />
              <span>Do'kon Ma'lumotlari (Yagona do'kon: TEXTILE PRO)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Do'kon Nomi *</label>
                <input
                  type="text"
                  required
                  value={formData.storeName}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  placeholder="Masalan: TEXTILE PRO"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Telefon Raqami *</label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+998 90 123 45 67"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Do'kon Manzili</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Masalan: Abu Sahiy F-107"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1">
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                  <span>Super Admin PIN Kodi (Tannarxlarni ochish uchun) *</span>
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={formData.adminPin || '1234'}
                  onChange={(e) => setFormData({ ...formData, adminPin: e.target.value })}
                  placeholder="1234"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* INTERFEYS TILI (FAQAT ADMIN) */}
          <div className="p-5 rounded-2xl glass-card border border-blue-500/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-500/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 border border-blue-500 flex items-center justify-center text-white">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Dastur Tili (Interfeys Tili)</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                      Faqat Admin uchun
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Tizimning barcha bo'limlari, kassa, ombor va hisobotlar uchun asosiy til
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1" data-no-translate="true">
              {(
                [
                  { id: 'uz_lat', label: "O'zbekcha", script: "Lotin yozuvida", badge: "O'Z" },
                  { id: 'uz_cyr', label: "Ўзбекча", script: "Кирилл ёзувида", badge: "ЎЗ" },
                  { id: 'ru', label: "Русский язык", script: "На русском языке", badge: "РУ" },
                ] as const
              ).map((item) => {
                const isSelected = language === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      soundManager.playHapticClick();
                      onChangeLanguage(item.id);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all interactive-press flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-blue-600/10 dark:bg-blue-500/20 border-blue-600 dark:border-blue-500 shadow-sm ring-1 ring-blue-500/40'
                        : 'glass-card border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        isSelected 
                          ? 'bg-blue-600 text-white shadow-sm' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        {item.badge}
                      </span>
                      <div className="min-w-0">
                        <div className={`text-xs font-bold truncate ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-white'}`}>
                          {item.label}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {item.script}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Receipt Settings */}
          <div className="p-5 rounded-2xl glass-card border space-y-3.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <Printer className="w-4 h-4 text-blue-600" />
              <span>Chek va Termo-Printer</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Chek Sarlavhasi</label>
                <input
                  type="text"
                  value={formData.receiptHeader}
                  onChange={(e) => setFormData({ ...formData, receiptHeader: e.target.value })}
                  placeholder="Xaridingiz uchun rahmat!"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Printer O'lchami</label>
                <select
                  value={formData.receiptPrinterWidth}
                  onChange={(e) => setFormData({ ...formData, receiptPrinterWidth: e.target.value as '58mm' | '80mm' })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="80mm">80 mm (Standart katta termo-printer)</option>
                  <option value="58mm">58 mm (Ixcham termo-printer)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Chek Tagso'zi</label>
                <textarea
                  value={formData.receiptFooter}
                  onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
                  rows={2}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Ovoz effektlari (Skaner va savdo jaranglari):</span>
              </div>
              <input
                type="checkbox"
                checked={formData.enableSound}
                onChange={(e) => setFormData({ ...formData, enableSound: e.target.checked })}
                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
              />
            </div>
          </div>

          {/* GOOGLE GEMINI AI YORDAMCHISI SOZLAMALARI */}
          <div className="p-5 rounded-2xl glass-card border border-indigo-500/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-500/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 border border-indigo-500 flex items-center justify-center text-white">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Google Gemini AI Yordamchisi</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                      Aqlli AI Yordamchi
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    AI ga API kalit kiriting — u dasturni ovozli va matnli buyruqlar orqali boshqarishda yordam beradi
                  </p>
                </div>
              </div>

              <div className={`px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0 ${
                aiConfig.apiKey 
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
              }`}>
                {aiConfig.apiKey ? '✓ AI Kalit Ulangan' : 'Kalit kiritilmagan'}
              </div>
            </div>

            <div className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Gemini API Kalit</span>
                  </label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <span>Bepul API Kalit Olish</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={aiConfig.apiKey}
                    onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value.trim() })}
                    placeholder="AIzaSy..."
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono text-xs sm:text-sm focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleTestAi}
                    disabled={aiTesting || !aiConfig.apiKey}
                    className="px-4 py-2.5 rounded-xl border glass-card text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-indigo-500 flex items-center gap-1.5 shrink-0 interactive-press disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{aiTesting ? "Tekshirilmoqda..." : "Sinash"}</span>
                  </button>
                </div>
              </div>

              {aiTestResult && (
                <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  aiTestResult.success
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300'
                }`}>
                  <span>{aiTestResult.message}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    AI Modeli
                  </label>
                  <select
                    value={aiConfig.model}
                    onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold text-xs sm:text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="gemini-flash-lite-latest">Gemini 2.5 Flash Lite (Eng tezkor & tejamkor)</option>
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash (Tavsiya etiladi)</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash (Barqaror)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Avtomatik Bajarish</div>
                    <div className="text-[10px] text-slate-500">Buyruqlarni to'g'ridan-to'g'ri ijro etish</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={aiConfig.autoExecuteActions}
                    onChange={(e) => setAiConfig({ ...aiConfig, autoExecuteActions: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* TELEGRAM BOT BILDIRISHNOMALARI (FAQAT ADMIN) */}
          <div className="p-5 rounded-2xl glass-card border border-sky-500/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sky-500/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500 border border-sky-400 flex items-center justify-center text-white">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Telegram Bot Xabarlari</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                      Faqat Admin uchun
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Barcha bo'lgan savdolar va qarzdorlardan tushgan to'lovlar real vaqtda Telegram botingizga yuboriladi
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={telegramConfig.enabled}
                    onChange={(e) => setTelegramConfig({ ...telegramConfig, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-sky-500"></div>
                </label>
                <span className={`text-xs font-bold ${telegramConfig.enabled ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'}`}>
                  {telegramConfig.enabled ? 'Faol' : "O'chiq"}
                </span>
              </div>
            </div>

            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Bot Token */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-sky-500" />
                      <span>Telegram Bot Token</span>
                    </label>
                    <a
                      href="https://t.me/BotFather"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                    >
                      <span>@BotFather</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <input
                    type="password"
                    value={telegramConfig.botToken}
                    onChange={(e) => setTelegramConfig({ ...telegramConfig, botToken: e.target.value.trim() })}
                    placeholder="123456789:ABCdefGhIJKlmNo..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono text-xs sm:text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Chat ID */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-sky-500" />
                      <span>Admin Telegram Chat ID</span>
                    </label>
                    <a
                      href="https://t.me/userinfobot"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                    >
                      <span>ID bilish (@userinfobot)</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <input
                    type="text"
                    value={telegramConfig.chatId}
                    onChange={(e) => setTelegramConfig({ ...telegramConfig, chatId: e.target.value.trim() })}
                    placeholder="Masalan: 123456789 yoki -100..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono text-xs sm:text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Notification Toggles & Test Button */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Savdolar xabari</div>
                    <div className="text-[10px] text-slate-500">Har bir chek va sotilgan matolar</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={telegramConfig.notifyOnSale}
                    onChange={(e) => setTelegramConfig({ ...telegramConfig, notifyOnSale: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-300 text-sky-600 focus:ring-0 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Qarz to'lovlari</div>
                    <div className="text-[10px] text-slate-500">Qarzdorlardan tushgan pullar</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={telegramConfig.notifyOnDebtPayment}
                    onChange={(e) => setTelegramConfig({ ...telegramConfig, notifyOnDebtPayment: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-300 text-sky-600 focus:ring-0 cursor-pointer"
                  />
                </div>

                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={handleTestTelegram}
                    disabled={telegramTesting || !telegramConfig.botToken || !telegramConfig.chatId}
                    className="w-full py-3 rounded-xl border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-all interactive-press disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{telegramTesting ? "Yuborilmoqda..." : "Test Xabar Yuborish"}</span>
                  </button>
                </div>
              </div>

              {telegramTestResult && (
                <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  telegramTestResult.success
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300'
                }`}>
                  {telegramTestResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{telegramTestResult.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* BULUTLI BAZA (SUPABASE CLOUD DATABASE - FAQAT ADMIN) */}
          <div className="p-5 rounded-2xl glass-card border border-emerald-500/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-500/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 border border-emerald-500 flex items-center justify-center text-white">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Bulutli Baza (Supabase Cloud Database)</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      Doimiy Saqlash
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Barcha matolar, savdolar va mijozlar bulutda saqlanadi. Saytdan chiqsangiz ham, boshqa telefondan kirsangiz ham bir xil turadi.
                  </p>
                </div>
              </div>

              <div className={`px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0 ${
                supabaseConfig.url && supabaseConfig.anonKey
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
              }`}>
                {supabaseConfig.url && supabaseConfig.anonKey ? '✓ Sozlangan' : 'Ulanmagan'}
              </div>
            </div>

            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Supabase URL */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Cloud className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Supabase Project URL</span>
                    </label>
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <span>supabase.com</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <input
                    type="text"
                    value={supabaseConfig.url}
                    onChange={(e) => setSupabaseConfig({ ...supabaseConfig, url: e.target.value.trim() })}
                    placeholder="https://xyzproject.supabase.co"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Anon API Key */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Supabase Anon (Public) Key</span>
                    </label>
                    <span className="text-[10px] text-slate-500">Project API Keys</span>
                  </div>
                  <input
                    type="password"
                    value={supabaseConfig.anonKey}
                    onChange={(e) => setSupabaseConfig({ ...supabaseConfig, anonKey: e.target.value.trim() })}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Action Buttons: Test Connection & Migration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleTestSupabase}
                  disabled={supabaseTesting || !supabaseConfig.url || !supabaseConfig.anonKey}
                  className="py-2.5 px-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-all interactive-press disabled:opacity-50"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>{supabaseTesting ? "Tekshirilmoqda..." : "Ulanishni Sinash"}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePushAllToCloud}
                  disabled={pushingCloud || !cloudDb.isConfigured()}
                  className="py-2.5 px-3 rounded-xl border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-all interactive-press disabled:opacity-50"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>{pushingCloud ? "Yuklanmoqda..." : "Barcha Ma'lumotlarni Bulutga Yuklash"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSql(prev => !prev)}
                  className="py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all interactive-press"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{showSql ? "SQL Kodni Yashirish" : "Supabase SQL Jadval Kori"}</span>
                </button>
              </div>

              {supabaseTestResult && (
                <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  supabaseTestResult.success
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300'
                }`}>
                  {supabaseTestResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{supabaseTestResult.message}</span>
                </div>
              )}

              {pushResult && (
                <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  pushResult.success
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300'
                }`}>
                  {pushResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{pushResult.message}</span>
                </div>
              )}

              {showSql && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300">
                      Supabase SQL skripti (Supabase dashboard ➡️ SQL Editor'ga qo'yib 'Run' bosing):
                    </span>
                    <button
                      type="button"
                      onClick={handleCopySql}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1.5 transition-all interactive-press"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedSql ? "Nusxalandi!" : "Nusxalash (Copy)"}</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-900 rounded-lg text-[10px] font-mono text-emerald-400 overflow-x-auto max-h-48 border border-slate-800">
                    {SUPABASE_SQL_SETUP}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm shadow-lg shadow-blue-600/30 flex items-center gap-2 interactive-press"
            >
              <Save className="w-4 h-4" />
              <span>Sozlamalarni Saqlash</span>
            </button>
          </div>
        </form>

        {/* Database Backup & Maintenance */}
        <div className="p-5 rounded-2xl glass-card border space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Ma'lumotlar Zaxirasi & Boshqaruvi</span>
          </h3>

          <p className="text-xs text-slate-600 dark:text-slate-400">
            Dasturdagi barcha tovarlar, sotuvlar tarixi, mijozlar va xarajatlar brauzer va kompyuteringiz xotirasida xavfsiz saqlanadi. Har qanday vaqtda zaxira nusxa olib qo'yishingiz mumkin.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <button
              type="button"
              onClick={handleExportBackup}
              className="flex items-center justify-center gap-2 p-3 rounded-xl border glass-card text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-blue-500 transition-all interactive-press"
            >
              <Download className="w-4 h-4 text-blue-600" />
              <span>Zaxira Nusxa Olish (JSON)</span>
            </button>

            <label className="flex items-center justify-center gap-2 p-3 rounded-xl border glass-card text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-emerald-500 transition-all cursor-pointer interactive-press">
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>Zaxiradan Qayta Tiklash</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>

          </div>
        </div>

        {/* SUPER ADMIN: BARCHA MA'LUMOTLARNI 0 DAN TOZALASH (DANGER ZONE) */}
        <div className="p-5 rounded-2xl bg-rose-500/5 dark:bg-rose-950/20 border-2 border-rose-500/40 space-y-3.5">
          <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <span>Super Admin: Tizimni 0 dan Tozalash</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white uppercase tracking-wider">
                    To'liq Tozalash
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Barcha kiritilgan matolar, savdolar, qarzdorliklar va xarajatlarni bulutdan (Supabase) va barcha qurilmalardan butunlay o'chiradi
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
            Ushbu amal barcha ulangan telefon va kompyuterlardagi ma'lumotlarni ham bir zumda tozalab, tizimni yangi boshlanayotgan toza holatga keltiradi.
          </p>

          <div className="pt-1">
            <button
              type="button"
              onClick={handleClearAllData}
              disabled={isClearingAll}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition-all interactive-press disabled:opacity-50"
            >
              <Trash2 className={`w-4 h-4 ${isClearingAll ? 'animate-spin' : ''}`} />
              <span>{isClearingAll ? "Tozalanmoqda..." : "Barcha Ma'lumotlarni O'chirish va 0 dan Boshlash (Bulut + Sayt)"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
