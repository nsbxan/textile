export interface ParsedFabricItem {
  tempId: string;
  name: string;
  category: string;
  color: string;
  density: string;
  rolls: number;
  stock: number;         // kg
  buyPrice: number;      // $ / kg
  sellPrice: number;     // $ / kg
  wholesalePrice: number;// $ / kg
  batchNumber: string;
  barcode: string;
  matchedProductId?: string;
  isExistingProduct?: boolean;
  confidence: 'high' | 'medium' | 'low';
  rawText: string;
}

// O'zbekiston trikotaj bozoridagi asosiy mato turlari va ularning kategoriyalari
const FABRIC_CATEGORIES: { pattern: RegExp; category: string; defaultName: string; defaultDensity: string }[] = [
  { pattern: /dvunitka|dvuxnitka|2-ipli|2\s*ipli|futer\s*2/i, category: 'Dvunitka (2-ipli)', defaultName: 'Dvunitka Penye Futer', defaultDensity: '240 gr/m²' },
  { pattern: /tryoxnitka|tryox\s*nitka|treknitka|3-ipli|3\s*ipli|naches|futer\s*3/i, category: 'Tryoxnitka (3-ipli)', defaultName: 'Tryoxnitka Naches Futer', defaultDensity: '320 gr/m²' },
  { pattern: /kulevka|kulyorka|supren|penye\s*100|single\s*jersey|singl/i, category: 'Kulevka / Supren', defaultName: 'Kulevka Penye 100% paxta', defaultDensity: '160 gr/m²' },
  { pattern: /ribana|kastan|ribana\s*laykra/i, category: 'Ribana', defaultName: 'Ribana Penye Laykra bilan', defaultDensity: '220 gr/m²' },
  { pattern: /lakosta|lakost|pikye|pike/i, category: 'Lakosta / Pique', defaultName: 'Lakosta Penye (Pikye)', defaultDensity: '200 gr/m²' },
  { pattern: /interlok|interlock/i, category: 'Interlok', defaultName: 'Interlok Penye 100% paxta', defaultDensity: '210 gr/m²' },
  { pattern: /kashkorse|kashkarse/i, category: 'Kashkorse', defaultName: 'Kashkorse Penye', defaultDensity: '260 gr/m²' },
  { pattern: /polar|flis|fleece/i, category: 'Polar / Flis', defaultName: 'Polar Flis Yumshoq', defaultDensity: '280 gr/m²' },
  { pattern: /velur|velvet/i, category: 'Velur', defaultName: 'Velur Trikotaj Matosi', defaultDensity: '240 gr/m²' },
  { pattern: /laykra|lycra|spandeks|elastan/i, category: 'Kulevka / Supren', defaultName: 'Kulevka Laykra 95/5', defaultDensity: '190 gr/m²' },
];

