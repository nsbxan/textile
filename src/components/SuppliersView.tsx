import React, { useState } from 'react';
import { 
  Truck, 
  Search, 
  Plus, 
  PackagePlus, 
  DollarSign, 
  X, 
  Trash2, 
  FileText,
  Scan,
} from 'lucide-react';
import { Supplier, Product, SupplyOrder, SupplyOrderItem } from '../types';
import { AppDatabase } from '../db';
import { formatMoney, formatUSD, formatKg, usdToUzs, formatDateTime, formatBatchNumber } from '../utils/formatters';
import { getCachedRate } from '../utils/currency';

interface SuppliersViewProps {
  suppliers: Supplier[];
  products: Product[];
  onRefresh: () => void;
  isLargeText: boolean;
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({
  suppliers,
  products,
  onRefresh,
  isLargeText,
}) => {
  const [activeTab, setActiveTab] = useState<'suppliers' | 'orders'>('suppliers');
  const [searchQuery, setSearchQuery] = useState('');
  const usdRate = getCachedRate().sellRate;

  // Supplier Modal State
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [notes, setNotes] = useState('');

  // Supply Order Modal State
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderSupplierId, setOrderSupplierId] = useState('');
  const [orderItems, setOrderItems] = useState<SupplyOrderItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemQty, setItemQty] = useState('');
  const [itemBuyPrice, setItemBuyPrice] = useState('');
  const [itemSellPrice, setItemSellPrice] = useState('');
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState('');

  // Pay Supplier Modal
  const [payingSupplier, setPayingSupplier] = useState<Supplier | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'card'>('cash');

  const supplyOrders = AppDatabase.getSupplyOrders();
  const totalDebtToSuppliers = suppliers.reduce((sum, s) => sum + s.balance, 0);

  const handleAddItemToOrder = () => {
    if (!selectedProductId || !itemQty || !itemBuyPrice) {
      alert('Iltimos, tovar, miqdor va kirim narxini kiriting!');
      return;
    }

    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;

    const qty = parseFloat(itemQty) || 1;
    const buyP = parseFloat(itemBuyPrice) || 0;
    const sellP = itemSellPrice ? parseFloat(itemSellPrice) : undefined;

    setOrderItems(prev => [
      ...prev,
      {
        productId: prod.id,
        name: prod.name,
        barcode: prod.barcode,
        quantity: qty,
        buyPrice: buyP,
        sellPrice: sellP,
        total: qty * buyP,
      }
    ]);

    setSelectedProductId('');
    setItemQty('');
    setItemBuyPrice('');
    setItemSellPrice('');
  };

  const handleRemoveOrderItem = (index: number) => {
    setOrderItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const orderTotal = orderItems.reduce((sum, item) => sum + item.total, 0);

  const handleFinalizeOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderSupplierId) {
      alert('Iltimos, yetkazib beruvchini tanlang!');
      return;
    }
    if (orderItems.length === 0) {
      alert('Kamida bitta tovar kirim qiling!');
      return;
    }

    const sup = suppliers.find(s => s.id === orderSupplierId);
    if (!sup) return;

    const paid = parseFloat(paidAmount) || 0;
    const debt = Math.max(0, orderTotal - paid);

    AppDatabase.processSupplyOrder({
      supplierId: sup.id,
      supplierName: sup.name,
      items: orderItems,
      totalAmount: orderTotal,
      paidAmount: paid,
      debtAmount: debt,
      notes: orderNotes,
    });

    setIsOrderModalOpen(false);
    setOrderItems([]);
    setOrderSupplierId('');
    setPaidAmount('');
    setOrderNotes('');
    onRefresh();
    alert('Kirim muvaffaqiyatli saqlandi va ombor qoldiqlari yangilandi!');
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('Iltimos, ism va telefon raqamini kiriting!');
      return;
    }

    AppDatabase.saveSupplier({
      name: name.trim(),
      phone: phone.trim(),
      company: company.trim(),
      notes: notes.trim(),
      balance: 0,
    });

    setIsSupplierModalOpen(false);
    setName('');
    setPhone('');
    setCompany('');
    setNotes('');
    onRefresh();
  };

  const handlePaySupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingSupplier) return;
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) {
      alert('Summani to\'g\'ri kiriting!');
      return;
    }

    AppDatabase.paySupplierDebt(payingSupplier.id, amt, payMethod);
    setPayingSupplier(null);
    setPayAmount('');
    onRefresh();
  };

  const handleDeleteSupplier = (id: string, sName: string) => {
    if (window.confirm(`"${sName}" ta'minotchisini o'chirmoqchimisiz?`)) {
      AppDatabase.deleteSupplier(id);
      onRefresh();
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-5 space-y-4">
      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl glass-card flex items-center justify-between border">
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Jami Ta'minotchilar</span>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
              {suppliers.length} ta
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-card flex items-center justify-between border">
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Yetkazuvchilarga Qarzimiz ($)</span>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">
              {formatUSD(totalDebtToSuppliers)}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-0.5 font-mono">
              ≈ {formatMoney(usdToUzs(totalDebtToSuppliers, usdRate))}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-card flex items-center justify-between border">
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Kirim Hujjatlari</span>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
              {supplyOrders.length} ta
            </div>
            <div className="text-[11px] font-semibold text-blue-500 mt-0.5">
              NBU kursi: 1$ = {formatMoney(usdRate).replace(" so'm", "")}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 glass-panel p-3.5 rounded-2xl border">
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-slate-200 dark:bg-slate-800 p-1 border border-slate-300 dark:border-slate-700 text-xs font-bold">
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`px-4 py-2 rounded-lg transition-all interactive-press ${
                activeTab === 'suppliers' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              To'quv Fabrikalari / Ta'minotchilar
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 rounded-lg transition-all interactive-press ${
                activeTab === 'orders' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Kirim Hujjatlari Tarixi
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsSupplierModalOpen(true)}
            className="px-4 py-2 rounded-xl glass-card border text-slate-700 dark:text-slate-200 hover:border-blue-500 font-bold text-xs sm:text-sm transition-all interactive-press"
          >
            Yangi Ta'minotchi
          </button>

          <button
            onClick={() => {
              setOrderItems([]);
              setIsOrderModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm shadow-md shadow-blue-600/30 transition-all interactive-press"
          >
            <PackagePlus className="w-4 h-4 stroke-[2.5]" />
            <span>Omborga Mato Kirimi</span>
          </button>
        </div>
      </div>

      {/* Tables */}
      {activeTab === 'suppliers' ? (
        <div className="flex-1 overflow-hidden glass-panel rounded-2xl border flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 z-10">
                <tr>
                  <th className="py-3 px-4">Firma / Vakil</th>
                  <th className="py-3 px-4">Telefon</th>
                  <th className="py-3 px-4">Kompaniya</th>
                  <th className="py-3 px-4">Eslatma</th>
                  <th className="py-3 px-4 text-right">Qarzimiz ($ / so'm)</th>
                  <th className="py-3 px-4 text-center">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs sm:text-sm">
                {suppliers.map((sup) => (
                  <tr key={sup.id} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors">
                    <td className={`py-3 px-4 font-bold text-slate-900 dark:text-white ${isLargeText ? 'text-base' : 'text-sm'}`}>
                      {sup.name}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
                      {sup.phone}
                    </td>
                    <td className="py-3 px-4 font-semibold text-blue-600 dark:text-blue-400">
                      {sup.company || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 italic">
                      {sup.notes || '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {sup.balance > 0 ? (
                        <div>
                          <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm sm:text-base">
                            {formatUSD(sup.balance)}
                          </span>
                          <div className="text-[11px] font-mono text-slate-500">
                            ≈ {formatMoney(usdToUzs(sup.balance, usdRate))}
                          </div>
                        </div>
                      ) : (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">$ 0.00</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {sup.balance > 0 && (
                          <button
                            onClick={() => {
                              setPayingSupplier(sup);
                              setPayAmount(sup.balance.toString());
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md shadow-emerald-600/25 interactive-press"
                          >
                            Qarz to'lash
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteSupplier(sup.id, sup.name)}
                          className="p-1.5 rounded-lg border glass-card text-slate-600 dark:text-slate-300 hover:text-rose-600 interactive-press"
                          title="O'chirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden glass-panel rounded-2xl border flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 z-10">
                <tr>
                  <th className="py-3 px-4">Hujjat №</th>
                  <th className="py-3 px-4">Yetkazib Beruvchi</th>
                  <th className="py-3 px-4">Sana</th>
                  <th className="py-3 px-4 text-center">Matolar</th>
                  <th className="py-3 px-4 text-right">Jami Summa ($)</th>
                  <th className="py-3 px-4 text-right">To'landi ($)</th>
                  <th className="py-3 px-4 text-right">Qarzga Qoldi ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs sm:text-sm">
                {supplyOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400 text-sm">
                      Kirim hujjatlari mavjud emas
                    </td>
                  </tr>
                ) : (
                  supplyOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-xs sm:text-sm text-blue-600 dark:text-blue-400">
                        {ord.docNumber}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {ord.supplierName}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono text-xs">
                        {formatDateTime(ord.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-700 dark:text-slate-300">
                        {ord.items.length} xil mato
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-slate-900 dark:text-white">
                        {formatUSD(ord.totalAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatUSD(ord.paidAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                        {formatUSD(ord.debtAmount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NEW SUPPLY ORDER (KIRIM) MODAL */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-emerald-500" />
                <span>Omborga Tovar Kirimi</span>
              </h3>
              <button
                onClick={() => setIsOrderModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white interactive-press"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Yetkazib Beruvchi *</label>
                <select
                  required
                  value={orderSupplierId}
                  onChange={(e) => setOrderSupplierId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Tanlang --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.company || s.phone})</option>
                  ))}
                </select>
              </div>

              {/* Add item row */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Matoni tanlang:</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => {
                        setSelectedProductId(e.target.value);
                        const p = products.find(prod => prod.id === e.target.value);
                        if (p) {
                          setItemBuyPrice(p.buyPrice.toString());
                          setItemSellPrice(p.sellPrice.toString());
                        }
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold text-xs sm:text-sm"
                    >
                      <option value="">-- Tanlang --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>[{formatBatchNumber(p)}] {p.name} {p.color ? `(${p.color})` : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Vazni (kg da):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={itemQty}
                      onChange={(e) => setItemQty(e.target.value)}
                      placeholder="25.0"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold text-xs sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Kirim narxi ($/kg):</label>
                    <input
                      type="number"
                      step="0.01"
                      value={itemBuyPrice}
                      onChange={(e) => setItemBuyPrice(e.target.value)}
                      placeholder="5.20"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddItemToOrder}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold interactive-press shadow-sm"
                  >
                    + Hujjatga qo'shish
                  </button>
                </div>
              </div>

              {/* Items List in this doc */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3">Mato / Partiya №</th>
                      <th className="p-3 text-center">Vazn (kg)</th>
                      <th className="p-3 text-right">Kirim ($/kg)</th>
                      <th className="p-3 text-right">Jami ($)</th>
                      <th className="p-3 text-center">O'chirish</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {orderItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-4 text-slate-400">
                          Mato qo'shilmadi
                        </td>
                      </tr>
                    ) : (
                      orderItems.map((it, idx) => (
                        <tr key={idx}>
                          <td className="p-3 font-bold">
                            <div>{it.name}</div>
                            <div className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400">
                              Partiya №: {formatBatchNumber({ barcode: it.barcode, id: it.productId })}
                            </div>
                          </td>
                          <td className="p-3 text-center font-mono font-bold">{formatKg(it.quantity)}</td>
                          <td className="p-3 text-right font-mono font-semibold">{formatUSD(it.buyPrice)}</td>
                          <td className="p-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">{formatUSD(it.total)}</td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveOrderItem(idx)}
                              className="text-slate-400 hover:text-rose-600 interactive-press"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">To'lanayotgan summa ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-emerald-600 dark:text-emerald-400 font-mono font-black text-sm"
                  />
                  <div className="text-[11px] font-mono text-slate-500 mt-1">
                    So'mda: ≈ {formatMoney(usdToUzs(parseFloat(paidAmount) || 0, usdRate))}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col justify-center text-right">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Jami Kirim Summasi:</span>
                  <span className="text-xl font-black text-slate-900 dark:text-white font-mono">
                    {formatUSD(orderTotal)}
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-500 mt-0.5">
                    ≈ {formatMoney(usdToUzs(orderTotal, usdRate))}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsOrderModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm interactive-press"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={handleFinalizeOrder}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-black shadow-md shadow-emerald-600/30 interactive-press"
              >
                Tasdiqlash va Saqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW SUPPLIER MODAL */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-3xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3.5">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                <span>Yangi Ta'minotchi</span>
              </h3>
              <button
                onClick={() => setIsSupplierModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white interactive-press"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Ta'minotchi Ismi / Vakil *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Masalan: Azizbek"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Telefon *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Firma / Kompaniya</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Masalan: Nestle LLC"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold interactive-press"
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

      {/* PAY SUPPLIER DEBT MODAL */}
      {payingSupplier && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-3xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3.5">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                <span>Ta'minotchiga Qarz To'lash</span>
              </h3>
              <button
                onClick={() => setPayingSupplier(null)}
                className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white interactive-press"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Yetkazuvchi: {payingSupplier.name}</div>
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-slate-600 dark:text-slate-300 text-xs">Qarzimiz:</span>
                <span className="font-black text-amber-600 dark:text-amber-400 font-mono text-base">
                  {formatUSD(payingSupplier.balance)}
                </span>
              </div>
              <div className="text-right text-[11px] font-mono text-slate-500">
                ≈ {formatMoney(usdToUzs(payingSupplier.balance, usdRate))}
              </div>
            </div>

            <form onSubmit={handlePaySupplierSubmit} className="space-y-3.5">
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-emerald-600 dark:text-emerald-400 font-mono font-black text-lg"
                />
                <div className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 mt-1.5 text-right">
                  So'mda: ≈ <span className="text-slate-900 dark:text-white font-bold">{formatMoney(usdToUzs(parseFloat(payAmount) || 0, usdRate))}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPayingSupplier(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold interactive-press"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md shadow-emerald-600/30 interactive-press"
                >
                  Tasdiqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
