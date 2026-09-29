// Dollar miqdorini formatlash (masalan: $ 5.40 yoki $ 1,250.00)
export function formatUSD(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "$ 0.00";
  return "$ " + Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Matolar vaznini kg da formatlash (masalan: 24.5 kg)
export function formatKg(weight: number | undefined | null): string {
  if (weight === undefined || weight === null || isNaN(weight)) return "0 kg";
  const num = Number(weight);
  return (num % 1 === 0 ? num.toString() : num.toFixed(2)) + " kg";
}

// Pul miqdorini o'zbek so'mida formatlash (masalan: 150 000 so'm)
export function formatMoney(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "0 so'm";
  return new Intl.NumberFormat('uz-UZ').format(Math.round(amount)) + " so'm";
}

// Qisqa pul formati (masalan: 150 000)
export function formatNumber(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "0";
  return new Intl.NumberFormat('uz-UZ').format(Math.round(amount));
}

// Dollar summasini NBU kursi bo'yicha so'mga aylantirish
export function usdToUzs(usd: number, rate: number = 11880): number {
  return Math.round((usd || 0) * (rate || 11880));
}

// Sanani o'zbek formatida ko'rsatish
export function formatDate(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('uz-UZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

// Sana va vaqtni ko'rsatish
export function formatDateTime(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleString('uz-UZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Unikal ID generatsiyasi
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

// Yangi chek raqami (masalan: #10045)
export function generateReceiptNumber(salesCount: number): string {
  const num = (salesCount + 1).toString().padStart(5, '0');
  return `#${num}`;
}

// Partiya raqami (generatsiya qilinmaydi, faqat haqiqiy kiritilgan partiya ko'rsatiladi)
export function formatBatchNumber(product?: { barcode?: string; batchNumber?: string; id?: string } | null): string {
  if (!product) return '';
  if (product.batchNumber && product.batchNumber.trim()) {
    return product.batchNumber.trim();
  }
  return '-';
}
