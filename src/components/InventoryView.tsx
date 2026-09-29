import React, { useState } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  QrCode, 
  AlertTriangle, 
  X, 
  Check, 
  DollarSign,
  Layers,
  Scan
} from 'lucide-react';
import { Product, UnitType, StoreFilterId } from '../types';
import { AppDatabase } from '../db';
import { formatUSD, formatKg, formatBatchNumber } from '../utils/formatters';

interface InventoryViewProps {
  products: Product[];
  onOpenBarcodeModal: (product: Product) => void;
  onRefresh: () => void;
  isLargeText: boolean;
  isAdmin: boolean;
  storeFilter?: StoreFilterId;
  deviceStoreId?: string;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  onOpenBarcodeModal,
  onRefresh,
  isLargeText,
  isAdmin,
  storeFilter = 'store_1',
  deviceStoreId = 'store_1',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Barchasi');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  
  // Product Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form Fields - Knitted Fabric Specific
  const [name, setName] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('Kulevka');
  const [unit, setUnit] = useState<UnitType>('kg');
  const [density, setDensity] = useState('');
  const [color, setColor] = useState('');
  const [rolls, setRolls] = useState<string>('1');
  const [buyPrice, setBuyPrice] = useState<string>('');
  const [sellPrice, setSellPrice] = useState<string>('');
  const [stock, setStock] = useState<string>('');
  const [minStock, setMinStock] = useState<string>('20');

