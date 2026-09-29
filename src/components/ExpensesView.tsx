import React, { useState } from 'react';
import { 
  CircleDollarSign, 
  Plus, 
  Search, 
  Calendar, 
  Trash2, 
  X, 
  TrendingDown
} from 'lucide-react';
import { Expense } from '../types';
import { AppDatabase } from '../db';
import { formatMoney, formatUSD, usdToUzs, formatDate } from '../utils/formatters';
import { getCachedRate } from '../utils/currency';

interface ExpensesViewProps {
  expenses: Expense[];
  onRefresh: () => void;
  isLargeText: boolean;
  isAdmin?: boolean;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  onRefresh,
  isLargeText,
  isAdmin = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Barchasi');
  const usdRate = getCachedRate().sellRate;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [category, setCategory] = useState('Do\'kon Ijarasi');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const standardCategories = [
    'Ombor / Do\'kon Ijarasi',
    'Xodimlar Oyligi',
    'Mato Transporti / Yoqilg\'i',
    'Kommunal to\'lovlar (Svet, Gaz)',
    'Rulon qoplari va Skotch',
    'Choyxona / Tushlik',
    'Boshqa xarajatlar',
  ];

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayExpenses = expenses
    .filter(e => e.date.startsWith(todayStr))
    .reduce((sum, e) => sum + e.amount, 0);

  const categories = ['Barchasi', ...Array.from(new Set(expenses.map(e => e.category)))];

  const filteredExpenses = expenses.filter(e => {
    const matchesCategory = categoryFilter === 'Barchasi' || e.category === categoryFilter;
    const matchesSearch = 
      e.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
      e.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      alert('Iltimos, xarajat summasini to\'g\'ri kiriting!');
      return;
    }

    AppDatabase.addExpense({
      category,
      amount: amt,
      paymentMethod,
      description: description.trim() || category,
      date: new Date(date).toISOString(),
    });

    setIsModalOpen(false);
    setAmount('');
    setDescription('');
    onRefresh();
  };

  const handleDeleteExpense = (id: string) => {
    if (window.confirm('Ushbu xarajat yozuvini o\'chirmoqchimisiz?')) {
      AppDatabase.deleteExpense(id);
      onRefresh();
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-5 space-y-4">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl glass-card flex items-center justify-between border">
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Jami Xarajatlar ($)</span>
            <div className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono mt-0.5">
              {formatUSD(totalExpenses)}
            </div>
            <div className="text-[11px] font-mono font-semibold text-slate-500">
              ≈ {formatMoney(usdToUzs(totalExpenses, usdRate))}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-card flex items-center justify-between border">
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Bugungi Xarajatlar ($)</span>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">
              {formatUSD(todayExpenses)}
            </div>
            <div className="text-[11px] font-mono font-semibold text-slate-500">
              ≈ {formatMoney(usdToUzs(todayExpenses, usdRate))}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-card flex items-center justify-between border">
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Yozuvlar Soni</span>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
              {expenses.length} ta yozuv
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <CircleDollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Action Bar & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 glass-panel p-3.5 rounded-2xl border">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Qidirish..."
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 font-semibold text-xs sm:text-sm focus:outline-none focus:border-blue-500 shadow-inner"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold text-xs sm:text-sm focus:outline-none focus:border-blue-500"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Add Expense Button (Red allowed) */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs sm:text-sm shadow-md shadow-rose-600/30 transition-all shrink-0 interactive-press"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Yangi Xarajat Yozish</span>
        </button>
      </div>

      {/* Expenses Table */}
      <div className="flex-1 overflow-hidden glass-panel rounded-2xl border flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 z-10">
              <tr>
                <th className="py-3 px-4">Sana</th>
                <th className="py-3 px-4">Kategoriya</th>
                <th className="py-3 px-4">Izoh</th>
                <th className="py-3 px-4">To'lov</th>
                <th className="py-3 px-4 text-right">Summasi</th>
                <th className="py-3 px-4 text-center">Amal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs sm:text-sm">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 text-sm">
                    Xarajatlar mavjud emas
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                      {formatDate(exp.date)}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                      <div className="flex items-center gap-2">
                        <span>{exp.category}</span>
                        {isAdmin && exp.storeId && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${
                            exp.storeId === 'store_1' 
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50' 
                              : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700/50'
                          }`}>
                            {exp.storeId === 'store_1' ? "1-Do'kon" : "2-Do'kon"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`py-3 px-4 font-semibold text-slate-900 dark:text-white ${isLargeText ? 'text-base' : 'text-sm'}`}>
                      {exp.description}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-500">
                      {exp.paymentMethod === 'cash' ? 'Naqd' : 'Karta'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="font-mono font-black text-rose-600 dark:text-rose-400 text-sm sm:text-base">
                        -{formatUSD(exp.amount)}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        ≈ {formatMoney(usdToUzs(exp.amount, usdRate))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-1.5 rounded-lg border glass-card text-slate-500 hover:text-rose-600 interactive-press"
                        title="O'chirish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD EXPENSE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-3xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3.5">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <CircleDollarSign className="w-5 h-5 text-rose-500" />
                <span>Yangi Xarajat Yozish</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white interactive-press"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Kategoriya *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:border-blue-500"
                >
                  {standardCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Xarajat Summasi ($ USD) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-rose-600 dark:text-rose-400 font-mono font-black text-lg focus:outline-none focus:border-blue-500"
                />
                <div className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 mt-1 text-right">
                  So'mda: ≈ <span className="text-slate-900 dark:text-white font-bold">{formatMoney(usdToUzs(parseFloat(amount) || 0, usdRate))}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">To'lov shakli</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all interactive-press ${
                      paymentMethod === 'cash' 
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/30' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    Naqd kassa
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all interactive-press ${
                      paymentMethod === 'card' 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/30' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    Plastik karta
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Izoh</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Masalan: Oylik ijara"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Sana</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm font-mono"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold interactive-press"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-md shadow-rose-600/30 interactive-press"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
