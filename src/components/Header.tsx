import React, { useState, useEffect, useRef } from 'react';
import { 
  AlertTriangle, 
  Maximize2, 
  Minimize2, 
  Volume2, 
  VolumeX,
  Sun,
  Moon,
  DollarSign,
  RefreshCw,
  Bot,
  LogOut,
  Edit3,
  Check,
  X
} from 'lucide-react';
import { StoreSettings, Product, UserRole, StoreFilterId, AppUserSession } from '../types';
import { formatMoney } from '../utils/formatters';
import { soundManager } from '../utils/sound';
import { fetchNbuRate, getCachedRate, setCustomUsdRate, CurrencyRate } from '../utils/currency';
import { aiAgentService } from '../services/aiAgentService';

const UZ_MONTHS = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'
];

interface HeaderProps {
  settings: StoreSettings;
  onUpdateSettings: (s: StoreSettings) => void;
  products: Product[];
  onOpenLowStock: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  userRole?: UserRole;
  onOpenPinModal?: () => void;
  storeFilter: StoreFilterId;
  onChangeStoreFilter: (filter: StoreFilterId) => void;
  deviceStoreId: string;
  onOpenAiController?: () => void;
  currentUser?: AppUserSession | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onUpdateSettings,
  products,
  onOpenLowStock,
  theme,
  onToggleTheme,
  userRole: _userRole,
  onOpenPinModal: _onOpenPinModal,
  onOpenAiController,
  currentUser,
  onLogout,
}) => {
  const [hoursMin, setHoursMin] = useState<string>('00:00');
  const [dateStr, setDateStr] = useState<string>('30 sentyabr');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Dollar kursi state va tahrirlash oynasi
  const [usdRate, setUsdRate] = useState<CurrencyRate>(getCachedRate());
  const [isRateLoading, setIsRateLoading] = useState(false);
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState<string>(getCachedRate().sellRate.toString());
  const ratePopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      setHoursMin(`${hh}:${mm}`);
      setDateStr(`${now.getDate()} ${UZ_MONTHS[now.getMonth()]}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch USD Rate on mount
  useEffect(() => {
    loadRate(false);
    const handleRateChange = () => {
      setUsdRate(getCachedRate());
    };
    window.addEventListener('erp_rate_changed', handleRateChange);
    return () => window.removeEventListener('erp_rate_changed', handleRateChange);
  }, []);

  // Tashqariga bosilganda kurs tahrirlash oynasini yopish
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ratePopoverRef.current && !ratePopoverRef.current.contains(e.target as Node)) {
        setIsEditingRate(false);
      }
    };
    if (isEditingRate) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditingRate]);

  const loadRate = async (force: boolean = false) => {
    setIsRateLoading(true);
    try {
      const rate = await fetchNbuRate(force);
      setUsdRate(rate);
      setRateInput(rate.sellRate.toString());
    } finally {
      setIsRateLoading(false);
    }
  };

  const handleSaveCustomRate = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(rateInput);
    if (!parsed || parsed < 100) {
      alert("Iltimos, to'g'ri dollar kursini kiriting!");
      return;
    }
    soundManager.playSuccessSound();
    const updated = setCustomUsdRate(parsed);
    setUsdRate(updated);
    setIsEditingRate(false);
  };

  const toggleFullscreen = () => {
    soundManager.playHapticClick();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;

  return (
    <header className="h-16 glass-panel border-b flex items-center justify-between px-4 sm:px-6 z-30 shrink-0 select-none">
      {/* Left: APP NOMI TEXTILE PRO */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-black text-lg sm:text-xl tracking-[0.2em] uppercase text-slate-950 dark:text-white font-sans">
            TEXTILE PRO
          </span>
        </div>

        {/* Low Stock Touch Alert */}
        {lowStockCount > 0 && (
          <button
            onClick={() => {
              soundManager.playHapticClick();
              onOpenLowStock();
            }}
            className="h-11 px-4 rounded-2xl bg-red-500/15 border border-red-500/35 text-red-600 dark:text-red-300 hover:bg-red-500/25 oxista-btn text-xs font-bold flex items-center justify-center gap-2"
            title="Kam qolgan mahsulotlar"
          >
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <span className="hidden sm:inline">{lowStockCount} ta kam qoldiq</span>
          </button>
        )}
      </div>

      {/* Right: DOLLAR KURSI + SOAT + AI YORDAMCHI + BOSHQARUV TUGMALARI (Bir xil h-11 o'lcham va konturda) */}
      <div className="flex items-center gap-2.5">
        
        {/* DOLLAR KURSI VA TAHRIRLASH POPOVERI */}
        <div className="relative" ref={ratePopoverRef}>
          <div 
            onClick={() => {
              soundManager.playHapticClick();
              setRateInput(usdRate.sellRate.toString());
              setIsEditingRate(prev => !prev);
            }}
            className="h-11 min-w-[136px] px-4 rounded-2xl glass-card border font-mono font-black shadow-sm oxista-btn cursor-pointer text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 hover:border-emerald-500/50 transition-all flex items-center justify-center gap-1.5"
            title="Dollar kursini o'zgartirish uchun bosing"
          >
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
              <DollarSign className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <span className="tracking-tight text-xs sm:text-sm whitespace-nowrap">
              {formatMoney(usdRate.sellRate)}
            </span>
            <Edit3 className="w-3 h-3 text-slate-400 ml-0.5 shrink-0" />
            {isRateLoading && <RefreshCw className="w-3 h-3 text-slate-400 animate-spin ml-0.5 shrink-0" />}
          </div>

          {/* Kursni O'zgartirish Oynasi */}
          {isEditingRate && (
            <div className="absolute right-0 mt-2 w-72 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  <span>Dollar Kursini Belgilash</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingRate(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveCustomRate} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                    1 AQSH Dollari ($1) necha so'm?
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="100"
                      autoFocus
                      value={rateInput}
                      onChange={(e) => setRateInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-black text-base text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      so'm
                    </span>
                  </div>
                </div>

                {/* Tezkor +/- tugmalari */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[-100, -50, +50, +100].map(diff => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => {
                        const current = parseFloat(rateInput) || usdRate.sellRate;
                        setRateInput(Math.max(100, current + diff).toString());
                      }}
                      className="py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs border border-slate-200 dark:border-slate-700 interactive-press"
                    >
                      {diff > 0 ? `+${diff}` : diff}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => loadRate(true)}
                    disabled={isRateLoading}
                    className="px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-300 dark:border-slate-700 flex items-center gap-1 interactive-press"
                    title="Markaziy Bank kursini internetdan olish"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRateLoading ? 'animate-spin' : ''}`} />
                    <span>Bank kursi</span>
                  </button>

                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/25 interactive-press"
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Saqlash</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* VAQT VA SANA: Tepada Soat (HH:MM), Pastda Sana (30 sentyabr) */}
        <div className="h-11 min-w-[136px] px-4 rounded-2xl glass-card border shadow-sm flex flex-col items-center justify-center">
          <div className="font-mono font-black text-sm text-slate-900 dark:text-white tracking-tight leading-none">
            {hoursMin}
          </div>
          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wide lowercase mt-1 text-center leading-none whitespace-nowrap">
            {dateStr}
          </div>
        </div>

        {/* AI Yordamchi tezkor tugmasi */}
        {onOpenAiController && (
          <button
            onClick={() => {
              soundManager.playHapticClick();
              onOpenAiController();
            }}
            className="h-11 min-w-[136px] px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black oxista-btn border border-indigo-500 flex items-center justify-center gap-2 transition-all interactive-press relative shadow-sm"
            title="TEXTILE PRO AI Yordamchisi"
          >
            <Bot className="w-4 h-4 stroke-[2.2] shrink-0" />
            <span className="whitespace-nowrap">AI Yordamchi</span>
            {aiAgentService.isConfigured() && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 border border-slate-900 absolute top-2 right-2" />
            )}
          </button>
        )}


        {/* KUNDUZGI / TUNGI THEME TOGGLE (Sun / Moon) */}
        <button
          onClick={() => {
            soundManager.playHapticClick();
            onToggleTheme();
          }}
          className="h-11 px-4 rounded-2xl glass-card border oxista-btn text-xs font-bold text-slate-800 dark:text-slate-200 shadow-sm flex items-center justify-center gap-2"
          title={theme === 'dark' ? 'Kunduzgi mavzuga o\'tish (Light Mode)' : 'Tungi mavzuga o\'tish (Dark Mode)'}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="hidden md:inline">Kunduzgi</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="hidden md:inline">Tungi</span>
            </>
          )}
        </button>

        {/* Sound Toggle */}
        <button
          onClick={() => {
            soundManager.playHapticClick();
            onUpdateSettings({ ...settings, enableSound: !settings.enableSound });
          }}
          className={`w-11 h-11 rounded-2xl border oxista-btn flex items-center justify-center ${
            settings.enableSound
              ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
              : 'glass-card text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
          title={settings.enableSound ? 'Ovoz yoqilgan' : 'Ovoz o\'chirilgan'}
        >
          {settings.enableSound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Fullscreen Toggle (Sensor ekranda qulay to'liq ekran) */}
        <button
          onClick={toggleFullscreen}
          className="w-11 h-11 rounded-2xl glass-card border text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white oxista-btn flex items-center justify-center"
          title={isFullscreen ? 'Kichraytirish' : 'To\'liq ekran rejimi'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Tizimga Kirgan Foydalanuvchi & Chiqish */}
        {currentUser && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-300 dark:border-slate-800">
            <div className="hidden xl:flex flex-col items-end">
              <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                {currentUser.name}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {currentUser.phone}
              </span>
            </div>
            {onLogout && (
              <button
                onClick={() => {
                  soundManager.playHapticClick();
                  if (window.confirm("Haqiqatdan ham tizimdan chiqmoqchimisiz?")) {
                    onLogout();
                  }
                }}
                className="w-11 h-11 rounded-2xl glass-card border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 oxista-btn flex items-center justify-center transition-all"
                title="Tizimdan chiqish (Logout)"
              >
                <LogOut className="w-4 h-4 stroke-[2.2]" />
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
