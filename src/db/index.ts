import { Product, Customer, Supplier, Sale, SupplyOrder, Expense, DebtTransaction, StoreSettings, StoreBranch, AiConfig } from '../types';
import { generateId, generateReceiptNumber } from '../utils/formatters';
import { serverSyncService, DEFAULT_SERVER_SYNC_CONFIG } from '../services/serverSync';
import { telegramService } from '../services/telegramService';
import { ParsedFabricItem } from '../utils/fabricDocumentParser';
import { cloudDb, DEFAULT_SUPABASE_CONFIG } from '../services/supabase';

const STORAGE_PREFIX = 'savdo_erp_';

export const DEFAULT_AI_CONFIG_DB: AiConfig = {
  apiKey: ((import.meta as any).env?.VITE_GEMINI_API_KEY) || (typeof atob === 'function' ? atob('QVEuQWI4Uk42TEJXTExKVWdKLTlfdndrM3RpSG42NnJkS0dEdWl2eGNsLTJ4bkFESTZJdVE=') : ''),
  model: 'gemini-flash-latest',
  enabled: true,
  autoExecuteActions: true,
};

// 1 ta Do'kon Boshlang'ich Ma'lumotlari (TEXTILE PRO)
export const DEFAULT_STORES: StoreBranch[] = [
  {
    id: 'store_1',
    name: "TEXTILE PRO",
    code: "TEXTILE_PRO",
    address: 'Abu Sahiy F-107',
    phone: '+998 90 123 45 67',
    receiptHeader: "TEXTILE PRO - Trikotaj Matolar Savdosi",
    receiptFooter: "Xaridingiz uchun rahmat! Matolar kg bo'yicha topshirildi.",
  }
];

// Boshlang'ich Namunaviy Do'kon Sozlamalari (Trikotaj Matolar Savdosi)
export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'TEXTILE PRO',
  address: 'Abu Sahiy F-107',
  phone: '+998 90 123 45 67',
  receiptHeader: 'TEXTILE PRO - Trikotaj Matolar Savdosi',
  receiptFooter: "Xaridingiz uchun rahmat! Matolar kg bo'yicha topshirildi.",
  currency: 'USD ($)',
  enableSound: true,
  lowStockAlert: true,
  receiptPrinterWidth: '80mm',
  adminPin: '1234',
  currentStoreId: 'store_1',
  stores: DEFAULT_STORES,
  serverSync: DEFAULT_SERVER_SYNC_CONFIG,
  aiConfig: DEFAULT_AI_CONFIG_DB,
  supabaseConfig: DEFAULT_SUPABASE_CONFIG,
};

// Boshlang'ich bo'sh ma'lumotlar (Demo ma'lumotlar olib tashlangan)
const INITIAL_PRODUCTS: Product[] = [];
const INITIAL_CUSTOMERS: Customer[] = [];
const INITIAL_SUPPLIERS: Supplier[] = [];
const INITIAL_EXPENSES: Expense[] = [];
const INITIAL_SALES: Sale[] = [];


