import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Banknote, 
  History, 
  X, 
  Trash2, 
  DollarSign
} from 'lucide-react';
import { Customer } from '../types';
import { AppDatabase } from '../db';
import { formatMoney, formatUSD, usdToUzs, formatDateTime } from '../utils/formatters';
import { getCachedRate } from '../utils/currency';

interface DebtsViewProps {
  customers: Customer[];
  onRefresh: () => void;
  isLargeText: boolean;
  isAdmin?: boolean;
}

export const DebtsView: React.FC<DebtsViewProps> = ({
  customers,
  onRefresh,
  isLargeText,
  isAdmin = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'debtors' | 'all'>('debtors');
  const usdRate = getCachedRate().sellRate;

  // New Customer Modal
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [initialDebt, setInitialDebt] = useState<string>('');

  // Pay Debt Modal
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<'cash' | 'card'>('cash');
  const [payNotes, setPayNotes] = useState<string>('');

  // Transactions History Tab
  const [showHistoryModal, setShowHistoryModal] = useState<Customer | null>(null);

  const transactions = AppDatabase.getDebtTransactions();

  const totalDebtSum = customers.reduce((sum, c) => (c.balance < 0 ? sum + Math.abs(c.balance) : sum), 0);
  const debtorCustomersCount = customers.filter(c => c.balance < 0).length;

  const filteredCustomers = customers.filter(c => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      c.name.toLowerCase().includes(query) || 
      c.phone.includes(query) || 
      (c.address && c.address.toLowerCase().includes(query));

    if (filterType === 'debtors') return matchesSearch && c.balance < 0;
    return matchesSearch;
  });

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('Iltimos, mijoz ismi va telefon raqamini kiriting!');
      return;
    }

    const parsedDebt = Math.max(0, parseFloat(initialDebt) || 0);

    const saved = AppDatabase.saveCustomer({
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      notes: notes.trim(),
      balance: parsedDebt > 0 ? -parsedDebt : 0,
    });

    if (parsedDebt > 0) {
      AppDatabase.addDebtTransaction({
        type: 'customer',
        entityId: saved.id,
        entityName: saved.name,
        amount: parsedDebt,
        paymentMethod: 'cash',
        action: 'take_debt',
        notes: "Boshlang'ich qarz balansi (Ro'yxatga olishda kiritildi)",
      });
    }

    setIsCustomerModalOpen(false);
    setName('');
    setPhone('');
    setAddress('');
    setNotes('');
    setInitialDebt('');
    onRefresh();
  };

  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) {
      alert('Iltimos, to\'lov summasini to\'g\'ri kiriting!');
      return;
    }

    AppDatabase.payCustomerDebt(selectedCustomer.id, amt, payMethod, payNotes);
    setSelectedCustomer(null);
    setPayAmount('');
    setPayNotes('');
    onRefresh();
  };

  const handleDeleteCustomer = (id: string, cName: string) => {
    if (!isAdmin) {
      alert("Mijozlarni o'chirish faqat Super Admin uchun ruxsat etilgan!");
      return;
    }
    if (window.confirm(`"${cName}" mijozini ro'yxatdan o'chirmoqchimisiz?`)) {
      AppDatabase.deleteCustomer(id);
      onRefresh();
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-5 space-y-4">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl glass-card flex items-center justify-between border">
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Nasiyadorlar Soni</span>
            <div className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono mt-0.5">
              {debtorCustomersCount} <span className="text-xs font-semibold text-slate-500">nafar mijoz</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-card flex items-center justify-between border">
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Umumiy Nasiya Summasi ($)</span>
            <div className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono mt-0.5">
              {formatUSD(totalDebtSum)}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-0.5 font-mono">
              ≈ {formatMoney(usdToUzs(totalDebtSum, usdRate))}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-card flex items-center justify-between border">
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Barcha Mijozlar</span>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
              {customers.length} nafar
            </div>
            <div className="text-[11px] font-semibold text-blue-500 mt-0.5">
              NBU kursi: 1$ = {formatMoney(usdRate).replace(" so'm", "")}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
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
              placeholder="Ism, telefon yoki manzil bo'yicha..."
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 font-semibold text-xs sm:text-sm focus:outline-none focus:border-blue-500 shadow-inner"
            />
          </div>

          <div className="flex rounded-xl bg-slate-200 dark:bg-slate-800 p-1 border border-slate-300 dark:border-slate-700 text-xs font-bold">
            <button
              onClick={() => setFilterType('debtors')}
              className={`px-3 py-1 rounded-lg transition-all interactive-press ${
                filterType === 'debtors' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Qarzdorlar
            </button>
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg transition-all interactive-press ${
                filterType === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Barchasi
            </button>
          </div>
        </div>

        {/* Add Customer Button */}
        <button
          onClick={() => setIsCustomerModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm shadow-md shadow-blue-600/30 transition-all shrink-0 interactive-press"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Yangi Mijoz Qo'shish</span>
        </button>
      </div>

      {/* Customers Table */}
      <div className="flex-1 overflow-hidden glass-panel rounded-2xl border flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 z-10">
              <tr>
                <th className="py-3 px-4">Mijoz</th>
                <th className="py-3 px-4">Telefon</th>
                <th className="py-3 px-4">Manzil</th>
                <th className="py-3 px-4">Eslatma</th>
                <th className="py-3 px-4 text-right">Qarzdorlik ($ / so'm)</th>
                <th className="py-3 px-4 text-center">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs sm:text-sm">
              {filteredCustomers.map((cust) => {
                const isDebtor = cust.balance < 0;
                return (
                  <tr key={cust.id} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors">
                    <td className={`py-3 px-4 font-bold text-slate-900 dark:text-white ${isLargeText ? 'text-base' : 'text-sm'}`}>
                      <div className="flex items-center gap-2">
                        <span>{cust.name}</span>
                        {isAdmin && cust.storeId && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${
                            cust.storeId === 'store_1' 
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50' 
                              : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700/50'
                          }`}>
                            {cust.storeId === 'store_1' ? "1-Do'kon" : "2-Do'kon"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-mono font-bold text-xs sm:text-sm">
                      {cust.phone}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">
                      {cust.address || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 italic">
                      {cust.notes || '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isDebtor ? (
                        <div>
                          <span className="font-mono font-black text-rose-600 dark:text-rose-400 text-sm sm:text-base">
                            {formatUSD(Math.abs(cust.balance))}
                          </span>
                          <div className="text-[11px] font-mono text-slate-500">
                            ≈ {formatMoney(usdToUzs(Math.abs(cust.balance), usdRate))}
                          </div>
                        </div>
                      ) : (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          $ 0.00
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {isDebtor && (
                          <button
                            onClick={() => {
                              setSelectedCustomer(cust);
                              setPayAmount(Math.abs(cust.balance).toString());
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md shadow-emerald-600/25 interactive-press"
                          >
                            Qarz to'lash
                          </button>
                        )}
                        <button
                          onClick={() => setShowHistoryModal(cust)}
                          className="p-1.5 rounded-lg border glass-card text-slate-600 dark:text-slate-300 hover:text-blue-600 interactive-press"
                          title="Tarix"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                          className="p-1.5 rounded-lg border glass-card text-slate-600 dark:text-slate-300 hover:text-rose-600 interactive-press"
                          title="O'chirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAY DEBT MODAL */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-3xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3.5">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Banknote className="w-5 h-5 text-emerald-500" />
                <span>Qarz To'lovini Qabul Qilish</span>
              </h3>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white interactive-press"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-slate-800/80 border border-blue-200 dark:border-slate-700 space-y-1">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Mijoz: {selectedCustomer.name}</div>
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-slate-600 dark:text-slate-300 text-xs">Hozirgi qarzi:</span>
                <span className="font-black text-rose-600 dark:text-rose-400 font-mono text-lg">
                  {formatUSD(Math.abs(selectedCustomer.balance))}
                </span>
              </div>
              <div className="text-right text-[11px] font-mono text-slate-500">
                ≈ {formatMoney(usdToUzs(Math.abs(selectedCustomer.balance), usdRate))}
              </div>
            </div>

            <form onSubmit={handleProcessPayment} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  To'lanayotgan Summa ($ USD) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-emerald-600 dark:text-emerald-400 font-mono font-black text-xl focus:outline-none focus:border-blue-500"
                />
                
                {/* Touch Quick Amount Presets */}
                <div className="grid grid-cols-4 gap-1.5 mt-2">
                  {[50, 100, 200, 500].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setPayAmount(amt.toString())}
                      className="py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold font-mono border border-slate-200 dark:border-slate-700 interactive-press"
                    >
                      +${amt}
                    </button>
                  ))}
                </div>

                <div className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 mt-2 text-right">
                  So'mda: ≈ <span className="text-slate-900 dark:text-white font-bold">{formatMoney(usdToUzs(parseFloat(payAmount) || 0, usdRate))}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">To'lov shakli</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayMethod('cash')}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all interactive-press ${
                      payMethod === 'cash' 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/30' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    Naqd ($ yoki So'm)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMethod('card')}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all interactive-press ${
                      payMethod === 'card' 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/30' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    Karta / O'tkazma
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold interactive-press"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md shadow-emerald-600/30 interactive-press"
                >
                  Qabul Qilish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD CUSTOMER MODAL */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-3xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3.5">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span>Yangi Mijoz Qo'shish</span>
              </h3>
              <button
                onClick={() => setIsCustomerModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white interactive-press"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Ism-sharifi *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Telefon raqami *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+998"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Manzil</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Mavjud Qarz Summasi ($ da)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={initialDebt}
                    onChange={(e) => setInitialDebt(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold text-sm focus:outline-none focus:border-rose-500"
                  />
                </div>
                {parseFloat(initialDebt) > 0 && (
                  <div className="text-[11px] font-mono font-semibold text-rose-500 mt-1">
                    ≈ {formatMoney(usdToUzs(parseFloat(initialDebt), usdRate))} qarz sifatida belgilanadi
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Eslatma / Izoh</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold interactive-press"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-md shadow-blue-600/30 interactive-press"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-3xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3.5">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                <span>{showHistoryModal.name} — Tarix</span>
              </h3>
              <button
                onClick={() => setShowHistoryModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white interactive-press"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2.5">
              {transactions.filter(t => t.entityId === showHistoryModal.id).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Operatsiyalar mavjud emas</p>
              ) : (
                transactions.filter(t => t.entityId === showHistoryModal.id).map(trx => (
                  <div key={trx.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <span className={`text-xs font-black ${trx.action === 'pay_debt' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {trx.action === 'pay_debt' ? "Qarz to'landi" : "Nasiyaga tovar olindi"}
                      </span>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{formatDateTime(trx.createdAt)} • {trx.notes || ''}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-black text-sm text-slate-900 dark:text-white">
                        {formatUSD(trx.amount)}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        ≈ {formatMoney(usdToUzs(trx.amount, usdRate))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