  const categories = ['Barchasi', ...Array.from(new Set(products.map(p => p.category)))];

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setName('');
    setBatchNumber('');
    setBarcode(Date.now().toString());
    setCategory('Kulevka');
    setUnit('kg');
    setDensity('180 gr/m²');
    setColor('Qora');
    setRolls('1');
    setBuyPrice('5.20');
    setSellPrice('6.50');
    setStock('25.0');
    setMinStock('20');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setBatchNumber(p.batchNumber || formatBatchNumber(p));
    setBarcode(p.barcode);
    setCategory(p.category);
    setUnit(p.unit || 'kg');
    setDensity(p.density || '');
    setColor(p.color || '');
    setRolls(p.rolls !== undefined ? p.rolls.toString() : '1');
    setBuyPrice(p.buyPrice.toString());
    setSellPrice(p.sellPrice.toString());
    setStock(p.stock.toString());
    setMinStock(p.minStock.toString());
    setIsModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Iltimos, mato nomini kiriting!');
      return;
    }

    const buy = parseFloat(buyPrice) || 0;
    const sell = parseFloat(sellPrice) || 0;
    const st = parseFloat(stock) || 0;
    const minSt = parseFloat(minStock) || 20;
    const rollCount = parseInt(rolls) || 1;

    AppDatabase.saveProduct({
      id: editingProduct?.id,
      name: name.trim(),
      batchNumber: batchNumber.trim() || undefined,
      barcode: barcode.trim() || Date.now().toString(),
      category: category.trim() || 'Trikotaj',
      unit,
      density: density.trim() || undefined,
      color: color.trim() || undefined,
      rolls: rollCount,
      buyPrice: buy,
      sellPrice: sell,
      stock: st,
      minStock: minSt,
      storeId: 'store_1',
    });

    setIsModalOpen(false);
    onRefresh();
  };

  const handleDelete = (id: string, pName: string) => {
    if (!isAdmin) {
      alert("Matolar va rulonlarni bazadan o'chirish faqat Admin (Rahbar) uchun ruxsat etilgan!");
      return;
    }
    if (window.confirm(`Haqiqatdan ham "${pName}" matosini bazadan o'chirmoqchimisiz?`)) {
      AppDatabase.deleteProduct(id);
      onRefresh();
    }
  };

  const totalKgCount = products.reduce((sum, p) => sum + p.stock, 0);
  const totalRollsCount = products.reduce((sum, p) => sum + (p.rolls || 1), 0);
  const totalBuyValue = products.reduce((sum, p) => sum + (p.buyPrice * p.stock), 0);
  const totalSellValue = products.reduce((sum, p) => sum + (p.sellPrice * p.stock), 0);
  const potentialProfit = totalSellValue - totalBuyValue;
  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;

  const filteredProducts = products.filter(p => {
    const matchesCategory = categoryFilter === 'Barchasi' || p.category === categoryFilter;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = 
      p.name.toLowerCase().includes(query) || 
      p.barcode.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query) ||
      (p.color && p.color.toLowerCase().includes(query));

    let matchesStock = true;
    if (stockFilter === 'low') {
      matchesStock = p.stock <= p.minStock && p.stock > 0;
    } else if (stockFilter === 'out') {
      matchesStock = p.stock <= 0;
    }

    return matchesCategory && matchesSearch && matchesStock;
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-5 space-y-4">
      {/* Top Overview Cards (Glassmorphism & High Contrast) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl glass-card flex items-center justify-between border">
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Jami Matolar Qoldig'i</span>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
              {formatKg(totalKgCount)} <span className="text-xs font-semibold text-slate-500">({totalRollsCount} to'p, {products.length} xil)</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Package className="w-5 h-5" />
          </div>
        </div>

        {isAdmin ? (
          <>
            <div className="p-4 rounded-2xl glass-card flex items-center justify-between border">
              <div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Ombor Tannarxi ($)</span>
                <div className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                  {formatUSD(totalBuyValue)}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl glass-card flex items-center justify-between border">
              <div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Kutilayotgan Foyda ($)</span>
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                  +{formatUSD(potentialProfit)}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="p-4 rounded-2xl glass-card flex items-center justify-between border">
              <div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Ombordagi Jami Mato</span>
                <div className="text-xl font-black text-blue-600 dark:text-blue-400 font-mono mt-0.5">
                  {formatKg(totalKgCount)}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <Layers className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl glass-card flex items-center justify-between border">
              <div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Jami To'plar Soni</span>
                <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
                  {totalRollsCount} to'p
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold">
                <Package className="w-5 h-5" />
              </div>
            </div>
          </>
        )}

        <div className="p-4 rounded-2xl glass-card flex items-center justify-between border">
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Kam Qolgan Matolar</span>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">
              {lowStockCount} xil mato
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Action Bar & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 glass-panel p-3.5 rounded-2xl border">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Mato nomi, rangi, turi yoki partiya raqami..."
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 font-semibold text-xs sm:text-sm focus:outline-none focus:border-blue-500 shadow-inner"
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold text-xs sm:text-sm focus:outline-none focus:border-blue-500"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Stock Filter Pills */}
          <div className="hidden lg:flex rounded-xl bg-slate-200 dark:bg-slate-800 p-1 border border-slate-300 dark:border-slate-700 text-xs font-bold">
            <button
              onClick={() => setStockFilter('all')}
              className={`px-3 py-1 rounded-lg transition-all interactive-press ${
                stockFilter === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Barchasi
            </button>
            <button
              onClick={() => setStockFilter('low')}
              className={`px-3 py-1 rounded-lg transition-all interactive-press ${
                stockFilter === 'low' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Kam qolganlar
            </button>
            <button
              onClick={() => setStockFilter('out')}
              className={`px-3 py-1 rounded-lg transition-all interactive-press ${
                stockFilter === 'out' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Tugaganlar
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Add Product Button */}
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm border border-blue-500 transition-all shrink-0 interactive-press"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Yangi Mato Qo'shish</span>
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="flex-1 overflow-hidden glass-panel rounded-2xl border flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 z-10">
              <tr>
                <th className="py-3 px-3 text-center">QR</th>
                <th className="py-3 px-4">Partiya №</th>
                <th className="py-3 px-4">Mato Nomi & Rangi</th>
                <th className="py-3 px-4">Turi / Grammaj</th>
                <th className="py-3 px-4 text-center">To'plar</th>
                {isAdmin && <th className="py-3 px-4 text-right">Tannarx ($/kg)</th>}
                <th className="py-3 px-4 text-right">Sotish ($/kg)</th>
                <th className="py-3 px-4 text-center">Ombor Qoldig'i (kg)</th>
                <th className="py-3 px-4 text-right">Jami Qiymati ($)</th>
                <th className="py-3 px-4 text-center">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs sm:text-sm">
              {filteredProducts.map((product) => {
                const isLow = product.stock <= product.minStock && product.stock > 0;
                const isOut = product.stock <= 0;
                const totalVal = product.stock * product.sellPrice;

                return (
                  <tr key={product.id} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => onOpenBarcodeModal(product)}
                        className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 transition-colors interactive-press inline-flex items-center justify-center"
                        title="QR-kodni ko'rish va chop etish"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                      {product.batchNumber ? (
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/50">
                          {product.batchNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">-</span>
                      )}
                    </td>
                    <td className={`py-3 px-4 font-bold text-slate-900 dark:text-white ${isLargeText ? 'text-base' : 'text-sm'}`}>
                      <span>{product.name}</span>
                      {product.color && (
                        <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                          <span>Rangi: {product.color}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">
                      <div>{product.category}</div>
                      {product.density && (
                        <div className="text-[11px] text-slate-400 font-mono">{product.density}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <Layers className="w-3.5 h-3.5 text-blue-500" />
                        <span>{product.rolls || 1} to'p</span>
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-600 dark:text-slate-400">
                        {formatUSD(product.buyPrice)}
                      </td>
                    )}
                    <td className="py-3 px-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                      {formatUSD(product.sellPrice)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-black font-mono ${
                        isOut 
                          ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                          : isLow 
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25'
                      }`}>
                        {formatKg(product.stock)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatUSD(totalVal)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onOpenBarcodeModal(product)}
                          className="p-1.5 rounded-lg border glass-card text-slate-600 dark:text-slate-300 hover:text-blue-600 interactive-press"
                          title="QR-kod yorlig'ini chiqarish"
                        >
                          <QrCode className="w-4 h-4 text-blue-500" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(product)}
                          className="p-1.5 rounded-lg border glass-card text-slate-600 dark:text-slate-300 hover:text-emerald-600 interactive-press"
                          title="Tahrirlash"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(product.id, product.name)}
                            className="p-1.5 rounded-lg border glass-card text-slate-600 dark:text-slate-300 hover:text-rose-600 interactive-press"
                            title="O'chirish (Faqat Admin)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT PRODUCT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-3xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3.5">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                <span>{editingProduct ? 'Mato Ma\'lumotlarini Tahrirlash' : 'Yangi Mato Qo\'shish'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white interactive-press"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3.5">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Mato Nomi *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Masalan: Kulevka Penye 100% Paxta"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Partiya Raqami (Mato partiyasi)
                    </label>
                    <input
                      type="text"
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                      placeholder="Partiya raqamini yozing (masalan: 12, P-101)..."
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      QR-kod / Shtrix-kod (Skaner o'qishi uchun)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        placeholder="Skaner kodi..."
                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold text-sm focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setBarcode(Date.now().toString())}
                        className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold shrink-0 interactive-press"
                        title="Yangi unikal QR-kod raqami"
                      >
                        QR Kod
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Mato Turi</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Kulevka, Dvunitka..."
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Rangi</label>
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="Qora, Oq, Melanj..."
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Grammaj (Zichlik)</label>
                  <input
                    type="text"
                    value={density}
                    onChange={(e) => setDensity(e.target.value)}
                    placeholder="180 gr/m²"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className={`grid gap-3 ${isAdmin ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                {isAdmin && (
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Kirim Narxi ($ / kg)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={buyPrice}
                      onChange={(e) => setBuyPrice(e.target.value)}
                      placeholder="5.20"
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Sotish Narxi ($ / kg) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                    placeholder="6.50"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-emerald-600 dark:text-emerald-400 font-mono font-black text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Ombordagi Vazn (kg da)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="25.0"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Rulonlar (To'plar soni)</label>
                  <input
                    type="number"
                    value={rolls}
                    onChange={(e) => setRolls(e.target.value)}
                    placeholder="1"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Minimal Ogohlantirish (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    placeholder="20"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-amber-600 dark:text-amber-400 font-mono font-bold text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs sm:text-sm interactive-press"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm shadow-md shadow-blue-600/30 flex items-center gap-1.5 interactive-press"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Saqlash</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
