// NBU / Markaziy Bank dollar kursi servisi va qo'lda kurs belgilash

export interface CurrencyRate {
  currency: string;
  buyRate: number;
  sellRate: number;
  lastUpdated: string;
  source: string;
  isCustom?: boolean;
}

const STORAGE_KEY = 'savdo_erp_usd_rate';

// Standart boshlang'ich kurs
const DEFAULT_RATE: CurrencyRate = {
  currency: 'USD',
  buyRate: 12750,
  sellRate: 12850,
  lastUpdated: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
  source: 'Standart kurs',
};

export async function fetchNbuRate(forceRefresh: boolean = false): Promise<CurrencyRate> {
  // 1. Avval saqlangan keshni tekshirish
  if (!forceRefresh) {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as CurrencyRate;
        if (parsed && parsed.sellRate > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
  }

  // 2. Jonli so'rov yuborib yangilashga urinish
  try {
    const response = await fetch('https://cbu.uz/uz/arkhiv-kursov-valyut/json/');
    if (response.ok) {
      const data = await response.json();
      const usdItem = data.find((item: { Ccy: string }) => item.Ccy === 'USD');
      if (usdItem && usdItem.Rate) {
        const cbuRate = parseFloat(usdItem.Rate);
        const nbuSell = Math.round(cbuRate > 10000 ? (cbuRate + 50) : 12850);
        const nbuBuy = Math.round(cbuRate > 10000 ? (cbuRate - 50) : 12750);
        
        const newRate: CurrencyRate = {
          currency: 'USD',
          buyRate: nbuBuy,
          sellRate: nbuSell,
          lastUpdated: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
          source: 'Markaziy Bank (CBU)',
          isCustom: false,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newRate));
        window.dispatchEvent(new Event('erp_rate_changed'));
        return newRate;
      }
    }
  } catch {
    // Offline rejimda ishlasa
  }

  const fallback = getCachedRate();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
  return fallback;
}

export function setCustomUsdRate(sellRate: number): CurrencyRate {
  const validRate = Math.max(100, Math.round(sellRate));
  const newRate: CurrencyRate = {
    currency: 'USD',
    buyRate: Math.max(100, validRate - 100),
    sellRate: validRate,
    lastUpdated: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
    source: "Qo'lda belgilangan",
    isCustom: true,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newRate));
  window.dispatchEvent(new Event('erp_rate_changed'));
  return newRate;
}

export function getCachedRate(): CurrencyRate {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // ignore
  }
  return DEFAULT_RATE;
}
