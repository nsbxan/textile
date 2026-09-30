import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Product, Sale, Customer, Supplier, Expense, DebtTransaction, StoreSettings, SupabaseConfig } from '../types';

const SUPABASE_STORAGE_KEY = 'savdo_erp_supabase_config';

export const DEFAULT_SUPABASE_CONFIG: SupabaseConfig = {
  enabled: true,
  url: (import.meta as any).env?.VITE_SUPABASE_URL || 'https://hxwhjzvbvnrufqinsloh.supabase.co',
  anonKey: (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_BkN9NFXktPz8kq3_j3wmOA_4DHIJuwe',
};

export const SUPABASE_SQL_SETUP = `-- ==============================================================
-- TEXTILE PRO ERP - BULUTLI BAZA JADVALLARI (SUPABASE SQL SCRIPT)
-- Supabase boshqaruv panelidagi 'SQL Editor' bo'limiga nusxalang va 'RUN' bosing
-- ==============================================================

create table if not exists products (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists sales (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists customers (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists suppliers (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists expenses (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists debt_transactions (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists settings (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

-- RLS (Row Level Security) faollashtirish
alter table products enable row level security;
alter table sales enable row level security;
alter table customers enable row level security;
alter table suppliers enable row level security;
alter table expenses enable row level security;
alter table debt_transactions enable row level security;
alter table settings enable row level security;

-- Ochiq ruxsat siyosati (Anon kalit orqali to'g'ridan-to'g'ri o'qish va yozish uchun)
drop policy if exists "Allow all for products" on products;
create policy "Allow all for products" on products for all using (true) with check (true);

drop policy if exists "Allow all for sales" on sales;
create policy "Allow all for sales" on sales for all using (true) with check (true);

drop policy if exists "Allow all for customers" on customers;
create policy "Allow all for customers" on customers for all using (true) with check (true);

drop policy if exists "Allow all for suppliers" on suppliers;
create policy "Allow all for suppliers" on suppliers for all using (true) with check (true);

drop policy if exists "Allow all for expenses" on expenses;
create policy "Allow all for expenses" on expenses for all using (true) with check (true);

drop policy if exists "Allow all for debt_transactions" on debt_transactions;
create policy "Allow all for debt_transactions" on debt_transactions for all using (true) with check (true);

drop policy if exists "Allow all for settings" on settings;
create policy "Allow all for settings" on settings for all using (true) with check (true);
`;

class CloudDatabaseService {
  private client: SupabaseClient | null = null;
  private config: SupabaseConfig;

  constructor() {
    this.config = this.loadConfig();
    this.initClient();
  }

  public loadConfig(): SupabaseConfig {
    try {
      const saved = localStorage.getItem(SUPABASE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const url = (parsed.url && parsed.url.trim().length > 5) ? parsed.url.trim() : DEFAULT_SUPABASE_CONFIG.url;
        const anonKey = (parsed.anonKey && parsed.anonKey.trim().length > 10) ? parsed.anonKey.trim() : DEFAULT_SUPABASE_CONFIG.anonKey;
        return {
          enabled: parsed.enabled ?? true,
          url,
          anonKey,
        };
      }
    } catch {}
    return DEFAULT_SUPABASE_CONFIG;
  }

  public saveConfig(config: SupabaseConfig): void {
    this.config = config;
    try {
      localStorage.setItem(SUPABASE_STORAGE_KEY, JSON.stringify(config));
    } catch {}
    this.initClient();
  }

  public getConfig(): SupabaseConfig {
    return this.config;
  }

  public isConfigured(): boolean {
    return Boolean(this.config.enabled && this.config.url.trim() && this.config.anonKey.trim());
  }

  private initClient(): void {
    if (this.isConfigured()) {
      try {
        this.client = createClient(this.config.url.trim(), this.config.anonKey.trim(), {
          auth: {
            persistSession: false,
          },
        });
      } catch (e) {
        console.error('Supabase initialization failed:', e);
        this.client = null;
      }
    } else {
      this.client = null;
    }
  }

  public async testConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
    if (!url.trim() || !anonKey.trim()) {
      return { success: false, message: "Supabase Project URL va Anon API kaliti kiritilmadi!" };
    }

    try {
      const testClient = createClient(url.trim(), anonKey.trim(), { auth: { persistSession: false } });
      const { error } = await testClient.from('products').select('id').limit(1);

      if (error) {
        if (error.code === '42P01') {
          return {
            success: false,
            message: "Ulanish bo'ldi, ammo jadvallar hali yaratilmagan! Iltimos, Supabase 'SQL Editor' bo'limiga SQL skriptni nusxalab bosing."
          };
        }
        return { success: false, message: `Xatolik: ${error.message} (Kod: ${error.code})` };
      }

      return { 
        success: true, 
        message: "Ajoyib! Supabase bulutli bazasiga muvaffaqiyatli ulandi. Barcha ma'lumotlar endi xavfsiz serverda saqlanadi." 
      };
    } catch (e: any) {
      return { success: false, message: `Ulanishda xatolik: ${e?.message || e}` };
    }
  }

  // --- CLOUD SYNC OPERATIONS ---
  public async pullAllData(): Promise<{
    products?: Product[];
    sales?: Sale[];
    customers?: Customer[];
    suppliers?: Supplier[];
    expenses?: Expense[];
    debtTransactions?: DebtTransaction[];
    settings?: StoreSettings;
  } | null> {
    if (!this.client || !this.isConfigured()) return null;

    try {
      const [
        prodsRes,
        salesRes,
        custsRes,
        supsRes,
        expsRes,
        debtsRes,
        settingsRes
      ] = await Promise.all([
        this.client.from('products').select('data, updated_at'),
        this.client.from('sales').select('data, updated_at'),
        this.client.from('customers').select('data, updated_at'),
        this.client.from('suppliers').select('data, updated_at'),
        this.client.from('expenses').select('data, updated_at'),
        this.client.from('debt_transactions').select('data, updated_at'),
        this.client.from('settings').select('data').eq('key', 'store_settings').maybeSingle(),
      ]);

      const result: any = {};
      if (prodsRes.data && prodsRes.data.length > 0) {
        result.products = prodsRes.data.map(r => ({ ...r.data, updatedAt: r.data?.updatedAt || r.updated_at }));
      }
      if (salesRes.data && salesRes.data.length > 0) {
        result.sales = salesRes.data.map(r => ({ ...r.data, updatedAt: r.data?.updatedAt || r.updated_at }));
      }
      if (custsRes.data && custsRes.data.length > 0) {
        result.customers = custsRes.data.map(r => ({ ...r.data, updatedAt: r.data?.updatedAt || r.updated_at }));
      }
      if (supsRes.data && supsRes.data.length > 0) {
        result.suppliers = supsRes.data.map(r => ({ ...r.data, updatedAt: r.data?.updatedAt || r.updated_at }));
      }
      if (expsRes.data && expsRes.data.length > 0) {
        result.expenses = expsRes.data.map(r => ({ ...r.data, updatedAt: r.data?.updatedAt || r.updated_at }));
      }
      if (debtsRes.data && debtsRes.data.length > 0) {
        result.debtTransactions = debtsRes.data.map(r => ({ ...r.data, updatedAt: r.data?.updatedAt || r.updated_at }));
      }
      if (settingsRes.data && settingsRes.data.data) result.settings = settingsRes.data.data;

      return result;
    } catch (e) {
      console.error('Failed to pull data from Supabase:', e);
      return null;
    }
  }

  public async upsertProduct(product: Product): Promise<void> {
    if (!this.client || !this.isConfigured()) return;
    try {
      await this.client.from('products').upsert({
        id: product.id,
        data: product,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.error('Cloud upsertProduct error:', e);
    }
  }

  public async deleteProduct(id: string): Promise<void> {
    if (!this.client || !this.isConfigured()) return;
    try {
      await this.client.from('products').delete().eq('id', id);
    } catch (e) {
      console.error('Cloud deleteProduct error:', e);
    }
  }

  public async upsertSale(sale: Sale): Promise<void> {
    if (!this.client || !this.isConfigured()) return;
    try {
      await this.client.from('sales').upsert({
        id: sale.id,
        data: sale,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.error('Cloud upsertSale error:', e);
    }
  }

  public async deleteSale(id: string): Promise<void> {
    if (!this.client || !this.isConfigured()) return;
    try {
      await this.client.from('sales').delete().eq('id', id);
    } catch (e) {
      console.error('Cloud deleteSale error:', e);
    }
  }

  public async upsertCustomer(customer: Customer): Promise<void> {
    if (!this.client || !this.isConfigured()) return;
    try {
      await this.client.from('customers').upsert({
        id: customer.id,
        data: customer,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.error('Cloud upsertCustomer error:', e);
    }
  }

  public async deleteCustomer(id: string): Promise<void> {
    if (!this.client || !this.isConfigured()) return;
    try {
      await this.client.from('customers').delete().eq('id', id);
    } catch (e) {
      console.error('Cloud deleteCustomer error:', e);
    }
  }

  public async upsertSupplier(supplier: Supplier): Promise<void> {
    if (!this.client || !this.isConfigured()) return;
    try {
      await this.client.from('suppliers').upsert({
        id: supplier.id,
        data: supplier,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.error('Cloud upsertSupplier error:', e);
    }
  }

  public async deleteSupplier(id: string): Promise<void> {
    if (!this.client || !this.isConfigured()) return;
    try {
      await this.client.from('suppliers').delete().eq('id', id);
    } catch (e) {
      console.error('Cloud deleteSupplier error:', e);
    }
  }

  public async upsertExpense(expense: Expense): Promise<void> {
    if (!this.client || !this.isConfigured()) return;
    try {
      await this.client.from('expenses').upsert({
        id: expense.id,
        data: expense,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.error('Cloud upsertExpense error:', e);
    }
  }

  public async deleteExpense(id: string): Promise<void> {
    if (!this.client || !this.isConfigured()) return;
    try {
      await this.client.from('expenses').delete().eq('id', id);
    } catch (e) {
      console.error('Cloud deleteExpense error:', e);
    }
  }

  public async upsertDebtTransaction(tx: DebtTransaction): Promise<void> {
    if (!this.client || !this.isConfigured()) return;
    try {
      await this.client.from('debt_transactions').upsert({
        id: tx.id,
        data: tx,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.error('Cloud upsertDebtTransaction error:', e);
    }
  }

  public async upsertSettings(settings: StoreSettings): Promise<void> {
    if (!this.client || !this.isConfigured()) return;
    try {
      await this.client.from('settings').upsert({
        key: 'store_settings',
        data: settings,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.error('Cloud upsertSettings error:', e);
    }
  }

  public async pushAllLocalData(data: {
    products: Product[];
    sales: Sale[];
    customers: Customer[];
    suppliers: Supplier[];
    expenses: Expense[];
    debtTransactions: DebtTransaction[];
    settings: StoreSettings;
  }): Promise<{ success: boolean; message: string }> {
    if (!this.client || !this.isConfigured()) {
      return { success: false, message: "Supabase bulutli bazasi ulanmagan!" };
    }

    try {
      const now = new Date().toISOString();
      const pRows = data.products.map(p => ({ id: p.id, data: p, updated_at: now }));
      const sRows = data.sales.map(s => ({ id: s.id, data: s, updated_at: now }));
      const cRows = data.customers.map(c => ({ id: c.id, data: c, updated_at: now }));
      const supRows = data.suppliers.map(sup => ({ id: sup.id, data: sup, updated_at: now }));
      const eRows = data.expenses.map(e => ({ id: e.id, data: e, updated_at: now }));
      const dRows = data.debtTransactions.map(d => ({ id: d.id, data: d, updated_at: now }));

      if (pRows.length > 0) await this.client.from('products').upsert(pRows);
      if (sRows.length > 0) await this.client.from('sales').upsert(sRows);
      if (cRows.length > 0) await this.client.from('customers').upsert(cRows);
      if (supRows.length > 0) await this.client.from('suppliers').upsert(supRows);
      if (eRows.length > 0) await this.client.from('expenses').upsert(eRows);
      if (dRows.length > 0) await this.client.from('debt_transactions').upsert(dRows);
      await this.client.from('settings').upsert({ key: 'store_settings', data: data.settings, updated_at: now });

      return {
        success: true,
        message: `Muvaffaqiyatli saqlandi: ${pRows.length} ta mato, ${sRows.length} ta savdo, ${cRows.length} ta mijoz bulutga yuklandi!`
      };
    } catch (err: any) {
      return { success: false, message: `Yuklashda xatolik: ${err?.message || err}` };
    }
  }
}

export const cloudDb = new CloudDatabaseService();
