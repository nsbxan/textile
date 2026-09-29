import React, { useEffect, useRef } from 'react';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import { Sale, StoreSettings } from '../types';
import { formatMoney, formatUSD, formatKg, usdToUzs, formatDateTime } from '../utils/formatters';
import { QRCodeSVG } from './QRCodeSVG';

interface ReceiptModalProps {
  sale: Sale | null;
  settings: StoreSettings;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  settings,
  onClose,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' || (e.ctrlKey && e.key === 'p')) {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!sale) return null;

  const handlePrint = () => {
    const container = receiptRef.current;
    if (!container) {
      window.print();
      return;
    }

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
          <title>TEXTILE PRO - Chek</title>
          <style>
            @page {
              margin: 0;
              size: auto;
            }
            body {
              margin: 0;
              padding: 6px;
              font-family: 'Courier New', Courier, monospace;
              background: #fff;
              color: #000;
              width: ${is80mm ? '76mm' : '54mm'};
              box-sizing: border-box;
            }
          </style>
        </head>
        <body>
          ${container.innerHTML}
          <script>
            setTimeout(function() {
              window.focus();
              window.print();
              setTimeout(function() {
                try {
                  window.frameElement && window.frameElement.remove();
                } catch(e) {}
              }, 2000);
            }, 250);
          </script>
        </body>
      </html>
    `);
    doc.close();
  };

  const is80mm = settings.receiptPrinterWidth === '80mm';
  const rate = sale.exchangeRate || 11880;
  const totalUzs = sale.finalAmountUZS || usdToUzs(sale.finalAmount, rate);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-3xl max-w-sm w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-bold">
            <CheckCircle2 className="w-5 h-5" />
            <span>Savdo Bajarildi</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl interactive-press"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-100 dark:bg-slate-950 flex justify-center">
          <div
            id="printable-receipt"
            ref={receiptRef}
            className={`bg-white text-black p-4 shadow rounded-lg font-mono text-[11px] leading-relaxed ${
              is80mm ? 'w-[300px]' : 'w-[260px]'
            }`}
          >
            {/* Store Header */}
            {(() => {
              const currentStore = settings.stores?.find(s => s.id === sale.storeId) || {
                name: settings.storeName || 'TEXTILE PRO',
                address: settings.address || 'Abu Sahiy F-107',
                phone: settings.phone || '+998 90 123 45 67',
                receiptHeader: settings.receiptHeader,
                receiptFooter: settings.receiptFooter,
              };

              return (
                <>
                  <div className="text-center pb-2 border-b border-dashed border-gray-400">
                    <h2 className="text-sm font-black uppercase tracking-wider">{currentStore.name}</h2>
                    <p className="text-[10px] text-gray-700">{currentStore.address}</p>
                    <p className="text-[10px] text-gray-700">Tel: {currentStore.phone}</p>
                    <p className="text-[10px] font-bold mt-1">CHEK №: {sale.receiptNumber}</p>
                    <p className="text-[9px] text-gray-600">{formatDateTime(sale.createdAt)}</p>
                    <p className="text-[9px] text-gray-600">Kassir: {sale.cashierName}</p>
                    {sale.customerName && (
                      <p className="text-[10px] font-bold text-gray-800 mt-0.5">
                        Mijoz: {sale.customerName}
                      </p>
                    )}
                  </div>

                  {/* Header Text */}
                  {currentStore.receiptHeader && (
                    <p className="text-[9px] text-center my-1 italic text-gray-700">
                      {currentStore.receiptHeader}
                    </p>
                  )}
                </>
              );
            })()}

            {/* Items Table */}
            <div className="py-1.5 border-b border-dashed border-gray-400">
              <div className="flex justify-between font-bold text-[9px] pb-1 border-b border-gray-300 mb-1">
                <span>MATO / VAZN</span>
                <span>SUMMA ($)</span>
              </div>
              <div className="space-y-1.5">
                {sale.items.map((item, idx) => (
                  <div key={idx} className="text-[10px]">
                    <div className="font-bold truncate">{item.name}</div>
                    <div className="flex justify-between text-gray-700">
                      <span>{formatKg(item.quantity)} x {formatUSD(item.sellPrice)}/kg</span>
                      <span className="font-bold text-black">{formatUSD(item.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary & Totals */}
            <div className="py-2 space-y-1 border-b border-dashed border-gray-400 text-[10px]">
              <div className="flex justify-between">
                <span>Jami dollar:</span>
                <span>{formatUSD(sale.subtotal)}</span>
              </div>
              {sale.discountAmount > 0 && (
                <div className="flex justify-between text-red-600 font-semibold">
                  <span>Chegirma:</span>
                  <span>-{formatUSD(sale.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-xs pt-1 border-t border-gray-300">
                <span>TO'LANDI ($):</span>
                <span>{formatUSD(sale.finalAmount)}</span>
              </div>
              <div className="flex justify-between text-[9px] text-gray-600 pt-0.5">
                <span>NBU kursi:</span>
                <span>1$ = {formatMoney(rate).replace(" so'm", "")} so'm</span>
              </div>
              <div className="flex justify-between font-bold text-[11px] text-gray-900 pt-0.5">
                <span>SO'MDA:</span>
                <span>{formatMoney(totalUzs)}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="py-1.5 space-y-0.5 text-[9px] border-b border-dashed border-gray-400 text-gray-800">
              {sale.paidCash > 0 && (
                <>
                  <div className="flex justify-between">
                    <span>Naqd:</span>
                    <span className="font-bold">{formatUSD(sale.paidCash)}</span>
                  </div>
                  {sale.paidUsdCash !== undefined && sale.paidUsdCash > 0 && (
                    <div className="flex justify-between pl-2 text-[8.5px] text-gray-600">
                      <span>• $ naqd:</span>
                      <span>{formatUSD(sale.paidUsdCash)}</span>
                    </div>
                  )}
                  {sale.paidUzsCash !== undefined && sale.paidUzsCash > 0 && (
                    <div className="flex justify-between pl-2 text-[8.5px] text-gray-600">
                      <span>• So'm naqd:</span>
                      <span>{formatMoney(sale.paidUzsCash)}</span>
                    </div>
                  )}
                </>
              )}
              {sale.paidCard > 0 && (
                <div className="flex justify-between">
                  <span>Karta:</span>
                  <span className="font-bold">{formatUSD(sale.paidCard)}</span>
                </div>
              )}
              {sale.paidDebt > 0 && (
                <div className="flex justify-between text-red-700 font-bold">
                  <span>Nasiya (Qarz):</span>
                  <span>{formatUSD(sale.paidDebt)}</span>
                </div>
              )}
            </div>

            {/* Receipt Footer Note & QR Code */}
            <div className="text-center pt-2 space-y-1">
              <div className="flex justify-center my-1.5">
                <QRCodeSVG value={`TEXTILE-PRO-CHEK-${sale.receiptNumber}-${sale.finalAmount}$`} size={68} />
              </div>
              <p className="text-[8px] text-gray-700 font-medium leading-tight">
                {settings.receiptFooter || "Xaridingiz uchun rahmat! Matolar sifatiga kafolat beramiz."}
              </p>
              <p className="text-[8px] text-gray-500 font-mono">
                *** {sale.receiptNumber} ***
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions - Touch Friendly */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs interactive-press"
          >
            Yopish
          </button>
          
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-md shadow-blue-600/30 interactive-press"
          >
            <Printer className="w-4 h-4 stroke-[2.5]" />
            <span>Chop Etish</span>
          </button>
        </div>
      </div>
    </div>
  );
};
