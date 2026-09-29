export type AppLanguage = 'uz_lat' | 'uz_cyr' | 'ru';

const LANG_STORAGE_KEY = 'savdo_erp_language';

export function getSavedLanguage(): AppLanguage {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY) as AppLanguage | null;
    if (saved === 'uz_lat' || saved === 'uz_cyr' || saved === 'ru') {
      return saved;
    }
  } catch {}
  return 'uz_lat';
}

export function setSavedLanguage(lang: AppLanguage): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
    window.dispatchEvent(new CustomEvent('erp_lang_changed', { detail: lang }));
  } catch {}
}

// ============================================================================
// 1. RUS TILI LUG'ATI (TO'LIQ IBORALAR VA SO'ZLAR)
// ============================================================================
const RU_EXACT_DICT: Record<string, string> = {
  // Header & Navigation
  "Kam qolgan mahsulotlar": "Товары с низким остатком",
  "Dollar kursini o'zgartirish uchun bosing": "Нажмите, чтобы изменить курс доллара",
  "Dollar Kursini Belgilash": "Установка курса доллара",
  "1 AQSH Dollari ($1) necha so'm?": "Сколько сумов за 1 доллар США ($1)?",
  "so'm": "сум",
  "Markaziy Bank kursini internetdan olish": "Получить курс ЦБ из интернета",
  "Bank kursi": "Курс ЦБ",
  "Saqlash": "Сохранить",
  "AI Yordamchi": "AI Помощник",
  "TEXTILE PRO AI Yordamchisi": "AI Помощник TEXTILE PRO",
  "Kunduzgi": "Дневной",
  "Tungi": "Ночной",
  "Kunduzgi mavzuga o'tish (Light Mode)": "Переключить на дневной режим",
  "Tungi mavzuga o'tish (Dark Mode)": "Переключить на ночной режим",
  "Ovoz yoqilgan": "Звук включен",
  "Ovoz o'chirilgan": "Звук выключен",
  "Kichraytirish": "Свернуть",
  "To'liq ekran rejimi": "Полноэкранный режим",
  "Tizimdan chiqish (Logout)": "Выйти из системы",
  "Haqiqatdan ham tizimdan chiqmoqchimisiz?": "Вы действительно хотите выйти из системы?",

  // Sidebar
  "Bo'limlar": "Разделы",
  "Kassa (POS)": "Касса (POS)",
  "Ombor & Tovarlar": "Склад и Товары",
  "Nasiya / Qarzlar": "Рассрочка / Долги",
  "Ta'minot & Kirim": "Поставки и Приход",
  "Xarajatlar": "Расходы",
  "Hisobotlar": "Отчёты",
  "Sozlamalar": "Настройки",

  // Login Screen
  "Tizimga kirish uchun ma'lumotlaringizni va rolingizga mos mahfiy kodni kiriting": "Введите свои данные и секретный код, соответствующий вашей роли, для входа в систему",
  "Iltimos, barcha maydonlarni (ism, telefon, email va mahfiy kod) to'ldiring!": "Пожалуйста, заполните все поля (имя, телефон, email и секретный код)!",
  "Mahfiy kod noto'g'ri! Iltimos, to'g'ri mahfiy kodni kiriting.": "Неверный секретный код! Пожалуйста, введите правильный секретный код.",
  "Ismingiz *": "Ваше имя *",
  "Masalan: Shahzod Aliyev": "Например: Шахзод Алиев",
  "Telefon raqamingiz *": "Ваш номер телефона *",
  "Elektron pochta (Email) *": "Электронная почта (Email) *",
  "Mahfiy kod *": "Секретный код *",
  "Super Admin kodi aniqlandi": "Обнаружен код Супер Админа",
  "Sotuvchi kodi aniqlandi": "Обнаружен код Продавца",
  "Mahfiy kodni kiriting": "Введите секретный код",
  "Tekshirilmoqda...": "Проверка...",
  "Super Admin Sifatida Kirish": "Войти как Супер Админ",
  "Sotuvchi Sifatida Kirish": "Войти как Продавец",
  "Tizimga Kirish": "Войти в систему",
  "Himoyalangan Tizim (Sotuvchi / Admin)": "Защищённая система (Продавец / Админ)",

  // Admin PIN Modal
  "Admin Ruxsati": "Доступ Админа",
  "PIN Kodni Kiriting": "Введите PIN-код",
  "Mahsulot tannarxi va hisobotlarni ko'rish uchun admin parolini tering (Standart: 1234)": "Введите пароль администратора для просмотра себестоимости и отчётов (По умолч.: 1234)",
  "Noto'g'ri PIN kod! Qaytadan tering.": "Неверный PIN-код! Попробуйте снова.",
  "Tozalash": "Очистить",
  "Tasdiqlash": "Подтвердить",

  // POS View
  "Barchasi": "Все",
  "Mato nomi, partiya raqami yoki QR-kod...": "Название ткани, номер партии или QR-код...",
  "Bunday mahsulot topilmadi": "Товар не найден",
  "/ kg": "/ кг",
  "Xarid Savati": "Корзина покупок",
  "Savat bo'sh": "Корзина пуста",
  "Mato tanlang yoki QR-kod skanerlang": "Выберите ткань или отсканируйте QR-код",
  "Savatdan o'chirish": "Удалить из корзины",
  "Vazn:": "Вес:",
  "Bitta raqamni o'chirish": "Удалить одну цифру",
  "Vergul (,)": "Запятая (,)",
  "Oraliq summa:": "Промежуточная сумма:",
  "Chegirma ($):": "Скидка ($):",
  "JAMI TO'LOV ($):": "ИТОГО К ОПЛАТЕ ($):",
  "To'lovni Qabul Qilish": "Принять оплату",
  "To'lovni Rasmiylashtirish (Dollarda)": "Оформление оплаты (в долларах)",
  "To'lanishi kerak ($):": "К оплате ($):",
  "Jami vazn:": "Общий вес:",
  "Hammasi $": "Всё в $",
  "Hammasi So'm": "Всё в сумах",
  "Aralash ($ + so'm)": "Смешанно ($ + сум)",
  "Karta": "Карта",
  "Nasiya": "В долг",
  "Berilgan naqd dollar ($):": "Получено наличными ($):",
  "Qaytim ($):": "Сдача ($):",
  "Berilgan naqd so'm:": "Получено наличными (сум):",
  "Qaytim (so'm):": "Сдача (сум):",
  "Qanchasi dollarda va qanchasi so'mda ekanligini kiriting:": "Укажите сумму в долларах и сумму в сумах:",
  "Dollarda ($):": "В долларах ($):",
  "Qolganini dollarda to'lash": "Остаток оплатить в долларах",
  "So'mda (so'm):": "В сумах (сум):",
  "0 so'm": "0 сум",
  "Qolganini so'mda to'lash": "Остаток оплатить в сумах",
  "Jami kiritilgan summa:": "Всего внесено:",
  "Qaytim:": "Сдача:",
  "Yetmayotgan summa:": "Недостающая сумма:",
  "Plastik Karta orqali to'lov": "Оплата пластиковой картой",
  "Qarzdor / Mijozni tanlang:": "Выберите должника / клиента:",
  "+ Yangi qarzdor": "+ Новый должник",
  "-- Mijozni tanlang --": "-- Выберите клиента --",
  "Bekor qilish": "Отмена",
  "Yakunlash va Chek": "Завершить и Чек",
  "Yangi Qarzdor Qo'shish": "Добавить нового должника",
  "Mijoz / Qarzdor Ismi *": "Имя клиента / должника *",
  "Telefon Raqami *": "Номер телефона *",
  "Manzili (Do'koni / Rastasi)": "Адрес (Магазин / Ряд)",
  "Boshlang'ich Qarzi ($ da)": "Начальный долг (в $)",
  "Qarzdorni Saqlash": "Сохранить должника",

  // Inventory View
  "Jami Matolar Qoldig'i": "Общий остаток тканей",
  "Ombor Tannarxi ($)": "Себестоимость склада ($)",
  "Kutilayotgan Foyda ($)": "Ожидаемая прибыль ($)",
  "Ombordagi Jami Mato": "Всего ткани на складе",
  "Jami To'plar Soni": "Общее кол-во рулонов",
  "Kam Qolgan Matolar": "Мало на складе",
  "Mato nomi, rangi, turi yoki partiya raqami...": "Название ткани, цвет, тип или № партии...",
  "Kam qolganlar": "Мало на складе",
  "Tugaganlar": "Закончились",
  "Yangi Mato Qo'shish": "Добавить ткань",
  "Mato Ma'lumotlarini Tahrirlash": "Редактировать данные ткани",
  "Partiya №": "Партия №",
  "Mato Nomi & Rangi": "Название и цвет ткани",
  "Turi / Grammaj": "Тип / Плотность",
  "To'plar": "Рулоны",
  "Tannarx ($/kg)": "Себест. ($/кг)",
  "Sotish ($/kg)": "Продажа ($/кг)",
  "Ombor Qoldig'i (kg)": "Остаток (кг)",
  "Jami Qiymati ($)": "Общая стоимость ($)",
  "Amallar": "Действия",
  "QR-kodni ko'rish va chop etish": "Просмотр и печать QR-кода",
  "QR-kod yorlig'ini chiqarish": "Печать этикетки с QR-кодом",
  "Tahrirlash": "Редактировать",
  "O'chirish (Faqat Admin)": "Удалить (Только Админ)",
  "O'chirish": "Удалить",
  "Mato Nomi *": "Название ткани *",
  "Masalan: Kulevka Penye 100% Paxta": "Например: Кулирка Пенье 100% Хлопок",
  "Partiya Raqami (Mato partiyasi)": "Номер партии (Партия ткани)",
  "Partiya raqamini yozing (masalan: 12, P-101)...": "Введите номер партии (напр.: 12, P-101)...",
  "QR-kod / Shtrix-kod (Skaner o'qishi uchun)": "QR-код / Штрих-код (для сканера)",
  "Skaner kodi...": "Код сканера...",
  "Yangi unikal QR-kod raqami": "Новый уникальный QR-код",
  "QR Kod": "QR-код",
  "Mato Turi": "Тип ткани",
  "Kulevka, Dvunitka...": "Кулирка, Двунитка...",
  "Rangi": "Цвет",
  "Qora, Oq, Melanj...": "Чёрный, Белый, Меланж...",
  "Grammaj (Zichlik)": "Плотность (Граммаж)",
  "Kirim Narxi ($ / kg)": "Цена прихода ($ / кг)",
  "Sotish Narxi ($ / kg) *": "Цена продажи ($ / кг) *",
  "Ombordagi Vazn (kg da)": "Вес на складе (в кг)",
  "Rulonlar (To'plar soni)": "Рулоны (Кол-во рулонов)",
  "Minimal Ogohlantirish (kg)": "Мин. остаток для оповещения (кг)",

  // Debts View
  "Nasiyadorlar Soni": "Кол-во должников",
  "Umumiy Nasiya Summasi ($)": "Общая сумма долгов ($)",
  "Barcha Mijozlar": "Все клиенты",
  "Ism, telefon yoki manzil bo'yicha...": "По имени, телефону или адресу...",
  "Qarzdorlar": "Должники",
  "Yangi Mijoz Qo'shish": "Добавить клиента",
  "Mijoz": "Клиент",
  "Telefon": "Телефон",
  "Manzil": "Адрес",
  "Eslatma": "Примечание",
  "Qarzdorlik ($ / so'm)": "Задолженность ($ / сум)",
  "1-Do'kon": "Магазин 1",
  "2-Do'kon": "Магазин 2",
  "Qarz to'lash": "Оплатить долг",
  "Tarix": "История",
  "Qarz To'lovini Qabul Qilish": "Принять оплату долга",
  "Hozirgi qarzi:": "Текущий долг:",
  "To'lanayotgan Summa ($ USD) *": "Сумма оплаты ($ USD) *",
  "To'lov shakli": "Форма оплаты",
  "Naqd ($ yoki So'm)": "Наличные ($ или сум)",
  "Karta / O'tkazma": "Карта / Перевод",
  "Qabul Qilish": "Принять",
  "Ism-sharifi *": "Ф.И.О. клиента *",
  "Telefon raqami *": "Номер телефона *",
  "Mavjud Qarz Summasi ($ da)": "Сумма текущего долга (в $)",
  "Eslatma / Izoh": "Примечание / Комментарий",
  "Operatsiyalar mavjud emas": "Операций пока нет",
  "Qarz to'landi": "Долг оплачен",
  "Nasiyaga tovar olindi": "Товар взят в долг",

  // Suppliers View
  "Jami Ta'minotchilar": "Всего поставщиков",
  "Yetkazuvchilarga Qarzimiz ($)": "Наш долг поставщикам ($)",
  "Kirim Hujjatlari": "Приходные накладные",
  "To'quv Fabrikalari / Ta'minotchilar": "Фабрики / Поставщики",
  "Kirim Hujjatlari Tarixi": "История приходов",
  "Yangi Ta'minotchi": "Новый поставщик",
  "Omborga Mato Kirimi": "Приход ткани на склад",
  "Firma / Vakil": "Фирма / Представитель",
  "Kompaniya": "Компания",
  "Qarzimiz ($ / so'm)": "Наш долг ($ / сум)",
  "Hujjat №": "Документ №",
  "Yetkazib Beruvchi": "Поставщик",
  "Yetkazib Beruvchi *": "Поставщик *",
  "Sana": "Дата",
  "Matolar": "Ткани",
  "Jami Summa ($)": "Общая сумма ($)",
  "To'landi ($)": "Оплачено ($)",
  "Qarzga Qoldi ($)": "Остаток в долг ($)",
  "Kirim hujjatlari mavjud emas": "Приходных документов нет",
  "Omborga Tovar Kirimi": "Приход товара на склад",
  "-- Tanlang --": "-- Выберите --",
  "Matoni tanlang:": "Выберите ткань:",
  "Vazni (kg da):": "Вес (в кг):",
  "Kirim narxi ($/kg):": "Цена прихода ($/кг):",
  "+ Hujjatga qo'shish": "+ Добавить в документ",
  "Mato / Partiya №": "Ткань / Партия №",
  "Vazn (kg)": "Вес (кг)",
  "Kirim ($/kg)": "Приход ($/кг)",
  "Jami ($)": "Всего ($)",
  "Mato qo'shilmadi": "Ткань не добавлена",
  "To'lanayotgan summa ($ USD)": "Оплачиваемая сумма ($ USD)",
  "Jami Kirim Summasi:": "Общая сумма прихода:",
  "Tasdiqlash va Saqlash": "Подтвердить и сохранить",
  "Ta'minotchi Ismi / Vakil *": "Имя поставщика / Представитель *",
  "Telefon *": "Телефон *",
  "Firma / Kompaniya": "Фирма / Компания",
  "Ta'minotchiga Qarz To'lash": "Оплата долга поставщику",
  "Qarzimiz:": "Наш долг:",

  // Expenses View
  "Jami Xarajatlar ($)": "Всего расходов ($)",
  "Bugungi Xarajatlar ($)": "Расходы за сегодня ($)",
  "Yozuvlar Soni": "Кол-во записей",
  "Qidirish...": "Поиск...",
  "Yangi Xarajat Yozish": "Записать новый расход",
  "Kategoriya": "Категория",
  "Kategoriya *": "Категория *",
  "Izoh": "Примечание",
  "To'lov": "Оплата",
  "Summasi": "Сумма",
  "Amal": "Действие",
  "Xarajatlar mavjud emas": "Расходов нет",
  "Naqd": "Наличные",
  "Xarajat Summasi ($ USD) *": "Сумма расхода ($ USD) *",
  "Naqd kassa": "Наличная касса",
  "Plastik karta": "Пластиковая карта",
  "Masalan: Oylik ijara": "Например: Аренда за месяц",
  "Ombor / Do'kon Ijarasi": "Аренда склада / магазина",
  "Do'kon Ijarasi": "Аренда магазина",
  "Xodimlar Oyligi": "Зарплата сотрудников",
  "Mato Transporti / Yoqilg'i": "Транспорт / Топливо",
  "Kommunal to'lovlar (Svet, Gaz)": "Коммунальные услуги (Свет, Газ)",
  "Rulon qoplari va Skotch": "Упаковка рулонов и скотч",
  "Choyxona / Tushlik": "Обед / Питание",
  "Boshqa xarajatlar": "Прочие расходы",

  // Reports View
  "Savdo va Moliyaviy Hisobotlar (Daromadlar)": "Торговые и финансовые отчёты (Доходы)",
  "Bugun": "Сегодня",
  "Shu Hafta": "За неделю",
  "Shu Oy": "За месяц",
  "Yalpi Tushum (Savdo + Qarz)": "Валовая выручка (Продажи + Долги)",
  "Qarzdan Tushum": "Возврат долгов",
  "SOF FOYDA": "ЧИСТАЯ ПРИБЫЛЬ",
  "Sotilgan Jami Mato": "Всего продано ткани",
  "Barcha to'plar bo'yicha": "По всем рулонам",
  "Jami Cheklar Soni": "Всего чеков",
  "To'lov Turlari Bo'yicha Tushum": "Выручка по видам оплаты",
  "Naqd pulda:": "Наличными:",
  "Plastik kartada:": "Пластиковой картой:",
  "Qarzdan tushgan pul:": "Поступления по долгам:",
  "Undirilgan barcha to'lovlar": "Все взысканные платежи",
  "Yangi berilgan nasiya:": "Выдано в долг (рассрочка):",
  "Mijozlar hisobiga yozilgan": "Записано на счёт клиентов",
  "Eng Ko'p Sotilgan Matolar (kg)": "Самые продаваемые ткани (кг)",
  "Sotuvlar mavjud emas": "Продаж пока нет",
  "Chek №": "Чек №",
  "Vaqti": "Время",
  "Summasi ($ / so'm)": "Сумма ($ / сум)",
  "Foydasi ($)": "Прибыль ($)",
  "Chakana xaridor": "Розничный покупатель",
  "Aralash": "Смешанно",
  "Chekni ko'rish": "Посмотреть чек",
  "Bekor qilish (Faqat Super Admin)": "Отменить чек (Только Супер Админ)",
  "To'lov Vaqti": "Время оплаты",
  "Mijoz (Qarzdor)": "Клиент (Должник)",
  "To'lov Usuli": "Способ оплаты",
  "Izoh / Maqsad": "Примечание / Цель",
  "Qabul Qilingan Pul ($ / so'm)": "Принятая сумма ($ / сум)",
  "Holat": "Статус",
  "Tanlangan davrda qarzdorlardan pul to'lovi kelib tushmagan": "За выбранный период поступлений от должников не было",
  "Naqd Pul": "Наличные",
  "Plastik Karta": "Пластиковая карта",
  "Qarz to'lovi": "Оплата долга",
  "Daromadga olindi": "Принято в доход",

  // Settings View
  "Dastur va Do'kon Sozlamalari": "Настройки программы и магазина",
  "Saqlandi!": "Сохранено!",
  "Do'kon Ma'lumotlari (Yagona do'kon: TEXTILE PRO)": "Данные магазина (Единый магазин: TEXTILE PRO)",
  "Do'kon Nomi *": "Название магазина *",
  "Do'kon Manzili": "Адрес магазина",
  "Super Admin PIN Kodi (Tannarxlarni ochish uchun) *": "PIN-код Супер Админа (для открытия себестоимости) *",
  "Chek va Termo-Printer": "Чек и Термопринтер",
  "Chek Sarlavhasi": "Заголовок чека",
  "Xaridingiz uchun rahmat!": "Спасибо за покупку!",
  "Printer O'lchami": "Размер принтера",
  "80 mm (Standart katta termo-printer)": "80 мм (Стандартный термопринтер)",
  "58 mm (Ixcham termo-printer)": "58 мм (Компактный термопринтер)",
  "Chek Tagso'zi": "Нижний текст чека",
  "Ovoz effektlari (Skaner va savdo jaranglari):": "Звуковые эффекты (Сканер и уведомления):",
  "Google Gemini AI Yordamchisi": "AI Помощник Google Gemini",
  "Aqlli AI Yordamchi": "Умный AI Помощник",
  "AI ga API kalit kiriting — u dasturni ovozli va matnli buyruqlar orqali boshqarishda yordam beradi": "Введите API-ключ — AI поможет управлять программой голосовыми и текстовыми командами",
  "✓ AI Kalit Ulangan": "✓ AI Ключ подключён",
  "Kalit kiritilmagan": "Ключ не введён",
  "Gemini API Kalit": "Ключ Gemini API",
  "Bepul API Kalit Olish": "Получить бесплатный API-ключ",
  "Bepul API kalit olish": "Получить бесплатный API-ключ",
  "Sinash": "Проверить",
  "AI Modeli": "Модель AI",
  "Avtomatik Bajarish": "Автовыполнение",
  "Buyruqlarni to'g'ridan-to'g'ri ijro etish": "Выполнять команды автоматически",
  "Telegram Bot Xabarlari": "Уведомления в Telegram-бот",
  "Faqat Admin uchun": "Только для Админа",
  "Barcha bo'lgan savdolar va qarzdorlardan tushgan to'lovlar real vaqtda Telegram botingizga yuboriladi": "Все продажи и оплаты долгов отправляются в ваш Telegram-бот в реальном времени",
  "Faol": "Активен",
  "O'chiq": "Выкл.",
  "Admin Telegram Chat ID": "Telegram Chat ID Админа",
  "ID bilish (@userinfobot)": "Узнать ID (@userinfobot)",
  "Savdolar xabari": "Отчёты о продажах",
  "Har bir chek va sotilgan matolar": "Каждый чек и проданные ткани",
  "Qarz to'lovlari": "Оплаты долгов",
  "Qarzdorlardan tushgan pullar": "Деньги, поступившие от должников",
  "Yuborilmoqda...": "Отправка...",
  "Test Xabar Yuborish": "Отправить тест",
  "Sozlamalarni Saqlash": "Сохранить настройки",
  "Ma'lumotlar Zaxirasi & Boshqaruvi": "Резервное копирование и управление базой",
  "Dasturdagi barcha tovarlar, sotuvlar tarixi, mijozlar va xarajatlar brauzer va kompyuteringiz xotirasida xavfsiz saqlanadi. Har qanday vaqtda zaxira nusxa olib qo'yishingiz mumkin.": "Все товары, история продаж, клиенты и расходы надёжно хранятся в памяти компьютера. Вы можете создать резервную копию в любое время.",
  "Zaxira Nusxa Olish (JSON)": "Скачать резервную копию (JSON)",
  "Zaxiradan Qayta Tiklash": "Восстановить из копии",
  "Barcha Ma'lumotlarni Tozalash (0 dan boshlash)": "Очистить все данные (Начать с 0)",

  // Receipt Modal & Barcode Modal
  "Savdo Bajarildi": "Продажа завершена",
  "MATO / VAZN": "ТКАНЬ / ВЕС",
  "SUMMA ($)": "СУММА ($)",
  "Jami dollar:": "Итого в долларах:",
  "Chegirma:": "Скидка:",
  "TO'LANDI ($):": "ОПЛАЧЕНО ($):",
  "NBU kursi:": "Курс ЦБ:",
  "SO'MDA:": "В СУМАХ:",
  "Naqd:": "Наличные:",
  "• $ naqd:": "• Наличными $:",
  "• So'm naqd:": "• Наличными сум:",
  "Karta:": "Карта:",
  "Nasiya (Qarz):": "В долг (Рассрочка):",
  "Xaridingiz uchun rahmat! Matolar sifatiga kafolat beramiz.": "Спасибо за покупку! Гарантируем качество тканей.",
  "Yopish": "Закрыть",
  "Chop Etish": "Печать",
  "Mato QR-kod Yorlig'i": "QR-этикетка ткани",
  "Partiya Raqami:": "Номер партии:",
  "Nusxalash": "Копировать",
  "QR Skaner kodi:": "Код QR-сканера:",
  "Nusxalar soni:": "Количество копий:",
  "Yorliq Namunasi:": "Образец этикетки:",

  // AI Controller Modal
  "TEXTILE PRO AI Yordamchi": "AI Помощник TEXTILE PRO",
  "AI Faol": "AI Активен",
  "API Kalit Kutilmoqda": "Ожидание API-ключа",
  "Super Admin": "Супер Админ",
  "Sotuvchi": "Продавец",
  "Ovoz yoki matn orqali dasturda tezkor aqlli yordam oling": "Быстрая умная помощь голосом или текстом",
  "Yopish (Esc)": "Закрыть (Esc)",
  "Saqlash & Ulash": "Сохранить и подключить",
  "Siz": "Вы",
  "AI tahlil qilmoqda va buyruqni bajarmoqda...": "AI анализирует и выполняет команду...",
  "Tezkor:": "Быстрые:",
  "Bugungi tushum va sof foyda qancha?": "Какова сегодняшняя выручка и чистая прибыль?",
  "Bugungi savdo tushumi qancha?": "Какова сегодняшняя выручка от продаж?",
  "Qaysi matolar kam qoldi?": "Каких тканей осталось мало?",
  "Xarajatlarni ko'rsat": "Покажи расходы",
  "Kassaga o'tish": "Перейти в кассу",
  "Omborga o'tish": "Перейти на склад",
  "Qog'oz / Hujjat rasmi biriktirildi (AI tahlil qiladi)": "Прикреплено фото документа (для анализа AI)",
  "Ovozingizni eshitmoqdaman, gapiring...": "Слушаю вас, говорите...",
  "AI Yordamchiga buyruq bering (masalan: Kassaga o't, Qaysi matolar kam?)...": "Введите команду AI Помощнику (напр.: Перейди в кассу, Каких тканей мало?)...",
  "Yuborish": "Отправить",

  // Common Fabric Categories, Colors & Receipt Defaults
  "TEXTILE PRO - Trikotaj Matolar Savdosi": "TEXTILE PRO - Оптовая продажа трикотажных полотен",
  "Xaridingiz uchun rahmat! Matolar kg bo'yicha topshirildi.": "Спасибо за покупку! Ткани отпущены по весу (кг).",
  "Kulevka": "Кулирка",
  "Dvunitka": "Двунитка",
  "Futer": "Футер",
  "Kashkorse": "Кашкорсе",
  "Ribana": "Рибана",
  "Interlok": "Интерлок",
  "Trikotaj": "Трикотаж",
  "Umumiy": "Общее",
  "Qora": "Чёрный",
  "Oq": "Белый",
  "Qizil": "Красный",
  "Ko'k": "Синий",
  "Yashil": "Зелёный",
  "Sariq": "Жёлтый",
  "Kulrang": "Серый",
  "Melanj": "Меланж",
};

