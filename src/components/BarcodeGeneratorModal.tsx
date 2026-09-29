import React, { useState, useRef } from 'react';
import { X, Printer, QrCode, Copy, Check, Eye } from 'lucide-react';
import { Product } from '../types';
import { formatUSD, usdToUzs, formatMoney, formatBatchNumber } from '../utils/formatters';
import { getCachedRate } from '../utils/currency';
import { QRCodeSVG } from './QRCodeSVG';
import { soundManager } from '../utils/sound';

interface BarcodeGeneratorModalProps {
  product: Product | null;
  onClose: () => void;
}

export const BarcodeGeneratorModal: React.FC<BarcodeGeneratorModalProps> = ({
  product,
  onClose,
}) => {
  const [copiesCount, setCopiesCount] = useState<number>(6);
  const [copied, setCopied] = useState(false);
  const printContainerRef = useRef<HTMLDivElement>(null);

  if (!product) return null;

  const qrValue = product.barcode || product.id;
  const batchNumber = formatBatchNumber(product);
  const nbuRate = getCachedRate();
  const priceUzs = usdToUzs(product.sellPrice, nbuRate.sellRate);

  const handleCopyCode = () => {
    soundManager.playHapticClick();
    navigator.clipboard.writeText(batchNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    soundManager.playHapticClick();

    const container = printContainerRef.current;
    if (!container) {
      window.print();
      return;
    }

    // Mustaqil iframe orqali to'g'ridan-to'g'ri chop etish
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>TEXTILE PRO - QR Kod Yorliqlari</title>
          <style>
            @page {
              margin: 5mm;
              size: auto;
            }
            body {
              margin: 0;
              padding: 8px;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              background: #fff;
              color: #000;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .grid-container {
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
              align-items: flex-start;
            }
            .sticker-item {
              width: 195px;
              border: 1.5px solid #000;
              border-radius: 8px;
              padding: 8px 6px;
              text-align: center;
              box-sizing: border-box;
              page-break-inside: avoid;
              background: #fff;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .brand-name {
              font-size: 11px;
              font-weight: 900;
              letter-spacing: 2px;
              text-transform: uppercase;
              color: #000;
              margin-bottom: 2px;
              border-bottom: 1.5px solid #000;
              padding-bottom: 2px;
              width: 100%;
            }
            .fabric-name {
              font-size: 11px;
              font-weight: 900;
              line-height: 1.25;
              max-width: 100%;
              word-break: break-word;
              margin-top: 3px;
              margin-bottom: 2px;
            }
            .fabric-details {
              font-size: 9px;
              font-weight: 700;
              color: #333;
              margin-bottom: 4px;
            }
            .qr-wrapper {
              display: flex;
              justify-content: center;
              margin: 4px 0;
              background: #fff;
            }
            .qr-wrapper svg {
              width: 110px;
              height: 110px;
            }
            .qr-code-str {
              font-family: monospace;
              font-size: 11px;
              font-weight: 900;
              letter-spacing: 1px;
              margin-top: 2px;
              color: #000;
            }
            .price-row {
              width: 100%;
              border-top: 1px dashed #000;
              margin-top: 4px;
              padding-top: 4px;
              display: flex;
              justify-content: space-between;
              align-items: baseline;
            }
            .price-val {
              font-size: 13px;
              font-weight: 900;
              color: #000;
            }
            .price-sub {
              font-size: 9px;
              font-family: monospace;
              font-weight: 700;
              color: #444;
            }
          </style>
        </head>
        <body>
          <div class="grid-container">
            ${container.innerHTML}
          </div>
          <script>
            setTimeout(function() {
              window.focus();
              window.print();
              setTimeout(function() {
                try {
                  window.frameElement && window.frameElement.remove();
                } catch(e) {}
              }, 2000);
            }, 300);
          </script>
        </body>
      </html>
    `);
    doc.close();
  };

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-3 select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-3xl max-w-2xl w-full flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
          <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-extrabold text-sm sm:text-base">
            <div className="w-7 h-7 rounded-lg bg-blue-600/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <span>Mato QR-kod Yorlig'i</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg interactive-press"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content - 2 Ustunli ixcham layout (oynaga to'liq sig'adi) */}
        <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          {/* Chap ustun: Ma'lumotlar va Sozlamalar */}
          <div className="space-y-3.5 flex flex-col justify-between h-full">
            {/* Mato kartochkasi */}
            <div className="p-3 rounded-2xl glass-card border space-y-1.5">
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                {product.category}
              </span>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white leading-snug">
                {product.name}
              </h3>
              {(product.density || product.color) && (
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-semibold">
                  {product.density && <span>{product.density}</span>}
                  {product.density && product.color && <span>•</span>}
                  {product.color && <span>Rangi: {product.color}</span>}
                </div>
              )}

              <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-500">Partiya Raqami:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800 text-xs font-black">
                    {batchNumber}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white border interactive-press"
                    title="Nusxalash"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {product.barcode && (
                <div className="pt-1.5 flex items-center justify-between border-t border-slate-200 dark:border-slate-800 text-slate-400 text-[11px]">
                  <span className="font-semibold text-slate-500">QR Skaner kodi:</span>
                  <span className="font-mono font-bold text-slate-600 dark:text-slate-300">{product.barcode}</span>
                </div>
              )}
            </div>

            {/* Chop etish nusxalari */}
            <div className="p-3 rounded-2xl glass-card border space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Nusxalar soni:</span>
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={copiesCount}
                  onChange={(e) => setCopiesCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-14 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-center font-mono font-bold text-slate-900 dark:text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex items-center gap-1.5">
                {[1, 2, 4, 8, 16].map((num) => (
                  <button
                    key={num}
                    onClick={() => {
                      soundManager.playHapticClick();
                      setCopiesCount(num);
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all oxista-btn ${
                      copiesCount === num
                        ? 'btn-ios-blue shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    {num} ta
                  </button>
                ))}
              </div>
            </div>

            {/* Amallar tugmalari */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={onClose}
                className="w-24 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs interactive-press"
              >
                Yopish
              </button>
              
              <button
                onClick={handlePrint}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl btn-ios-blue font-black text-xs shadow-md shadow-blue-600/30 interactive-press"
              >
                <Printer className="w-4 h-4 stroke-[2.5]" />
                <span>Chop Etish</span>
              </button>
            </div>
          </div>

          {/* O'ng ustun: Ixcham va Aniq Namuna Kartochkasi (Ekranga to'liq sig'adi) */}
          <div className="flex flex-col items-center justify-center p-3.5 bg-slate-100/90 dark:bg-slate-950/90 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 mb-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <Eye className="w-3.5 h-3.5 text-blue-500" />
              <span>Yorliq Namunasi:</span>
            </div>

            {/* Oq rangli qulay etiketka */}
            <div className="bg-white p-3.5 rounded-xl shadow-md border-2 border-slate-900 text-slate-950 text-center flex flex-col items-center w-full max-w-[210px]">
              <div className="w-full pb-0.5 border-b-2 border-slate-900">
                <span className="text-[10px] font-black uppercase tracking-[2px] text-slate-900 block">
                  TEXTILE PRO
                </span>
              </div>

              <h4 className="text-xs font-black text-slate-950 mt-1.5 leading-snug line-clamp-2">
                {product.name}
              </h4>
              
              <div className="text-[9px] text-slate-700 font-bold my-0.5">
                {product.density && <span>{product.density}</span>}
                {product.density && product.color && <span> • </span>}
                {product.color && <span>{product.color}</span>}
              </div>

              {/* Ixcham va o'tkir SVG QR-kod */}
              <div className="p-2 bg-white rounded-lg border border-slate-300 my-1 shadow-xs flex items-center justify-center">
                <QRCodeSVG value={qrValue} size={110} />
              </div>

              {product.batchNumber && (
                <div className="font-mono text-xs font-black tracking-wider text-slate-900">
                  Partiya №: {product.batchNumber}
                </div>
              )}

              <div className="mt-1.5 pt-1 border-t-2 border-dashed border-slate-900 w-full flex items-center justify-between">
                <span className="font-black text-emerald-700 text-xs font-mono">
                  {formatUSD(product.sellPrice)} <span className="text-[9px] font-sans text-slate-600 font-bold">/kg</span>
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-700">
                  ≈ {formatMoney(priceUzs)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Chop etiladigan yashirin konteyner (iframe uchun) */}
        <div ref={printContainerRef} style={{ display: 'none' }}>
          {Array.from({ length: copiesCount }).map((_, index) => (
            <div key={index} className="sticker-item">
              <div className="brand-name">TEXTILE PRO</div>
              <div className="fabric-name">{product.name}</div>
              <div className="fabric-details">
                {product.density || ''} {product.color ? `• ${product.color}` : ''}
              </div>
              <div className="qr-wrapper">
                <QRCodeSVG value={qrValue} size={110} />
              </div>
              {product.batchNumber && (
                <div className="qr-code-str">Partiya №: {product.batchNumber}</div>
              )}
              <div className="price-row">
                <span className="price-val">{formatUSD(product.sellPrice)} / kg</span>
                <span className="price-sub">≈ {formatMoney(priceUzs)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
