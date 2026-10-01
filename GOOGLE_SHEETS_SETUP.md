# 📊 Savdo ERP - Google Sheets & Google Service Account Arxitekturasi

Ushbu tizim **Google Sheets** ni bulutli ma'lumotlar bazasi (Cloud Database) sifatida ishlatadi va unga **Google Service Account** orqali xavfsiz **Backend Server-Side API** orqali ulanadi.

---

## 🏛️ Arxitektura Tuzilishi

1. **Frontend**: Zamonaviy, responsive web ilova (React 19, TypeScript, Tailwind CSS, Lucide Icons). Kassa (POS), Ombor, Nasiyalar, Xarajatlar va Hisobotlar.
2. **Backend**: Xavfsiz Server-Side API (`api/` papkasida Vercel Serverless Functions). Maxfiy Google Service Account kalitlari **hech qachon brauzerga chiqmaydi**, faqat serverda saqlanadi.
3. **Database**: **Google Sheets** jadvali. Har bir yo'nalish uchun alohida varaqlar (worksheets):
   - `Tovarlar` (Mahsulotlar katalogi, qoldiqlar, narxlar)
   - `Savdolar` (Cheklar, to'lovlar, sof foyda)
   - `Mijozlar` (Qarzdorlar ro'yxati va balanslar)
   - `Xarajatlar` (Do'kon xarajatlari)
   - `Yetkazib_beruvchilar` (Ta'minotchilar)
   - `Qarz_Tarixi` (Qarz to'lovlari va yangi qarzlar)
   - `Sinxronizatsiya_Logi` (Hodisalar auditi)
   - `Sozlamalar` (Tizim sozlamalari)
4. **Google Authentication**: **Google Service Account (JWT)**. Foydalanuvchining login/paroli talab etilmaydi, server Google bilan avtonom ishlaydi.
5. **Deployment-ready Architecture**: Vercel Serverless API, `vercel.json` integratsiyasi va mahalliy Vite dev-server bilan to'liq tayyor.

---

## 🚀 1. Google Cloud Console Sozlash (4 Qadam)

### 1-qadam: Google Cloud loyiha ochish
1. [Google Cloud Console](https://console.cloud.google.com/) ga kiring.
2. Yangi loyiha (Project) yarating (masalan: `Savdo-ERP-Sheets`).

### 2-qadam: Google Sheets API ni yoqish
1. Chap menyudan **APIs & Services** ➡️ **Library** bo'limiga o'ting.
2. Qidiruv qatoriga **Google Sheets API** deb yozing.
3. Tanlab, **Enable (Включить)** tugmasini bosing.

### 3-qadam: Service Account yaratish va JSON kalit olish
1. **IAM & Admin** ➡️ **Service Accounts** bo'limiga o'ting.
2. **Create Service Account** tugmasini bosing:
   - Name: `erp-sheets-bot`
   - Role: `Editor` (yoki standart qilib davom eting).
3. Yaratilgan Service Account qatorini bosing va **Keys** bo'limiga o'ting.
4. **Add Key** ➡️ **Create new key** ➡️ **JSON** formatini tanlang.
5. Kompyuteringizga `.json` fayl yuklanadi. Undagi:
   - `client_email` — Service Account elektron pochtasi.
   - `private_key` — Maxfiy xususiy kalit.

### 4-qadam: Google Sheets jadval ochish va ruxsat berish
1. [Google Sheets](https://sheets.new) da yangi bo'sh jadval yarating.
2. Yuqori o'ng burchakdagi **Share (Поделиться)** tugmasini bosing.
3. Service Account elektron pochtasini (masalan: `erp-sheets-bot@savdo-erp.iam.gserviceaccount.com`) qo'shing va unga **Editor (Редактор)** rolini bering.
4. Jadval havolasidan **Sheet ID** ni nusxalab oling:
   `https://docs.google.com/spreadsheets/d/`**BU_YERDA_SHEET_ID**`/edit`

---

## 🔑 2. Muhit O'zgaruvchilari (Environment Variables)

`.env` faylida (yoki Vercel Project Settings ➡️ Environment Variables bo'limida) quyidagilarni sozlang:

```env
GOOGLE_SHEET_ID=sizning_google_sheet_id_kodingiz
GOOGLE_SERVICE_ACCOUNT_EMAIL=erp-sheets-bot@savdo-erp.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASC...\n-----END PRIVATE KEY-----\n"

# Ixtiyoriy: API xavfsizlik kaliti (begona so'rovlardan himoya qilish uchun)
API_SECRET_KEY=my_secure_erp_token_2026
```

---

## ⚡ 3. API Endpointlar Ro'yxati

| Metod | Endpoint | Vazifasi |
|---|---|---|
| `GET` | `/api/health` | Server holati va Google Sheets ulanishini tekshirish |
| `POST` | `/api/sheets/init` | Google Sheets da jadvallarni va sarlavhalarni avtomatik yaratish |
| `GET` | `/api/sheets/stats` | Google Sheets dagi tovarlar, savdolar, qarzlar statistikasi |
| `POST` | `/api/sync/events` | ERP dagi barcha o'zgarishlarni real vaqtda Google Sheets ga yozish |
| `GET, POST` | `/api/products` | Mahsulotlarni Google Sheets dan o'qish yoki qo'shish |
| `GET, POST` | `/api/sales` | Savdolar ro'yxati va yangi savdoni saqlash |
| `POST` | `/api/backup/export` | 1-tugma bilan barcha lokal ma'lumotlarni Google Sheets ga yuklash |
| `GET` | `/api/backup/import` | Google Sheets dan barcha ma'lumotlarni ilovaga tiklash |

---

## 💻 4. Ishga Tushirish va Testlash

### Lokal ishga tushirish (Local Development)
```bash
npm run dev
```
Brauzerda `http://localhost:5173` ochiladi. Vite dev-server `/api/*` so'rovlarini to'g'ridan-to'g'ri TypeScript serverless handlerlariga yo'naltiradi.

### Vercel ga Deploy qilish
```bash
npx vercel --prod
```
Yoki GitHub ga commit qilib, Vercel da loyihani import qiling. Muhit o'zgaruvchilarini Vercel panelida kiriting.

---

## 🖥️ 5. Dastur Interfeysida Boshqarish
Dasturda **Sozlamalar (F7)** bo'limiga kiring:
- **"Google Sheets Baza & Secure Server API"** kartasi mavjud.
- **Ulanishni Sinash**: 1 tugma bilan Google Sheets va Service Account aloqasini tekshiradi (javob tezligi millisekundlarda ko'rinadi).
- **Jadvallarni Sozlash**: Google Sheets da barcha varaqlarni sarlavhalari bilan avtomatik ochib beradi.
- **Sheetsga Yuklash**: Barcha tovar va cheklarni Google Sheets ga nusxalaydi.
- **Sheetsdan Tiklash**: Google Sheets dagi ma'lumotlarni dasturga tortib oladi.
- **Jadvalni Ochish**: Google Sheets jadvalini brauzerda to'g'ridan-to'g'ri yangi tabda ochadi.
