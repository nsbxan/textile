/**
 * Qog'oz hujjatlar va veb-kamera skaneri yordamchi vositalari
 */

export type DocumentFilterMode = 'normal' | 'high_contrast' | 'black_and_white';

/**
 * Canvas tasvirini oq-qora yoki yuqori kontrastli qilib qayta ishlash (Hujjat OCR / O'qish sifatini yaxshilash)
 */
export function applyDocumentFilter(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  mode: DocumentFilterMode
): void {
  if (mode === 'normal') return;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Grayscale luminance
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

    if (mode === 'black_and_white') {
      // Oq-qora chegara (Binarization): qog'oz oq, matn qora
      const threshold = 140;
      const v = gray > threshold ? 255 : 0;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
    } else if (mode === 'high_contrast') {
      // Yuqori kontrast (Contrast stretching)
      const factor = 1.6;
      const adjusted = factor * (gray - 128) + 128;
      const clamped = Math.max(0, Math.min(255, adjusted));
      data[i] = clamped;
      data[i + 1] = clamped;
      data[i + 2] = clamped;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Brauzerning mahalliy BarcodeDetector API orqali shtrixkod / QR kodni aniqlash
 */
export async function detectCodeFromCanvas(canvas: HTMLCanvasElement): Promise<string | null> {
  try {
    // Agar brauzer yoki Electron da BarcodeDetector mavjud bo'lsa
    if ('BarcodeDetector' in window) {
      const BarcodeDetectorClass = (window as any).BarcodeDetector;
      const detector = new BarcodeDetectorClass({
        formats: ['qr_code', 'ean_13', 'code_128', 'code_39', 'data_matrix', 'upc_a'],
      });
      const barcodes = await detector.detect(canvas);
      if (barcodes && barcodes.length > 0) {
        return barcodes[0].rawValue;
      }
    }
  } catch (err) {
    console.debug('BarcodeDetector error/not supported:', err);
  }
  return null;
}

/**
 * Rasmni 90 daraja o'ngga burish
 */
export function rotateImageCanvas(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const rotated = document.createElement('canvas');
  rotated.width = sourceCanvas.height;
  rotated.height = sourceCanvas.width;
  const ctx = rotated.getContext('2d');
  if (!ctx) return sourceCanvas;

  ctx.translate(rotated.width / 2, rotated.height / 2);
  ctx.rotate((90 * Math.PI) / 180);
  ctx.drawImage(sourceCanvas, -sourceCanvas.width / 2, -sourceCanvas.height / 2);

  return rotated;
}
