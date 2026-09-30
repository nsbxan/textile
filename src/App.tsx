import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { PosView } from './components/PosView';
import { InventoryView } from './components/InventoryView';
import { DebtsView } from './components/DebtsView';
import { SuppliersView } from './components/SuppliersView';
import { ExpensesView } from './components/ExpensesView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { ReceiptModal } from './components/ReceiptModal';
import { BarcodeGeneratorModal } from './components/BarcodeGeneratorModal';
import { AdminPinModal } from './components/AdminPinModal';
import { AiControllerModal } from './components/AiControllerModal';
import { LoginScreen } from './components/LoginScreen';
import { ViewTab, Product, Customer, Supplier, Sale, Expense, StoreSettings, UserRole, StoreFilterId, AppUserSession } from './types';
import { AppDatabase } from './db';
import { cloudDb } from './services/supabase';
import { soundManager } from './utils/sound';
import { AppLanguage, getSavedLanguage, setSavedLanguage, applyDomTranslations, setupLanguageObserver } from './utils/i18n';

export function App() {
  // Eski demo/kesh ma'lumotlarni to'liq yo'q qilish (v1 dan v2 ga toza o'tish)
  try {
    ['products', 'sales', 'customers', 'suppliers', 'expenses', 'debt_transactions', 'supply_orders'].forEach(k => {
      localStorage.removeItem('savdo_erp_' + k);
    });
  } catch {}

  const [currentTab, setCurrentTab] = useState<ViewTab>('pos');
  
  // Theme state: 'dark' | 'light'
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('savdo_erp_theme') as 'dark' | 'light') || 'dark';
  });

  // Large font toggle for older eyes
  const [isLargeText, setIsLargeText] = useState<boolean>(() => {
    return localStorage.getItem('savdo_erp_largetext') === 'true';
  });

  // Language state: 'uz_lat' | 'uz_cyr' | 'ru'
  const [language, setLanguage] = useState<AppLanguage>(() => getSavedLanguage());
  const languageRef = React.useRef<AppLanguage>(language);
  languageRef.current = language;

  const handleChangeLanguage = (newLang: AppLanguage) => {
    setLanguage(newLang);
    setSavedLanguage(newLang);
    languageRef.current = newLang;
    applyDomTranslations(document.body, newLang);
  };

  useEffect(() => {
    const cleanup = setupLanguageObserver(() => languageRef.current);
    return cleanup;
  }, []);


  // Terminal (Kompyuter) Do'koni va Multi-Store Filter
  const [deviceStoreId, setDeviceStoreId] = useState<string>(AppDatabase.getDeviceStoreId());
  const [storeFilter, setStoreFilter] = useState<StoreFilterId>('store_1');

  // App Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(AppDatabase.getSettings());

  // Active Modals
  const [activeReceiptSale, setActiveReceiptSale] = useState<Sale | null>(null);
  const [activeBarcodeProduct, setActiveBarcodeProduct] = useState<Product | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Authentication Session (Ism, Tel, Email, Mahfiy kod: Sh_909367577)
  const [userSession, setUserSession] = useState<AppUserSession | null>(() => {
    try {
      const saved = localStorage.getItem('savdo_erp_user_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLoginSuccess = (session: AppUserSession) => {
    setUserSession(session);
    localStorage.setItem('savdo_erp_user_session', JSON.stringify(session));
    setUserRole(session.role);
    setStoreFilter('store_1');
  };

  const handleLogout = () => {
    setUserSession(null);
    setUserRole('cashier');
    localStorage.removeItem('savdo_erp_user_session');
    soundManager.playHapticClick();
  };

  // User Role State ('cashier' = sotuvchi, 'superadmin' / 'admin' = rahbar)
  const [userRole, setUserRole] = useState<UserRole>(() => {
    try {
      const saved = localStorage.getItem('savdo_erp_user_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.role) return parsed.role;
      }
    } catch {}
    return 'cashier';
  });

  const isSuperAdmin = userRole === 'superadmin' || userRole === 'admin';

  const handleToggleRole = () => {
    if (isSuperAdmin) {
      setUserRole('cashier');
    } else {
      setIsPinModalOpen(true);
    }
  };

  useEffect(() => {
    applyDomTranslations(document.body, language);
  }, [language, currentTab, userSession, isPinModalOpen, isAiModalOpen]);

  // Sync theme with document class
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('savdo_erp_theme', theme);
  }, [theme]);

  // Sync large font state
  useEffect(() => {
    localStorage.setItem('savdo_erp_largetext', isLargeText ? 'true' : 'false');
  }, [isLargeText]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const toggleLargeText = () => {
    setIsLargeText(prev => !prev);
  };

  // Global tactile haptic click feedback for buttons (iOS Taptic Engine uslubi)
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const clickable = target.closest('button, .oxista-btn, .interactive-press');
      if (clickable && settings.enableSound) {
        soundManager.playHapticClick();
      }
    };
    window.addEventListener('click', handleGlobalClick, true);
    return () => window.removeEventListener('click', handleGlobalClick, true);
  }, [settings.enableSound]);

  // Cloud Sync State
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<string>('Hozirgina');

  // Load all data from storage
  const loadData = useCallback(() => {
    const curDevice = AppDatabase.getDeviceStoreId();
    setDeviceStoreId(curDevice);
    setProducts(AppDatabase.getProducts());
    setCustomers(AppDatabase.getCustomers());
    setSuppliers(AppDatabase.getSuppliers());
    setSales(AppDatabase.getSales());
    setExpenses(AppDatabase.getExpenses());
    setSettings(AppDatabase.getSettings());
  }, []);

  const triggerCloudSync = useCallback(async (showLoading: boolean = false) => {
    if (showLoading) setSyncStatus('syncing');
    try {
      const changed = await AppDatabase.syncFromCloud();
      if (changed) {
        loadData();
      }
      setSyncStatus('synced');
      const now = new Date();
      setLastSyncTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    } catch (e) {
      console.error('Cloud sync error:', e);
      setSyncStatus('error');
    }
  }, [loadData]);

  useEffect(() => {
    loadData();

    // 1. Dastur ochilganda bulutli bazadan yangilash
    triggerCloudSync(true);

    // 2. Supabase Realtime obunasi: Boshqa qurilma biror narsa saqlashi bilan darhol bu yerga tushadi
    const unsubscribeRealtime = cloudDb.subscribeToChanges(() => {
      triggerCloudSync(false);
    });

    // 3. Fondagi avto-tekshirish (har 10 soniyada)
    const syncInterval = setInterval(() => {
      triggerCloudSync(false);
    }, 10000);

    // 4. Foydalanuvchi ilovaga qaytganida darhol sinxronlash (kamida 3 soniya oraliq bilan)
    let lastFocusSync = 0;
    const handleFocusSync = () => {
      const now = Date.now();
      if (now - lastFocusSync < 3000) return;
      lastFocusSync = now;
      triggerCloudSync(false);
    };
    window.addEventListener('focus', handleFocusSync);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleFocusSync();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const handleDataChange = () => loadData();
    window.addEventListener('erp_data_changed', handleDataChange);
    window.addEventListener('erp_rate_changed', handleDataChange);
    return () => {
      unsubscribeRealtime();
      clearInterval(syncInterval);
      window.removeEventListener('focus', handleFocusSync);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('erp_data_changed', handleDataChange);
      window.removeEventListener('erp_rate_changed', handleDataChange);
    };
  }, [loadData, triggerCloudSync]);

  // Global Function Key Shortcuts (F1 - F9)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9'].includes(e.key)) {
        e.preventDefault();
        switch (e.key) {
          case 'F1': setCurrentTab('pos'); break;
          case 'F2': setCurrentTab('inventory'); break;
          case 'F3': setCurrentTab('debts'); break;
          case 'F4': 
            if (isSuperAdmin) {
              setCurrentTab('suppliers');
            } else {
              setIsPinModalOpen(true);
            }
            break;
          case 'F5': setCurrentTab('expenses'); break;
          case 'F6': setCurrentTab('reports'); break;
          case 'F7': 
            if (isSuperAdmin) {
              setCurrentTab('settings');
            } else {
              setIsPinModalOpen(true);
            }
            break;
          case 'F9':
            setIsAiModalOpen(prev => !prev);
            break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSuperAdmin]);

  // Agar super admin rejimi yopilsa va hozir sozlamalar yoki ta'minotda turgan bo'lsa, kassaga qaytarish
  useEffect(() => {
    if (!isSuperAdmin && (currentTab === 'settings' || currentTab === 'suppliers')) {
      setCurrentTab('pos');
    }
  }, [isSuperAdmin, currentTab]);

  // Today's Sales Calculation
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySalesTotal = sales
    .filter(s => s.createdAt.startsWith(todayStr))
    .reduce((sum, s) => sum + s.finalAmount, 0);

  const debtCount = customers.filter(c => c.balance < 0).length;
  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;

  const handleSaleComplete = (sale: Sale) => {
    loadData();
    setActiveReceiptSale(sale);
  };

  // Agar tizimga kirilmagan bo'lsa, xavfsiz LoginScreen ko'rsatiladi
  if (!userSession) {
    return (
      <LoginScreen
        onLoginSuccess={handleLoginSuccess}
        theme={theme}
        language={language}
      />
    );
  }

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden select-none transition-colors duration-200 ${
      theme === 'dark' ? 'bg-[#0b0f19] text-slate-100' : 'bg-slate-100 text-slate-900'
    } ${isLargeText ? 'text-[15px]' : 'text-sm'}`}>
      {/* Top Header with Theme & Role Controls */}
      <Header
        settings={settings}
        onUpdateSettings={(newSettings) => {
          setSettings(newSettings);
          AppDatabase.saveSettings(newSettings);
        }}
        products={products}
        onOpenLowStock={() => setCurrentTab('inventory')}
        theme={theme}
        onToggleTheme={toggleTheme}
        userRole={userRole}
        onOpenPinModal={handleToggleRole}
        storeFilter="store_1"
        onChangeStoreFilter={() => {}}
        deviceStoreId="store_1"
        onOpenAiController={() => setIsAiModalOpen(true)}
        currentUser={userSession}
        onLogout={handleLogout}
        syncStatus={syncStatus}
        lastSyncTime={lastSyncTime}
        onManualSync={() => triggerCloudSync(true)}
      />

      {/* Main Layout Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          debtCount={debtCount}
          lowStockCount={lowStockCount}
          isLargeText={isLargeText}
          isAdmin={isSuperAdmin}
        />

        {/* Dynamic Main Workspace View */}
        <main className="flex-1 flex flex-col overflow-hidden relative z-10">
          {currentTab === 'pos' && (
            <PosView
              products={products}
              customers={customers}
              settings={settings}
              onSaleComplete={handleSaleComplete}
              isLargeText={isLargeText}
              currentStoreId="store_1"
              onRefresh={loadData}
            />
          )}

          {currentTab === 'inventory' && (
            <InventoryView
              products={products}
              onOpenBarcodeModal={(prod) => setActiveBarcodeProduct(prod)}
              onRefresh={loadData}
              isLargeText={isLargeText}
              isAdmin={isSuperAdmin}
              storeFilter="store_1"
              deviceStoreId="store_1"
            />
          )}

          {currentTab === 'debts' && (
            <DebtsView
              customers={customers}
              onRefresh={loadData}
              isLargeText={isLargeText}
              isAdmin={isSuperAdmin}
            />
          )}

          {currentTab === 'suppliers' && isSuperAdmin && (
            <SuppliersView
              suppliers={suppliers}
              products={products}
              onRefresh={loadData}
              isLargeText={isLargeText}
            />
          )}

          {currentTab === 'expenses' && (
            <ExpensesView
              expenses={expenses}
              onRefresh={loadData}
              isLargeText={isLargeText}
              isAdmin={isSuperAdmin}
            />
          )}

          {currentTab === 'reports' && (
            <ReportsView
              sales={sales}
              expenses={expenses}
              products={products}
              onOpenReceipt={(sale) => setActiveReceiptSale(sale)}
              onRefresh={loadData}
              isLargeText={isLargeText}
              isAdmin={isSuperAdmin}
              storeFilter="store_1"
            />
          )}

          {currentTab === 'settings' && isSuperAdmin && (
            <SettingsView
              settings={settings}
              onUpdateSettings={(newSettings) => setSettings(newSettings)}
              onRefreshAll={loadData}
              isLargeText={isLargeText}
              deviceStoreId="store_1"
              onUpdateDeviceStoreId={() => {
                loadData();
              }}
              language={language}
              onChangeLanguage={handleChangeLanguage}
            />
          )}
        </main>
      </div>

      {/* Global Receipt Modal */}
      {activeReceiptSale && (
        <ReceiptModal
          sale={activeReceiptSale}
          settings={settings}
          onClose={() => setActiveReceiptSale(null)}
        />
      )}

      {/* Global Barcode Generator Modal */}
      {activeBarcodeProduct && (
        <BarcodeGeneratorModal
          product={activeBarcodeProduct}
          onClose={() => setActiveBarcodeProduct(null)}
        />
      )}

      {/* Admin PIN Kod Modali */}
      <AdminPinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onSuccess={() => {
          setUserRole('superadmin');
          setStoreFilter('store_1');
        }}
        correctPin={settings.adminPin || '1234'}
      />

      {/* TEXTILE PRO AI Yordamchisi Modali */}
      <AiControllerModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onSwitchTab={(tab) => setCurrentTab(tab)}
        onRefreshData={loadData}
        userRole={userRole}
      />
    </div>
  );
}

export default App;
