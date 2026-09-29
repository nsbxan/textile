/**
 * Minimalist, Zero-dependency QR Code Generator (SVG & Matrix)
 * ISO/IEC 18004 Standardiga asoslangan QR-kod generatori
 * Trikotaj matolari yorliqlari (etiketkalar) va cheklar uchun 100% oflayn ishlaydi.
 */

// Galois Field (GF 2^8) log and exp tables for Reed-Solomon error correction
const EXP_TABLE = new Uint8Array(256);
const LOG_TABLE = new Uint8Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    LOG_TABLE[x] = i;
    x <<= 1;
    if (x & 256) {
      x ^= 0x11d; // Primitive polynomial x^8 + x^4 + x^3 + x^2 + 1
    }
  }
  EXP_TABLE[255] = EXP_TABLE[0];
})();

function gmult(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP_TABLE[(LOG_TABLE[a] + LOG_TABLE[b]) % 255];
}

// Generate Reed-Solomon error correction polynomial
function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const nextPoly = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j++) {
      nextPoly[j] ^= gmult(poly[j], EXP_TABLE[i]);
      nextPoly[j + 1] ^= poly[j];
    }
    poly = nextPoly;
  }
  return poly;
}

// Calculate error correction codewords
function rsCalculateECC(data: Uint8Array, eccLength: number): Uint8Array {
  const genPoly = rsGeneratorPoly(eccLength);
  const msgPoly = new Uint8Array(data.length + eccLength);
  msgPoly.set(data);

  for (let i = 0; i < data.length; i++) {
    const coef = msgPoly[i];
    if (coef !== 0) {
      for (let j = 0; j < genPoly.length; j++) {
        msgPoly[i + j] ^= gmult(genPoly[j], coef);
      }
    }
  }

  return msgPoly.slice(data.length);
}

// QR Code Specifications for Version 1 to 4 (Medium error correction)
interface VersionInfo {
  version: number;
  size: number;
  totalDataBytes: number;
  eccBytes: number;
  alignmentPatternPositions: number[];
}

const VERSIONS: VersionInfo[] = [
  { version: 1, size: 21, totalDataBytes: 16, eccBytes: 10, alignmentPatternPositions: [] },
  { version: 2, size: 25, totalDataBytes: 28, eccBytes: 16, alignmentPatternPositions: [6, 18] },
  { version: 3, size: 29, totalDataBytes: 44, eccBytes: 26, alignmentPatternPositions: [6, 22] },
  { version: 4, size: 33, totalDataBytes: 64, eccBytes: 36, alignmentPatternPositions: [6, 26] },
];

