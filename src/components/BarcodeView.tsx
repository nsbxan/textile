import React, { useState } from 'react';
import { 
  QrCode as BarcodeIcon, 
  Search, 
  Printer, 
  Copy, 
  Check
} from 'lucide-react';
import { Product } from '../types';
import { formatMoney, formatBatchNumber } from '../utils/formatters';
import { QRCodeSVG } from './QRCodeSVG';

interface BarcodeViewProps {
  products: Product[];
  onOpenBarcodeModal: (p: Product) => void;
  isLargeText: boolean;
}

export const BarcodeView: React.FC<BarcodeViewProps> = ({
  products,
  onOpenBarcodeModal,
  isLargeText,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = products.filter(p => {
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.barcode.toLowerCase().includes(q) ||
      formatBatchNumber(p).toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });

  const handleCopy = (batchNo: string, id: string) => {
    navigator.clipboard.writeText(batchNo);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-5 space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 glass-panel p-3.5 rounded-2xl border">
        <div className="flex items-center gap-2">
          <BarcodeIcon className="w-5 h-5 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Mato QR-kodlari va Partiya Yorliqlari
          </h2>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Mato nomi yoki partiya raqami..."
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 font-bold text-xs sm:text-sm focus:outline-none focus:border-blue-500 shadow-inner"
          />
        </div>
      </div>

      {/* Grid of Product Barcode Cards */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((product) => {
            const batchNo = formatBatchNumber(product);
            return (
              <div
                key={product.id}
                className="p-4 rounded-2xl glass-card border flex flex-col justify-between space-y-3.5"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5 text-xs">
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {product.category}
                    </span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                      {formatMoney(product.sellPrice)}
                    </span>
                  </div>

                  <h4 className={`font-bold text-slate-900 dark:text-white line-clamp-1 ${isLargeText ? 'text-base' : 'text-sm'}`}>
                    {product.name}
                  </h4>
                </div>

                {/* QR / Batch Visual Box */}
                <div className="p-3 bg-white rounded-xl text-black flex flex-col items-center justify-center text-center shadow-sm border border-slate-200">
                  <div className="text-xs font-black truncate max-w-[200px] uppercase text-slate-900">
                    {product.name}
                  </div>
                  <div className="my-2 p-1.5 bg-white rounded-lg border border-slate-200">
                    <QRCodeSVG value={product.barcode || product.id} size={76} />
                  </div>
                  {product.batchNumber && (
                    <div className="font-mono text-xs font-black text-slate-800 tracking-wider">
                      Partiya №: {product.batchNumber}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => handleCopy(batchNo, product.id)}
                    className="flex-1 py-2 px-3 rounded-xl border glass-card text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white flex items-center justify-center gap-1.5 interactive-press"
                  >
                    {copiedId === product.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedId === product.id ? 'Nusxalandi' : 'Partiya №'}</span>
                  </button>

                  <button
                    onClick={() => onOpenBarcodeModal(product)}
                    className="py-2 px-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/30 interactive-press"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Chop etish</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
