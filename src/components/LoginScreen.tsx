import React, { useState } from 'react';
import { 
  User, 
  Phone, 
  Mail, 
  KeyRound, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  ArrowRight, 
  AlertCircle,
  Sparkles,
  Lock,
  Crown,
  UserCheck
} from 'lucide-react';
import { AppUserSession, UserRole } from '../types';
import { soundManager } from '../utils/sound';
import { AppLanguage } from '../utils/i18n';

// 1-kod: Sotuvchi (Kassir) uchun maxfiy kodlar
export const SOTUVCHI_CODES = [
  'So_909367577', 
  'S_909367577', 
  'Sotuvchi_909367577', 
  'Sh_909367577_1',
  'Sh_909367577_sotuvchi'
];

// 2-kod: Admin (Rahbar) uchun maxfiy kodlar
export const ADMIN_CODES = [
  'Sh_909367577', 
  'Ad_909367577', 
  'Admin_909367577',
  'Sh_909367577_2',
  'Sh_909367577_admin'
];

interface LoginScreenProps {
  onLoginSuccess: (user: AppUserSession) => void;
  theme?: 'dark' | 'light';
  language?: AppLanguage;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ 
  onLoginSuccess,
  theme = 'dark',
  language: _language = 'uz_lat',
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Kod bo'yicha foydalanuvchi rolini aniqlash
  const detectRole = (code: string): UserRole | null => {
    const c = code.trim();
    if (ADMIN_CODES.includes(c)) return 'superadmin';
    if (SOTUVCHI_CODES.includes(c)) return 'cashier';
    return null;
  };

  const detectedRole = detectRole(secretCode);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();
    const trimmedCode = secretCode.trim();

    if (!trimmedName || !trimmedPhone || !trimmedEmail || !trimmedCode) {
      soundManager.playErrorSound();
      setErrorMsg("Iltimos, barcha maydonlarni (ism, telefon, email va mahfiy kod) to'ldiring!");
      return;
    }

    const role = detectRole(trimmedCode);
    if (!role) {
      soundManager.playErrorSound();
      setErrorMsg("Mahfiy kod noto'g'ri! Iltimos, to'g'ri mahfiy kodni kiriting.");
      return;
    }

    setIsLoading(true);
    soundManager.playSuccessSound();

    const userSession: AppUserSession = {
      name: trimmedName,
      phone: trimmedPhone,
      email: trimmedEmail,
      loginTime: new Date().toISOString(),
      role: role,
    };

    setTimeout(() => {
      onLoginSuccess(userSession);
    }, 350);
  };

  return (
    <div className={`min-h-screen w-screen flex items-center justify-center p-4 select-none ${
      theme === 'dark' ? 'bg-[#0b0f19] text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>
      {/* Login Card (Clean, Sharp, Zero blur, Zero shadows) */}
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
        
        {/* App Logo & Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white border border-blue-500 font-black text-2xl tracking-wider mb-1">
            <Lock className="w-7 h-7 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-black tracking-wider uppercase text-slate-900 dark:text-white font-sans">
            TEXTILE PRO
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            Tizimga kirish uchun ma'lumotlaringizni va rolingizga mos mahfiy kodni kiriting
          </p>
        </div>

        {/* Error message alert */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-600 dark:text-rose-400 font-semibold animate-in fade-in zoom-in-95">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Ism Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-500" />
              <span>Ismingiz *</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Masalan: Shahzod Aliyev"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 font-semibold focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Telefon Raqam Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-500" />
              <span>Telefon raqamingiz *</span>
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+998 (90) 123-45-67"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 font-semibold font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Email Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-indigo-500" />
              <span>Elektron pochta (Email) *</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="shahzod@example.uz"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 font-semibold focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Mahfiy Kod Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                <span>Mahfiy kod *</span>
              </label>

              {/* Real-time detected role pill */}
              {(detectedRole === 'superadmin' || detectedRole === 'admin') && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/40 animate-in fade-in">
                  <Crown className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 fill-amber-500/30" />
                  <span>Super Admin kodi aniqlandi</span>
                </span>
              )}
              {detectedRole === 'cashier' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-in fade-in">
                  <UserCheck className="w-3 h-3 text-emerald-400" />
                  <span>Sotuvchi kodi aniqlandi</span>
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type={showCode ? 'text' : 'password'}
                required
                value={secretCode}
                onChange={(e) => setSecretCode(e.target.value)}
                placeholder="Mahfiy kodni kiriting"
                className={`w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 font-mono font-bold focus:outline-none tracking-wider transition-colors ${
                  (detectedRole === 'superadmin' || detectedRole === 'admin')
                    ? 'border-amber-500 focus:border-amber-400 ring-1 ring-amber-500/30'
                    : detectedRole === 'cashier'
                    ? 'border-emerald-500 focus:border-emerald-400'
                    : 'border-slate-300 dark:border-slate-700 focus:border-blue-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowCode(!showCode)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                tabIndex={-1}
              >
                {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full mt-2 py-3 rounded-2xl font-black text-xs sm:text-sm border flex items-center justify-center gap-2 transition-all interactive-press shadow-sm ${
              (detectedRole === 'superadmin' || detectedRole === 'admin')
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 shadow-amber-500/20 shadow-md'
                : detectedRole === 'cashier'
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
                : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500'
            }`}
          >
            {isLoading ? (
              <span>Tekshirilmoqda...</span>
            ) : (
              <>
                {(detectedRole === 'superadmin' || detectedRole === 'admin') ? (
                  <Crown className="w-4 h-4 text-slate-950 fill-current" />
                ) : (
                  <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                )}
                <span>
                  {(detectedRole === 'superadmin' || detectedRole === 'admin')
                    ? "Super Admin Sifatida Kirish" 
                    : detectedRole === 'cashier'
                    ? "Sotuvchi Sifatida Kirish"
                    : "Tizimga Kirish"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security badge footer */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Himoyalangan Tizim (Sotuvchi / Admin)</span>
          </span>
          <span className="font-mono">v2.4</span>
        </div>
      </div>
    </div>
  );
};