// Ranglar lug'ati (O'zbek, Rus, Ingliz)
const COLORS_MAP: { pattern: RegExp; uzName: string }[] = [
  { pattern: /\b(oq|bely|belyy|beliy|white|molochniy|sut)\b/i, uzName: 'Oq' },
  { pattern: /\b(qora|cherny|chernyy|cherniy|black)\b/i, uzName: 'Qora' },
  { pattern: /\b(melanj|melange|kulrang|seriy|seryy|grey|gray)\b/i, uzName: 'Melanj' },
  { pattern: /\b(xaki|haki|khaki|zaytun|olivkoviy|olive)\b/i, uzName: 'Xaki' },
  { pattern: /\b(to['’`]?q\s*ko['’`]?k|temno[- ]siniy|navy|navy[- ]blue)\b/i, uzName: "To'q ko'k" },
  { pattern: /\b(antratsit|antracit|anthracite|charcoal)\b/i, uzName: 'Antratsit' },
  { pattern: /\b(qizil|krasny|krasniy|red)\b/i, uzName: 'Qizil' },
  { pattern: /\b(yashil|zeleny|zeleniy|green|zumrad)\b/i, uzName: 'Yashil' },
  { pattern: /\b(sariq|zhelty|zheltiy|yellow|limon)\b/i, uzName: 'Sariq' },
  { pattern: /\b(bej|bejeviy|beige|krem|cream)\b/i, uzName: 'Bej' },
  { pattern: /\b(bordo|bordoviy|maroon|burgundy|vino)\b/i, uzName: 'Bordo' },
  { pattern: /\b(jigarrang|korichneviy|brown|shokolad)\b/i, uzName: 'Jigarrang' },
  { pattern: /\b(moviy|goluboy|light[- ]blue|cyan|havorang)\b/i, uzName: 'Moviy' },
  { pattern: /\b(pushti|rozoviy|pink)\b/i, uzName: 'Pushti' },
  { pattern: /\b(binafsha|fioletoviy|purple|siren)\b/i, uzName: 'Binafsha' },
  { pattern: /\b(olovrang|oranj|orange|apelsin)\b/i, uzName: 'Olovrang' },
];

/**
 * Har bir mato uchun unikal EAN-13 shtrixkod hosil qilish
 */
export function generateEanBarcode(): string {
  const prefix = '478000'; // O'zbekiston kodi namunasi
  const randomPart = Math.floor(100000 + Math.random() * 900000).toString();
  const base = prefix + randomPart;
  // EAN-13 check digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(base[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return base + checkDigit;
}

/**
 * Qog'oz hujjat, QR kod yoki skaner matnini tahlil qilish (Parser)
 */
export function parseScannedDocumentText(rawText: string, existingProducts: { id: string; name: string; barcode: string; color?: string; category: string }[] = []): ParsedFabricItem[] {
  if (!rawText || !rawText.trim()) return [];

  const trimmed = rawText.trim();

  // 1. Agar QR kod orqali JSON kelsa (yoki QR kod yorlig'i)
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const obj = JSON.parse(trimmed);
      if (obj.name || obj.mato || obj.kg || obj.price || obj.narx) {
        const item = createItemFromObject(obj, rawText, existingProducts);
        if (item) return [item];
      }
    } catch {
      // not JSON, proceed to line-by-line
    }
  }

  // 2. Qatorlarga ajratib tahlil qilish
  const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 2);
  const results: ParsedFabricItem[] = [];

  // Qatorlarni ko'rib chiqamiz:
  // Har bir qator alohida mato bo'lishi mumkin yoki "Kalit: Qiymat" ko'rinishida yagona birka bo'lishi mumkin.
  
  // Agar butun matn bitta yorliq (birka) bo'lsa (masalan "Mato: Dvunitka \n Kilo: 25.4 \n Narx: 5.50"):
  const hasKeyValueStructure = lines.some(l => /^(?:mato|nomi|turi|rang|vazn|kilo|kg|narx|tannarx|partiya|rulon|shtrixkod)\s*[:=-]/i.test(l));
  
  if (hasKeyValueStructure && lines.length >= 2) {
    const singleItem = parseKeyValueDocument(lines, rawText, existingProducts);
    if (singleItem && singleItem.stock > 0) {
      return [singleItem];
    }
  }

  // Har bir qator alohida tovar (jadval qatori):
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Sarlavha qatorlarini tashlab yuboramiz (№, Mahsulot, Vazn, Narx...)
    if (/^(?:№|nomer|t\/r|mahsulot\s*nomi|mato\s*nomi|tovarlar|nakladnoy|faktura|hisob|hisobot|jami|itogo|total)/i.test(line)) {
      continue;
    }

    const parsedRow = parseSingleLine(line, i, existingProducts);
    if (parsedRow) {
      results.push(parsedRow);
    }
  }

  // Agar qatorlararo bo'shliq bilan parse qilinmasa va hech narsa topilmasa, butun matnni bitta obyekt sifatida sinab ko'ramiz
  if (results.length === 0 && lines.length > 0) {
    const fallback = parseSingleLine(lines.join(' '), 0, existingProducts);
    if (fallback) {
      results.push(fallback);
    }
  }

  return results;
}

/**
 * Bitta matn qatoridan mato, kg, narx va boshqa ma'lumotlarni ajratib olish
 */
function parseSingleLine(line: string, index: number, existingProducts: { id: string; name: string; barcode: string; color?: string; category: string }[]): ParsedFabricItem | null {
  // 1. Kategoriya va Asosiy Mato Nomini aniqlash
  let detectedCategory = 'Kulevka / Supren';
  let defaultBaseName = 'Kulevka Penye';
  let detectedDensity = '180 gr/m²';
  let categoryMatched = false;

  for (const cat of FABRIC_CATEGORIES) {
    if (cat.pattern.test(line)) {
      detectedCategory = cat.category;
      defaultBaseName = cat.defaultName;
      detectedDensity = cat.defaultDensity;
      categoryMatched = true;
      break;
    }
  }

  // 2. Rangni aniqlash
  let detectedColor = 'Qora';
  let colorMatched = false;
  for (const col of COLORS_MAP) {
    if (col.pattern.test(line)) {
      detectedColor = col.uzName;
      colorMatched = true;
      break;
    }
  }

  // 3. Grammaj / Zichlikni aniqlash (masalan: 180 gr/m2, 240gr, 320 gsm)
  const densityMatch = line.match(/(\d{2,3})\s*(?:gr\/m²|gr\/m2|g\/m2|gsm|gr|gramm|гр)/i);
  if (densityMatch) {
    detectedDensity = `${densityMatch[1]} gr/m²`;
  }

  // 4. Kilosi / Og'irligini aniqlash (kg)
  // Masalan: "125.5 kg", "25,4 kg", "ves: 250", "netto 18.5", yoki oddiygina o'lcham
  let detectedKg = 0;
  
  // Aniq kg belgisi bilan
  const kgMatch = line.match(/(?:vazn|og['’`]?irlik|netto|brutto|ves|kg|kilo|кг)?\s*[:=-]?\s*(\d+(?:[.,]\d+)?)\s*(?:kg|kilo|кг|kgs)\b/i);
  if (kgMatch) {
    detectedKg = parseFloat(kgMatch[1].replace(',', '.'));
  } else {
    // Agar "kg" so'zi bo'lmasa, qatordagi 2-raqam yoki o'rtadagi o'lchovni qidiramiz
    const allNumbers = line.match(/\b\d+(?:[.,]\d+)?\b/g);
    if (allNumbers && allNumbers.length > 0) {
      // Odatda mato og'irligi 5 dan 5000 kg gacha bo'ladi
      for (const numStr of allNumbers) {
        const val = parseFloat(numStr.replace(',', '.'));
        if (val >= 5 && val <= 5000 && val !== parseFloat(detectedDensity)) {
          detectedKg = val;
          break;
        }
      }
    }
  }

  if (detectedKg <= 0) {
    // Standart 1 to'p mato og'irligi
    detectedKg = 25.0;
  }

  // 5. Kirim va Sotish Narxlarini aniqlash ($)
  // Masalan: "$5.20", "5.40$", "narxi: 6.5", "5,50 usd"
  let detectedBuyPrice = 0;
  let detectedSellPrice = 0;

  const priceMatches = Array.from(line.matchAll(/(?:\$|usd|dollar)?\s*(\d+(?:[.,]\d+)?)\s*(?:\$|usd|dollar|\/kg)/gi));
  if (priceMatches.length >= 2) {
    detectedBuyPrice = parseFloat(priceMatches[0][1].replace(',', '.'));
    detectedSellPrice = parseFloat(priceMatches[1][1].replace(',', '.'));
  } else if (priceMatches.length === 1) {
    detectedBuyPrice = parseFloat(priceMatches[0][1].replace(',', '.'));
  } else {
    // Narx belgisi ($) bo'lmagan holda, 2.00 dan 35.00 gacha bo'lgan sonlar (chunki mato kg si odatda $3 - $15 atrofida bo'ladi)
    const floatNumbers = line.match(/\b\d+[.,]\d{1,2}\b/g);
    if (floatNumbers && floatNumbers.length > 0) {
      for (const numStr of floatNumbers) {
        const val = parseFloat(numStr.replace(',', '.'));
        if (val >= 2.0 && val <= 35.0 && val !== detectedKg) {
          detectedBuyPrice = val;
          break;
        }
      }
    }
  }

  if (detectedBuyPrice <= 0) {
    // Namunaviy tannarx
    detectedBuyPrice = detectedCategory.includes('Tryoxnitka') ? 6.80 : (detectedCategory.includes('Dvunitka') ? 5.50 : 4.80);
  }

  if (detectedSellPrice <= 0) {
    // 25% ustama bilan sotish narxi tavsiya etiladi
    detectedSellPrice = Math.round((detectedBuyPrice * 1.25) * 100) / 100;
  }

  const wholesalePrice = Math.round((detectedBuyPrice * 1.15) * 100) / 100;

  // 6. Rulon / To'plar sonini aniqlash
  let detectedRolls = 1;
  const rollsMatch = line.match(/(\d+)\s*(?:to['’`]?p|rulon|roll|rolls|ta|dona|рулон)/i);
  if (rollsMatch) {
    detectedRolls = parseInt(rollsMatch[1], 10);
  } else if (detectedKg > 40) {
    // Agar vazn katta bo'lsa, to'plar sonini taxminan hisoblash (har bir to'p ~22-25 kg)
    detectedRolls = Math.max(1, Math.round(detectedKg / 23));
  }

  // 7. Partiya raqami
  let detectedBatch = `P-${(100 + (index % 900) + Math.floor(Math.random() * 50))}`;
  const batchMatch = line.match(/(?:partiya|batch|lot|№|#)\s*[:=-]?\s*([A-Za-z0-9\-]+)/i);
  if (batchMatch && batchMatch[1].length >= 2) {
    detectedBatch = batchMatch[1].toUpperCase();
  }

  // 8. Shtrixkod
  let detectedBarcode = generateEanBarcode();
  const barcodeMatch = line.match(/\b(\d{12,13})\b/);
  if (barcodeMatch) {
    detectedBarcode = barcodeMatch[1];
  }

  // 9. Mato nomini chiroyli shakllantirish
  let fabricName = `${defaultBaseName} (${detectedColor})`;
  // Agar qatorda qo'shimcha nom bo'lsa, uni saqlab qolish
  if (!categoryMatched && !colorMatched) {
    // Agar na kategoriya na rang aniqlansa, qatordagi birinchi so'zlarni nom sifatida olamiz
    const cleanWords = line.replace(/[^A-Za-zА-Яа-я0-9\s'%/-]/g, ' ').trim().split(/\s+/).slice(0, 4).join(' ');
    if (cleanWords.length >= 3) {
      fabricName = cleanWords;
    }
  }

  // 10. Mavjud bazadagi matolar bilan moslikni tekshirish
  const matched = existingProducts.find(p => 
    p.name.toLowerCase().includes(detectedColor.toLowerCase()) &&
    p.category.toLowerCase() === detectedCategory.toLowerCase()
  );

  return {
    tempId: `scanned_${Date.now()}_${index}`,
    name: fabricName,
    category: detectedCategory,
    color: detectedColor,
    density: detectedDensity,
    rolls: detectedRolls,
    stock: detectedKg,
    buyPrice: detectedBuyPrice,
    sellPrice: detectedSellPrice,
    wholesalePrice,
    batchNumber: detectedBatch,
    barcode: detectedBarcode,
    matchedProductId: matched?.id,
    isExistingProduct: !!matched,
    confidence: (categoryMatched && colorMatched) ? 'high' : (categoryMatched || colorMatched ? 'medium' : 'low'),
    rawText: line,
  };
}

/**
 * Birka (yorliq) ko'rinishidagi "Kalit: Qiymat" hujjatini tahlil qilish
 */
function parseKeyValueDocument(lines: string[], rawText: string, existingProducts: { id: string; name: string; barcode: string; color?: string; category: string }[]): ParsedFabricItem | null {
  const fullText = lines.join(' \n ');
  return parseSingleLine(fullText, 0, existingProducts);
}

/**
 * JSON obyektdan mato ma'lumotlarini tuzish
 */
function createItemFromObject(obj: any, rawText: string, existingProducts: { id: string; name: string; barcode: string; color?: string; category: string }[]): ParsedFabricItem | null {
  const name = obj.name || obj.mato || obj.title || 'Kulevka Penye';
  const category = obj.category || obj.turi || 'Kulevka / Supren';
  const color = obj.color || obj.rang || 'Qora';
  const density = obj.density || obj.grammaj || '180 gr/m²';
  const rolls = Number(obj.rolls || obj.top || obj.rulon) || 1;
  const stock = Number(obj.stock || obj.kg || obj.vazn || obj.ogirlik) || 25.0;
  const buyPrice = Number(obj.buyPrice || obj.narx || obj.tannarx || obj.price) || 5.0;
  const sellPrice = Number(obj.sellPrice || obj.sotishNarxi) || (Math.round(buyPrice * 1.25 * 100) / 100);
  const wholesalePrice = Number(obj.wholesalePrice) || (Math.round(buyPrice * 1.15 * 100) / 100);
  const batchNumber = obj.batchNumber || obj.partiya || `P-${Math.floor(100 + Math.random() * 900)}`;
  const barcode = obj.barcode || obj.shtrixkod || generateEanBarcode();

  const matched = existingProducts.find(p => p.barcode === barcode || (p.name === name && p.color === color));

  return {
    tempId: `scanned_json_${Date.now()}`,
    name,
    category,
    color,
    density,
    rolls,
    stock,
    buyPrice,
    sellPrice,
    wholesalePrice,
    batchNumber,
    barcode,
    matchedProductId: matched?.id,
    isExistingProduct: !!matched,
    confidence: 'high',
    rawText,
  };
}

/**
 * Namunaviy Qog'oz Hujjatlar (foydalanuvchi bir marta bosish bilan sinab ko'rishi uchun)
 */
export const SAMPLE_FABRIC_DOCUMENTS = [
  {
    title: "Mato Nakladnoyi (Fabrika Yuk Xati №104)",
    type: "nakladnoy",
    text: `YUK XATI (NAKLADNOY) № 104-F
Yetkazib beruvchi: OOO "Tekstil Sanoat Savdo"
Sana: 2026-yil 29-sentyabr

1. Kulevka Penye 100% paxta, Oq, 160 gr/m2, 14 to'p, 350.0 kg, Kirim narxi: $ 4.30 /kg, Sotish: $ 5.40
2. Dvunitka Penye Futer, Qora, 240 gr/m2, 10 to'p, 260.5 kg, Kirim narxi: $ 5.60 /kg, Sotish: $ 6.90
3. Tryoxnitka Naches Futer, Melanj, 330 gr/m2, 8 to'p, 210.0 kg, Kirim narxi: $ 7.10 /kg, Sotish: $ 8.80
4. Ribana Laykra bilan, To'q ko'k, 220 gr/m2, 6 to'p, 145.0 kg, Kirim narxi: $ 5.80 /kg, Sotish: $ 7.20
5. Lakosta Penye (Pikye), Xaki, 200 gr/m2, 5 to'p, 125.0 kg, Kirim narxi: $ 6.20 /kg, Sotish: $ 7.80`,
  },
  {
    title: "To'p Yorlig'i / Birka (Roll Tag)",
    type: "birka",
    text: `---------------------------------------
      TRIKOTAJ MATO YORLIG'I (BIRKA)
---------------------------------------
Mato turi: Tryoxnitka Naches Futer (3-ipli)
Rangi: Antratsit (Kulrang to'q)
Grammaj: 320 gr/m²
Partiya raqami: P-2055
Rulon soni: 1 to'p
Sof vazni (Netto): 28.6 kg
Kirim tannarxi: $ 7.25 /kg
Tavsiya sotish: $ 8.90 /kg
Shtrix-kod: 4780001092814
---------------------------------------`,
  },
  {
    title: "Oddiy Tezkor Kirim Ro'yxati",
    type: "simple",
    text: `Kulevka Laykra Oq 190gr 8 to'p 200kg $5.10
Dvunitka Penye Qizil 240gr 5 to'p 130kg $5.70
Interlok Penye Bej 210gr 6 to'p 150kg $6.00
Kashkorse Qora 260gr 4 to'p 95kg $6.50`,
  },
];
