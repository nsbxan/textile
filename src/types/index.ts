export type UnitType = 'kg' | 'dona' | 'metr' | 'rulon';

export interface StoreBranch {
  id: string;             // 'store_1'
  name: string;           // 'TEXTILE PRO'
  code: string;           // 'TEXTILE_PRO'
  address: string;        // 'Abu Sahiy F-107'
  phone: string;
  receiptHeader: string;
  receiptFooter: string;
}

export type StoreFilterId = 'all' | 'store_1';

export interface Product {
  id: string;
  barcode: string;
  batchNumber?: string;   // Partiya raqami (masalan: P-1015, P-204)
  name: string;
  category: string;        // Trikotaj mato turi: Kulevka, Dvunitka, Tryoxnitka, Ribana, Lakosta, Interlok
  unit: UnitType;          // Doimo 'kg'
  density?: string;        // Zichlik / grammaj (masalan: 160 gr/m², 240 gr/m², 330 gr/m²)
  color?: string;          // Rangi (masalan: Oq, Qora, Melanj, To'q ko'k, Xaki)
  rolls?: number;          // Rulonlar (to'plar) soni
  buyPrice: number;        // Tannarx (Kirim) DOLLARDA ($ / kg)
  sellPrice: number;       // Chakana sotish narxi DOLLARDA ($ / kg)
  wholesalePrice?: number; // Ulgurji sotish narxi DOLLARDA ($ / kg)
  stock: number;           // Qoldiq miqdori (kg da)
  minStock: number;        // Minimal qoldiq ogohlantirish (kg da)
  storeId?: string;        // 'store_1' (TEXTILE PRO)
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  balance: number;      // Musbat: oldindan to'lov, Manfiy: qarzdorlik (masalan: -50,000)
  notes?: string;
  storeId?: string;     // 'store_1' (TEXTILE PRO)
  createdAt: string;
  updatedAt?: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  company?: string;
  balance: number;      // Biz yetkazib beruvchidan qarzdormiz
  notes?: string;
  storeId?: string;     // 'store_1' (TEXTILE PRO)
  createdAt: string;
  updatedAt?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  price: number;        // Tanlangan narx (chakana yoki ulgurji)
  total: number;
  discount: number;     // Ushbu mahsulot uchun chegirma
}

export interface SaleItem {
  productId: string;
  name: string;
  barcode: string;
  unit: UnitType;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  discount: number;
  total: number;
}

export interface Sale {
  id: string;
  receiptNumber: string;
  items: SaleItem[];
  subtotal: number;       // DOLLARDA ($)
  discountAmount: number; // DOLLARDA ($)
  finalAmount: number;    // JAMI DOLLARDA ($)
  exchangeRate?: number;  // NBU dollar kursi (masalan: 11 880)
  finalAmountUZS?: number;// So'm ekvivalenti
  paidCash: number;       // DOLLARDA ($)
  paidCard: number;       // DOLLARDA ($)
  paidDebt: number;       // DOLLARDA ($)
  paidUsdCash?: number;   // Naqd to'langan dollar
  paidUzsCash?: number;   // Naqd to'langan so'm
  customerId?: string;
  customerName?: string;
  cashierName: string;
  paymentMethod: 'cash' | 'card' | 'debt' | 'mixed';
  profit: number;         // Sof foyda DOLLARDA ($)
  storeId?: string;       // 'store_1' (TEXTILE PRO)
  createdAt: string;
}

export interface SupplyOrderItem {
  productId: string;
  name: string;
  barcode?: string;
  quantity: number;
  buyPrice: number;
  sellPrice?: number;
  total: number;
}

export interface SupplyOrder {
  id: string;
  docNumber: string;
  supplierId: string;
  supplierName: string;
  items: SupplyOrderItem[];
  totalAmount: number;
  paidAmount: number;
  debtAmount: number;
  notes?: string;
  storeId?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  paymentMethod: 'cash' | 'card';
  description: string;
  date: string;
  storeId?: string;
  createdAt: string;
}

export interface DebtTransaction {
  id: string;
  type: 'customer' | 'supplier';
  entityId: string;
  entityName: string;
  amount: number;       // To'langan summa
  paymentMethod: 'cash' | 'card';
  action: 'pay_debt' | 'take_debt'; // Qarz to'lash yoki yangi qarz yozish
  notes?: string;
  storeId?: string;
  createdAt: string;
}

export type SyncActionType = 
  | 'SALE_CREATED' 
  | 'PRODUCT_SAVED' 
  | 'PRODUCT_DELETED' 
  | 'STOCK_UPDATED'
  | 'STOCK_TRANSFERRED' 
  | 'CUSTOMER_SAVED' 
  | 'CUSTOMER_DELETED' 
  | 'DEBT_PAYMENT' 
  | 'EXPENSE_ADDED' 
  | 'EXPENSE_DELETED' 
  | 'SUPPLIER_SAVED' 
  | 'SUPPLIER_DELETED' 
  | 'SETTINGS_SAVED';

export interface SyncEvent {
  id: string;
  action: SyncActionType;
  entity: 'sale' | 'product' | 'customer' | 'expense' | 'supplier' | 'setting' | 'debt';
  entityId?: string;
  storeId: string;
  deviceStoreId: string;
  description: string;
  payload: any;
  timestamp: string;
  synced: boolean;
  syncedAt?: string;
  retryCount?: number;
  error?: string;
}

export interface ServerSyncConfig {
  enabled: boolean;
  serverUrl: string; // Foydalanuvchi oxirida aytadigan server manzili
  apiKey?: string;
  autoSync: boolean;
  syncIntervalSec: number;
  lastSyncedAt?: string;
  lastSyncStatus?: 'success' | 'error' | 'idle' | 'syncing' | 'waiting_server_url';
  lastErrorMessage?: string;
}

export interface AiConfig {
  apiKey: string;
  model: string;            // 'gemini-2.0-flash' | 'gemini-1.5-flash'
  enabled: boolean;
  autoExecuteActions: boolean;
}

export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
  notifyOnSale: boolean;
  notifyOnDebtPayment: boolean;
}

export interface SupabaseConfig {
  enabled: boolean;
  url: string;
  anonKey: string;
}

export interface StoreSettings {
  storeName: string;
  address: string;
  phone: string;
  receiptHeader: string;
  receiptFooter: string;
  currency: string;
  enableSound: boolean;
  lowStockAlert: boolean;
  receiptPrinterWidth: '58mm' | '80mm';
  adminPin?: string;
  currentStoreId?: string; // Bu terminal qaysi do'konga tegishli
  stores?: StoreBranch[];
  serverSync?: ServerSyncConfig;
  aiConfig?: AiConfig;
  telegramConfig?: TelegramConfig;
  supabaseConfig?: SupabaseConfig;
  lastClearedAt?: string;
}

export type UserRole = 'superadmin' | 'admin' | 'cashier';

export type ViewTab = 
  | 'pos' 
  | 'inventory' 
  | 'debts' 
  | 'suppliers' 
  | 'expenses' 
  | 'reports' 
  | 'settings';

export interface AppUserSession {
  name: string;
  phone: string;
  email: string;
  loginTime: string;
  role: UserRole;
}