const RU_MONTHS: Record<string, string> = {
  yanvar: 'января',
  fevral: 'февраля',
  mart: 'марта',
  aprel: 'апреля',
  may: 'мая',
  iyun: 'июня',
  iyul: 'июля',
  avgust: 'августа',
  sentyabr: 'сентября',
  oktyabr: 'октября',
  noyabr: 'ноября',
  dekabr: 'декабря',
};

// Dinamik matnlarni Rus tiliga o'girish
function translateToRussian(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return text;

  const leadingSpace = text.match(/^\s*/)?.[0] || '';
  const trailingSpace = text.match(/\s*$/)?.[0] || '';

  if (RU_EXACT_DICT[trimmed]) {
    return leadingSpace + RU_EXACT_DICT[trimmed] + trailingSpace;
  }

  let s = trimmed;

  // Sana formati: "30 sentyabr" -> "30 сентября"
  const dateMatch = s.match(/^(\d{1,2})\s+(yanvar|fevral|mart|aprel|may|iyun|iyul|avgust|sentyabr|oktyabr|noyabr|dekabr)$/i);
  if (dateMatch) {
    const day = dateMatch[1];
    const mKey = dateMatch[2].toLowerCase();
    return leadingSpace + `${day} ${RU_MONTHS[mKey] || mKey}` + trailingSpace;
  }

  // Dinamik qoliplar (Regex)
  s = s
    .replace(/^(\d+)\s+ta kam qoldiq$/i, '$1 мало на складе')
    .replace(/^(\d+)\s+xil mahsulot$/i, '$1 вида товара')
    .replace(/^(\d+)\s+xil mato$/i, '$1 вида ткани')
    .replace(/^\((\d+)\s+to'p,\s*(\d+)\s+xil\)$/i, '($1 рул., $2 вид.)')
    .replace(/^\((\d+)\s+to'p\)$/i, '($1 рул.)')
    .replace(/^(\d+)\s+to'p$/i, '$1 рул.')
    .replace(/^(\d+)\s+ta yozuv$/i, '$1 записей')
    .replace(/^(\d+)\s+nafar mijoz$/i, '$1 клиентов')
    .replace(/^(\d+)\s+nafar$/i, '$1 чел.')
    .replace(/^\+(\d+)\s+to'lov$/i, '+$1 оплаты')
    .replace(/^(\d+)\s+ta$/i, '$1 шт.')
    .replace(/^Partiya:\s*(.+)$/i, 'Партия: $1')
    .replace(/^Partiya №:\s*(.+)$/i, 'Партия №: $1')
    .replace(/^Rangi:\s*(.+)$/i, 'Цвет: $1')
    .replace(/^Mijoz:\s*(.+)$/i, 'Клиент: $1')
    .replace(/^Yetkazuvchi:\s*(.+)$/i, 'Поставщик: $1')
    .replace(/^Kassir:\s*(.+)$/i, 'Кассир: $1')
    .replace(/^Tel:\s*(.+)$/i, 'Тел: $1')
    .replace(/^CHEK №:\s*(.+)$/i, 'ЧЕК №: $1')
    .replace(/^Savdo Cheklari \((\d+)\)$/i, 'Чеки продаж ($1)')
    .replace(/^Qarzdorlardan Tushgan Pul \((\d+)\)$/i, 'Поступления от должников ($1)')
    .replace(/^Jami savdo:\s*(.+)$/i, 'Всего продаж: $1')
    .replace(/^Jami undirilgan:\s*(.+)$/i, 'Всего взыскано: $1')
    .replace(/^Savdo foydasi:\s*(.+)$/i, 'Прибыль с продаж: $1')
    .replace(/^O'rtacha:\s*(.+)$/i, 'Средний чек: $1')
    .replace(/^NBU kursi:\s*(.+)$/i, 'Курс ЦБ: $1')
    .replace(/^Aniq:\s*(.+)$/i, 'Ровно: $1')
    .replace(/^Jami:\s*(.+)$/i, 'Итого: $1')
    .replace(/^So'mda:\s*(.+)$/i, 'В сумах: $1')
    .replace(/\(Kurs:\s*(.+)\)/i, '(Курс: $1)')
    .replace(/^Savdo:\s*(.+)\s*\+\s*Qarz:\s*(.+)$/i, 'Продажи: $1 + Долги: $2')
    .replace(/^Yetmagan\s+(.+)\s+ni nasiyaga \(qarzga\) yozish$/i, 'Записать недостающие $1 в долг (рассрочку)')
    .replace(/qarz sifatida belgilanadi$/i, 'будет записано как долг')
    .replace(/sotildi$/i, 'продано')
    .replace(/— Tarix$/i, '— История')
    .replace(/Qarzi:\s*/g, 'Долг: ')
    .replace(/Qarzi yo'q/g, 'Без долга')
    .replace(/\b(\d+)\s+mln\b/g, '$1 млн')
    .replace(/\b(\d+)\s+ming\b/g, '$1 тыс.')
    .replace(/\bso'm\b/g, 'сум')
    .replace(/\b([0-9.,]+)\s*kg\b/g, '$1 кг')
    .replace(/\/kg\b/g, '/кг')
    .replace(/\bgr\/m²/g, 'гр/м²');

  return leadingSpace + s + trailingSpace;
}

// ============================================================================
// 2. O'ZBEK LOTIN -> O'ZBEK KIRILL TRANSLITERATORI
// ============================================================================
const PRESERVE_TOKENS = new Set([
  'TEXTILE', 'PRO', 'POS', 'USD', 'UZS', 'AI', 'ERP', 'QR', 'PIN', 'ID',
  'JSON', 'API', 'LLC', 'Gemini', 'Flash', 'Lite', 'BotFather', 'userinfobot',
  'v2.4', 'mm', '58mm', '80mm'
]);

const CYR_WORD_OVERRIDES: Record<string, string> = {
  'yanvar': 'январь',
  'fevral': 'февраль',
  'mart': 'март',
  'aprel': 'апрель',
  'may': 'май',
  'iyun': 'июнь',
  'iyul': 'июль',
  'avgust': 'август',
  'sentyabr': 'сентябрь',
  'oktyabr': 'октябрь',
  'noyabr': 'ноябрь',
  'dekabr': 'декабрь',
};

function convertWordToUzbekCyrillic(word: string): string {
  if (!word) return word;
  if (PRESERVE_TOKENS.has(word)) return word;
  if (/^(https?:\/\/|@|AIzaSy|[A-Z0-9_-]{8,})/.test(word)) return word;

  const lower = word.toLowerCase();
  if (CYR_WORD_OVERRIDES[lower]) {
    const target = CYR_WORD_OVERRIDES[lower];
    if (word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) {
      return target.charAt(0).toUpperCase() + target.slice(1);
    }
    return target;
  }

  // Standart apostroflarni birxillashtirish
  let w = word.replace(/[’‘`ʼ']/g, "'");

  // Harf birikmalari (O', G', Sh, Ch, Yo, Yu, Ya, Ye, Ts)
  w = w
    .replace(/O'/g, 'Ў')
    .replace(/o'/g, 'ў')
    .replace(/G'/g, 'Ғ')
    .replace(/g'/g, 'ғ')
    .replace(/SH/g, 'Ш')
    .replace(/Sh/g, 'Ш')
    .replace(/sh/g, 'ш')
    .replace(/CH/g, 'Ч')
    .replace(/Ch/g, 'Ч')
    .replace(/ch/g, 'ч')
    .replace(/YO/g, 'Ё')
    .replace(/Yo/g, 'Ё')
    .replace(/yo/g, 'ё')
    .replace(/YU/g, 'Ю')
    .replace(/Yu/g, 'Ю')
    .replace(/yu/g, 'ю')
    .replace(/YA/g, 'Я')
    .replace(/Ya/g, 'Я')
    .replace(/ya/g, 'я')
    .replace(/YE/g, 'Е')
    .replace(/Ye/g, 'Е')
    .replace(/ye/g, 'е')
    .replace(/TS/g, 'Ц')
    .replace(/Ts/g, 'Ц')
    .replace(/ts/g, 'ц');

  // So'z boshidagi E -> Э
  w = w.replace(/^E/g, 'Э').replace(/^e/g, 'э');

  const charMap: Record<string, string> = {
    A: 'А', a: 'а',
    B: 'Б', b: 'б',
    D: 'Д', d: 'д',
    E: 'Е', e: 'е',
    F: 'Ф', f: 'ф',
    G: 'Г', g: 'г',
    H: 'Ҳ', h: 'ҳ',
    I: 'И', i: 'и',
    J: 'Ж', j: 'ж',
    K: 'К', k: 'к',
    L: 'Л', l: 'л',
    M: 'М', m: 'м',
    N: 'Н', n: 'н',
    O: 'О', o: 'о',
    P: 'П', p: 'п',
    Q: 'Қ', q: 'қ',
    R: 'Р', r: 'р',
    S: 'С', s: 'с',
    T: 'Т', t: 'т',
    U: 'У', u: 'у',
    V: 'В', v: 'в',
    X: 'Х', x: 'х',
    Y: 'Й', y: 'й',
    Z: 'З', z: 'з',
    "'": 'ъ',
  };

  let out = '';
  for (let i = 0; i < w.length; i++) {
    const ch = w[i];
    out += charMap[ch] !== undefined ? charMap[ch] : ch;
  }
  return out;
}

export function latinToUzbekCyrillic(text: string): string {
  if (!text || !text.trim()) return text;
  // TEXTILE PRO nomini o'z holicha saqlaymiz
  return text.replace(/[A-Za-z0-9@._-]+(?:[’‘`ʼ'][A-Za-z]+)*/g, (match) => {
    return convertWordToUzbekCyrillic(match);
  });
}

export function translateText(text: string, lang: AppLanguage): string {
  if (!text || lang === 'uz_lat') return text;
  if (lang === 'uz_cyr') return latinToUzbekCyrillic(text);
  if (lang === 'ru') return translateToRussian(text);
  return text;
}

// ============================================================================
// 3. AVTOMATIK DOM TARJIMON (React bilan 100% xavfsiz WeakMap orqali)
// ============================================================================
interface NodeTranslationMeta {
  source: string;
  rendered: string;
}

const textNodeMeta = new WeakMap<Text, NodeTranslationMeta>();
const attrNodeMeta = new WeakMap<Element, Record<string, NodeTranslationMeta>>();

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE']);

export function applyDomTranslations(root: Node, lang: AppLanguage): void {
  if (!root) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);

  let current: Node | null = walker.currentNode;
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) {
      const textNode = current as Text;
      const parent = textNode.parentElement;
      if (parent && !SKIP_TAGS.has(parent.tagName) && !parent.hasAttribute('data-no-translate')) {
        const val = textNode.nodeValue || '';
        if (val.trim().length > 0) {
          let meta = textNodeMeta.get(textNode);
          if (!meta || val !== meta.rendered) {
            meta = { source: val, rendered: val };
          }
          const target = translateText(meta.source, lang);
          meta.rendered = target;
          textNodeMeta.set(textNode, meta);
          if (textNode.nodeValue !== target) {
            textNode.nodeValue = target;
          }
        }
      }
    } else if (current.nodeType === Node.ELEMENT_NODE) {
      const el = current as Element;
      if (!SKIP_TAGS.has(el.tagName) && !el.hasAttribute('data-no-translate')) {
        let attrMap = attrNodeMeta.get(el);
        if (!attrMap) {
          attrMap = {};
          attrNodeMeta.set(el, attrMap);
        }

        for (const attrName of ['placeholder', 'title']) {
          if (el.hasAttribute(attrName)) {
            const val = el.getAttribute(attrName) || '';
            if (val.trim().length > 0) {
              let meta = attrMap[attrName];
              if (!meta || val !== meta.rendered) {
                meta = { source: val, rendered: val };
              }
              const target = translateText(meta.source, lang);
              meta.rendered = target;
              attrMap[attrName] = meta;
              if (val !== target) {
                el.setAttribute(attrName, target);
              }
            }
          }
        }
      }
    }
    current = walker.nextNode();
  }
}

export function setupLanguageObserver(getLang: () => AppLanguage): () => void {
  const observeConfig: MutationObserverInit = {
    childList: true,
    subtree: true,
    characterData: true,
  };

  let rafId: number | null = null;

  const runTranslation = () => {
    observer.disconnect();
    try {
      applyDomTranslations(document.body, getLang());
    } finally {
      observer.observe(document.body, observeConfig);
    }
  };

  const observer = new MutationObserver(() => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      rafId = null;
      runTranslation();
    });
  });

  runTranslation();

  return () => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    observer.disconnect();
  };
}

