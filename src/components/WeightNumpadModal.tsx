import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Delete, 
  RotateCcw, 
  Scale, 
  Plus, 
  Minus,
  Sparkles,
  Layers,
  Calculator
} from 'lucide-react';
import { CartItem } from '../types';
import { formatUSD, formatKg, formatMoney, usdToUzs } from '../utils/formatters';
import { soundManager } from '../utils/sound';
import { getCachedRate } from '../utils/currency';

interface WeightNumpadModalProps {
  isOpen: boolean;
  item: CartItem | null;
  onClose: () => void;
  onSaveWeight: (productId: string, newWeight: number) => void;
}

export const WeightNumpadModal: React.FC<WeightNumpadModalProps> = ({
  isOpen,
  item,
  onClose,
  onSaveWeight,
}) => {
  const [inputVal, setInputVal] = useState<string>('');
  const [subRolls, setSubRolls] = useState<number[]>([]); // Ko'p rulonlar yig'indisi uchun

  useEffect(() => {
    if (item && isOpen) {
      const initialQty = item.quantity > 0 ? item.quantity.toString() : '20';
      setInputVal(initialQty);
      setSubRolls([]);
    }
  }, [item, isOpen]);

  const currentNum = parseFloat(inputVal) || 0;
  const totalWeight = subRolls.length > 0 
    ? subRolls.reduce((sum, r) => sum + r, 0) + (parseFloat(inputVal) || 0)
    : currentNum;

  const currentPrice = item?.price || 0;
  const estimatedTotal = totalWeight * currentPrice;
  const nbuRate = getCachedRate().sellRate;

  const handleKeyPress = (char: string) => {
    soundManager.playScanBeep();

    if (char === '.' || char === ',') {
      if (inputVal.includes('.')) return;
      setInputVal(prev => (prev === '' ? '0.' : prev + '.'));
      return;
    }

    if (inputVal === '0') {
      setInputVal(char);
    } else {
      setInputVal(prev => prev + char);
    }
  };

  const handleBackspace = () => {
    soundManager.playScanBeep();
    setInputVal(prev => {
      if (prev.length <= 1) return '';
      return prev.slice(0, -1);
    });
  };

  const handleClear = () => {
    soundManager.playScanBeep();
    setInputVal('');
  };

  // 20-30 kg tezkor butun sonlar
  const handleWholePreset = (val: number) => {
    soundManager.playScanBeep();
    setInputVal(val.toString());
  };

  // .25, .50, .75, .95 kabi tezkor o'nliklar
  const handleFractionPreset = (frac: string) => {
    soundManager.playScanBeep();
    const whole = Math.floor(parseFloat(inputVal) || 20);
    setInputVal(`${whole}${frac}`);
  };

  // Bir nechta rulonlarni qo'shish (Masalan: 20.75 + 21.25 + 25.95)
  const handleAddRoll = () => {
    const w = parseFloat(inputVal);
    if (w > 0) {
      soundManager.playScanBeep();
      setSubRolls(prev => [...prev, w]);
      setInputVal('');
    }
  };

  const handleRemoveSubRoll = (index: number) => {
    setSubRolls(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    if (!item) return;
    if (totalWeight <= 0) {
      alert("Iltimos, to'g'ri vazn kiriting!");
      return;
    }
    soundManager.playSuccessSound();
    onSaveWeight(item.product.id, Math.round(totalWeight * 1000) / 1000);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === '.' || e.key === ',') {
        handleKeyPress('.');
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        handleConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, inputVal, totalWeight, subRolls, item]);

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold">
              <Scale className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base line-clamp-1">
                {item.product.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Tannarx: <span className="font-bold text-blue-600 dark:text-blue-400">{formatUSD(item.price)} / kg</span> • Partiya: {item.product.batchNumber || 'Asosiy'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-red-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Display: Katta Raqamli Tarozi Tablosi */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              <span>Sotilayotgan Mato Vazni:</span>
              <span className="text-blue-600 dark:text-blue-400">1-30+ kg Rulonlar</span>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-2">
                <span className="font-mono font-black text-4xl sm:text-5xl text-slate-900 dark:text-white tracking-tight">
                  {inputVal === '' ? '0' : inputVal}
                </span>
                <span className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 font-sans">
                  kg
                </span>
              </div>

              <div className="text-right">
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatUSD(estimatedTotal)}
                </div>
                <div className="text-xs font-mono font-semibold text-slate-500">
                  ≈ {formatMoney(usdToUzs(estimatedTotal, nbuRate))}
                </div>
              </div>
            </div>

            {/* Ko'p rulonlar ro'yxati (agar qo'shilgan bo'lsa) */}
            {subRolls.length > 0 && (
              <div className="mt-2.5 pt-2.5 border-t border-dashed border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500">Rulonlar:</span>
                {subRolls.map((r, idx) => (
                  <span
                    key={idx}
                    onClick={() => handleRemoveSubRoll(idx)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-mono font-bold cursor-pointer hover:bg-rose-100 hover:text-rose-600"
                    title="O'chirish uchun bosing"
                  >
                    {r} kg <X className="w-3 h-3" />
                  </span>
                ))}
                <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 ml-auto">
                  Jami: {totalWeight.toFixed(2)} kg
                </span>
              </div>
            )}
          </div>

          {/* 20-30 kg tezkor rulon andozalari */}
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span>Mato Ruloni Standart Vaznlari:</span>
              <span className="text-slate-400">Bir marta bosish bilan kiritiladi</span>
            </div>
            
            {/* Butun kg lar: 20 dan 30 gacha */}
            <div className="grid grid-cols-6 sm:grid-cols-6 gap-1.5">
              {[20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 32].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleWholePreset(num)}
                  className={`py-2 rounded-xl text-xs sm:text-sm font-black font-mono transition-all border ${
                    Math.floor(parseFloat(inputVal) || 0) === num
                      ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-blue-400'
                  }`}
                >
                  {num} kg
                </button>
              ))}
            </div>

            {/* O'nlik aniq grammlar: .25, .50, .75, .95 */}
            <div className="grid grid-cols-6 gap-1.5 pt-1">
              {['.00', '.25', '.50', '.75', '.80', '.95'].map(frac => (
                <button
                  key={frac}
                  type="button"
                  onClick={() => handleFractionPreset(frac)}
                  className="py-1.5 rounded-xl text-xs font-bold font-mono bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 transition-all"
                >
                  {frac} kg
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Numpad va Funksional Tugmalar */}
        <div className="p-4 bg-white dark:bg-slate-900 space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {/* Raqamlar 7, 8, 9, Backspace */}
            <button
              type="button"
              onClick={() => handleKeyPress('7')}
              className="h-14 sm:h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-mono font-black text-2xl transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center active:scale-95"
            >
              7
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress('8')}
              className="h-14 sm:h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-mono font-black text-2xl transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center active:scale-95"
            >
              8
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress('9')}
              className="h-14 sm:h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-mono font-black text-2xl transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center active:scale-95"
            >
              9
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="h-14 sm:h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 font-bold transition-all border border-rose-200 dark:border-rose-900 flex items-center justify-center active:scale-95"
              title="Bitta raqamni o'chirish"
            >
              <Delete className="w-6 h-6" />
            </button>

            {/* Raqamlar 4, 5, 6, Clear */}
            <button
              type="button"
              onClick={() => handleKeyPress('4')}
              className="h-14 sm:h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-mono font-black text-2xl transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center active:scale-95"
            >
              4
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress('5')}
              className="h-14 sm:h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-mono font-black text-2xl transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center active:scale-95"
            >
              5
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress('6')}
              className="h-14 sm:h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-mono font-black text-2xl transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center active:scale-95"
            >
              6
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="h-14 sm:h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 hover:bg-amber-100 font-mono font-black text-lg transition-all border border-amber-200 dark:border-amber-900 flex items-center justify-center active:scale-95"
              title="Tozalash (0)"
            >
              C
            </button>

            {/* Raqamlar 1, 2, 3, + Rulon qo'shish */}
            <button
              type="button"
              onClick={() => handleKeyPress('1')}
              className="h-14 sm:h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-mono font-black text-2xl transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center active:scale-95"
            >
              1
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress('2')}
              className="h-14 sm:h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-mono font-black text-2xl transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center active:scale-95"
            >
              2
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress('3')}
              className="h-14 sm:h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-mono font-black text-2xl transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center active:scale-95"
            >
              3
            </button>
            <button
              type="button"
              onClick={handleAddRoll}
              className="h-14 sm:h-16 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-300 hover:bg-cyan-100 font-bold text-xs transition-all border border-cyan-200 dark:border-cyan-800 flex flex-col items-center justify-center gap-0.5 active:scale-95"
              title="Bir necha rulonni qo'shish"
            >
              <Plus className="w-5 h-5" />
              <span>+ Rulon</span>
            </button>

            {/* 0, Nuqta (.), Vergul (,), va Tasdiqlash */}
            <button
              type="button"
              onClick={() => handleKeyPress('0')}
              className="h-14 sm:h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-mono font-black text-2xl transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center active:scale-95"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress('.')}
              className="h-14 sm:h-16 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-black text-3xl transition-all border border-slate-300 dark:border-slate-700 flex items-center justify-center active:scale-95"
              title="Nuqta (o'nlik grammlar uchun)"
            >
              .
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress('.')}
              className="h-14 sm:h-16 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-black text-3xl transition-all border border-slate-300 dark:border-slate-700 flex items-center justify-center active:scale-95"
              title="Vergul"
            >
              ,
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="h-14 sm:h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm transition-all border border-emerald-500 shadow-md shadow-emerald-600/25 flex flex-col items-center justify-center gap-0.5 active:scale-95"
            >
              <Check className="w-6 h-6 stroke-[3]" />
              <span>Tayyor</span>
            </button>
          </div>

          {/* Pastki Katta Tasdiqlash Tugmasi */}
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-base transition-all border border-blue-500 shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 active:scale-98"
          >
            <span>Vaznni Saqlash:</span>
            <span className="font-mono text-xl font-black bg-blue-700 px-3 py-0.5 rounded-xl">
              {totalWeight.toFixed(2)} kg
            </span>
            <span>({formatUSD(estimatedTotal)})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
