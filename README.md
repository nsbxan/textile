# Savdo ERP - Windows uchun Zamonaviy Savdo va Ombor Nazorati Dasturi

Windows operatsion tizimi uchun mo'ljallangan, do'konlar, marketlar, chakana va ulgurji savdo nuqtalari uchun to'liq avtomatlashtirilgan **Savdo va Ombor Boshqaruvi (ERP / POS)** dasturi.

---

## Asosiy Imkoniyatlar va Bo'limlar

1. **Kassa (POS Terminal)**:
   - Shtrix-kod (Barcode) skanerlari bilan to'g'ridan-to'g'ri ishlash (avtomatik skaner ovozi bilan)
   - Tezkor qidiruv (nomi yoki shtrix-kodi bo'yicha) va kategoriya bo'yicha saralash
   - Qulay xarid savati: miqdorni (+ / - / dona / kg) o'zgartirish, mahsulot va umumiy chegirma kiritish
   - Chakana va Ulgurji narxlarga tezda o'tish
   - **To'lov turlari**: Naqd pul (avtomatik qaytim hisoblash), Plastik karta (Uzcard, Humo, Visa), Nasiya (Qarzga sotish) va Aralash to'lov
   - Savdo yakunida avtomatik **Chek (Receipt)** chiqarish (58mm va 80mm termo-printerlar uchun maxsus moslashtirilgan)

2. **Ombor & Tovarlar (Sklad)**:
   - Mahsulotlar ro'yxati, tannarxi, sotish narxi, ulgurji narxi va qoldiqlari
   - Minimal qoldiq (kam qolgan mahsulotlar) bo'yicha avtomatik ogohlantirish (Alert)
   - Yangi mahsulot qo'shish, tahrirlash va o'chirish
   - Har bir tovar uchun 13 xonali shtrix-kod generatsiya qilish

3. **Nasiya va Qarz Daftari (Debtors)**:
   - Qarzdor mijozlar ro'yxati va umumiy qarz summasi
   - Qarz to'lovlarini qabul qilish (naqd yoki karta orqali)
   - Mijozlar bo'yicha qarz va to'lovlar to'liq tarixi

4. **Ta'minot & Kirim Hujjatlari (Suppliers)**:
   - Yetkazib beruvchilar bazasi va ularga bo'lgan qarzdorlik hisobi
   - **Omborga Kirim hujjati qilish**: bir nechta tovarni bitta hujjatda qabul qilish, ombor qoldig'i va tannarxini avtomatik yangilash

5. **Do'kon Xarajatlari (Expenses)**:
   - Ijara, xodimlar oyligi, kommunal, transport va boshqa xarajatlarni qayd etish
   - Oylik va kunlik xarajatlar statistikasi

6. **Hisobotlar va Tahlil (Analytics)**:
   - Kunlik, haftalik, oylik va umumiy savdo tushumi
   - **Sof Foyda (Chistiy pribil)** tahlili: `Sof foyda = Savdo tushumi - Tannarx - Xarajatlar`
   - Eng ko'p sotilgan top mahsulotlar reytingi
   - To'lov turlari (Naqd vs Karta vs Nasiya) bo'yicha taqsimot
   - Savdo cheklari tarixi va ularni qayta chop etish yoki bekor qilish

7. **Shtrix-kod Generatori va Etiketka Chop Etish**:
   - Istalgan mahsulot uchun termo-etiketka yoki A4 qog'ozda ko'p nusxada shtrix-kod chop etish

8. **Sozlamalar va Zaxira Nusxalash (Backup & Restore)**:
   - Do'kon nomi, telefon, manzil, chek sarlavhasi va tagso'zini sozlash
   - Barcha ma'lumotlar bazasini 1 ta tugma orqali kompyuterga JSON fayl qilib yuklab olish (Backup)
   - Zaxiradan qayta tiklash (Restore)

---

## Tezkor Tugmalar (Hotkeys)

- **F1** - Kassa (POS oynasi)
- **F2** - Ombor & Tovarlar
- **F3** - Nasiya / Qarz daftari
- **F4** - Ta'minot & Kirimlar
- **F5** - Do'kon xarajatlari
- **F6** - Hisobotlar & Sof foyda
- **F7** - Shtrix-kodlar
- **F8** - Sozlamalar
- **Enter** - Shtrix-kodni skanerlash / Chekni chop etish
- **Esc** - Modallarni yopish

---

## Dasturni Ishga Tushirish

1. `Ishga_tushirish.bat` fayliga sichqoncha bilan 2 marta bosing.
2. Yoki buyruqlar satrida (Terminal):
   ```bash
   npm run dev
   ```
3. Brauzerda ochiladi: `http://localhost:5173`
