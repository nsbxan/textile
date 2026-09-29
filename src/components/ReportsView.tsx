import React, { useState } from 'react';
import { 
  BarChart3, 
  DollarSign, 
  CreditCard, 
  Banknote, 
  Users, 
  Receipt, 
  Printer, 
  Trash2, 
  Award,
  CheckCircle2,
  ArrowDownLeft
} from 'lucide-react';
import { Sale, Expense, Product, StoreFilterId } from '../types';
import { AppDatabase } from '../db';
import { formatMoney, formatUSD, formatKg, usdToUzs, formatDateTime } from '../utils/formatters';
import { getCachedRate } from '../utils/currency';

interface ReportsViewProps {
  sales: Sale[];
  expenses: Expense[];
  products: Product[];
  onOpenReceipt: (sale: Sale) => void;
  onRefresh: () => void;
  isLargeText: boolean;
  isAdmin?: boolean;
  storeFilter?: StoreFilterId;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  sales,
  expenses,
  products,
  onOpenReceipt,
  onRefresh,
  isLargeText,
  isAdmin = true,
  storeFilter = 'store_1',
}) => {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [historyTab, setHistoryTab] = useState<'sales' | 'debts'>('sales');
  const usdRate = getCachedRate().sellRate;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = startOfToday - (now.getDay() === 0 ? 6 : now.getDay() - 1) * 86400000;
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const filteredSales = sales.filter(s => {
    const saleTime = new Date(s.createdAt).getTime();
    if (period === 'today') return saleTime >= startOfToday;
    if (period === 'week') return saleTime >= startOfWeek;
    if (period === 'month') return saleTime >= startOfMonth;
    return true;
  });

  const filteredExpenses = expenses.filter(e => {
    const expTime = new Date(e.date || e.createdAt).getTime();
    if (period === 'today') return expTime >= startOfToday;
    if (period === 'week') return expTime >= startOfWeek;
    if (period === 'month') return expTime >= startOfMonth;
    return true;
  });

  // Debt Repayments (Qarzdorlardan tushgan pul)
  const allDebtTrxs = AppDatabase.getDebtTransactions();
  const customerDebtPayments = allDebtTrxs.filter(
    t => t.type === 'customer' && t.action === 'pay_debt'
  );

  const filteredDebtPayments = customerDebtPayments.filter(t => {
    const tTime = new Date(t.createdAt).getTime();
    if (period === 'today') return tTime >= startOfToday;
    if (period === 'week') return tTime >= startOfWeek;
    if (period === 'month') return tTime >= startOfMonth;
    return true;
  });

  const totalSalesRevenue = filteredSales.reduce((sum, s) => sum + s.finalAmount, 0);
  const totalDebtCollected = filteredDebtPayments.reduce((sum, t) => sum + t.amount, 0);
  const totalGrossProfit = filteredSales.reduce((sum, s) => sum + s.profit, 0);
  const totalExpensesAmt = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalGrossProfit - totalExpensesAmt;

  // Yalpi Tushum (Savdo + Qarzdorlar to'lagan pul)
  const totalAllInflow = totalSalesRevenue + totalDebtCollected;

  const totalSalesCash = filteredSales.reduce((sum, s) => sum + s.paidCash, 0);
  const totalSalesCard = filteredSales.reduce((sum, s) => sum + s.paidCard, 0);
  const totalDebtGiven = filteredSales.reduce((sum, s) => sum + s.paidDebt, 0);

  const debtCashCollected = filteredDebtPayments
    .filter(t => t.paymentMethod === 'cash')
    .reduce((sum, t) => sum + t.amount, 0);
  const debtCardCollected = filteredDebtPayments
    .filter(t => t.paymentMethod === 'card')
    .reduce((sum, t) => sum + t.amount, 0);

  const averageReceipt = filteredSales.length > 0 ? totalSalesRevenue / filteredSales.length : 0;

  const productSalesMap: { [id: string]: { name: string; qty: number; revenue: number } } = {};
  filteredSales.forEach(s => {
    s.items.forEach(it => {
      if (!productSalesMap[it.productId]) {
        productSalesMap[it.productId] = { name: it.name, qty: 0, revenue: 0 };
      }
      productSalesMap[it.productId].qty += it.quantity;
      productSalesMap[it.productId].revenue += it.total;
    });
  });

  const topProducts = Object.values(productSalesMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 6);

  const handleDeleteSale = (saleId: string, receiptNum: string) => {
    if (!isAdmin) {
      alert("Cheklarni bekor qilish faqat Super Admin uchun ruxsat etilgan!");
      return;
    }
    if (window.confirm(`Ushbu ${receiptNum} chekni bekor qilib, tovarlarni omborga qaytarmoqchimisiz?`)) {
      AppDatabase.deleteSale(saleId);
      onRefresh();
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-5 space-y-4">
      {/* Period Filter Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 glass-panel p-3.5 rounded-2xl border">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Savdo va Moliyaviy Hisobotlar (Daromadlar)
          </h2>
        </div>

        <div className="flex rounded-xl bg-slate-200 dark:bg-slate-800 p-1 border border-slate-300 dark:border-slate-700 text-xs font-bold">
          <button
            onClick={() => setPeriod('today')}
            className={`px-3.5 py-1.5 rounded-lg transition-all interactive-press ${
              period === 'today' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Bugun
          </button>
          <button
            onClick={() => setPeriod('week')}
            className={`px-3.5 py-1.5 rounded-lg transition-all interactive-press ${
              period === 'week' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Shu Hafta
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-3.5 py-1.5 rounded-lg transition-all interactive-press ${
              period === 'month' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Shu Oy
          </button>
          <button
            onClick={() => setPeriod('all')}
            className={`px-3.5 py-1.5 rounded-lg transition-all interactive-press ${
              period === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Barchasi
          </button>
        </div>
      </div>

      {/* Main KPI Cards (Large, bold, high contrast) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Yalpi Tushum */}
        <div className="p-4 rounded-2xl glass-card border space-y-1">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Yalpi Tushum (Savdo + Qarz)</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {formatUSD(totalAllInflow)}
          </div>
          <div className="text-[11px] font-mono font-semibold text-slate-500">
            ≈ {formatMoney(usdToUzs(totalAllInflow, usdRate))}
          </div>
        </div>

        {/* Card 2: Undirilgan Qarzlar (Qarzdorlar to'lagan pul) */}
        <div className="p-4 rounded-2xl glass-card border border-emerald-500/30 bg-emerald-500/5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Qarzdan Tushum</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono">
              +{filteredDebtPayments.length} to'lov
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            +{formatUSD(totalDebtCollected)}
          </div>
          <div className="text-[11px] font-mono font-semibold text-emerald-600/80 dark:text-emerald-400/80">
            ≈ {formatMoney(usdToUzs(totalDebtCollected, usdRate))}
          </div>
        </div>

        {isAdmin ? (
          <>
            <div className="p-4 rounded-2xl glass-card border space-y-1">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Xarajatlar</span>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
                -{formatUSD(totalExpensesAmt)}
              </div>
              <div className="text-xs font-semibold text-slate-500">
                {filteredExpenses.length} ta yozuv
              </div>
            </div>

            <div className="p-4 rounded-2xl glass-card border space-y-1">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">SOF FOYDA</span>
              <div className={`text-2xl font-black font-mono ${netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatUSD(netProfit)}
              </div>
              <div className="text-[11px] font-mono font-semibold text-slate-500">
                Savdo foydasi: +{formatUSD(totalGrossProfit)}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="p-4 rounded-2xl glass-card border space-y-1">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Sotilgan Jami Mato</span>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
                {formatKg(filteredSales.reduce((sum, s) => sum + s.items.reduce((iSum, it) => iSum + it.quantity, 0), 0))}
              </div>
              <div className="text-[11px] font-mono font-semibold text-slate-500">
                Barcha to'plar bo'yicha
              </div>
            </div>

            <div className="p-4 rounded-2xl glass-card border space-y-1">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Jami Cheklar Soni</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {filteredSales.length} ta
              </div>
              <div className="text-xs font-semibold text-slate-500">
                O'rtacha: {formatUSD(averageReceipt)}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Breakdown & Top Selling */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {/* Payment Channels */}
        <div className="p-4 rounded-2xl glass-card border space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">To'lov Turlari Bo'yicha Tushum</h3>

          <div className="space-y-2">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs sm:text-sm">
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block">Naqd pulda:</span>
                <span className="text-[10px] text-slate-500 font-mono">Savdo: {formatUSD(totalSalesCash)} + Qarz: {formatUSD(debtCashCollected)}</span>
              </div>
              <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm sm:text-base">
                {formatUSD(totalSalesCash + debtCashCollected)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs sm:text-sm">
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block">Plastik kartada:</span>
                <span className="text-[10px] text-slate-500 font-mono">Savdo: {formatUSD(totalSalesCard)} + Qarz: {formatUSD(debtCardCollected)}</span>
              </div>
              <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-sm sm:text-base">
                {formatUSD(totalSalesCard + debtCardCollected)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs sm:text-sm">
              <div>
                <span className="font-bold text-emerald-700 dark:text-emerald-300 block">Qarzdan tushgan pul:</span>
                <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">Undirilgan barcha to'lovlar</span>
              </div>
              <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm sm:text-base">
                +{formatUSD(totalDebtCollected)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs sm:text-sm">
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block">Yangi berilgan nasiya:</span>
                <span className="text-[10px] text-slate-500">Mijozlar hisobiga yozilgan</span>
              </div>
              <span className="font-mono font-black text-rose-600 dark:text-rose-400 text-sm sm:text-base">
                {formatUSD(totalDebtGiven)}
              </span>
            </div>
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="lg:col-span-2 p-4 rounded-2xl glass-card border space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Eng Ko'p Sotilgan Matolar (kg)</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {topProducts.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center col-span-2">Sotuvlar mavjud emas</p>
            ) : (
              topProducts.map((p, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-black">
                      {idx + 1}
                    </span>
                    <div>
                      <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-1">{p.name}</h5>
                      <span className="text-xs font-semibold text-slate-500">{formatKg(p.qty)} sotildi</span>
                    </div>
                  </div>
                  <span className="font-mono font-black text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                    {formatUSD(p.revenue)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* History Tabs Section */}
      <div className="flex-1 overflow-hidden glass-panel rounded-2xl border flex flex-col">
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex rounded-xl bg-slate-200 dark:bg-slate-800 p-1 border border-slate-300 dark:border-slate-700 text-xs font-bold w-fit">
            <button
              onClick={() => setHistoryTab('sales')}
              className={`px-3.5 py-1.5 rounded-lg transition-all interactive-press flex items-center gap-1.5 ${
                historyTab === 'sales'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Savdo Cheklari ({filteredSales.length})</span>
            </button>
            <button
              onClick={() => setHistoryTab('debts')}
              className={`px-3.5 py-1.5 rounded-lg transition-all interactive-press flex items-center gap-1.5 ${
                historyTab === 'debts'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>Qarzdorlardan Tushgan Pul ({filteredDebtPayments.length})</span>
            </button>
          </div>

          <span className="text-xs font-bold font-mono text-slate-600 dark:text-slate-400">
            {historyTab === 'sales' 
              ? `Jami savdo: ${formatUSD(totalSalesRevenue)}`
              : `Jami undirilgan: +${formatUSD(totalDebtCollected)}`}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {historyTab === 'sales' ? (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 z-10">
                <tr>
                  <th className="py-3 px-4">Chek №</th>
                  <th className="py-3 px-4">Vaqti</th>
                  <th className="py-3 px-4">Mijoz</th>
                  <th className="py-3 px-4 text-center">To'lov</th>
                  <th className="py-3 px-4 text-right">Summasi ($ / so'm)</th>
                  {isAdmin && <th className="py-3 px-4 text-right">Foydasi ($)</th>}
                  <th className="py-3 px-4 text-center">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs sm:text-sm">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-xs sm:text-sm text-blue-600 dark:text-blue-400">
                      <span>{sale.receiptNumber}</span>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-600 dark:text-slate-400">
                      {formatDateTime(sale.createdAt)}
                    </td>
                    <td className={`py-3 px-4 font-bold text-slate-900 dark:text-white ${isLargeText ? 'text-base' : 'text-sm'}`}>
                      {sale.customerName || 'Chakana xaridor'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-xs text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800">
                        {sale.paymentMethod === 'cash' ? 'Naqd' :
                         sale.paymentMethod === 'card' ? 'Karta' :
                         sale.paymentMethod === 'debt' ? 'Nasiya' : 'Aralash'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="font-mono font-black text-slate-900 dark:text-white text-sm sm:text-base">
                        {formatUSD(sale.finalAmount)}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        ≈ {formatMoney(sale.finalAmountUZS || usdToUzs(sale.finalAmount, sale.exchangeRate || usdRate))}
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm sm:text-base">
                        +{formatUSD(sale.profit)}
                      </td>
                    )}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onOpenReceipt(sale)}
                          className="p-1.5 rounded-lg border glass-card text-slate-600 dark:text-slate-300 hover:text-blue-600 interactive-press"
                          title="Chekni ko'rish"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteSale(sale.id, sale.receiptNumber)}
                            className="p-1.5 rounded-lg border glass-card text-slate-600 dark:text-slate-300 hover:text-rose-600 interactive-press"
                            title="Bekor qilish (Faqat Super Admin)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 z-10">
                <tr>
                  <th className="py-3 px-4">To'lov Vaqti</th>
                  <th className="py-3 px-4">Mijoz (Qarzdor)</th>
                  <th className="py-3 px-4 text-center">To'lov Usuli</th>
                  <th className="py-3 px-4">Izoh / Maqsad</th>
                  <th className="py-3 px-4 text-right">Qabul Qilingan Pul ($ / so'm)</th>
                  <th className="py-3 px-4 text-center">Holat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs sm:text-sm">
                {filteredDebtPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400 font-semibold">
                      Tanlangan davrda qarzdorlardan pul to'lovi kelib tushmagan
                    </td>
                  </tr>
                ) : (
                  filteredDebtPayments.map((trx) => (
                    <tr key={trx.id} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                        {formatDateTime(trx.createdAt)}
                      </td>
                      <td className={`py-3 px-4 font-bold text-slate-900 dark:text-white ${isLargeText ? 'text-base' : 'text-sm'}`}>
                        {trx.entityName}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-xs text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30">
                          {trx.paymentMethod === 'cash' ? 'Naqd Pul' : 'Plastik Karta'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 italic">
                        {trx.notes || "Qarz to'lovi"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm sm:text-base">
                          +{formatUSD(trx.amount)}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                          ≈ +{formatMoney(usdToUzs(trx.amount, usdRate))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Daromadga olindi
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
