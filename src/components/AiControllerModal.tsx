import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  Key, 
  Check, 
  X, 
  Mic, 
  MicOff, 
  Sparkles, 
  Layers, 
  ExternalLink, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Terminal, 
  SlidersHorizontal,
  Image as ImageIcon,
  Paperclip
} from 'lucide-react';
import { aiAgentService, AiChatMessage } from '../services/aiAgentService';
import { ViewTab } from '../types';
import { soundManager } from '../utils/sound';

interface AiControllerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchTab: (tab: ViewTab) => void;
  onRefreshData: () => void;
  userRole?: 'superadmin' | 'admin' | 'cashier';
}

export const AiControllerModal: React.FC<AiControllerModalProps> = ({
  isOpen,
  onClose,
  onSwitchTab,
  onRefreshData,
  userRole = 'cashier',
}) => {
  const isSuperAdmin = userRole === 'superadmin' || userRole === 'admin';
  const [apiKey, setApiKey] = useState<string>('');
  const [model, setModel] = useState<string>('gemini-2.0-flash');
  const [isConfigured, setIsConfigured] = useState<boolean>(aiAgentService.isConfigured());
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [testingKey, setTestingKey] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Chat
  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: "Assalomu alaykum! Men sizning TEXTILE PRO ERP AI Yordamchingizman. Savdolar, sof foyda tahlili, tovar qoldiqlari, matolar kirimi va tizim bo'yicha har qanday savolingizga javob berishga tayyorman.",
      timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Ovozli buyruq (Speech-to-text)
  const [isListening, setIsListening] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  // Rasm yuklash (Multimodal Vision)
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const config = aiAgentService.getConfig();
    setApiKey(config.apiKey || '');
    setModel(config.model || 'gemini-2.0-flash');
    setIsConfigured(aiAgentService.isConfigured());
  }, [isOpen, isSuperAdmin]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Speech Recognition sozlash
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'uz-UZ';

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            setInputText(prev => (prev ? `${prev} ${transcript}` : transcript));
            soundManager.playScanBeep();
          }
          setIsListening(false);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) {
      alert("Kechirasiz, brauzeringizda mikrofon orqali ovozni aniqlash qo'llab-quvvatlanmaydi.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        soundManager.playScanBeep();
      } catch {
        setIsListening(false);
      }
    }
  };

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      alert("Iltimos, API kalitni kiriting!");
      return;
    }

    setTestingKey(true);
    setTestResult(null);

    const res = await aiAgentService.testApiKey(apiKey.trim());
    setTestingKey(false);
    setTestResult(res);

    if (res.success) {
      aiAgentService.saveConfig({
        apiKey: apiKey.trim(),
        model,
        enabled: true,
      });
      setIsConfigured(true);
      soundManager.playSuccessSound();
      setTimeout(() => {
        setShowSettings(false);
        setTestResult(null);
      }, 1200);
    } else {
      soundManager.playErrorSound();
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputText;
    if (!textToSend.trim() && !attachedImage) return;

    const userMsg: AiChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    const imageToSend = attachedImage;
    setAttachedImage(null);
    setIsLoading(true);

    try {
      const historyForApi = messages
        .filter(m => m.sender === 'user' || m.sender === 'ai')
        .map(m => ({ sender: m.sender as 'user' | 'ai', text: m.text }));

      const response = await aiAgentService.sendMessage(
        textToSend,
        historyForApi,
        {
          onSwitchTab,
          onRefreshData,
        },
        imageToSend || undefined,
        userRole
      );

      const aiMsg: AiChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: response.text,
        timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
        executedActions: response.executedActions
      };

      setMessages(prev => [...prev, aiMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAttachedImage(event.target.result as string);
        soundManager.playScanBeep();
      }
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 select-none animate-fade-in">
      <div className="flex flex-col w-full max-w-2xl h-[85vh] bg-slate-900 border border-slate-700 rounded-3xl text-slate-100 overflow-hidden">
        
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 border border-indigo-500 flex items-center justify-center text-white">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-white">TEXTILE PRO AI Yordamchi</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  isConfigured 
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                }`}>
                  {isConfigured ? 'AI Faol' : (isSuperAdmin ? 'API Kalit Kutilmoqda' : 'AI Yordamchi')}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  isSuperAdmin
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}>
                  {isSuperAdmin ? 'Super Admin' : 'Sotuvchi'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Ovoz yoki matn orqali dasturda tezkor aqlli yordam oling
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isSuperAdmin && (
              <button
                onClick={() => setShowSettings(prev => !prev)}
                className={`p-2 rounded-xl border transition-colors interactive-press ${
                  showSettings 
                    ? 'bg-blue-600 text-white border-blue-500' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title="AI API Kalit va Model Sozlamalari (Faqat Admin)"
              >
                <Key className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 interactive-press"
              title="Yopish (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* API Settings Section (Faqat Admin uchun) */}
        {isSuperAdmin && showSettings && (
          <div className="p-4 bg-slate-950 border-b border-slate-800 shrink-0 animate-in slide-in-from-top-2">
            <form onSubmit={handleSaveApiKey} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-amber-400" />
                  Google Gemini API Kaliti:
                </span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>Bepul API kalit olish</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />

                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="gemini-flash-lite-latest">Gemini Flash Lite (Ultra Tezkor & Tavsiya etiladi)</option>
                  <option value="gemini-flash-latest">Gemini Flash (Eng so'nggi)</option>
                  <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                </select>

                <button
                  type="submit"
                  disabled={testingKey}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-xs border border-blue-500 transition-all shrink-0 interactive-press"
                >
                  {testingKey ? 'Tekshirilmoqda...' : 'Saqlash & Ulash'}
                </button>
              </div>

              {testResult && (
                <div className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                  testResult.success 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}>
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </form>
          </div>
        )}

        {/* Chat Message History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-900/60">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1">
                <span className="text-[10px] text-slate-500 font-semibold">{msg.timestamp}</span>
                <span className="text-[10px] font-bold text-slate-400">
                  {msg.sender === 'user' ? 'Siz' : 'TEXTILE PRO AI'}
                </span>
              </div>

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs font-medium leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white border border-blue-500 rounded-tr-sm'
                    : 'bg-slate-950 text-slate-200 border border-slate-800 rounded-tl-sm'
                }`}
              >
                <p className="whitespace-pre-line">{msg.text}</p>

                {/* Bajarilgan amallar kartochkalari */}
                {msg.executedActions && msg.executedActions.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800 space-y-1.5">
                    {msg.executedActions.map((action, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono font-bold"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>{action.detail}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-950 border border-slate-800 max-w-xs text-xs text-slate-400">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
              <span>AI tahlil qilmoqda va buyruqni bajarmoqda...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Command Chips */}
        <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto shrink-0 no-scrollbar">
          <span className="text-[11px] text-slate-500 font-bold shrink-0 mr-1">Tezkor:</span>
          {[
            "Bugungi tushum va sof foyda qancha?",
            "Qaysi matolar kam qoldi?",
            "Xarajatlarni ko'rsat",
            "Kassaga o'tish",
            "Omborga o'tish",
          ].map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(prompt)}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-blue-500 text-[11px] font-semibold text-slate-300 hover:text-white whitespace-nowrap transition-all interactive-press shrink-0"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Attached image preview if any */}
        {attachedImage && (
          <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <ImageIcon className="w-4 h-4 text-blue-400" />
              <span>Qog'oz / Hujjat rasmi biriktirildi (AI tahlil qiladi)</span>
            </div>
            <button
              onClick={() => setAttachedImage(null)}
              className="p-1 text-slate-400 hover:text-rose-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Chat Input Bar */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 shrink-0">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageAttach}
            className="hidden"
          />

          <div className="flex items-center gap-2">
            {/* Rasm biriktirish (Qog'oz rasm) */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all interactive-press"
              title="Qog'oz hujjat yoki nakladnoy rasmini biriktirish"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Ovozli kiritish (Microphone) */}
            <button
              onClick={toggleSpeechRecognition}
              className={`p-2.5 rounded-xl border transition-all interactive-press ${
                isListening 
                  ? 'bg-rose-600 text-white border-rose-500 animate-pulse' 
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white'
              }`}
              title={isListening ? "Tinglamoqda... To'xtatish uchun bosing" : "Ovozli buyruq berish (Mikrofon)"}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Text Input */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={isListening ? "Ovozingizni eshitmoqdaman, gapiring..." : "AI Yordamchiga buyruq bering (masalan: Kassaga o't, Qaysi matolar kam?)..."}
              className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-medium"
            />

            {/* Send Button */}
            <button
              onClick={() => handleSendMessage()}
              disabled={(!inputText.trim() && !attachedImage) || isLoading}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs border border-blue-500 flex items-center gap-1.5 transition-all interactive-press shrink-0"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Yuborish</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