export function generateQRMatrix(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text);
  
  // Pick smallest fitting version
  let ver = VERSIONS[0];
  let found = false;
  for (const v of VERSIONS) {
    // Mode indicator (4 bits) + Character count indicator (8 bits for Byte mode in v1-9) + data length
    const capacity = v.totalDataBytes;
    if (bytes.length + 2 <= capacity) {
      ver = v;
      found = true;
      break;
    }
  }

  if (!found) {
    // Agar matn uzunroq bo'lsa, eng kattasini olamiz (Version 4)
    ver = VERSIONS[VERSIONS.length - 1];
  }

  const { size, totalDataBytes, eccBytes, alignmentPatternPositions } = ver;

  // 1. Bit Buffer: 0100 (Byte mode) + length (8 bits) + payload
  const bitArray: number[] = [];
  const pushBits = (value: number, count: number) => {
    for (let i = count - 1; i >= 0; i--) {
      bitArray.push((value >> i) & 1);
    }
  };

  // Mode: Byte (0100)
  pushBits(0b0100, 4);
  // Length
  pushBits(Math.min(bytes.length, totalDataBytes - 2), 8);
  // Data bytes
  for (let i = 0; i < Math.min(bytes.length, totalDataBytes - 2); i++) {
    pushBits(bytes[i], 8);
  }

  // Terminator (up to 4 zeros)
  const maxBits = totalDataBytes * 8;
  const termLength = Math.min(4, maxBits - bitArray.length);
  for (let i = 0; i < termLength; i++) bitArray.push(0);

  // Pad to multiple of 8
  while (bitArray.length % 8 !== 0) bitArray.push(0);

  // Pad bytes: 0xEC, 0x11
  const dataBytes = new Uint8Array(totalDataBytes);
  let byteIndex = 0;
  for (let i = 0; i < bitArray.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | bitArray[i + j];
    }
    dataBytes[byteIndex++] = b;
  }

  let pad = 0xec;
  while (byteIndex < totalDataBytes) {
    dataBytes[byteIndex++] = pad;
    pad = pad === 0xec ? 0x11 : 0xec;
  }

  // Error correction calculation
  const eccData = rsCalculateECC(dataBytes, eccBytes);

  // Combined final data codewords
  const finalCodewords = new Uint8Array(dataBytes.length + eccData.length);
  finalCodewords.set(dataBytes);
  finalCodewords.set(eccData, dataBytes.length);

  // Convert to bit stream
  const allBits: number[] = [];
  for (let i = 0; i < finalCodewords.length; i++) {
    for (let b = 7; b >= 0; b--) {
      allBits.push((finalCodewords[i] >> b) & 1);
    }
  }

  // 2. Setup Matrix & Reserved Mask
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const reserved: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const setModule = (r: number, c: number, val: boolean) => {
    matrix[r][c] = val;
    reserved[r][c] = true;
  };

  // Finder Patterns
  const addFinder = (top: number, left: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const row = top + r;
        const col = left + c;
        if (row >= 0 && row < size && col >= 0 && col < size) {
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
            const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
            setModule(row, col, isBorder || isCenter);
          } else {
            setModule(row, col, false); // Separator
          }
        }
      }
    }
  };

  addFinder(0, 0);
  addFinder(0, size - 7);
  addFinder(size - 7, 0);

  // Alignment patterns
  if (alignmentPatternPositions.length > 0) {
    for (const r of alignmentPatternPositions) {
      for (const c of alignmentPatternPositions) {
        if (reserved[r][c]) continue; // Skip if overlaps finder
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const isBorder = Math.abs(dr) === 2 || Math.abs(dc) === 2;
            const isCenter = dr === 0 && dc === 0;
            setModule(r + dr, c + dc, isBorder || isCenter);
          }
        }
      }
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (!reserved[6][i]) setModule(6, i, i % 2 === 0);
    if (!reserved[i][6]) setModule(i, 6, i % 2 === 0);
  }

  // Dark module
  setModule(size - 8, 8, true);

  // Reserve format info area
  for (let i = 0; i < 9; i++) {
    if (!reserved[8][i]) reserved[8][i] = true;
    if (!reserved[i][8]) reserved[i][8] = true;
  }
  for (let i = size - 8; i < size; i++) {
    if (!reserved[8][i]) reserved[8][i] = true;
    if (!reserved[i][8]) reserved[i][8] = true;
  }

  // 3. Place Data with Mask 0 ((r + c) % 2 == 0)
  let bitIdx = 0;
  let upwards = true;

  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--; // Skip vertical timing pattern

    const rows = [];
    if (upwards) {
      for (let r = size - 1; r >= 0; r--) rows.push(r);
    } else {
      for (let r = 0; r < size; r++) rows.push(r);
    }
    upwards = !upwards;

    for (const row of rows) {
      for (const c of [col, col - 1]) {
        if (!reserved[row][c]) {
          let bit = bitIdx < allBits.length ? allBits[bitIdx++] : 0;
          // Mask 0: (row + c) % 2 === 0
          if ((row + c) % 2 === 0) {
            bit ^= 1;
          }
          matrix[row][c] = bit === 1;
        }
      }
    }
  }

  // Format info for Medium ECC (00) and Mask 0 (000) => 00000 -> with BCH & XOR 0x5412 => 0x5412 = 0b101010000010010
  const formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];
  
  // Place format info top-left
  const formatCoordsTL = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ];
  for (let i = 0; i < 15; i++) {
    const [r, c] = formatCoordsTL[i];
    matrix[r][c] = formatBits[i] === 1;
  }

  // Place format info split around finders
  const formatCoordsSplit = [
    [size - 1, 8], [size - 2, 8], [size - 3, 8], [size - 4, 8], [size - 5, 8], [size - 6, 8], [size - 7, 8],
    [8, size - 8], [8, size - 7], [8, size - 6], [8, size - 5], [8, size - 4], [8, size - 3], [8, size - 2], [8, size - 1]
  ];
  for (let i = 0; i < 15; i++) {
    const [r, c] = formatCoordsSplit[i];
    matrix[r][c] = formatBits[i] === 1;
  }

  return matrix;
}
