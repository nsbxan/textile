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
  Copy,
  FileSpreadsheet,
  Server,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  FileText,
  Users,
  UserPlus,
  Search,
  User,
  Plus,
  X,
  Shield
} from 'lucide-react';
import { StoreSettings, AiConfig, TelegramConfig, TelegramRecipient, SupabaseConfig, GoogleSheetsClientConfig } from '../types';
import { AppDatabase, DEFAULT_STORES } from '../db';
import { aiAgentService, DEFAULT_AI_CONFIG } from '../services/aiAgentService';
import { telegramService } from '../services/telegramService';
import { cloudDb, SUPABASE_SQL_SETUP } from '../services/supabase';
import { googleSheetsClient } from '../services/googleSheetsClient';
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
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>(
    settings.telegramConfig || telegramService.getConfig()
  );
  const [telegramTesting, setTelegramTesting] = useState(false);
  const [telegramTestResult, setTelegramTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Telegram Multi-user state
  const [showAddTgUserModal, setShowAddTgUserModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanningUsers, setScanningUsers] = useState(false);
  const [scannedUsers, setScannedUsers] = useState<Array<{ chatId: string; name: string; username?: string; lastMessage?: string; date?: string }>>([]);
  const [scanMessage, setScanMessage] = useState<string>('');
  const [testingUserId, setTestingUserId] = useState<string | null>(null);
  const [userTestMessage, setUserTestMessage] = useState<{ id: string; success: boolean; message: string } | null>(null);

  // New recipient form state
  const [newTgUser, setNewTgUser] = useState<{
    name: string;
    chatId: string;
    role: 'admin' | 'manager' | 'cashier' | 'observer';
    notifyOnSale: boolean;
    notifyOnDebtPayment: boolean;
  }>({
    name: '',
    chatId: '',
    role: 'manager',
    notifyOnSale: true,
    notifyOnDebtPayment: true,
  });

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

  // Google Sheets & Backend API state
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsClientConfig>(
    settings.googleSheetsConfig || googleSheetsClient.getConfig()
  );
  const [sheetsTesting, setSheetsTesting] = useState(false);
  const [sheetsTestResult, setSheetsTestResult] = useState<{ success: boolean; message: string; latencyMs?: number; details?: any } | null>(null);
  const [sheetsInitializing, setSheetsInitializing] = useState(false);
  const [sheetsInitResult, setSheetsInitResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  const [sheetsExporting, setSheetsExporting] = useState(false);
  const [sheetsExportResult, setSheetsExportResult] = useState<{ success: boolean; message: string; counts?: any } | null>(null);
  const [sheetsImporting, setSheetsImporting] = useState(false);
  const [sheetsImportResult, setSheetsImportResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);
  const [showSheetsGuide, setShowSheetsGuide] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    aiAgentService.saveConfig(aiConfig);
    telegramService.saveConfig(telegramConfig);
    cloudDb.saveConfig(supabaseConfig);
    googleSheetsClient.saveConfig(sheetsConfig);
    const updatedSettings: StoreSettings = {
      ...formData,
      currentStoreId: 'store_1',
      stores: DEFAULT_STORES,
      aiConfig,
      telegramConfig,
      supabaseConfig,
      googleSheetsConfig: sheetsConfig,
    };
    AppDatabase.saveSettings(updatedSettings);
    onUpdateSettings(updatedSettings);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleTestGoogleSheets = async () => {
    setSheetsTesting(true);
    setSheetsTestResult(null);
    try {
      googleSheetsClient.saveConfig(sheetsConfig);
      const res = await googleSheetsClient.testConnection();
      setSheetsTestResult(res);
    } finally {
      setSheetsTesting(false);
    }
  };

  const handleInitGoogleSheets = async () => {
    setSheetsInitializing(true);
    setSheetsInitResult(null);
    try {
      googleSheetsClient.saveConfig(sheetsConfig);
      const res = await googleSheetsClient.initializeSheets();
      setSheetsInitResult(res);
    } finally {
      setSheetsInitializing(false);
    }
  };

  const handleExportToSheets = async () => {
    if (!window.confirm("Barcha tovarlar, savdolar, mijozlar va xarajatlar Google Sheets bazasiga yuklanadi. Davom etasizmi?")) {
      return;
    }
    setSheetsExporting(true);
    setSheetsExportResult(null);
    try {
      googleSheetsClient.saveConfig(sheetsConfig);
      const [products, sales, customers, suppliers, expenses, debtTransactions] = await Promise.all([
        AppDatabase.getProducts(),
        AppDatabase.getSales(),
        AppDatabase.getCustomers(),
        AppDatabase.getSuppliers(),
        AppDatabase.getExpenses(),
        AppDatabase.getDebtTransactions(),
      ]);

      const res = await googleSheetsClient.exportAllToSheets({
        products,
        sales,
        customers,
        suppliers,
        expenses,
        debtTransactions,
      });
      setSheetsExportResult(res);
    } finally {
      setSheetsExporting(false);
    }
  };

  const handleImportFromSheets = async () => {
    if (!window.confirm("Google Sheets dagi tovarlar, mijozlar va xarajatlar dasturingizga yuklab olinadi va mavjudlari yangilanadi. Davom etasizmi?")) {
      return;
    }
    setSheetsImporting(true);
    setSheetsImportResult(null);
    try {
      googleSheetsClient.saveConfig(sheetsConfig);
      const res = await googleSheetsClient.importAllFromSheets();
      setSheetsImportResult(res);
      if (res.success && res.data) {
        if (res.data.products && Array.isArray(res.data.products)) {
          for (const p of res.data.products) {
            await AppDatabase.saveProduct(p);
          }
        }
        if (res.data.customers && Array.isArray(res.data.customers)) {
          for (const c of res.data.customers) {
            await AppDatabase.saveCustomer(c);
          }
        }
        if (res.data.expenses && Array.isArray(res.data.expenses)) {
          for (const exp of res.data.expenses) {
            await AppDatabase.addExpense(exp);
          }
        }
        if (res.data.suppliers && Array.isArray(res.data.suppliers)) {
          for (const sup of res.data.suppliers) {
            await AppDatabase.saveSupplier(sup);
          }
        }
        onRefreshAll();
      }
    } finally {
      setSheetsImporting(false);
    }
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
    if (!telegramConfig.botToken.trim()) {
      alert("Iltimos, avval Telegram Bot Tokenini kiriting!");
      return;
    }
    setTelegramTesting(true);
    setTelegramTestResult(null);
    try {
      telegramService.saveConfig(telegramConfig);
      const res = await telegramService.testAllConnections(telegramConfig.botToken);
      setTelegramTestResult(res);
      if (res.success) {
        soundManager.playSuccessSound();
      }
    } finally {
      setTelegramTesting(false);
    }
  };

  const handleAddTgUser = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTgUser.name.trim() || !newTgUser.chatId.trim()) {
      alert("Iltimos, foydalanuvchi ismi va Telegram Chat ID sini kiriting!");
      return;
    }
    telegramService.addRecipient({
      name: newTgUser.name.trim(),
      chatId: newTgUser.chatId.trim(),
      role: newTgUser.role,
      enabled: true,
      notifyOnSale: newTgUser.notifyOnSale,
      notifyOnDebtPayment: newTgUser.notifyOnDebtPayment,
    });
    setTelegramConfig(telegramService.getConfig());
    setNewTgUser({
      name: '',
      chatId: '',
      role: 'manager',
      notifyOnSale: true,
      notifyOnDebtPayment: true,
    });
    setShowAddTgUserModal(false);
    soundManager.playSuccessSound();
  };

  const handleRemoveTgUser = (id: string, name: string) => {
    if (!window.confirm(`Haqiqatdan ham "${name}" ni Telegram xabarnomalaridan o'chirmoqchimisiz?`)) {
      return;
    }
    telegramService.removeRecipient(id);
    setTelegramConfig(telegramService.getConfig());
  };

  const handleToggleTgUser = (id: string, field: 'enabled' | 'notifyOnSale' | 'notifyOnDebtPayment') => {
    const recipients = telegramConfig.recipients || [];
    const target = recipients.find(r => r.id === id);
    if (!target) return;
    telegramService.updateRecipient(id, {
      [field]: !target[field]
    });
    setTelegramConfig(telegramService.getConfig());
  };

  const handleTestRecipient = async (recipient: TelegramRecipient) => {
    setTestingUserId(recipient.id);
    setUserTestMessage(null);
    try {
      const res = await telegramService.testConnection(
        telegramConfig.botToken,
        recipient.chatId,
        recipient.name
      );
      setUserTestMessage({
        id: recipient.id,
        success: res.success,
        message: res.message
      });
      if (res.success) {
        soundManager.playSuccessSound();
      }
    } finally {
      setTestingUserId(null);
    }
  };

  const handleScanBotUsers = async () => {
    if (!telegramConfig.botToken.trim()) {
      alert("Avval Telegram Bot Tokenini kiriting!");
      return;
    }
    setScanningUsers(true);
    setScanMessage('');
    try {
      const res = await telegramService.fetchBotUpdates(telegramConfig.botToken);
      setScannedUsers(res.users);
      setScanMessage(res.message || '');
      setShowScanModal(true);
    } finally {
      setScanningUsers(false);
    }
  };

  const handleQuickAddScannedUser = (user: { chatId: string; name: string; username?: string }) => {
    telegramService.addRecipient({
      name: user.name + (user.username ? ` (@${user.username})` : ''),
      chatId: user.chatId,
      username: user.username,
      role: 'cashier',
      enabled: true,
      notifyOnSale: true,
      notifyOnDebtPayment: true,
    });
    setTelegramConfig(telegramService.getConfig());
    soundManager.playSuccessSound();
    setScannedUsers(prev => prev.filter(u => u.chatId !== user.chatId));
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
                      <span>Telegram Chat ID (yoki bir nechta: 12345, 67890)</span>
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
                    placeholder="Masalan: 7239051384, 123456789..."
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
                    <span>{telegramTesting ? "Yuborilmoqda..." : "Umumiy Test Xabari"}</span>
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

              {/* ---------------------------------------------------------------- */}
              {/* TELEGRAM RECIPIENTS / USERS MANAGEMENT SECTION */}
              {/* ---------------------------------------------------------------- */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Xabar Boradigan Foydalanuvchilar (Userlar)</span>
                        <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-600 dark:text-sky-400 text-[10px] font-bold">
                          {(telegramConfig.recipients || []).length} ta user
                        </span>
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Do'kon egalari, filial menejerlari va kassirlarni botga ulab, savdo xabarlarini ulashish
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleScanBotUsers}
                      disabled={scanningUsers}
                      className="px-3 py-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 text-[11px] font-bold flex items-center gap-1.5 transition-all interactive-press disabled:opacity-50"
                      title="Botga /start bosgan foydalanuvchilarni avtomatik qidirish"
                    >
                      <Search className={`w-3.5 h-3.5 ${scanningUsers ? 'animate-spin' : ''}`} />
                      <span>{scanningUsers ? "Qidirilmoqda..." : "Botdan Izlash (Auto)"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowAddTgUserModal(true)}
                      className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm shadow-sky-500/20 transition-all interactive-press"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Yangi User Qo'shish</span>
                    </button>
                  </div>
                </div>

                {/* Direct Bot Link helper */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200/60 dark:border-sky-900/30 text-[11px]">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Bot className="w-4 h-4 text-sky-500 shrink-0" />
                    <span>
                      Yangi xodim botga ulanishi uchun Telegramda <b>@textileprouzbot</b> ga kirib <b>Start</b> bosishi kifoya!
                    </span>
                  </div>
                  <a
                    href="https://t.me/textileprouzbot"
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-sky-500 text-white font-bold text-[10px] flex items-center gap-1 shrink-0 hover:bg-sky-600 transition-all"
                  >
                    <span>Botni Ochish</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* SCAN MODAL / AUTO DISCOVER PANEL */}
                {showScanModal && (
                  <div className="p-3.5 rounded-2xl bg-slate-900 text-white border border-sky-500/40 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-sky-400" />
                        <span className="text-xs font-bold text-white">
                          Botga yozgan yangi foydalanuvchilar
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleScanBotUsers}
                          disabled={scanningUsers}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 text-[10px] font-bold flex items-center gap-1"
                        >
                          <RefreshCw className={`w-3 h-3 ${scanningUsers ? 'animate-spin' : ''}`} />
                          <span>Qayta tekshirish</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowScanModal(false)}
                          className="text-slate-400 hover:text-white p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {scannedUsers.length === 0 ? (
                      <div className="py-4 text-center text-xs text-slate-400 space-y-2">
                        <p>{scanMessage || "Hozircha botga yangi xabar yozgan foydalanuvchilar topilmadi."}</p>
                        <p className="text-[11px] text-sky-300">
                          💡 Xodim telefonida Telegramni ochib, <b>@textileprouzbot</b> ga <b>/start</b> bossin va bu yerdagi "Qayta tekshirish" tugmasini bosing!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {scannedUsers.map((u) => {
                          const isAlreadyAdded = (telegramConfig.recipients || []).some(r => r.chatId === u.chatId);
                          return (
                            <div
                              key={u.chatId}
                              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 hover:border-sky-500/50 transition-all text-xs"
                            >
                              <div className="space-y-0.5">
                                <div className="font-bold text-white flex items-center gap-2">
                                  <span>{u.name}</span>
                                  {u.username && (
                                    <span className="text-[10px] text-sky-400 font-mono">@{u.username}</span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-2 font-mono">
                                  <span>ID: {u.chatId}</span>
                                  {u.lastMessage && <span>• Xabar: "{u.lastMessage}"</span>}
                                </div>
                              </div>

                              <div>
                                {isAlreadyAdded ? (
                                  <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                                    ✓ Ro'yxatda bor
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleQuickAddScannedUser(u)}
                                    className="px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-bold text-[11px] flex items-center gap-1 transition-all interactive-press"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Qo'shish</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ADD USER FORM / DRAWER */}
                {showAddTgUserModal && (
                  <div className="p-4 rounded-2xl glass-card border border-sky-500/40 bg-sky-50/50 dark:bg-sky-950/20 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between border-b border-sky-500/20 pb-2">
                      <h5 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-sky-500" />
                        <span>Yangi Telegram Foydalanuvchisini Qo'shish</span>
                      </h5>
                      <button
                        type="button"
                        onClick={() => setShowAddTgUserModal(false)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Foydalanuvchi Ismi / Nomi *
                        </label>
                        <input
                          type="text"
                          required
                          value={newTgUser.name}
                          onChange={(e) => setNewTgUser({ ...newTgUser, name: e.target.value })}
                          placeholder="Masalan: Jamshid (Kassir)"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-sky-500"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            Telegram Chat ID *
                          </label>
                          <a
                            href="https://t.me/userinfobot"
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-sky-600 dark:text-sky-400 font-bold hover:underline"
                          >
                            @userinfobot
                          </a>
                        </div>
                        <input
                          type="text"
                          required
                          value={newTgUser.chatId}
                          onChange={(e) => setNewTgUser({ ...newTgUser, chatId: e.target.value.trim() })}
                          placeholder="Masalan: 7239051384"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Vazifasi / Roli
                        </label>
                        <select
                          value={newTgUser.role}
                          onChange={(e) => setNewTgUser({ ...newTgUser, role: e.target.value as any })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-sky-500"
                        >
                          <option value="admin">Rahbar / Admin</option>
                          <option value="manager">Menejer</option>
                          <option value="cashier">Kassir / Sotuvchi</option>
                          <option value="observer">Kuzatuvchi</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={newTgUser.notifyOnSale}
                            onChange={(e) => setNewTgUser({ ...newTgUser, notifyOnSale: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-0 cursor-pointer"
                          />
                          <span>Savdolar (Har bir chek)</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={newTgUser.notifyOnDebtPayment}
                            onChange={(e) => setNewTgUser({ ...newTgUser, notifyOnDebtPayment: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-0 cursor-pointer"
                          />
                          <span>Qarz to'lovlari</span>
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowAddTgUserModal(false)}
                          className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                        >
                          Bekor qilish
                        </button>
                        <button
                          type="button"
                          onClick={handleAddTgUser}
                          className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-sm transition-all interactive-press"
                        >
                          Foydalanuvchini Saqlash
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* USER TEST RESULT NOTIFICATION */}
                {userTestMessage && (
                  <div className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in ${
                    userTestMessage.success
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300'
                  }`}>
                    <div className="flex items-center gap-2">
                      {userTestMessage.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                      <span>{userTestMessage.message}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUserTestMessage(null)}
                      className="text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* RECIPIENTS CARDS LIST */}
                <div className="space-y-2">
                  {(telegramConfig.recipients || []).length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
                      <p className="font-bold text-slate-700 dark:text-slate-300">Hozircha qo'shimcha foydalanuvchilar yo'q</p>
                      <p>Yuqoridagi <b>"+ Yangi User Qo'shish"</b> yoki <b>"Botdan Izlash"</b> tugmasi orqali xodimlaringizni qo'shing.</p>
                    </div>
                  ) : (
                    (telegramConfig.recipients || []).map((recipient) => {
                      const roleBadge = recipient.role === 'admin'
                        ? { label: 'Rahbar', color: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30' }
                        : recipient.role === 'manager'
                        ? { label: 'Menejer', color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' }
                        : recipient.role === 'cashier'
                        ? { label: 'Kassir', color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' }
                        : { label: 'Kuzatuvchi', color: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30' };

                      const isTestingThis = testingUserId === recipient.id;

                      return (
                        <div
                          key={recipient.id}
                          className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            recipient.enabled
                              ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                              : 'bg-slate-100/60 dark:bg-slate-800/20 border-slate-200 dark:border-slate-800 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-xs shrink-0">
                              {recipient.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                  {recipient.name}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${roleBadge.color}`}>
                                  {roleBadge.label}
                                </span>
                                {recipient.username && (
                                  <span className="text-[10px] text-sky-500 font-mono">@{recipient.username}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                <span>Chat ID: <code>{recipient.chatId}</code></span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(recipient.chatId);
                                    alert(`Chat ID nusxalandi: ${recipient.chatId}`);
                                  }}
                                  className="text-slate-400 hover:text-sky-500 p-0.5"
                                  title="Chat ID nusxalash"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 flex-wrap sm:justify-end">
                            {/* Notification Pills */}
                            <button
                              type="button"
                              onClick={() => handleToggleTgUser(recipient.id, 'notifyOnSale')}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                                recipient.notifyOnSale
                                  ? 'bg-sky-500/15 border-sky-500/30 text-sky-600 dark:text-sky-400'
                                  : 'bg-slate-200/50 dark:bg-slate-700/50 border-transparent text-slate-400 line-through'
                              }`}
                              title="Savdolar xabarnomasini yoqish/o'chirish"
                            >
                              🛍️ Savdolar
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleTgUser(recipient.id, 'notifyOnDebtPayment')}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                                recipient.notifyOnDebtPayment
                                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-slate-200/50 dark:bg-slate-700/50 border-transparent text-slate-400 line-through'
                              }`}
                              title="Qarz to'lovlari xabarnomasini yoqish/o'chirish"
                            >
                              💸 Qarzlar
                            </button>

                            {/* Active switch */}
                            <label className="relative inline-flex items-center cursor-pointer" title={recipient.enabled ? "Faol" : "O'chiq"}>
                              <input
                                type="checkbox"
                                checked={recipient.enabled}
                                onChange={() => handleToggleTgUser(recipient.id, 'enabled')}
                                className="sr-only peer"
                              />
                              <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500"></div>
                            </label>

                            {/* Test individual recipient */}
                            <button
                              type="button"
                              onClick={() => handleTestRecipient(recipient)}
                              disabled={isTestingThis || !telegramConfig.botToken}
                              className="px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 text-[10px] font-bold flex items-center gap-1 transition-all interactive-press disabled:opacity-50"
                              title="Shu foydalanuvchiga test xabar yuborish"
                            >
                              <Send className={`w-3 h-3 ${isTestingThis ? 'animate-spin' : ''}`} />
                              <span>{isTestingThis ? "..." : "Test"}</span>
                            </button>

                            {/* Delete button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveTgUser(recipient.id, recipient.name)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                              title="O'chirish"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
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

          {/* GOOGLE SHEETS BAZA & SERVER API (GOOGLE SERVICE ACCOUNT) */}
          <div className="p-5 rounded-2xl glass-card border border-teal-500/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-teal-500/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-600 border border-teal-500 flex items-center justify-center text-white">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Google Sheets Baza & Secure Server API</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/30">
                      Google Service Account
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Barcha tovarlar, savdolar, qarzlar va xarajatlar to'g'ridan-to'g'ri Google Sheets jadvaliga xavfsiz Server API orqali yoziladi va saqlanadi.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => googleSheetsClient.openGoogleSheet()}
                  className="px-2.5 py-1 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-700 dark:text-teal-300 text-[11px] font-bold flex items-center gap-1.5 transition-all interactive-press shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Jadvalni Ochish</span>
                </button>
              </div>
            </div>

            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Google Sheet ID */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-teal-500" />
                      <span>Google Sheet ID</span>
                    </label>
                    <span className="text-[10px] text-slate-400">docs.google.com/spreadsheets/d/...</span>
                  </div>
                  <input
                    type="text"
                    value={sheetsConfig.sheetId || ''}
                    onChange={(e) => setSheetsConfig({ ...sheetsConfig, sheetId: e.target.value.trim() })}
                    placeholder="Masalan: 1a2B3c4D5e6F7g8H9i..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* API Server URL */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-teal-500" />
                      <span>API Server URL (Vercel)</span>
                    </label>
                    <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">Bo'sh qolsa: /api</span>
                  </div>
                  <input
                    type="text"
                    value={sheetsConfig.apiUrl || ''}
                    onChange={(e) => setSheetsConfig({ ...sheetsConfig, apiUrl: e.target.value.trim() })}
                    placeholder="O'z saytingizda bo'lsa bo'sh qoldiring (yoki https://...)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* API Secret Key */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-teal-500" />
                      <span>API Xavfsizlik Kaliti (Ixtiyoriy)</span>
                    </label>
                    <span className="text-[10px] text-slate-400">API_SECRET_KEY</span>
                  </div>
                  <input
                    type="password"
                    value={sheetsConfig.apiKey || ''}
                    onChange={(e) => setSheetsConfig({ ...sheetsConfig, apiKey: e.target.value.trim() })}
                    placeholder="Serverda sozlagan maxfiy tokeningiz"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* Auto Sync Toggle */}
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <input
                    type="checkbox"
                    id="sheets-autosync"
                    checked={sheetsConfig.autoSync}
                    onChange={(e) => setSheetsConfig({ ...sheetsConfig, autoSync: e.target.checked })}
                    className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500 cursor-pointer"
                  />
                  <label htmlFor="sheets-autosync" className="text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                    Avtomatik doimiy sinxronizatsiya (Har bir yangi savdo va tushumni Google Sheetsga yozish)
                  </label>
                </div>
              </div>

              {/* Action Buttons: Test Connection, Init Sheets, Export All, Import All */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleTestGoogleSheets}
                  disabled={sheetsTesting}
                  className="py-2.5 px-3 rounded-xl border border-teal-500/40 bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all interactive-press disabled:opacity-50"
                >
                  <Server className={`w-3.5 h-3.5 ${sheetsTesting ? 'animate-spin' : ''}`} />
                  <span>{sheetsTesting ? "Tekshirilmoqda..." : "Ulanishni Sinash"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleInitGoogleSheets}
                  disabled={sheetsInitializing}
                  className="py-2.5 px-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all interactive-press disabled:opacity-50"
                >
                  <FileSpreadsheet className={`w-3.5 h-3.5 ${sheetsInitializing ? 'animate-spin' : ''}`} />
                  <span>{sheetsInitializing ? "Yaratilmoqda..." : "Jadvallarni Sozlash"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportToSheets}
                  disabled={sheetsExporting}
                  className="py-2.5 px-3 rounded-xl border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all interactive-press disabled:opacity-50"
                >
                  <UploadCloud className={`w-3.5 h-3.5 ${sheetsExporting ? 'animate-spin' : ''}`} />
                  <span>{sheetsExporting ? "Yuklanmoqda..." : "Sheetsga Yuklash"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleImportFromSheets}
                  disabled={sheetsImporting}
                  className="py-2.5 px-3 rounded-xl border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all interactive-press disabled:opacity-50"
                >
                  <DownloadCloud className={`w-3.5 h-3.5 ${sheetsImporting ? 'animate-spin' : ''}`} />
                  <span>{sheetsImporting ? "Yuklanmoqda..." : "Sheetsdan Tiklash"}</span>
                </button>
              </div>

              {/* Status Message Panels */}
              {sheetsTestResult && (
                <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
                  sheetsTestResult.success
                    ? 'bg-teal-500/15 border border-teal-500/30 text-teal-800 dark:text-teal-200'
                    : 'bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300'
                }`}>
                  {sheetsTestResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-teal-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />}
                  <span>{sheetsTestResult.message}</span>
                  {sheetsTestResult.latencyMs && (
                    <span className="text-[10px] font-mono opacity-75 ml-auto">({sheetsTestResult.latencyMs} ms)</span>
                  )}
                </div>
              )}

              {sheetsInitResult && (
                <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
                  sheetsInitResult.success
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
                    : 'bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300'
                }`}>
                  {sheetsInitResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />}
                  <span>{sheetsInitResult.message}</span>
                </div>
              )}

              {sheetsExportResult && (
                <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
                  sheetsExportResult.success
                    ? 'bg-blue-500/15 border border-blue-500/30 text-blue-800 dark:text-blue-200'
                    : 'bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300'
                }`}>
                  {sheetsExportResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />}
                  <span>{sheetsExportResult.message}</span>
                  {sheetsExportResult.counts && (
                    <span className="text-[10px] font-mono opacity-80 ml-auto">
                      (Tovarlar: {sheetsExportResult.counts.products}, Savdolar: {sheetsExportResult.counts.sales})
                    </span>
                  )}
                </div>
              )}

              {sheetsImportResult && (
                <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
                  sheetsImportResult.success
                    ? 'bg-purple-500/15 border border-purple-500/30 text-purple-800 dark:text-purple-200'
                    : 'bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300'
                }`}>
                  {sheetsImportResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-purple-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />}
                  <span>{sheetsImportResult.message}</span>
                </div>
              )}

              {/* Instructions Guide toggle */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowSheetsGuide(prev => !prev)}
                  className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{showSheetsGuide ? "Google Service Account qo'llanmasini yashirish" : "Google Sheets & Service Account o'rnatish qo'llanmasini ko'rish"}</span>
                </button>

                {showSheetsGuide && (
                  <div className="mt-2.5 p-4 rounded-xl bg-slate-900 border border-teal-500/30 text-slate-300 text-xs space-y-2 animate-in fade-in">
                    <p className="font-bold text-teal-400 text-sm">Google Sheets va Google Service Account ulash bo'yicha 4 qadam:</p>
                    <ol className="list-decimal pl-4 space-y-1.5 text-[11px] leading-relaxed">
                      <li>
                        <strong>Google Cloud Console</strong> (<a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-teal-400 underline">console.cloud.google.com</a>) ga kiring va yangi loyiha (Project) oching.
                      </li>
                      <li>
                        <strong>APIs & Services ➡️ Library</strong> bo'limidan <strong>Google Sheets API</strong> ni qidiring va <em>Enable</em> (Yoqish) tugmasini bosing.
                      </li>
                      <li>
                        <strong>IAM & Admin ➡️ Service Accounts</strong> bo'limiga o'ting, <em>Create Service Account</em> qiling. Yaratilgan hisobning <em>Keys</em> bo'limiga kirib <em>Add Key ➡️ JSON</em> formatida xususiy kalitni yuklab oling.
                      </li>
                      <li>
                        Yangi Google Sheets jadval yarating va uning yuqori o'ng burchagidagi <strong>Share (Поделиться)</strong> tugmasini bosib, Service Account elektron pochtasini (masalan: <code>xyz@project.iam.gserviceaccount.com</code>) <strong>Editor (Tahrirlovchi)</strong> qilib qo'shing.
                      </li>
                      <li>
                        Vercel yoki serveringizning <strong>Environment Variables</strong> bo'limiga <code>GOOGLE_SHEET_ID</code>, <code>GOOGLE_SERVICE_ACCOUNT_EMAIL</code>, va <code>GOOGLE_PRIVATE_KEY</code> ni kiriting.
                      </li>
                    </ol>
                  </div>
                )}
              </div>
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
