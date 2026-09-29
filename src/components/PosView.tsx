import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  QrCode, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  Banknote, 
  UserCheck, 
  Layers, 
  ShoppingCart,
  Percent,
  CheckCircle2,
  X,
  Package,
  Scale,
  Calculator,
  DollarSign
} from 'lucide-react';
import { Product, Customer, CartItem, Sale, StoreSettings } from '../types';
import { AppDatabase } from '../db';
import { formatMoney, formatNumber, formatUSD, formatKg, usdToUzs, formatBatchNumber } from '../utils/formatters';
import { soundManager } from '../utils/sound';
import { getCachedRate } from '../utils/currency';

interface PosViewProps {
  products: Product[];
  customers: Customer[];
  settings: StoreSettings;
  onSaleComplete: (sale: Sale) => void;
  isLargeText: boolean;
  currentStoreId?: string;
  onRefresh?: () => void;
}

export const PosView: React.FC<PosViewProps> = ({
  products,
  customers,
  settings,
  onSaleComplete,
  isLargeText,
  currentStoreId,
  onRefresh,
}) => {
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Barchasi');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [overallDiscount, setOverallDiscount] = useState<number>(0);

  // Ong tomon to'lov ustidagi sensorli tarozi klaviaturasi
  const [activeCartItemId, setActiveCartItemId] = useState<string | null>(null);
  const [weightInputBuffer, setWeightInputBuffer] = useState<string>('');

  // Payment Modal State (Hammasi $, Hammasi so'm, Aralash $ va so'm, Karta, Nasiya)
  type PaymentCurrencyMode = 'hammasi_usd' | 'hammasi_uzs' | 'aralash' | 'karta' | 'nasiya';
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<PaymentCurrencyMode>('hammasi_usd');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [cashGiven, setCashGiven] = useState<number>(0);
  const [uzsCashGiven, setUzsCashGiven] = useState<number>(0);
  const [splitUsd, setSplitUsd] = useState<string>('');
  const [splitUzs, setSplitUzs] = useState<string>('');
  const [writeShortageToDebt, setWriteShortageToDebt] = useState<boolean>(false);
  const [cashierName] = useState<string>('Kassir 1');

  // Quick Customer Creation Modal (Cashier)
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [quickCustName, setQuickCustName] = useState('');
  const [quickCustPhone, setQuickCustPhone] = useState('');
  const [quickCustAddress, setQuickCustAddress] = useState('');
  const [quickCustDebt, setQuickCustDebt] = useState('');

  const handleQuickSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustName.trim() || !quickCustPhone.trim()) {
      alert("Iltimos, qarzdor ismi va telefon raqamini kiriting!");
      return;
    }
    const parsedDebt = Math.max(0, parseFloat(quickCustDebt) || 0);
    const newCust = AppDatabase.saveCustomer({
      name: quickCustName.trim(),
      phone: quickCustPhone.trim(),
      address: quickCustAddress.trim(),
      balance: parsedDebt > 0 ? -parsedDebt : 0,
    });
    if (parsedDebt > 0) {
      AppDatabase.addDebtTransaction({
        type: 'customer',
        entityId: newCust.id,
        entityName: newCust.name,
        amount: parsedDebt,
        paymentMethod: 'cash',
        action: 'take_debt',
        notes: "Boshlang'ich qarz balansi (Kassada qo'shildi)",
      });
    }
    setSelectedCustomerId(newCust.id);
    setIsQuickCustomerOpen(false);
    setQuickCustName('');
    setQuickCustPhone('');
    setQuickCustAddress('');
    setQuickCustDebt('');
    if (onRefresh) onRefresh();
  };

  // Scanner & Search input ref
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input on mount and on modal close
  useEffect(() => {
    searchInputRef.current?.focus();
  }, [isPaymentModalOpen]);

  const categories = ['Barchasi', ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'Barchasi' || p.category === selectedCategory;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = 
      p.name.toLowerCase().includes(query) || 
      p.barcode.toLowerCase().includes(query) ||
      formatBatchNumber(p).toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  const activeItem = cart.find(i => i.product.id === activeCartItemId) || (cart.length > 0 ? cart[cart.length - 1] : null);

  const addToCart = (product: Product, customQty?: number) => {
    if (product.stock <= 0) {
      if (settings.enableSound) soundManager.playErrorSound();
      alert(`"${product.name}" mahsulotidan omborda qolmagan!`);
      return;
    }

    if (settings.enableSound) soundManager.playScanBeep();

    const initialWeight = customQty !== undefined ? customQty : 0;

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      const chosenPrice = product.sellPrice;

      if (existing) {
        return prev;
      } else {
        return [
          ...prev,
          {
            product,
            quantity: initialWeight,
            price: chosenPrice,
            discount: 0,
            total: initialWeight * chosenPrice,
          }
        ];
      }
    });

    setActiveCartItemId(product.id);
    const existing = cart.find(item => item.product.id === product.id);
    setWeightInputBuffer(existing ? (existing.quantity > 0 ? existing.quantity.toString() : '') : (initialWeight > 0 ? initialWeight.toString() : ''));
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return;

      const exactProduct = products.find(p => 
        p.barcode.toLowerCase() === query ||
        formatBatchNumber(p).toLowerCase() === query
      );
      if (exactProduct) {
        addToCart(exactProduct);
        setSearchQuery('');
        return;
      }

      if (filteredProducts.length === 1) {
        addToCart(filteredProducts[0]);
        setSearchQuery('');
        return;
      }
    }
  };

  const setDirectQuantity = (productId: string, qty: number) => {
    const validQty = isNaN(qty) || qty < 0 ? 0 : qty;
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        return {
          ...item,
          quantity: validQty,
          total: validQty * item.price - item.discount,
        };
      }
      return item;
    }));
  };

  // Sensorli klaviatura (0123456789 va vergul)
  const handleKeypadPress = (val: string) => {
    soundManager.playScanBeep();
    const targetItem = activeItem;
    if (!targetItem) return;

    let newBuf = weightInputBuffer;

    if (val === 'C') {
      newBuf = '';
    } else if (val === 'BACKSPACE') {
      newBuf = newBuf.length > 0 ? newBuf.slice(0, -1) : '';
    } else if (val === ',' || val === '.') {
      if (!newBuf.includes('.')) {
        newBuf = newBuf === '' ? '0.' : newBuf + '.';
      }
    } else {
      if (newBuf === '0') {
        newBuf = val;
      } else {
        newBuf = newBuf + val;
      }
    }

    setWeightInputBuffer(newBuf);
    const parsed = parseFloat(newBuf);
    setDirectQuantity(targetItem.product.id, isNaN(parsed) ? 0 : parsed);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const filtered = prev.filter(item => item.product.id !== productId);
      if (activeCartItemId === productId) {
        if (filtered.length > 0) {
          setActiveCartItemId(filtered[0].product.id);
          setWeightInputBuffer(filtered[0].quantity > 0 ? filtered[0].quantity.toString() : '');
        } else {
          setActiveCartItemId(null);
          setWeightInputBuffer('');
        }
      }
      return filtered;
    });
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    setCart([]);
    setOverallDiscount(0);
    setActiveCartItemId(null);
    setWeightInputBuffer('');
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const itemsDiscount = cart.reduce((sum, item) => sum + item.discount, 0);
  const totalDiscount = itemsDiscount + overallDiscount;
  const finalAmount = Math.max(0, subtotal - totalDiscount);

  const handleOpenPayment = () => {
    if (cart.length === 0) return;
    const zeroWeightItem = cart.find(item => item.quantity <= 0);
    if (zeroWeightItem) {
      if (settings.enableSound) soundManager.playErrorSound();
      alert(`Iltimos, "${zeroWeightItem.product.name}" matosining vaznini (kg) kiriting!`);
      setActiveCartItemId(zeroWeightItem.product.id);
      setWeightInputBuffer('');
      return;
    }
    const rate = getCachedRate().sellRate;
    setPaymentMode('hammasi_usd');
    setCashGiven(finalAmount);
    setUzsCashGiven(Math.round(usdToUzs(finalAmount, rate)));
    setSplitUsd('');
    setSplitUzs('');
    setWriteShortageToDebt(false);
    setSelectedCustomerId('');
    setIsPaymentModalOpen(true);
  };

  const handleFinalizeSale = () => {
    if (cart.length === 0) return;
    const rate = getCachedRate().sellRate;

    let paidCash = 0;
    let paidCard = 0;
    let paidDebt = 0;
    let paidUsdCash = 0;
    let paidUzsCash = 0;
    let finalPaymentMethod: 'cash' | 'card' | 'debt' | 'mixed' = 'cash';

    if (paymentMode === 'hammasi_usd') {
      const given = Number(cashGiven) || 0;
      if (given < finalAmount - 0.009) {
        alert("Kiritilgan naqd dollar summasi yetarli emas!");
        return;
      }
      paidCash = finalAmount;
      paidUsdCash = finalAmount;
      finalPaymentMethod = 'cash';
    } else if (paymentMode === 'hammasi_uzs') {
      const targetUzs = Math.round(usdToUzs(finalAmount, rate));
      const given = Number(uzsCashGiven) || 0;
      if (given < targetUzs - 50) {
        alert("Kiritilgan naqd so'm summasi yetarli emas!");
        return;
      }
      paidCash = finalAmount;
      paidUzsCash = targetUzs;
      finalPaymentMethod = 'cash';
    } else if (paymentMode === 'aralash') {
      const sUsd = Number(splitUsd) || 0;
      const sUzs = Number(splitUzs) || 0;
      const totalPaidUSD = sUsd + (sUzs / rate);

      if (totalPaidUSD < finalAmount - 0.01) {
        const shortage = finalAmount - totalPaidUSD;
        if (!writeShortageToDebt) {
          alert(`Kiritilgan summa yetarli emas! Yetmayotgan summa: ${formatUSD(shortage)}. Yetmaganini nasiyaga yozish uchun katakchani belgilang.`);
          return;
        }
        if (!selectedCustomerId) {
          alert("Yetmagan qoldiqni qarzga yozish uchun mijozni tanlang!");
          return;
        }
        paidCash = totalPaidUSD;
        paidDebt = shortage;
        finalPaymentMethod = 'mixed';
      } else {
        paidCash = finalAmount;
        finalPaymentMethod = 'cash';
      }
      paidUsdCash = sUsd;
      paidUzsCash = sUzs;
    } else if (paymentMode === 'karta') {
      paidCard = finalAmount;
      finalPaymentMethod = 'card';
    } else if (paymentMode === 'nasiya') {
      if (!selectedCustomerId) {
        alert("Iltimos, nasiyaga yozish uchun mijozni tanlang!");
        return;
      }
      paidDebt = finalAmount;
      finalPaymentMethod = 'debt';
    }

    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
    const totalBuyPrice = cart.reduce((sum, item) => sum + (item.product.buyPrice * item.quantity), 0);
    const profit = finalAmount - totalBuyPrice;

    const completedSale = AppDatabase.processSale({
      items: cart.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        barcode: item.product.barcode,
        unit: item.product.unit,
        quantity: item.quantity,
        buyPrice: item.product.buyPrice,
        sellPrice: item.price,
        discount: item.discount,
        total: item.total,
      })),
      subtotal,
      discountAmount: totalDiscount,
      finalAmount,
      exchangeRate: rate,
      finalAmountUZS: Math.round(usdToUzs(finalAmount, rate)),
      paidCash,
      paidCard,
      paidDebt,
      paidUsdCash: paidUsdCash > 0 ? paidUsdCash : undefined,
      paidUzsCash: paidUzsCash > 0 ? paidUzsCash : undefined,
      customerId: selectedCustomerId || undefined,
      customerName: selectedCustomer ? selectedCustomer.name : undefined,
      cashierName,
      paymentMethod: finalPaymentMethod,
      profit,
      storeId: currentStoreId || AppDatabase.getDeviceStoreId(),
    });

    if (settings.enableSound) {
      soundManager.playSuccessSound();
    }

    setCart([]);
    setOverallDiscount(0);
    setIsPaymentModalOpen(false);
    setSelectedCustomerId('');

    onSaleComplete(completedSale);
  };

  return (
    <div className="flex-1 flex overflow-hidden h-[calc(100vh-4rem)]">
      {/* LEFT: Products Catalog & Search */}
      <div className="flex-1 flex flex-col border-r border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Search & Top Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 glass-panel space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Mato nomi, partiya raqami yoki QR-kod..."
                className={`w-full pl-11 pr-11 py-3.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 font-bold transition-all shadow-inner ${
                  isLargeText ? 'text-base' : 'text-sm'
                }`}
              />
              <QrCode className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-500" />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2.5 rounded-2xl font-bold whitespace-nowrap transition-all oxista-btn ${
                  isLargeText ? 'text-sm' : 'text-xs'
                } ${
                  selectedCategory === cat
                    ? 'btn-ios-blue shadow-md shadow-blue-600/25'
                    : 'glass-card text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid (Large readable cards for older eyes) */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
              <Package className="w-12 h-12 stroke-[1.5]" />
              <p className="text-base font-semibold">Bunday mahsulot topilmadi</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
              {filteredProducts.map((product) => {
                const isOutOfStock = product.stock <= 0;
                const isLowStock = product.stock <= product.minStock;
                const price = product.sellPrice;
                const nbuRate = getCachedRate();
                const priceUZS = usdToUzs(price, nbuRate.sellRate);

                return (
                  <div
                    key={product.id}
                    onClick={() => !isOutOfStock && addToCart(product)}
                    className={`group p-4 rounded-2xl glass-card flex flex-col justify-between select-none interactive-press ${
                      isOutOfStock
                        ? 'opacity-40 cursor-not-allowed'
                        : 'hover:border-blue-500 hover:shadow-xl cursor-pointer hover:-translate-y-0.5'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-1.5">
                        <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 truncate">
                            {product.category}
                          </span>
                          {product.batchNumber && (
                            <span className="text-[10px] font-mono font-extrabold px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded border border-blue-200 dark:border-blue-800">
                              Partiya: {product.batchNumber}
                            </span>
                          )}
                        </div>
                        
                        <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md ${
                          isOutOfStock 
                            ? 'bg-red-500/20 text-red-600 dark:text-red-400'
                            : isLowStock 
                            ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
                          {formatKg(product.stock)}
                        </span>
                      </div>

                      {/* Fabric Name & Properties */}
                      <h4 className={`font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors ${
                        isLargeText ? 'text-base' : 'text-sm'
                      }`}>
                        {product.name}
                      </h4>

                      {(product.density || product.color) && (
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          {product.density && <span>{product.density}</span>}
                          {product.density && product.color && <span>•</span>}
                          {product.color && <span>{product.color}</span>}
                          {product.rolls && <span className="text-blue-500">({product.rolls} to'p)</span>}
                        </div>
                      )}
                    </div>

                    <div className="mt-3.5 pt-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="font-black text-emerald-600 dark:text-emerald-400 font-mono text-base sm:text-lg">
                          {formatUSD(price)} <span className="text-xs font-bold text-slate-500 font-sans">/ kg</span>
                        </div>
                        <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400 block -mt-0.5">
                          ≈ {formatMoney(priceUZS)}
                        </span>
                      </div>
                      <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/30 group-hover:scale-105 transition-transform shrink-0">
                        <Plus className="w-5 h-5 stroke-[2.5]" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Active Cart & Checkout Panel */}
      <div className="w-96 lg:w-[420px] glass-panel border-l flex flex-col justify-between shrink-0 select-none">
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Xarid Savati</h3>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{cart.length} xil mahsulot</span>
            </div>
          </div>

          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 px-3 py-1.5 rounded-xl transition-all interactive-press"
            >
              <Trash2 className="w-4 h-4" />
              <span>Tozalash</span>
            </button>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
              <div className="w-16 h-16 rounded-2xl glass-card flex items-center justify-center text-slate-400">
                <ShoppingCart className="w-8 h-8 stroke-[1.2]" />
              </div>
              <p className="font-bold text-slate-600 dark:text-slate-300 text-sm">Savat bo'sh</p>
              <p className="text-xs text-slate-500">Mato tanlang yoki QR-kod skanerlang</p>
            </div>
          ) : (
            cart.map((item) => {
              const isSelected = activeItem?.product.id === item.product.id;
              return (
                <div
                  key={item.product.id}
                  onClick={() => {
                    setActiveCartItemId(item.product.id);
                    setWeightInputBuffer(item.quantity > 0 ? item.quantity.toString() : '');
                  }}
                  className={`p-3 rounded-2xl cursor-pointer transition-all border select-none ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/50 shadow-sm ring-1 ring-blue-500/50'
                      : 'glass-card hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h5 className={`font-bold text-slate-900 dark:text-white line-clamp-1 ${
                        isLargeText ? 'text-base' : 'text-sm'
                      }`}>
                        {item.product.name}
                      </h5>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                        {item.product.batchNumber && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded border border-blue-200 dark:border-blue-800">
                            Partiya: {item.product.batchNumber}
                          </span>
                        )}
                        <span>{formatUSD(item.price)} / kg</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromCart(item.product.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors oxista-btn"
                      title="Savatdan o'chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">Vazn:</span>
                      <span className={`font-mono font-black text-base px-3 py-0.5 rounded-xl border ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/80'
                      }`}>
                        {isSelected && weightInputBuffer !== ''
                          ? weightInputBuffer.replace('.', ',')
                          : (item.quantity > 0 ? item.quantity.toString().replace('.', ',') : '0')} kg
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-base text-emerald-600 dark:text-emerald-400 font-mono block">
                        {formatUSD(item.total)}
                      </span>
                      <span className="text-[10px] font-mono font-semibold text-slate-500 block -mt-0.5">
                        ≈ {formatMoney(usdToUzs(item.total, getCachedRate().sellRate))}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* SENSORLI RAQAMLAR KLAVIATURASI (O'NG TOMONDA, TO'LOVNING USTIDA) */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-4 gap-1.5">
            {/* Row 1 */}
            <button
              type="button"
              disabled={!activeItem}
              onClick={() => handleKeypadPress('7')}
              className="h-10 sm:h-11 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-mono font-black text-lg border border-slate-300 dark:border-slate-700 flex items-center justify-center interactive-press disabled:opacity-40"
            >
              7
            </button>
            <button
              type="button"
              disabled={!activeItem}
              onClick={() => handleKeypadPress('8')}
              className="h-10 sm:h-11 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-mono font-black text-lg border border-slate-300 dark:border-slate-700 flex items-center justify-center interactive-press disabled:opacity-40"
            >
              8
            </button>
            <button
              type="button"
              disabled={!activeItem}
              onClick={() => handleKeypadPress('9')}
              className="h-10 sm:h-11 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-mono font-black text-lg border border-slate-300 dark:border-slate-700 flex items-center justify-center interactive-press disabled:opacity-40"
            >
              9
            </button>
            <button
              type="button"
              disabled={!activeItem}
              onClick={() => handleKeypadPress('BACKSPACE')}
              className="h-10 sm:h-11 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 font-bold border border-rose-200 dark:border-rose-900 flex items-center justify-center interactive-press disabled:opacity-40"
              title="Bitta raqamni o'chirish"
            >
              ⌫
            </button>

            {/* Row 2 */}
            <button
              type="button"
              disabled={!activeItem}
              onClick={() => handleKeypadPress('4')}
              className="h-10 sm:h-11 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-mono font-black text-lg border border-slate-300 dark:border-slate-700 flex items-center justify-center interactive-press disabled:opacity-40"
            >
              4
            </button>
            <button
              type="button"
              disabled={!activeItem}
              onClick={() => handleKeypadPress('5')}
              className="h-10 sm:h-11 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-mono font-black text-lg border border-slate-300 dark:border-slate-700 flex items-center justify-center interactive-press disabled:opacity-40"
            >
              5
            </button>
            <button
              type="button"
              disabled={!activeItem}
              onClick={() => handleKeypadPress('6')}
              className="h-10 sm:h-11 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-mono font-black text-lg border border-slate-300 dark:border-slate-700 flex items-center justify-center interactive-press disabled:opacity-40"
            >
              6
            </button>
            <button
              type="button"
              disabled={!activeItem}
              onClick={() => handleKeypadPress('C')}
              className="h-10 sm:h-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 hover:bg-amber-100 font-mono font-black text-base border border-amber-200 dark:border-amber-900 flex items-center justify-center interactive-press disabled:opacity-40"
              title="Tozalash"
            >
              C
            </button>

            {/* Row 3: 1, 2, 3 va Vergul (,) */}
            <button
              type="button"
              disabled={!activeItem}
              onClick={() => handleKeypadPress('1')}
              className="h-10 sm:h-11 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-mono font-black text-lg border border-slate-300 dark:border-slate-700 flex items-center justify-center interactive-press disabled:opacity-40"
            >
              1
            </button>
            <button
              type="button"
              disabled={!activeItem}
              onClick={() => handleKeypadPress('2')}
              className="h-10 sm:h-11 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-mono font-black text-lg border border-slate-300 dark:border-slate-700 flex items-center justify-center interactive-press disabled:opacity-40"
            >
              2
            </button>
            <button
              type="button"
              disabled={!activeItem}
              onClick={() => handleKeypadPress('3')}
              className="h-10 sm:h-11 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-mono font-black text-lg border border-slate-300 dark:border-slate-700 flex items-center justify-center interactive-press disabled:opacity-40"
            >
              3
            </button>
            <button
              type="button"
              disabled={!activeItem}
              onClick={() => handleKeypadPress(',')}
              className="h-10 sm:h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 font-mono font-black text-2xl border border-blue-200 dark:border-blue-900 flex items-center justify-center interactive-press disabled:opacity-40"
              title="Vergul (,)"
            >
              ,
            </button>

            {/* Row 4: Faqat 0 */}
            <button
              type="button"
              disabled={!activeItem}
              onClick={() => handleKeypadPress('0')}
              className="col-span-4 h-10 sm:h-11 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-mono font-black text-lg border border-slate-300 dark:border-slate-700 flex items-center justify-center interactive-press disabled:opacity-40"
            >
              0
            </button>
          </div>
        </div>

        {/* Cart Bottom Summary & Checkout Button */}
        <div className="p-4 glass-panel border-t space-y-3">
          <div className="space-y-1.5 text-xs sm:text-sm">
            <div className="flex justify-between font-semibold text-slate-600 dark:text-slate-400">
              <span>Oraliq summa:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{formatUSD(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between font-semibold text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Percent className="w-4 h-4 text-blue-500" />
                Chegirma ($):
              </span>
              <input
                type="number"
                step="0.5"
                value={overallDiscount || ''}
                onChange={(e) => setOverallDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="$ 0.00"
                className="w-24 px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-right font-mono font-bold text-amber-600 dark:text-amber-400 text-xs sm:text-sm focus:outline-none"
              />
            </div>

            <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
              <div>
                <span className="font-black text-sm sm:text-base block">JAMI TO'LOV ($):</span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  NBU kursi: {formatMoney(getCachedRate().sellRate)}
                </span>
              </div>
              <div className="text-right">
                <span className="font-black text-2xl sm:text-3xl text-emerald-600 dark:text-emerald-400 font-mono block">
                  {formatUSD(finalAmount)}
                </span>
                <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 block -mt-0.5">
                  ≈ {formatMoney(usdToUzs(finalAmount, getCachedRate().sellRate))}
                </span>
              </div>
            </div>
          </div>

          {/* Big Green Touch Checkout Button */}
          <button
            onClick={handleOpenPayment}
            disabled={cart.length === 0}
            className={`w-full py-4 sm:py-5 rounded-2xl font-black text-base sm:text-lg flex items-center justify-center gap-3 shadow-xl oxista-btn ${
              cart.length === 0
                ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'btn-ios-green'
            }`}
          >
            <CreditCard className="w-6 h-6 stroke-[2.2]" />
            <span>To'lovni Qabul Qilish</span>
          </button>
        </div>
      </div>

      {/* PAYMENT MODAL (High contrast, big readable numbers, allowed colors) */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-3xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3.5">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Banknote className="w-6 h-6 text-emerald-500" />
                To'lovni Rasmiylashtirish (Dollarda)
              </h3>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 oxista-btn"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Total to pay banner (Dollarda va So'mda) */}
            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-slate-800/80 border border-blue-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">To'lanishi kerak ($):</span>
                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                  {formatUSD(finalAmount)}
                </div>
                <div className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300 mt-1">
                  So'mda: {formatMoney(usdToUzs(finalAmount, getCachedRate().sellRate))} (Kurs: {formatMoney(getCachedRate().sellRate)})
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Jami vazn:</span>
                <div className="text-base font-black text-slate-800 dark:text-slate-200 font-mono">
                  {formatKg(cart.reduce((sum, i) => sum + i.quantity, 0))}
                </div>
              </div>
            </div>

            {/* Payment Method & Currency Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {/* Hammasi $ */}
              <button
                type="button"
                onClick={() => setPaymentMode('hammasi_usd')}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1 font-bold transition-all oxista-btn ${
                  paymentMode === 'hammasi_usd'
                    ? 'btn-ios-green shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-500'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <DollarSign className="w-5 h-5" />
                <span className="text-xs">Hammasi $</span>
              </button>

              {/* Hammasi So'm */}
              <button
                type="button"
                onClick={() => setPaymentMode('hammasi_uzs')}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1 font-bold transition-all oxista-btn ${
                  paymentMode === 'hammasi_uzs'
                    ? 'btn-ios-green shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-500'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Banknote className="w-5 h-5" />
                <span className="text-xs">Hammasi So'm</span>
              </button>

              {/* Aralash ($ va So'm) */}
              <button
                type="button"
                onClick={() => setPaymentMode('aralash')}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1 font-bold transition-all oxista-btn ${
                  paymentMode === 'aralash'
                    ? 'btn-ios-blue shadow-lg shadow-blue-600/30 ring-2 ring-blue-500'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Layers className="w-5 h-5" />
                <span className="text-xs">Aralash ($ + so'm)</span>
              </button>

              {/* Karta */}
              <button
                type="button"
                onClick={() => setPaymentMode('karta')}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1 font-bold transition-all oxista-btn ${
                  paymentMode === 'karta'
                    ? 'btn-ios-blue shadow-lg shadow-blue-600/30 ring-2 ring-blue-500'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span className="text-xs">Karta</span>
              </button>

              {/* Nasiya */}
              <button
                type="button"
                onClick={() => setPaymentMode('nasiya')}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1 font-bold transition-all oxista-btn col-span-2 sm:col-span-1 ${
                  paymentMode === 'nasiya'
                    ? 'btn-ios-red shadow-lg shadow-red-600/30 ring-2 ring-red-500'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <UserCheck className="w-5 h-5" />
                <span className="text-xs">Nasiya</span>
              </button>
            </div>

            {/* A) HAMMASI DOLLARDA ($) */}
            {paymentMode === 'hammasi_usd' && (
              <div className="space-y-3 bg-slate-100 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Berilgan naqd dollar ($):
                  </label>
                  <span className="text-xs font-mono font-semibold text-slate-500">
                    ≈ {formatMoney(usdToUzs(cashGiven, getCachedRate().sellRate))}
                  </span>
                </div>
                <input
                  type="number"
                  step="1"
                  value={cashGiven || ''}
                  onChange={(e) => setCashGiven(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-2xl font-mono text-2xl font-black text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />

                <div className="flex flex-wrap gap-2 pt-1">
                  {[10, 20, 50, 100, 200, 500].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCashGiven(val)}
                      className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-100 oxista-btn shadow-sm"
                    >
                      $ {val}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCashGiven(finalAmount)}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm oxista-btn"
                  >
                    Aniq: {formatUSD(finalAmount)}
                  </button>
                </div>

                <div className="flex justify-between items-center pt-2.5 border-t border-slate-300 dark:border-slate-700">
                  <span className="font-bold text-sm text-slate-600 dark:text-slate-300">Qaytim ($):</span>
                  <div className="text-right">
                    <span className="font-black text-2xl text-amber-600 dark:text-amber-400 font-mono">
                      {formatUSD(Math.max(0, cashGiven - finalAmount))}
                    </span>
                    <div className="text-[11px] font-mono text-slate-500">
                      ≈ {formatMoney(usdToUzs(Math.max(0, cashGiven - finalAmount), getCachedRate().sellRate))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* B) HAMMASI SO'MDA (SO'M) */}
            {paymentMode === 'hammasi_uzs' && (
              <div className="space-y-3 bg-slate-100 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Berilgan naqd so'm:
                  </label>
                  <span className="text-xs font-mono font-semibold text-slate-500">
                    ≈ $ {((uzsCashGiven || 0) / getCachedRate().sellRate).toFixed(2)}
                  </span>
                </div>
                <input
                  type="number"
                  step="1000"
                  value={uzsCashGiven || ''}
                  onChange={(e) => setUzsCashGiven(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-2xl font-mono text-2xl font-black text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />

                <div className="flex flex-wrap gap-2 pt-1">
                  {[50000, 100000, 200000, 500000, 1000000, 2000000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setUzsCashGiven(val)}
                      className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-100 oxista-btn shadow-sm"
                    >
                      {val >= 1000000 ? `${val / 1000000} mln` : `${val / 1000} ming`}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setUzsCashGiven(Math.round(usdToUzs(finalAmount, getCachedRate().sellRate)))}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm oxista-btn"
                  >
                    Aniq: {formatMoney(Math.round(usdToUzs(finalAmount, getCachedRate().sellRate)))}
                  </button>
                </div>

                <div className="flex justify-between items-center pt-2.5 border-t border-slate-300 dark:border-slate-700">
                  <span className="font-bold text-sm text-slate-600 dark:text-slate-300">Qaytim (so'm):</span>
                  <div className="text-right">
                    <span className="font-black text-2xl text-amber-600 dark:text-amber-400 font-mono">
                      {formatMoney(Math.max(0, uzsCashGiven - Math.round(usdToUzs(finalAmount, getCachedRate().sellRate))))}
                    </span>
                    <div className="text-[11px] font-mono text-slate-500">
                      ≈ {formatUSD(Math.max(0, uzsCashGiven - Math.round(usdToUzs(finalAmount, getCachedRate().sellRate))) / getCachedRate().sellRate)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* C) ARALASH ($ VA SO'MDA QANCHA EKANINI YOZISH) */}
            {paymentMode === 'aralash' && (
              <div className="space-y-3.5 bg-slate-100 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Qanchasi dollarda va qanchasi so'mda ekanligini kiriting:
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Dollar qismi */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-600 dark:text-slate-400">
                      <span>Dollarda ($):</span>
                      {Number(splitUsd) > 0 && (
                        <span className="text-[10px] font-mono">≈ {formatMoney(usdToUzs(Number(splitUsd), getCachedRate().sellRate))}</span>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">$</span>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={splitUsd}
                        onChange={(e) => setSplitUsd(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl font-mono text-lg font-black text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const sUzs = Number(splitUzs) || 0;
                        const remUsd = Math.max(0, parseFloat((finalAmount - (sUzs / getCachedRate().sellRate)).toFixed(2)));
                        setSplitUsd(remUsd.toString());
                      }}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Qolganini dollarda to'lash
                    </button>
                  </div>

                  {/* So'm qismi */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-600 dark:text-slate-400">
                      <span>So'mda (so'm):</span>
                      {Number(splitUzs) > 0 && (
                        <span className="text-[10px] font-mono">≈ {formatUSD(Number(splitUzs) / getCachedRate().sellRate)}</span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="1000"
                        min="0"
                        value={splitUzs}
                        onChange={(e) => setSplitUzs(e.target.value)}
                        placeholder="0 so'm"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl font-mono text-lg font-black text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const sUsd = Number(splitUsd) || 0;
                        const remUzs = Math.max(0, Math.round((finalAmount - sUsd) * getCachedRate().sellRate));
                        setSplitUzs(remUzs.toString());
                      }}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Qolganini so'mda to'lash
                    </button>
                  </div>
                </div>

                {/* Calculation Summary */}
                {(() => {
                  const sUsd = Number(splitUsd) || 0;
                  const sUzs = Number(splitUzs) || 0;
                  const rate = getCachedRate().sellRate;
                  const totalGivenUSD = sUsd + (sUzs / rate);
                  const isOver = totalGivenUSD >= finalAmount - 0.009;
                  const diffUSD = Math.abs(totalGivenUSD - finalAmount);
                  const diffUZS = Math.round(diffUSD * rate);

                  return (
                    <div className="pt-2 border-t border-slate-300 dark:border-slate-700 space-y-2">
                      <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                        <span>Jami kiritilgan summa:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          ${sUsd} + {formatMoney(sUzs)} = {formatUSD(totalGivenUSD)}
                        </span>
                      </div>

                      {isOver ? (
                        <div className="flex justify-between items-center p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Qaytim:</span>
                          <div className="text-right">
                            <span className="font-mono font-black text-lg text-emerald-600 dark:text-emerald-400">
                              {formatUSD(diffUSD)}
                            </span>
                            <span className="text-[11px] font-mono text-emerald-600 block">
                              ≈ {formatMoney(diffUZS)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Yetmayotgan summa:</span>
                            <div className="text-right">
                              <span className="font-mono font-black text-lg text-amber-600 dark:text-amber-400">
                                {formatUSD(diffUSD)}
                              </span>
                              <span className="text-[11px] font-mono text-amber-600 block">
                                ≈ {formatMoney(diffUZS)}
                              </span>
                            </div>
                          </div>

                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                            <input
                              type="checkbox"
                              checked={writeShortageToDebt}
                              onChange={(e) => setWriteShortageToDebt(e.target.checked)}
                              className="w-4 h-4 rounded text-blue-600"
                            />
                            <span>Yetmagan {formatUSD(diffUSD)} ni nasiyaga (qarzga) yozish</span>
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* D) KARTA */}
            {paymentMode === 'karta' && (
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-slate-800/60 border border-blue-200 dark:border-slate-700 text-center space-y-1">
                <CreditCard className="w-8 h-8 text-blue-600 mx-auto" />
                <div className="text-sm font-black text-slate-900 dark:text-white">
                  Plastik Karta orqali to'lov
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  Jami: {formatUSD(finalAmount)} (≈ {formatMoney(usdToUzs(finalAmount, getCachedRate().sellRate))})
                </div>
              </div>
            )}

            {/* E) NASIYA YOKI QARZGA YOZILADIGAN QISM UCHUN MIJOZ TANLASH */}
            {(paymentMode === 'nasiya' || (paymentMode === 'aralash' && writeShortageToDebt)) && (
              <div className="space-y-2 bg-slate-100 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Qarzdor / Mijozni tanlang:
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsQuickCustomerOpen(true)}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-500 flex items-center gap-1 interactive-press"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>+ Yangi qarzdor</span>
                  </button>
                </div>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Mijozni tanlang --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone}) - {c.balance < 0 ? `Qarzi: ${formatMoney(Math.abs(c.balance))}` : 'Qarzi yo\'q'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="flex-1 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-bold interactive-press"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={handleFinalizeSale}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 interactive-press"
              >
                <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                <span>Yakunlash va Chek</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ADD CUSTOMER / DEBTOR MODAL FOR CASHIERS */}
      {isQuickCustomerOpen && (
        <div className="fixed inset-0 bg-black/75 z-60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span>Yangi Qarzdor Qo'shish</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsQuickCustomerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickSaveCustomer} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Mijoz / Qarzdor Ismi *
                </label>
                <input
                  type="text"
                  required
                  value={quickCustName}
                  onChange={(e) => setQuickCustName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Telefon Raqami *
                </label>
                <input
                  type="text"
                  required
                  value={quickCustPhone}
                  onChange={(e) => setQuickCustPhone(e.target.value)}
                  placeholder="+998"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Manzili (Do'koni / Rastasi)
                </label>
                <input
                  type="text"
                  value={quickCustAddress}
                  onChange={(e) => setQuickCustAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Boshlang'ich Qarzi ($ da)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={quickCustDebt}
                    onChange={(e) => setQuickCustDebt(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold text-xs focus:outline-none focus:border-rose-500"
                  />
                </div>
                {parseFloat(quickCustDebt) > 0 && (
                  <div className="text-[11px] font-mono font-semibold text-rose-500 mt-1">
                    ≈ {formatMoney(usdToUzs(parseFloat(quickCustDebt), getCachedRate().sellRate))} qarz belgilanadi
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQuickCustomerOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold interactive-press"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-md shadow-blue-600/30 interactive-press"
                >
                  Saqlash va Tanlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
