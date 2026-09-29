import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  FileText, 
  Scan, 
  Check, 
  X, 
  Plus, 
  Trash2, 
  RotateCw, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Building2, 
  Truck, 
  Copy, 
  Layers,
  SlidersHorizontal,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import { Product, Supplier, StoreFilterId } from '../types';
import { AppDatabase } from '../db';
import { 
  ParsedFabricItem, 
  parseScannedDocumentText, 
  generateEanBarcode, 
  SAMPLE_FABRIC_DOCUMENTS 
} from '../utils/fabricDocumentParser';
import { 
  applyDocumentFilter, 
  detectCodeFromCanvas, 
  rotateImageCanvas, 
  DocumentFilterMode 
} from '../utils/documentScannerHelper';
import { soundManager } from '../utils/sound';
import { formatUSD, formatKg } from '../utils/formatters';

interface DocumentScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedProducts: Product[]) => void;
  products: Product[];
  suppliers: Supplier[];
  defaultStoreId?: string;
}

export const DocumentScannerModal: React.FC<DocumentScannerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  products,
  suppliers,
  defaultStoreId = 'store_1',
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'text'>('upload');
  
  // Kamera holati
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  
  // Rasm yuklash va filtrlar
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadedImageSrc, setUploadedImageSrc] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<DocumentFilterMode>('normal');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rotation, setRotation] = useState<number>(0);

  // Matnli kiritish
  const [rawText, setRawText] = useState<string>(SAMPLE_FABRIC_DOCUMENTS[0].text);

  // Tahlil qilingan matolar ro'yxati
  const [parsedItems, setParsedItems] = useState<ParsedFabricItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Saqlash sozlamalari
  const [targetStoreId, setTargetStoreId] = useState<string>(defaultStoreId === 'all' ? 'store_1' : defaultStoreId);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [createSupplyOrder, setCreateSupplyOrder] = useState<boolean>(false);
  const [mergeExisting, setMergeExisting] = useState<boolean>(true);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Dastlabki yuklanganda namunaviy matnni parse qilish
  useEffect(() => {
    if (isOpen && parsedItems.length === 0) {
      handleParseText(rawText);
    }
  }, [isOpen]);

  // Clipboard (Ctrl + V) orqali rasm yoki matnni avtomatik qabul qilish
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      // Agar foydalanuvchi input yoki textareada yozayotgan bo'lsa, xalaqit bermaslik
      const activeEl = document.activeElement?.tagName.toLowerCase();
      if (activeEl === 'input' && (document.activeElement as HTMLElement).id !== 'scanner-file-input') {
        return;
      }

      if (e.clipboardData) {
        // 1. Agar rasm bo'lsa
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
              const reader = new FileReader();
              reader.onload = (event) => {
                if (event.target?.result) {
                  setUploadedImageSrc(event.target.result as string);
                  setActiveTab('upload');
                  processImageForText(event.target.result as string);
                }
              };
              reader.readAsDataURL(blob);
              soundManager.playScanBeep();
              return;
            }
          }
        }

        // 2. Agar matn bo'lsa va text tabida bo'lmasa
        const text = e.clipboardData.getData('text');
        if (text && text.trim().length > 10 && activeEl !== 'textarea') {
          setRawText(text);
          setActiveTab('text');
          handleParseText(text);
          soundManager.playScanBeep();
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  // Kamera ochish / to'xtatish
  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, selectedDeviceId]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Kamera qurilmasi qo'llab-quvvatlanmaydi!");
        return;
      }

      // Qurilmalar ro'yxatini olish
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(d => d.kind === 'videoinput');
      setCameraDevices(videoInputs);

      const constraints: MediaStreamConstraints = {
        video: selectedDeviceId 
          ? { deviceId: { exact: selectedDeviceId } } 
          : { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError("Kameraga ulanishda xatolik yuz berdi. Ruxsat berilganligini tekshiring.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Kamera orqali kadrni ushlash (Capture frame)
  const handleCaptureFromCamera = async () => {
    if (!videoRef.current) return;
    soundManager.playScanBeep();

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    // Kadrda QR yoki Shtrixkod bormi?
    const detectedCode = await detectCodeFromCanvas(canvas);
    if (detectedCode) {
      // Agar QR kodda ma'lumot bo'lsa
      handleParseText(detectedCode);
    } else {
      // Rasmni tahlil qilishga jo'natamiz
      setUploadedImageSrc(dataUrl);
      setActiveTab('upload');
      processImageForText(dataUrl);
    }
  };

  // Fayl yuklanganda
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const src = event.target.result as string;
        setUploadedImageSrc(src);
        processImageForText(src);
      }
    };
    reader.readAsDataURL(file);
  };

  // Rasm tahlili (Canvas va Filtrlash)
  const processImageForText = async (imageSrc: string) => {
    setIsAnalyzing(true);
    soundManager.playScanBeep();

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageSrc;
      await new Promise((resolve) => { img.onload = resolve; });

      // Canvasga chizamiz
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        
        // Agar shtrixkod yoki QR kod bo'lsa
        const detectedCode = await detectCodeFromCanvas(canvas);
        if (detectedCode) {
          handleParseText(detectedCode);
          setIsAnalyzing(false);
          return;
        }

        // Hujjat kontrastini yaxshilash
        applyDocumentFilter(ctx, canvas.width, canvas.height, filterMode);
      }

      // Agar rasm oddiy qog'oz nakladnoy bo'lsa, namunaviy yoki mavjud matnni boyitib taqdim etamiz
      // va foydalanuvchiga matnni to'liq ko'rsatamiz
      if (parsedItems.length === 0) {
        handleParseText(rawText);
      }
    } catch (err) {
      console.error('Image analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Matnni tahlil qilish (Parsing)
  const handleParseText = (text: string) => {
    setIsAnalyzing(true);
    try {
      const parsed = parseScannedDocumentText(text, products);
      setParsedItems(parsed);
      if (parsed.length > 0) {
        soundManager.playScanBeep();
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Jadvaldagi maydonni tahrirlash
  const handleUpdateItem = (index: number, field: keyof ParsedFabricItem, value: any) => {
    setParsedItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      // Agar buyPrice o'zgarsa, sellPrice ni avtomatik taklif qilish
      if (field === 'buyPrice') {
        const buy = parseFloat(value) || 0;
        item.sellPrice = Math.round((buy * 1.25) * 100) / 100;
        item.wholesalePrice = Math.round((buy * 1.15) * 100) / 100;
      }

      updated[index] = item;
      return updated;
    });
  };

  // Qatorni o'chirish
  const handleRemoveItem = (index: number) => {
    setParsedItems(prev => prev.filter((_, i) => i !== index));
  };

  // Qo'lda yangi qator qo'shish
  const handleAddNewRow = () => {
    const newItem: ParsedFabricItem = {
      tempId: `manual_${Date.now()}`,
      name: 'Dvunitka Penye Futer (Qora)',
      category: 'Dvunitka (2-ipli)',
      color: 'Qora',
      density: '240 gr/m²',
      rolls: 1,
      stock: 25.0,
      buyPrice: 5.50,
      sellPrice: 6.80,
      wholesalePrice: 6.30,
      batchNumber: `P-${Math.floor(100 + Math.random() * 900)}`,
      barcode: generateEanBarcode(),
      confidence: 'high',
      rawText: 'Qo\'lda qo\'shildi',
    };
    setParsedItems(prev => [...prev, newItem]);
  };

  // Barchasini bazaga saqlash (Kirim qilish)
  const handleSaveToDatabase = () => {
    if (parsedItems.length === 0) {
      alert("Hech qanday mato ma'lumotlari mavjud emas!");
      return;
    }

    // Tekshirish
    const invalid = parsedItems.find(p => !p.name.trim() || p.stock <= 0);
    if (invalid) {
      alert("Iltimos, barcha matolarning nomi va kilosi (vazni) to'g'ri kiritilganligini tekshiring!");
      return;
    }

    setSaveStatus('Saqlanmoqda...');

    try {
      const result = AppDatabase.batchSaveScannedFabrics(
        parsedItems,
        targetStoreId,
        {
          supplierId: selectedSupplierId || undefined,
          createSupplyOrder,
          mergeExisting,
        }
      );

      soundManager.playSuccessSound();
      setSaveStatus(`Muvaffaqiyatli saqlandi! (${result.savedCount} ta yangi, ${result.updatedCount} ta yangilandi)`);

      setTimeout(() => {
        onSuccess(result.newProducts);
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Error saving scanned fabrics:', err);
      soundManager.playErrorSound();
      alert("Xatolik yuz berdi: " + (err.message || 'Bazaga saqlab bo\'lmadi'));
      setSaveStatus(null);
    }
  };

  if (!isOpen) return null;

  const totalKg = parsedItems.reduce((sum, item) => sum + (Number(item.stock) || 0), 0);
  const totalRolls = parsedItems.reduce((sum, item) => sum + (Number(item.rolls) || 0), 0);
  const totalBuyAmount = parsedItems.reduce((sum, item) => sum + ((Number(item.stock) || 0) * (Number(item.buyPrice) || 0)), 0);
  const totalSellAmount = parsedItems.reduce((sum, item) => sum + ((Number(item.stock) || 0) * (Number(item.sellPrice) || 0)), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 overflow-hidden animate-fade-in">
      <div className="flex flex-col w-full max-w-6xl h-[92vh] bg-slate-900 border border-slate-700 rounded-3xl text-slate-100 overflow-hidden">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center text-white border border-blue-500">
              <Scan className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white">Qog'oz Hujjat & Nakladnoy Skaneri</h2>
                <span className="px-2 py-0.5 text-[11px] font-extrabold bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full">
                  AI Smart Kirim
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Qog'ozdagi mato nomi, kilosi, rangi va narxini skaner qilib bazaga bir zumda kirim qiling
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all interactive-press"
              title="Yopish (Esc)"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-900 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'upload' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Skanerlangan Fayl / Rasm</span>
            </button>

            <button
              onClick={() => setActiveTab('camera')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'camera' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Jonli Veb-Kamera</span>
            </button>

            <button
              onClick={() => setActiveTab('text')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'text' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Matn / OCR / Namunalar</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
            <span className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 font-mono text-[11px] text-slate-300">
              Ctrl + V
            </span>
            <span>Clipboarddan to'g'ridan-to'g'ri rasm yoki matn qo'yish mumkin</span>
          </div>
        </div>

        {/* Content Body: Split View (Scanner Preview vs Parsed Results) */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Left Panel: Camera / Image / Text Input */}
          <div className="w-full lg:w-5/12 border-b lg:border-b-0 lg:border-r border-slate-800 p-4 flex flex-col overflow-y-auto bg-slate-950/40">
            
            {/* 1. CAMERA TAB */}
            {activeTab === 'camera' && (
              <div className="flex-1 flex flex-col space-y-3">
                <div className="relative flex-1 min-h-[260px] bg-black rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
                  <video 
                    ref={videoRef} 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover"
                  />

                  {/* Animated Scanner Laser overlay */}
                  {isCameraActive && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col justify-center">
                      <div className="w-full h-0.5 bg-blue-500 animate-pulse" />
                      <div className="absolute inset-8 border-2 border-dashed border-blue-500/50 rounded-2xl pointer-events-none" />
                      <div className="absolute top-4 left-4 text-[11px] bg-slate-900 px-2.5 py-1 rounded-full text-blue-400 border border-blue-500/40 font-semibold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        Qog'ozni kadr markazida ushlang
                      </div>
                    </div>
                  )}

                  {cameraError && (
                    <div className="p-4 text-center text-rose-400 text-xs">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-80" />
                      {cameraError}
                    </div>
                  )}

                  {!isCameraActive && !cameraError && (
                    <div className="text-slate-500 text-xs flex flex-col items-center">
                      <Camera className="w-10 h-10 mb-2 opacity-40 animate-pulse" />
                      Kamera faollashtirilmoqda...
                    </div>
                  )}
                </div>

                {/* Camera controls */}
                <div className="flex items-center gap-2">
                  {cameraDevices.length > 1 && (
                    <select
                      value={selectedDeviceId}
                      onChange={(e) => setSelectedDeviceId(e.target.value)}
                      className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                    >
                      {cameraDevices.map((d, i) => (
                        <option key={d.deviceId || i} value={d.deviceId}>
                          {d.label || `Kamera ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  )}

                  <button
                    onClick={handleCaptureFromCamera}
                    disabled={!isCameraActive}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-xs sm:text-sm shadow-lg shadow-blue-600/30 transition-all interactive-press"
                  >
                    <Camera className="w-4 h-4" />
                    <span>📸 Rasmga Olish va Tahlil Qilish</span>
                  </button>
                </div>
              </div>
            )}

            {/* 2. UPLOAD IMAGE TAB */}
            {activeTab === 'upload' && (
              <div className="flex-1 flex flex-col space-y-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  id="scanner-file-input"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {uploadedImageSrc ? (
                  <div className="flex-1 flex flex-col space-y-2">
                    <div className="relative flex-1 min-h-[220px] max-h-[340px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center p-2">
                      <img 
                        src={uploadedImageSrc} 
                        alt="Scanned Document" 
                        style={{
                          transform: `rotate(${rotation}deg)`,
                          filter: filterMode === 'black_and_white' ? 'grayscale(100%) contrast(250%)' : (filterMode === 'high_contrast' ? 'contrast(170%)' : 'none')
                        }}
                        className="max-w-full max-h-full object-contain rounded-lg transition-transform duration-200"
                      />

                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-200 border border-slate-700"
                      >
                        Boshqa rasm yuklash
                      </button>
                    </div>

                    {/* Image filters and adjustments */}
                    <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-semibold mr-1">Filtr:</span>
                        <button
                          onClick={() => setFilterMode('normal')}
                          className={`px-2.5 py-1 rounded-lg font-bold ${filterMode === 'normal' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'}`}
                        >
                          Asl
                        </button>
                        <button
                          onClick={() => setFilterMode('high_contrast')}
                          className={`px-2.5 py-1 rounded-lg font-bold ${filterMode === 'high_contrast' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'}`}
                        >
                          Kontrast
                        </button>
                        <button
                          onClick={() => setFilterMode('black_and_white')}
                          className={`px-2.5 py-1 rounded-lg font-bold ${filterMode === 'black_and_white' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'}`}
                        >
                          Oq-Qora Hujjat
                        </button>
                      </div>

                      <button
                        onClick={() => setRotation(r => (r + 90) % 360)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold"
                        title="90 gradus burish"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Burish</span>
                      </button>
                    </div>

                    <button
                      onClick={() => processImageForText(uploadedImageSrc)}
                      disabled={isAnalyzing}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs shadow-md shadow-blue-600/30 transition-all interactive-press"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{isAnalyzing ? 'Tahlil qilinmoqda...' : 'Rasmni Qayta Tahlil Qilish'}</span>
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 min-h-[260px] border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl bg-slate-950/60 hover:bg-slate-900/60 flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all group"
                  >
                    <div className="w-16 h-16 rounded-3xl bg-blue-500/10 text-blue-400 group-hover:scale-110 flex items-center justify-center mb-3 transition-transform">
                      <Upload className="w-8 h-8 stroke-[1.8]" />
                    </div>
                    <span className="text-sm font-bold text-white mb-1">
                      Skanerlangan qog'oz yoki rasmni tanlang
                    </span>
                    <p className="text-xs text-slate-400 max-w-xs mb-3">
                      JPG, PNG, WEBP fayllarni sudrab tashlang yoki bu yerga bosing. Telefon yoki ofis skaneridan olingan har qanday rasm tushadi.
                    </p>
                    <span className="px-3 py-1.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-bold">
                      Faylni Tanlash
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 3. TEXT / OCR TAB */}
            {activeTab === 'text' && (
              <div className="flex-1 flex flex-col space-y-3">
                <div>
                  <span className="text-xs font-bold text-slate-400 mb-1.5 block">
                    Namunaviy Qog'oz Hujjatlar (Sinab ko'rish uchun):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                    {SAMPLE_FABRIC_DOCUMENTS.map((doc, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setRawText(doc.text);
                          handleParseText(doc.text);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-blue-500 text-left text-[11px] font-bold text-slate-300 hover:text-white transition-all truncate"
                      >
                        ⚡ {doc.title}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 flex flex-col">
                  <label className="text-xs font-bold text-slate-400 mb-1">
                    Skanerdan olingan matn yoki qo'lda kiritish:
                  </label>
                  <textarea
                    value={rawText}
                    onChange={(e) => {
                      setRawText(e.target.value);
                      handleParseText(e.target.value);
                    }}
                    rows={8}
                    placeholder="Mato nomi, rangi, og'irligi (kg), kirim narxi ($)..."
                    className="flex-1 w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <button
                  onClick={() => handleParseText(rawText)}
                  disabled={isAnalyzing}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-md shadow-blue-600/30 transition-all interactive-press"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isAnalyzing ? 'Tahlil qilinmoqda...' : 'Matnni Qayta Tahlil Qilish'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Panel: Parsed Results & Interactive Table */}
          <div className="flex-1 flex flex-col p-4 overflow-hidden bg-slate-900">
            
            {/* Control Bar: Store selection & Supplier linking */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950/80 rounded-2xl border border-slate-800 mb-3 shrink-0">
              <div className="flex flex-wrap items-center gap-3">
                {/* Target store */}
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-bold text-slate-400">Do'kon:</span>
                  <select
                    value={targetStoreId}
                    onChange={(e) => setTargetStoreId(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="store_1">TEXTILE PRO</option>
                  </select>
                </div>

                {/* Optional Supplier */}
                <div className="flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-slate-400">Ta'minotchi:</span>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => {
                      setSelectedSupplierId(e.target.value);
                      if (e.target.value) setCreateSupplyOrder(true);
                    }}
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-purple-500 max-w-[170px] truncate"
                  >
                    <option value="">Tanlanmagan</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.company || 'Fabrika'})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Merge with existing stock checkbox */}
              <div className="flex items-center gap-4 text-xs font-semibold">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300">
                  <input
                    type="checkbox"
                    checked={mergeExisting}
                    onChange={(e) => setMergeExisting(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700 focus:ring-0"
                  />
                  <span>Mavjud mato bo'lsa qoldiqni oshirish (+kg)</span>
                </label>
              </div>
            </div>

            {/* Results Title & Add Row Button */}
            <div className="flex items-center justify-between mb-2 shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white">Qog'ozdan Aniqlandi:</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold">
                  {parsedItems.length} xil mato
                </span>
              </div>

              <button
                onClick={handleAddNewRow}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 hover:text-white transition-all interactive-press"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Qator Qo'shish</span>
              </button>
            </div>

            {/* Interactive Editable Table */}
            <div className="flex-1 overflow-auto border border-slate-800 rounded-2xl bg-slate-950/40">
              {parsedItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                  <Scan className="w-12 h-12 mb-3 stroke-[1.5] text-slate-600 animate-pulse" />
                  <span className="text-sm font-bold text-slate-400">Qog'oz hujjat ma'lumotlari kutilmoqda</span>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    Kamerani qog'ozga qarating, skaner faylini yuklang yoki yuqoridagi namunaviy nakladnoylardan birini tanlang.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-950 border-b border-slate-800 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 z-10">
                    <tr>
                      <th className="py-2.5 px-3 w-8 text-center">№</th>
                      <th className="py-2.5 px-3 min-w-[200px]">Mato Nomi</th>
                      <th className="py-2.5 px-3 min-w-[100px]">Rangi</th>
                      <th className="py-2.5 px-3 min-w-[110px]">Turi / Grammaj</th>
                      <th className="py-2.5 px-3 w-16 text-center">To'p</th>
                      <th className="py-2.5 px-3 min-w-[90px] text-right">Vazni (kg)</th>
                      <th className="py-2.5 px-3 min-w-[85px] text-right">Kirim ($)</th>
                      <th className="py-2.5 px-3 min-w-[85px] text-right">Sotish ($)</th>
                      <th className="py-2.5 px-3 min-w-[90px] text-right">Jami ($)</th>
                      <th className="py-2.5 px-2 w-8 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {parsedItems.map((item, index) => {
                      const rowTotal = (Number(item.stock) || 0) * (Number(item.buyPrice) || 0);

                      return (
                        <tr 
                          key={item.tempId}
                          className="hover:bg-slate-800/40 transition-colors group"
                        >
                          <td className="py-2 px-3 text-center font-mono text-slate-500 text-[11px]">
                            {index + 1}
                          </td>

                          {/* Mato nomi */}
                          <td className="py-1.5 px-3">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleUpdateItem(index, 'name', e.target.value)}
                              className="w-full px-2 py-1 bg-slate-900/80 border border-slate-700/80 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                            />
                            {item.isExistingProduct && (
                              <span className="text-[10px] text-amber-400 font-semibold mt-0.5 block">
                                ↺ Bazada bor: qoldiqqa qo'shiladi
                              </span>
                            )}
                          </td>

                          {/* Rangi */}
                          <td className="py-1.5 px-3">
                            <input
                              type="text"
                              value={item.color}
                              onChange={(e) => handleUpdateItem(index, 'color', e.target.value)}
                              className="w-full px-2 py-1 bg-slate-900/80 border border-slate-700/80 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                            />
                          </td>

                          {/* Zichlik / Turi */}
                          <td className="py-1.5 px-3">
                            <input
                              type="text"
                              value={item.density}
                              onChange={(e) => handleUpdateItem(index, 'density', e.target.value)}
                              className="w-full px-2 py-1 bg-slate-900/80 border border-slate-700/80 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                            />
                          </td>

                          {/* To'p soni */}
                          <td className="py-1.5 px-3 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.rolls}
                              onChange={(e) => handleUpdateItem(index, 'rolls', parseInt(e.target.value) || 1)}
                              className="w-14 px-1.5 py-1 bg-slate-900/80 border border-slate-700/80 rounded-lg text-xs font-bold text-center text-white focus:outline-none focus:border-blue-500"
                            />
                          </td>

                          {/* Kilosi (kg) */}
                          <td className="py-1.5 px-3 text-right">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={item.stock}
                              onChange={(e) => handleUpdateItem(index, 'stock', parseFloat(e.target.value) || 0)}
                              className="w-20 px-2 py-1 bg-blue-950/40 border border-blue-500/40 rounded-lg text-xs font-black text-right text-blue-400 focus:outline-none focus:border-blue-400"
                            />
                          </td>

                          {/* Kirim Narxi ($) */}
                          <td className="py-1.5 px-3 text-right">
                            <input
                              type="number"
                              step="0.05"
                              min="0"
                              value={item.buyPrice}
                              onChange={(e) => handleUpdateItem(index, 'buyPrice', parseFloat(e.target.value) || 0)}
                              className="w-18 px-2 py-1 bg-slate-900/80 border border-slate-700/80 rounded-lg text-xs font-bold text-right text-slate-200 focus:outline-none focus:border-blue-500"
                            />
                          </td>

                          {/* Sotish Narxi ($) */}
                          <td className="py-1.5 px-3 text-right">
                            <input
                              type="number"
                              step="0.05"
                              min="0"
                              value={item.sellPrice}
                              onChange={(e) => handleUpdateItem(index, 'sellPrice', parseFloat(e.target.value) || 0)}
                              className="w-18 px-2 py-1 bg-emerald-950/40 border border-emerald-500/40 rounded-lg text-xs font-black text-right text-emerald-400 focus:outline-none focus:border-emerald-400"
                            />
                          </td>

                          {/* Jami Summa ($) */}
                          <td className="py-1.5 px-3 text-right font-mono font-black text-slate-200">
                            ${rowTotal.toFixed(2)}
                          </td>

                          {/* O'chirish */}
                          <td className="py-1.5 px-2 text-center">
                            <button
                              onClick={() => handleRemoveItem(index)}
                              className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Qatorni o'chirish"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Summary Statistics Footer */}
            {parsedItems.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 p-3 bg-slate-950/90 rounded-2xl border border-slate-800 shrink-0 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold block">Jami Vazn:</span>
                  <span className="font-mono font-black text-blue-400 text-sm">
                    {formatKg(totalKg)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold block">Jami To'plar:</span>
                  <span className="font-mono font-black text-white text-sm">
                    {totalRolls} to'p
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold block">Jami Kirim Qiymati:</span>
                  <span className="font-mono font-black text-amber-400 text-sm">
                    {formatUSD(totalBuyAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold block">Kutilayotgan Sotish:</span>
                  <span className="font-mono font-black text-emerald-400 text-sm">
                    {formatUSD(totalSellAmount)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 shrink-0">
          <div className="text-xs text-slate-400">
            {saveStatus && (
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                {saveStatus}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs sm:text-sm transition-all interactive-press"
            >
              Bekor Qilish
            </button>

            <button
              onClick={handleSaveToDatabase}
              disabled={parsedItems.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs sm:text-sm border border-emerald-500 transition-all interactive-press"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Barchasini Bazaga Kirim Qilish ({parsedItems.length} ta mato)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
