import React, { useState, useEffect } from 'react';
import { X, Lock, ShieldCheck, Delete, ArrowRight } from 'lucide-react';
import { soundManager } from '../utils/sound';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  correctPin: string;
}

export const AdminPinModal: React.FC<AdminPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  correctPin,
}) => {
  const [pin, setPin] = useState('');
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setHasError(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (/^[0-9]$/.test(e.key)) {
        handleDigit(e.key);
      }
      if (e.key === 'Backspace') {
        handleBackspace();
      }
      if (e.key === 'Enter') {
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pin]);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    soundManager.playHapticClick();
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
      setHasError(false);
      // Agar 4 xonali bo'lsa va to'g'ri kelsa avtomatik tekshirish
      if (newPin === correctPin) {
        soundManager.playSuccessSound();
        onSuccess();
        onClose();
      }
    }
  };

  const handleBackspace = () => {
    soundManager.playHapticClick();
    setPin(prev => prev.slice(0, -1));
    setHasError(false);
  };

  const handleClear = () => {
    soundManager.playHapticClick();
    setPin('');
    setHasError(false);
  };

  const handleSubmit = () => {
    if (pin === correctPin) {
      soundManager.playSuccessSound();
      onSuccess();
      onClose();
    } else {
      soundManager.playErrorSound();
      setHasError(true);
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-3xl max-w-xs w-full p-6 flex flex-col items-center">
        {/* Header */}
        <div className="w-full flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm">
            <Lock className="w-4 h-4 text-amber-500" />
            <span>Admin Ruxsati</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg interactive-press"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Icon & Description */}
        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
          <ShieldCheck className="w-8 h-8 stroke-[2]" />
        </div>
        <h3 className="font-black text-slate-900 dark:text-white text-base">PIN Kodni Kiriting</h3>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center mt-1 mb-4">
          Mahsulot tannarxi va hisobotlarni ko'rish uchun admin parolini tering (Standart: 1234)
        </p>

        {/* PIN Dots Display */}
        <div className={`flex items-center justify-center gap-3 my-2 py-2.5 px-6 rounded-2xl border ${
          hasError 
            ? 'border-red-500 bg-red-500/10 animate-bounce' 
            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950'
        }`}>
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                pin.length > idx
                  ? hasError ? 'bg-red-500 scale-110' : 'bg-blue-600 scale-110'
                  : 'bg-slate-300 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>
        {hasError && (
          <span className="text-[11px] font-bold text-red-500 mt-1">Noto'g'ri PIN kod! Qaytadan tering.</span>
        )}

        {/* Numeric Keypad (Sensor ekranlar uchun yirik tugmalar) */}
        <div className="grid grid-cols-3 gap-2.5 w-full mt-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-12 rounded-2xl glass-card border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-black text-xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all interactive-press shadow-xs"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs flex items-center justify-center hover:text-red-500 interactive-press"
          >
            Tozalash
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-12 rounded-2xl glass-card border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-black text-xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all interactive-press shadow-xs"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold flex items-center justify-center hover:text-black dark:hover:text-white interactive-press"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Kirish tugmasi */}
        <button
          onClick={handleSubmit}
          disabled={pin.length === 0}
          className="w-full mt-4 py-3 rounded-2xl btn-ios-blue font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-600/30 disabled:opacity-40 interactive-press"
        >
          <span>Tasdiqlash</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
