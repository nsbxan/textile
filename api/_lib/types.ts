export interface SheetProductRow {
  id: string;
  barcode: string;
  batchNumber?: string;
  name: string;
  category: string;
  unit: string;
  density?: string;
  color?: string;
  rolls?: number;
  buyPrice: number;
  sellPrice: number;
  wholesalePrice?: number;
  stock: number;
  minStock: number;
  storeId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SheetSaleRow {
  id: string;
  receiptNumber: string;
  createdAt: string;
  storeId?: string;
  customerId?: string;
  customerName?: string;
  cashierName: string;
  paymentMethod: string;
  subtotal: number;
  discountAmount: number;
  finalAmount: number;
  finalAmountUZS?: number;
  paidCash: number;
  paidCard: number;
  paidDebt: number;
  profit: number;
  itemsSummary: string;
  itemsJson?: string;
}

export interface SheetCustomerRow {
  id: string;
  name: string;
  phone: string;
  address?: string;
  balance: number;
  notes?: string;
  storeId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SheetExpenseRow {
  id: string;
  date: string;
  category: string;
  amount: number;
  paymentMethod: string;
  description: string;
  storeId?: string;
  createdAt: string;
}

export interface SheetSupplierRow {
  id: string;
  name: string;
  phone: string;
  company?: string;
  balance: number;
  notes?: string;
  storeId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SheetDebtRow {
  id: string;
  createdAt: string;
  type: string;
  entityName: string;
  action: string;
  amount: number;
  paymentMethod: string;
  notes?: string;
  storeId?: string;
}

export interface SheetSyncLogRow {
  id: string;
  timestamp: string;
  action: string;
  entity: string;
  storeId: string;
  description: string;
  status: string;
  error?: string;
}