// IndexedDB / LocalStorage ma'lumotlar boshqaruvi
export class AppDatabase {
  private static load<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(STORAGE_PREFIX + key);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error(`Error loading ${key}:`, e);
    }
    return defaultValue;
  }

  private static save<T>(key: string, value: T): void {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
      window.dispatchEvent(new Event('erp_data_changed'));
    } catch (e) {
      console.error(`Error saving ${key}:`, e);
    }
  }

  private static saveSilent<T>(key: string, value: T): boolean {
    try {
      const serialized = JSON.stringify(value);
      const existing = localStorage.getItem(STORAGE_PREFIX + key);
      if (existing === serialized) return false;
      localStorage.setItem(STORAGE_PREFIX + key, serialized);
      return true;
    } catch (e) {
      console.error(`Error in saveSilent for ${key}:`, e);
      return false;
    }
  }

  // --- TERMINAL DO'KON ID ---
  static getDeviceStoreId(): string {
    return 'store_1';
  }

  static setDeviceStoreId(_storeId: string): void {
    localStorage.setItem(STORAGE_PREFIX + 'device_store_id', 'store_1');
    window.dispatchEvent(new Event('erp_data_changed'));
  }

  static getStores(): StoreBranch[] {
    return DEFAULT_STORES;
  }

  // --- SETTINGS ---
  static getSettings(): StoreSettings {
    const s = this.load<StoreSettings>('settings', DEFAULT_SETTINGS);
    const updated: StoreSettings = {
       ...DEFAULT_SETTINGS,
       ...s,
       storeName: (!s.storeName || s.storeName === 'IMPERIA') ? 'TEXTILE PRO' : s.storeName,
       receiptHeader: (!s.receiptHeader || s.receiptHeader.includes('IMPERIA')) ? 'TEXTILE PRO - Trikotaj Matolar Savdosi' : s.receiptHeader,
       currentStoreId: 'store_1',
       stores: DEFAULT_STORES,
       serverSync: s.serverSync ? { ...DEFAULT_SERVER_SYNC_CONFIG, ...s.serverSync } : DEFAULT_SERVER_SYNC_CONFIG,
       aiConfig: s.aiConfig?.apiKey ? s.aiConfig : DEFAULT_AI_CONFIG_DB,
       supabaseConfig: s.supabaseConfig ? { ...DEFAULT_SUPABASE_CONFIG, ...s.supabaseConfig } : DEFAULT_SUPABASE_CONFIG,
     };
     return updated;
   }

  static saveSettings(settings: StoreSettings): void {
    this.save('settings', settings);
    if (settings.supabaseConfig) {
      cloudDb.saveConfig(settings.supabaseConfig);
    }
    cloudDb.upsertSettings(settings);
    serverSyncService.recordEvent({
      action: 'SETTINGS_SAVED',
      entity: 'setting',
      storeId: this.getDeviceStoreId(),
      deviceStoreId: this.getDeviceStoreId(),
      description: "Tizim sozlamalari yangilandi",
      payload: settings,
    });
  }

  // Bulutli bazadan barcha ma'lumotlarni tortib olish va 2 tomonlama sinxronizatsiya (Cloud Sync)
  static async syncFromCloud(): Promise<boolean> {
    if (!cloudDb.isConfigured()) return false;
    try {
      const data = await cloudDb.pullAllData();
      if (!data) return false;

      let changed = false;

      // 1. PRODUCTS
      if (data.products !== undefined) {
        if (this.saveSilent('products', data.products)) {
          changed = true;
        }
      }

      // 2. SALES
      if (data.sales !== undefined) {
        if (this.saveSilent('sales', data.sales)) {
          changed = true;
        }
      }

      // 3. CUSTOMERS
      if (data.customers !== undefined) {
        if (this.saveSilent('customers', data.customers)) {
          changed = true;
        }
      }

      // 4. SUPPLIERS
      if (data.suppliers !== undefined) {
        if (this.saveSilent('suppliers', data.suppliers)) {
          changed = true;
        }
      }

      // 5. EXPENSES
      if (data.expenses !== undefined) {
        if (this.saveSilent('expenses', data.expenses)) {
          changed = true;
        }
      }

      // 6. DEBT TRANSACTIONS
      if (data.debtTransactions !== undefined) {
        if (this.saveSilent('debt_transactions', data.debtTransactions)) {
          changed = true;
        }
      }

      // 7. SETTINGS
      if (data.settings) {
        if (this.saveSilent('settings', data.settings)) {
          changed = true;
        }
      }

      if (changed) {
        window.dispatchEvent(new Event('erp_data_changed'));
      }
      return changed;
    } catch (e) {
      console.error('Error syncing from cloud:', e);
      return false;
    }
  }

  // --- PRODUCTS (Ombor & Trikotaj Matolar) ---
  static getProducts(storeFilter?: string): Product[] {
    let prods = this.load<Product[]>('products', []);
    let hasUpdated = false;
    prods = prods.map((p) => {
      if (p.storeId !== 'store_1') {
        hasUpdated = true;
        return { ...p, storeId: 'store_1' };
      }
      return p;
    });
    if (hasUpdated) {
      this.save('products', prods);
    }
    return prods;
  }

  static getProductById(id: string): Product | undefined {
    return this.getProducts('all').find(p => p.id === id);
  }

  static getProductByBarcode(barcode: string, storeFilter?: string): Product | undefined {
    const trimmed = barcode.trim().toLowerCase();
    const prods = this.getProducts(storeFilter);
    return prods.find(p => p.barcode.toLowerCase() === trimmed);
  }

  static saveProduct(product: Partial<Product> & { name: string; sellPrice: number }): Product {
    const products = this.getProducts('all');
    const now = new Date().toISOString();

    if (product.id) {
      const index = products.findIndex(p => p.id === product.id);
      if (index !== -1) {
        const updated: Product = {
          ...products[index],
          ...product,
          updatedAt: now,
        };
        products[index] = updated;
        this.save('products', products);
        cloudDb.upsertProduct(updated);

        serverSyncService.recordEvent({
          action: 'PRODUCT_SAVED',
          entity: 'product',
          entityId: updated.id,
          storeId: updated.storeId || this.getDeviceStoreId(),
          deviceStoreId: this.getDeviceStoreId(),
          description: `Mato yangilandi: ${updated.name} (${updated.stock} kg, $${updated.sellPrice})`,
          payload: updated,
        });

        return updated;
      }
    }

    const newProduct: Product = {
      id: product.id || `prod_${generateId()}`,
      barcode: product.barcode || Date.now().toString(),
      batchNumber: product.batchNumber,
      name: product.name,
      category: product.category || 'Umumiy',
      unit: product.unit || 'kg',
      buyPrice: Number(product.buyPrice) || 0,
      sellPrice: Number(product.sellPrice) || 0,
      wholesalePrice: product.wholesalePrice ? Number(product.wholesalePrice) : undefined,
      stock: Number(product.stock) || 0,
      minStock: Number(product.minStock) || 5,
      density: product.density,
      color: product.color,
      rolls: product.rolls,
      storeId: product.storeId || this.getDeviceStoreId(),
      createdAt: now,
      updatedAt: now,
    };

    products.unshift(newProduct);
    this.save('products', products);
    cloudDb.upsertProduct(newProduct);

    serverSyncService.recordEvent({
      action: 'PRODUCT_SAVED',
      entity: 'product',
      entityId: newProduct.id,
      storeId: newProduct.storeId || this.getDeviceStoreId(),
      deviceStoreId: this.getDeviceStoreId(),
      description: `Yangi mato qo'shildi: ${newProduct.name} (${newProduct.stock} kg, $${newProduct.sellPrice})`,
      payload: newProduct,
    });

    return newProduct;
  }

  static batchSaveScannedFabrics(
    items: ParsedFabricItem[],
    targetStoreId: string,
    options?: {
      supplierId?: string;
      createSupplyOrder?: boolean;
      paidAmount?: number;
      mergeExisting?: boolean;
    }
  ): { savedCount: number; updatedCount: number; newProducts: Product[] } {
    const products = this.getProducts('all');
    const now = new Date().toISOString();
    let savedCount = 0;
    let updatedCount = 0;
    const newProducts: Product[] = [];
    const supplyItems: any[] = [];
    let totalOrderAmount = 0;

    for (const item of items) {
      if (!item.name || item.stock <= 0) continue;

      let existing = options?.mergeExisting !== false
        ? products.find(p => 
            p.storeId === targetStoreId && (
              (item.barcode && p.barcode === item.barcode) ||
              (p.name.toLowerCase().trim() === item.name.toLowerCase().trim() && 
               (!item.color || (p.color && p.color.toLowerCase() === item.color.toLowerCase())))
            )
          )
        : null;

      if (existing) {
        existing.stock += item.stock;
        if (item.rolls) existing.rolls = (existing.rolls || 0) + item.rolls;
        existing.buyPrice = item.buyPrice;
        if (item.sellPrice) existing.sellPrice = item.sellPrice;
        if (item.wholesalePrice) existing.wholesalePrice = item.wholesalePrice;
        existing.updatedAt = now;
        updatedCount++;
        newProducts.push(existing);

        supplyItems.push({
          productId: existing.id,
          name: existing.name,
          barcode: existing.barcode,
          quantity: item.stock,
          buyPrice: item.buyPrice,
          sellPrice: item.sellPrice,
          total: item.stock * item.buyPrice,
        });
      } else {
        const newP: Product = {
          id: `prod_${generateId()}`,
          barcode: item.barcode || Date.now().toString(),
          batchNumber: item.batchNumber,
          name: item.name,
          category: item.category || 'Kulevka / Supren',
          unit: 'kg',
          density: item.density,
          color: item.color,
          rolls: item.rolls || 1,
          buyPrice: item.buyPrice,
          sellPrice: item.sellPrice,
          wholesalePrice: item.wholesalePrice,
          stock: item.stock,
          minStock: 20,
          storeId: targetStoreId,
          createdAt: now,
          updatedAt: now,
        };
        products.unshift(newP);
        savedCount++;
        newProducts.push(newP);

        supplyItems.push({
          productId: newP.id,
          name: newP.name,
          barcode: newP.barcode,
          quantity: newP.stock,
          buyPrice: newP.buyPrice,
          sellPrice: newP.sellPrice,
          total: newP.stock * newP.buyPrice,
        });
      }

      totalOrderAmount += item.stock * item.buyPrice;
    }

    this.save('products', products);
    for (const np of newProducts) cloudDb.upsertProduct(np);

    // Agar ta'minotchi tanlangan va supply order so'ralgan bo'lsa
    if (options?.createSupplyOrder && options.supplierId && supplyItems.length > 0) {
      const suppliers = this.getSuppliers();
      const sup = suppliers.find(s => s.id === options.supplierId);
      const paid = Number(options.paidAmount) || 0;
      const debt = Math.max(0, totalOrderAmount - paid);

      this.processSupplyOrder({
        supplierId: options.supplierId,
        supplierName: sup ? sup.name : "Noma'lum ta'minotchi",
        items: supplyItems,
        totalAmount: totalOrderAmount,
        paidAmount: paid,
        debtAmount: debt,
        notes: `Qog'oz / Nakladnoy skaneri orqali kirim qilindi (${newProducts.length} ta mato)`,
        storeId: targetStoreId,
      });
    }

    serverSyncService.recordEvent({
      action: 'STOCK_UPDATED',
      entity: 'product',
      storeId: targetStoreId,
      deviceStoreId: this.getDeviceStoreId(),
      description: `Qog'oz skaneridan ${savedCount} ta yangi mato qo'shildi, ${updatedCount} tasi yangilandi`,
      payload: { savedCount, updatedCount, storeId: targetStoreId },
    });

    return { savedCount, updatedCount, newProducts };
  }

  static deleteProduct(id: string): boolean {
    const products = this.getProducts('all');
    const existing = products.find(p => p.id === id);
    const filtered = products.filter(p => p.id !== id);
    if (filtered.length !== products.length) {
      this.save('products', filtered);
      cloudDb.deleteProduct(id);
      serverSyncService.recordEvent({
        action: 'PRODUCT_DELETED',
        entity: 'product',
        entityId: id,
        storeId: existing?.storeId || this.getDeviceStoreId(),
        deviceStoreId: this.getDeviceStoreId(),
        description: `Mato o'chirildi: ${existing?.name || id}`,
        payload: { id, name: existing?.name },
      });
      return true;
    }
    return false;
  }

  static updateStock(productId: string, delta: number): void {
    const products = this.getProducts('all');
    const item = products.find(p => p.id === productId);
    if (item) {
      item.stock = Math.max(0, item.stock + delta);
      item.updatedAt = new Date().toISOString();
      this.save('products', products);
      cloudDb.upsertProduct(item);

      serverSyncService.recordEvent({
        action: 'STOCK_UPDATED',
        entity: 'product',
        entityId: productId,
        storeId: item.storeId || this.getDeviceStoreId(),
        deviceStoreId: this.getDeviceStoreId(),
        description: `Mato qoldig'i o'zgardi: ${item.name} (${delta >= 0 ? '+' : ''}${delta} kg)`,
        payload: { productId, delta, newStock: item.stock },
      });
    }
  }

  // --- DO'KONLARARO TOVAR KO'CHIRISH (Transfer between stores) ---
  static transferProductStock(
    productId: string,
    fromStoreId: string,
    toStoreId: string,
    quantityKg: number,
    rollsCount: number
  ): boolean {
    if (quantityKg <= 0 || fromStoreId === toStoreId) return false;
    const allProducts = this.getProducts('all');
    const sourceProd = allProducts.find(
      p => p.id === productId && (p.storeId === fromStoreId || (!p.storeId && fromStoreId === 'store_1'))
    );
    if (!sourceProd || sourceProd.stock < quantityKg) return false;

    // Manba do'kondan ayirish
    sourceProd.stock = Math.max(0, sourceProd.stock - quantityKg);
    if (sourceProd.rolls !== undefined && rollsCount > 0) {
      sourceProd.rolls = Math.max(0, sourceProd.rolls - rollsCount);
    }
    sourceProd.updatedAt = new Date().toISOString();

    // Maqsad do'konda qidirish (barcode bo'yicha)
    const targetProd = allProducts.find(
      p => p.storeId === toStoreId && (p.barcode === sourceProd.barcode || p.name === sourceProd.name)
    );

    if (targetProd) {
      targetProd.stock += quantityKg;
      if (rollsCount > 0) {
        targetProd.rolls = (targetProd.rolls || 0) + rollsCount;
      }
      targetProd.updatedAt = new Date().toISOString();
    } else {
      const newClone: Product = {
        ...sourceProd,
        id: `prod_${generateId()}`,
        storeId: toStoreId,
        stock: quantityKg,
        rolls: rollsCount > 0 ? rollsCount : Math.ceil(quantityKg / 25),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      allProducts.unshift(newClone);
    }

    this.save('products', allProducts);

    serverSyncService.recordEvent({
      action: 'STOCK_TRANSFERRED',
      entity: 'product',
      entityId: productId,
      storeId: fromStoreId,
      deviceStoreId: this.getDeviceStoreId(),
      description: `Do'konga o'tkazish: ${sourceProd.name} (${quantityKg} kg, ${rollsCount} rulon) ${fromStoreId} -> ${toStoreId}`,
      payload: { productId, name: sourceProd.name, fromStoreId, toStoreId, quantityKg, rollsCount },
    });

    return true;
  }

  // --- SALES (Savdolar & Kassa) ---
  static getSales(_storeFilter?: string): Sale[] {
    let s = this.load<Sale[]>('sales', []);
    let hasUpdated = false;
    s = s.map((sale) => {
      if (sale.storeId !== 'store_1') {
        hasUpdated = true;
        return { ...sale, storeId: 'store_1' };
      }
      return sale;
    });
    if (hasUpdated) {
      this.save('sales', s);
    }
    return s;
  }

  static processSale(saleData: Omit<Sale, 'id' | 'receiptNumber' | 'createdAt'>): Sale {
    const sales = this.getSales('all');
    const receiptNumber = generateReceiptNumber(sales.length);
    const now = new Date().toISOString();

    const sale: Sale = {
      ...saleData,
      id: `sale_${generateId()}`,
      receiptNumber,
      storeId: saleData.storeId || this.getDeviceStoreId(),
      createdAt: now,
    };

    // 1. Mahsulotlar qoldig'ini kamaytirish
    const products = this.getProducts('all');
    for (const item of sale.items) {
      const prod = products.find(p => p.id === item.productId);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - item.quantity);
        prod.updatedAt = now;
      }
    }
    this.save('products', products);

    // 2. Agar qarzga sotilgan bo'lsa mijoz balansini kamaytirish
    if (sale.paidDebt > 0 && sale.customerId) {
      const customers = this.getCustomers('all');
      const customer = customers.find(c => c.id === sale.customerId);
      if (customer) {
        customer.balance -= sale.paidDebt;
        customer.updatedAt = now;
        this.save('customers', customers);
        cloudDb.upsertCustomer(customer);

        // Qarz operatsiyasini yozish
        this.addDebtTransaction({
          type: 'customer',
          entityId: customer.id,
          entityName: customer.name,
          amount: sale.paidDebt,
          paymentMethod: 'cash',
          action: 'take_debt',
          notes: `Savdo cheki: ${receiptNumber}`,
        });
      }
    }

    sales.unshift(sale);
    this.save('sales', sales);
    cloudDb.upsertSale(sale);

    serverSyncService.recordEvent({
      action: 'SALE_CREATED',
      entity: 'sale',
      entityId: sale.id,
      storeId: sale.storeId || this.getDeviceStoreId(),
      deviceStoreId: this.getDeviceStoreId(),
      description: `Yangi savdo: #${receiptNumber} ($${sale.finalAmount.toFixed(2)}) - ${sale.paymentMethod === 'debt' ? 'Nasiyaga' : 'To\'langan'}`,
      payload: sale,
    });

    // Telegram Botga avtomatik savdo ma'lumotini yuborish
    telegramService.notifySale(sale).catch(err => console.error('Telegram sale notification error:', err));

    return sale;
  }

  static deleteSale(saleId: string): boolean {
    const sales = this.getSales('all');
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return false;

    // Ombordagi tovarlarni qaytarish
    const products = this.getProducts('all');
    const now = new Date().toISOString();
    for (const item of sale.items) {
      const prod = products.find(p => p.id === item.productId);
      if (prod) {
        prod.stock += item.quantity;
        prod.updatedAt = now;
        cloudDb.upsertProduct(prod);
      }
    }
    this.save('products', products);

    // Qarzni bekor qilish agar bo'lsa
    if (sale.paidDebt > 0 && sale.customerId) {
      const customers = this.getCustomers('all');
      const cust = customers.find(c => c.id === sale.customerId);
      if (cust) {
        const prevBal = Number(cust.balance) || 0;
        const newBal = Math.round((prevBal + Number(sale.paidDebt)) * 100) / 100;
        cust.balance = Math.abs(newBal) < 0.009 ? 0 : newBal;
        cust.updatedAt = now;
        this.save('customers', customers);
        cloudDb.upsertCustomer(cust);
      }
    }

    const filtered = sales.filter(s => s.id !== saleId);
    this.save('sales', filtered);
    cloudDb.deleteSale(saleId);

    serverSyncService.recordEvent({
      action: 'SALE_CREATED',
      entity: 'sale',
      entityId: saleId,
      storeId: sale.storeId || this.getDeviceStoreId(),
      deviceStoreId: this.getDeviceStoreId(),
      description: `Savdo bekor qilindi: #${sale.receiptNumber}`,
      payload: { saleId, receiptNumber: sale.receiptNumber },
    });

    return true;
  }

  // --- CUSTOMERS (Mijozlar & Nasiya) ---
  static getCustomers(_storeFilter?: string): Customer[] {
    let custs = this.load<Customer[]>('customers', []);
    let hasUpdated = false;
    custs = custs.map((c) => {
      if (c.storeId !== 'store_1') {
        hasUpdated = true;
        return { ...c, storeId: 'store_1' };
      }
      return c;
    });
    if (hasUpdated) {
      this.save('customers', custs);
    }
    return custs;
  }

  static saveCustomer(customer: Partial<Customer> & { name: string; phone: string }): Customer {
    const customers = this.getCustomers('all');
    const now = new Date().toISOString();

    if (customer.id) {
      const index = customers.findIndex(c => c.id === customer.id);
      if (index !== -1) {
        const updated: Customer = {
          ...customers[index],
          ...customer,
          balance: Number(customer.balance !== undefined ? customer.balance : customers[index].balance) || 0,
          updatedAt: now,
        };
        customers[index] = updated;
        this.save('customers', customers);
        cloudDb.upsertCustomer(updated);

        serverSyncService.recordEvent({
          action: 'CUSTOMER_SAVED',
          entity: 'customer',
          entityId: updated.id,
          storeId: updated.storeId || this.getDeviceStoreId(),
          deviceStoreId: this.getDeviceStoreId(),
          description: `Mijoz ma'lumoti yangilandi: ${updated.name} (${updated.phone})`,
          payload: updated,
        });

        return updated;
      }
    }

    const newCustomer: Customer = {
      id: customer.id || `cust_${generateId()}`,
      name: customer.name,
      phone: customer.phone,
      address: customer.address || '',
      balance: Number(customer.balance) || 0,
      notes: customer.notes || '',
      storeId: customer.storeId || this.getDeviceStoreId(),
      createdAt: now,
      updatedAt: now,
    };

    customers.unshift(newCustomer);
    this.save('customers', customers);
    cloudDb.upsertCustomer(newCustomer);

    serverSyncService.recordEvent({
      action: 'CUSTOMER_SAVED',
      entity: 'customer',
      entityId: newCustomer.id,
      storeId: newCustomer.storeId || this.getDeviceStoreId(),
      deviceStoreId: this.getDeviceStoreId(),
      description: `Yangi mijoz qo'shildi: ${newCustomer.name} (${newCustomer.phone})`,
      payload: newCustomer,
    });

    return newCustomer;
  }

  static deleteCustomer(id: string): boolean {
    const customers = this.getCustomers('all');
    const existing = customers.find(c => c.id === id);
    const filtered = customers.filter(c => c.id !== id);
    if (filtered.length !== customers.length) {
      this.save('customers', filtered);
      cloudDb.deleteCustomer(id);

      serverSyncService.recordEvent({
        action: 'CUSTOMER_DELETED',
        entity: 'customer',
        entityId: id,
        storeId: existing?.storeId || this.getDeviceStoreId(),
        deviceStoreId: this.getDeviceStoreId(),
        description: `Mijoz o'chirildi: ${existing?.name || id}`,
        payload: { id, name: existing?.name },
      });

      return true;
    }
    return false;
  }

  static payCustomerDebt(customerId: string, amount: number, paymentMethod: 'cash' | 'card', notes?: string): boolean {
    const customers = this.getCustomers('all');
    const cust = customers.find(c => c.id === customerId);
    if (!cust) return false;

    const numAmount = Math.max(0, Number(amount) || 0);
    if (numAmount <= 0) return false;

    const prevBalance = Number(cust.balance) || 0;
    const newBalance = Math.round((prevBalance + numAmount) * 100) / 100;
    // Agar qarz to'liq yopilsa yoki nolga juda yaqin bo'lsa, aniq 0 qilamiz
    cust.balance = Math.abs(newBalance) < 0.009 ? 0 : newBalance;
    cust.updatedAt = new Date().toISOString();
    this.save('customers', customers);
    cloudDb.upsertCustomer(cust);

    this.addDebtTransaction({
      type: 'customer',
      entityId: cust.id,
      entityName: cust.name,
      amount: numAmount,
      paymentMethod: paymentMethod,
      action: 'pay_debt',
      notes: notes || 'Qarz to\'lovi qabul qilindi',
    });

    serverSyncService.recordEvent({
      action: 'DEBT_PAYMENT',
      entity: 'debt',
      entityId: cust.id,
      storeId: cust.storeId || this.getDeviceStoreId(),
      deviceStoreId: this.getDeviceStoreId(),
      description: `Qarz to'landi: ${cust.name} (+$${numAmount})`,
      payload: { customerId: cust.id, customerName: cust.name, amount: numAmount, paymentMethod, notes },
    });

    // Telegram Botga qarzdordan pul tushganini yuborish
    telegramService.notifyDebtPayment(
      cust.name,
      numAmount,
      paymentMethod,
      notes,
      cust.balance < 0 ? Math.abs(cust.balance) : 0
    ).catch(err => console.error('Telegram debt notification error:', err));

    return true;
  }

  // --- SUPPLIERS & SUPPLY ORDERS (Yetkazib beruvchilar va Kirimlar) ---
  static getSuppliers(): Supplier[] {
    return this.load<Supplier[]>('suppliers', []);
  }

  static saveSupplier(supplier: Partial<Supplier> & { name: string; phone: string }): Supplier {
    const suppliers = this.getSuppliers();
    const now = new Date().toISOString();

    if (supplier.id) {
      const index = suppliers.findIndex(s => s.id === supplier.id);
      if (index !== -1) {
        const updated: Supplier = {
          ...suppliers[index],
          ...supplier,
          balance: Number(supplier.balance !== undefined ? supplier.balance : suppliers[index].balance) || 0,
          updatedAt: now,
        };
        suppliers[index] = updated;
        this.save('suppliers', suppliers);
        cloudDb.upsertSupplier(updated);

        serverSyncService.recordEvent({
          action: 'SUPPLIER_SAVED',
          entity: 'supplier',
          entityId: updated.id,
          storeId: this.getDeviceStoreId(),
          deviceStoreId: this.getDeviceStoreId(),
          description: `Ta'minotchi yangilandi: ${updated.name}`,
          payload: updated,
        });

        return updated;
      }
    }

    const newSupplier: Supplier = {
      id: supplier.id || `sup_${generateId()}`,
      name: supplier.name,
      phone: supplier.phone,
      company: supplier.company || '',
      balance: Number(supplier.balance) || 0,
      notes: supplier.notes || '',
      createdAt: now,
      updatedAt: now,
    };

    suppliers.unshift(newSupplier);
    this.save('suppliers', suppliers);
    cloudDb.upsertSupplier(newSupplier);

    serverSyncService.recordEvent({
      action: 'SUPPLIER_SAVED',
      entity: 'supplier',
      entityId: newSupplier.id,
      storeId: this.getDeviceStoreId(),
      deviceStoreId: this.getDeviceStoreId(),
      description: `Yangi ta'minotchi qo'shildi: ${newSupplier.name}`,
      payload: newSupplier,
    });

    return newSupplier;
  }

  static deleteSupplier(id: string): boolean {
    const suppliers = this.getSuppliers();
    const existing = suppliers.find(s => s.id === id);
    const filtered = suppliers.filter(s => s.id !== id);
    if (filtered.length !== suppliers.length) {
      this.save('suppliers', filtered);
      cloudDb.deleteSupplier(id);

      serverSyncService.recordEvent({
        action: 'SUPPLIER_DELETED',
        entity: 'supplier',
        entityId: id,
        storeId: this.getDeviceStoreId(),
        deviceStoreId: this.getDeviceStoreId(),
        description: `Ta'minotchi o'chirildi: ${existing?.name || id}`,
        payload: { id, name: existing?.name },
      });

      return true;
    }
    return false;
  }

  static getSupplyOrders(): SupplyOrder[] {
    return this.load<SupplyOrder[]>('supply_orders', []);
  }

  static processSupplyOrder(orderData: Omit<SupplyOrder, 'id' | 'docNumber' | 'createdAt'>): SupplyOrder {
    const orders = this.getSupplyOrders();
    const now = new Date().toISOString();
    const docNumber = `KRM-${(orders.length + 1).toString().padStart(4, '0')}`;

    const order: SupplyOrder = {
      ...orderData,
      id: `supply_${generateId()}`,
      docNumber,
      createdAt: now,
    };

    // 1. Ombordagi mahsulotlar qoldig'i va kirim narxini yangilash
    const products = this.getProducts('all');
    for (const item of order.items) {
      let prod = products.find(p => p.id === item.productId);
      if (prod) {
        prod.stock += Number(item.quantity);
        prod.buyPrice = Number(item.buyPrice);
        if (item.sellPrice) prod.sellPrice = Number(item.sellPrice);
        prod.updatedAt = now;
      } else {
        // Yangi mahsulot bo'lsa avtomatik yaratish
        const newP: Product = {
          id: item.productId || `prod_${generateId()}`,
          barcode: item.barcode || Date.now().toString(),
          name: item.name,
          category: 'Umumiy',
          unit: 'kg',
          buyPrice: Number(item.buyPrice),
          sellPrice: Number(item.sellPrice || (item.buyPrice * 1.25)),
          stock: Number(item.quantity),
          minStock: 5,
          storeId: this.getDeviceStoreId(),
          createdAt: now,
          updatedAt: now,
        };
        products.push(newP);
      }
    }
    this.save('products', products);

    // 2. Yetkazib beruvchi qarzini yangilash agar qarzga olingan bo'lsa
    if (order.debtAmount > 0 && order.supplierId) {
      const suppliers = this.getSuppliers();
      const supplier = suppliers.find(s => s.id === order.supplierId);
      if (supplier) {
        supplier.balance += order.debtAmount; // Bizning qarzimiz oshadi
        supplier.updatedAt = now;
        this.save('suppliers', suppliers);
        cloudDb.upsertSupplier(supplier);
      }
    }

    orders.unshift(order);
    this.save('supply_orders', orders);

    serverSyncService.recordEvent({
      action: 'STOCK_UPDATED',
      entity: 'product',
      entityId: order.id,
      storeId: this.getDeviceStoreId(),
      deviceStoreId: this.getDeviceStoreId(),
      description: `Kirim qabul qilindi: #${docNumber} ($${order.totalAmount.toFixed(2)})`,
      payload: order,
    });

    return order;
  }

  static paySupplierDebt(supplierId: string, amount: number, paymentMethod: 'cash' | 'card', notes?: string): boolean {
    const suppliers = this.getSuppliers();
    const sup = suppliers.find(s => s.id === supplierId);
    if (!sup) return false;

    const numAmount = Math.max(0, Number(amount) || 0);
    if (numAmount <= 0) return false;

    const prevBalance = Number(sup.balance) || 0;
    const newBalance = Math.max(0, Math.round((prevBalance - numAmount) * 100) / 100);
    sup.balance = Math.abs(newBalance) < 0.009 ? 0 : newBalance;
    sup.updatedAt = new Date().toISOString();
    this.save('suppliers', suppliers);
    cloudDb.upsertSupplier(sup);

    this.addDebtTransaction({
      type: 'supplier',
      entityId: sup.id,
      entityName: sup.name,
      amount: numAmount,
      paymentMethod: paymentMethod,
      action: 'pay_debt',
      notes: notes || 'Yetkazib beruvchiga qarz to\'landi',
    });

    serverSyncService.recordEvent({
      action: 'DEBT_PAYMENT',
      entity: 'debt',
      entityId: sup.id,
      storeId: this.getDeviceStoreId(),
      deviceStoreId: this.getDeviceStoreId(),
      description: `Yetkazib beruvchiga qarz to'landi: ${sup.name} ($${amount})`,
      payload: { supplierId: sup.id, supplierName: sup.name, amount, paymentMethod, notes },
    });

    return true;
  }

  // --- EXPENSES (Xarajatlar) ---
  static getExpenses(_storeFilter?: string): Expense[] {
    let exps = this.load<Expense[]>('expenses', []);
    let hasUpdated = false;
    exps = exps.map((e) => {
      if (e.storeId !== 'store_1') {
        hasUpdated = true;
        return { ...e, storeId: 'store_1' };
      }
      return e;
    });
    if (hasUpdated) {
      this.save('expenses', exps);
    }
    return exps;
  }

  static addExpense(expense: Omit<Expense, 'id' | 'createdAt'>): Expense {
    const expenses = this.getExpenses('all');
    const newExp: Expense = {
      ...expense,
      id: `exp_${generateId()}`,
      storeId: expense.storeId || this.getDeviceStoreId(),
      createdAt: new Date().toISOString(),
    };
    expenses.unshift(newExp);
    this.save('expenses', expenses);
    cloudDb.upsertExpense(newExp);

    serverSyncService.recordEvent({
      action: 'EXPENSE_ADDED',
      entity: 'expense',
      entityId: newExp.id,
      storeId: newExp.storeId || this.getDeviceStoreId(),
      deviceStoreId: this.getDeviceStoreId(),
      description: `Xarajat yozildi: ${newExp.category} ($${newExp.amount})`,
      payload: newExp,
    });

    return newExp;
  }

  static deleteExpense(id: string): boolean {
    const expenses = this.getExpenses('all');
    const existing = expenses.find(e => e.id !== id);
    const filtered = expenses.filter(e => e.id !== id);
    if (filtered.length !== expenses.length) {
      this.save('expenses', filtered);
      cloudDb.deleteExpense(id);

      serverSyncService.recordEvent({
        action: 'EXPENSE_DELETED',
        entity: 'expense',
        entityId: id,
        storeId: existing?.storeId || this.getDeviceStoreId(),
        deviceStoreId: this.getDeviceStoreId(),
        description: `Xarajat o'chirildi (ID: ${id})`,
        payload: { id },
      });

      return true;
    }
    return false;
  }

  // --- DEBT TRANSACTIONS ---
  static getDebtTransactions(): DebtTransaction[] {
    return this.load<DebtTransaction[]>('debt_transactions', []);
  }

  static addDebtTransaction(trx: Omit<DebtTransaction, 'id' | 'createdAt'>): DebtTransaction {
    const list = this.getDebtTransactions();
    const item: DebtTransaction = {
      ...trx,
      id: `debt_trx_${generateId()}`,
      createdAt: new Date().toISOString(),
    };
    list.unshift(item);
    this.save('debt_transactions', list);
    cloudDb.upsertDebtTransaction(item);
    return item;
  }

  // --- BACKUP & RESTORE ---
  static exportFullBackup(): string {
    const data = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      settings: this.getSettings(),
      products: this.getProducts(),
      customers: this.getCustomers(),
      suppliers: this.getSuppliers(),
      sales: this.getSales(),
      supplyOrders: this.getSupplyOrders(),
      expenses: this.getExpenses(),
      debtTransactions: this.getDebtTransactions(),
    };
    return JSON.stringify(data, null, 2);
  }

  static importFullBackup(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.settings) this.save('settings', data.settings);
      if (data.products) this.save('products', data.products);
      if (data.customers) this.save('customers', data.customers);
      if (data.suppliers) this.save('suppliers', data.suppliers);
      if (data.sales) this.save('sales', data.sales);
      if (data.supplyOrders) this.save('supply_orders', data.supplyOrders);
      if (data.expenses) this.save('expenses', data.expenses);
      if (data.debtTransactions) this.save('debt_transactions', data.debtTransactions);
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }

  // Tozalash (Barcha ma'lumotlarni o'chirish va 0 dan boshlash)
  static clearAllData(): void {
    const now = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_PREFIX + 'last_cleared_at', now);
    } catch {}
    this.save('products', []);
    this.save('customers', []);
    this.save('suppliers', []);
    this.save('sales', []);
    this.save('expenses', []);
    this.save('supply_orders', []);
    this.save('debt_transactions', []);
    this.save('sync_events', []);

    const settings = this.getSettings();
    settings.lastClearedAt = now;
    this.save('settings', settings);
    cloudDb.upsertSettings(settings).catch(() => {});
    cloudDb.clearAllCloudData().catch(() => {});
    window.dispatchEvent(new Event('erp_data_changed'));
  }

  static resetToDemo(): void {
    this.clearAllData();
  }
}
