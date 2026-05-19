# Talablar hujjati

## Kirish

**Kunlik Avtomatik Hisobot** — Rentify ijaralar boshqaruv tizimiga qo'shiladigan yangi feature. Foydalanuvchi har kuni ilovaga birinchi marta kirganida dashboard sahifasining yuqori qismida avtomatik ravishda chiroyli "Kunlik Hisobot" kartasi ko'rsatiladi. Karta 3 ta asosiy ko'rsatkichni (bugungi daromad, faol ijaralar soni, qarzdorlar soni) ixcham va vizual tarzda taqdim etadi. Foydalanuvchi kartani "Yopish" tugmasi orqali yopishi mumkin. Bir kun ichida karta faqat bir marta ko'rsatiladi — bu holat `DB_PREFIX` ostida LocalStorage da saqlanadi. Dizayn mavjud dark theme va `--accent` rang bilan uyg'un bo'lib, animatsiyali kirish effektiga ega.

---

## Lug'at

- **Daily_Report**: Kunlik avtomatik hisobot kartasini boshqaruvchi modul (vanilla JS ES5)
- **Dashboard**: `#page-dashboard` elementi — ilovaning bosh sahifasi
- **DB_PREFIX**: `ijarabot_{username}_` formatidagi LocalStorage kalit prefiksi (mavjud `app.js` dan)
- **Report_Card**: Dashboard yuqorisida ko'rsatiladigan hisobot kartasi HTML elementi
- **Last_Shown_Key**: `DB_PREFIX + 'daily_report_last_shown'` — oxirgi ko'rsatilgan sana kaliti
- **Today_Date_String**: `YYYY-MM-DD` formatidagi bugungi sana satri
- **Income_Today**: `analyzeIncome('today')` funksiyasi qaytargan bugungi daromad qiymati (mavjud `ai-chat.js` dan)
- **Active_Count**: `analyzeActiveRentals().count` — faol ijaralar soni (mavjud `ai-chat.js` dan)
- **Debtor_Count**: `analyzeDebtors().length` — qarzdorlar soni (mavjud `ai-chat.js` dan)
- **Slide_In_Animation**: CSS `@keyframes` asosida yuqoridan pastga siljish va opacity o'zgarishi animatsiyasi

---

## Talablar

### Talab 1: Kunlik bir martalik ko'rsatish

**Foydalanuvchi hikoyasi:** Foydalanuvchi sifatida, har kuni ilovaga birinchi kirishimda avtomatik hisobot ko'rishni xohlayman, shunda bugungi holat haqida darhol xabardor bo'laman.

#### Qabul qilish mezonlari

1. WHEN foydalanuvchi muvaffaqiyatli login qilib `initApp()` chaqirilganda, THE Daily_Report SHALL `Last_Shown_Key` qiymatini LocalStorage dan o'qiydi va `Today_Date_String` bilan solishtiradi.
2. WHEN `Last_Shown_Key` qiymati `Today_Date_String` ga teng bo'lmasa, THE Daily_Report SHALL `Report_Card` ni Dashboard sahifasida ko'rsatadi.
3. WHEN `Last_Shown_Key` qiymati `Today_Date_String` ga teng bo'lsa, THE Daily_Report SHALL `Report_Card` ni ko'rsatmaydi va hech qanday DOM o'zgarish qilmaydi.
4. THE Daily_Report SHALL `Today_Date_String` ni `new Date()` asosida `YYYY-MM-DD` formatida hisoblaydi, UTC emas mahalliy vaqt zonasida.
5. WHEN `Last_Shown_Key` LocalStorage da mavjud bo'lmasa, THE Daily_Report SHALL bu holatni birinchi kirish sifatida qabul qilib `Report_Card` ni ko'rsatadi.

---

### Talab 2: Hisobot kartasini ko'rsatish

**Foydalanuvchi hikoyasi:** Foydalanuvchi sifatida, hisobot kartasini Dashboard sahifasining eng yuqorisida ko'rishni xohlayman, shunda u boshqa kontentdan oldin e'tiborimni tortsin.

#### Qabul qilish mezonlari

1. WHEN `Report_Card` ko'rsatilishi kerak bo'lganda, THE Daily_Report SHALL `Report_Card` HTML elementini `#page-dashboard` ichidagi birinchi child element sifatida DOM ga qo'shadi.
2. THE Daily_Report SHALL `Report_Card` ni ko'rsatishdan oldin `Income_Today`, `Active_Count` va `Debtor_Count` qiymatlarini hisoblaydi.
3. THE `Report_Card` SHALL quyidagi 3 ta ko'rsatkichni o'z ichiga oladi: 💰 bugungi daromad (`fmt()` funksiyasi bilan formatlangan), 📋 faol ijaralar soni (dona), ⚠️ qarzdorlar soni (dona).
4. THE `Report_Card` SHALL "Kunlik Hisobot" sarlavhasini va bugungi sanani (`DD.MM.YYYY` formatida) ko'rsatadi.
5. THE `Report_Card` SHALL `Slide_In_Animation` bilan paydo bo'ladi — yuqoridan pastga siljish (translateY(-20px) → translateY(0)) va opacity (0 → 1) o'zgarishi, davomiyligi 0.4 soniya.

---

### Talab 3: Hisobot kartasini yopish

**Foydalanuvchi hikoyasi:** Foydalanuvchi sifatida, hisobot kartasini ko'rib bo'lgach yopishni xohlayman, shunda u Dashboard ni to'sib qolmasin.

#### Qabul qilish mezonlari

1. THE `Report_Card` SHALL "Yopish" deb yozilgan tugmani o'z ichiga oladi.
2. WHEN foydalanuvchi "Yopish" tugmasini bosganida, THE Daily_Report SHALL `Report_Card` ni DOM dan olib tashlaydi.
3. WHEN foydalanuvchi "Yopish" tugmasini bosganida, THE Daily_Report SHALL `Last_Shown_Key` ga `Today_Date_String` qiymatini `DB_PREFIX` ostida LocalStorage ga saqlaydi.
4. WHEN `Last_Shown_Key` LocalStorage ga saqlanganida, THE Daily_Report SHALL `showToast()` funksiyasini chaqirmaydi (yopish jimgina amalga oshadi).
5. IF LocalStorage ga saqlashda xato yuz bersa, THEN THE Daily_Report SHALL `console.warn()` orqali xatoni qayd etadi va `Report_Card` ni DOM dan baribir olib tashlaydi.

---

### Talab 4: LocalStorage integratsiyasi

**Foydalanuvchi hikoyasi:** Foydalanuvchi sifatida, har bir foydalanuvchi uchun alohida hisobot holati saqlanishini xohlayman, shunda boshqa foydalanuvchi kirganda uning o'z holati ko'rsatilsin.

#### Qabul qilish mezonlari

1. THE Daily_Report SHALL `Last_Shown_Key` ni `DB_PREFIX + 'daily_report_last_shown'` formatida saqlaydi, bu yerda `DB_PREFIX` mavjud `app.js` dagi global o'zgaruvchidan olinadi.
2. WHEN foydalanuvchi logout qilib boshqa hisob bilan kirganida, THE Daily_Report SHALL yangi foydalanuvchining `DB_PREFIX` i bilan `Last_Shown_Key` ni qayta tekshiradi.
3. THE Daily_Report SHALL LocalStorage ga faqat `Today_Date_String` (`YYYY-MM-DD` formatidagi sana satri) ni saqlaydi, boshqa ma'lumot saqlamaydi.
4. IF LocalStorage dan o'qishda xato yuz bersa (masalan, `JSON.parse` xatosi), THEN THE Daily_Report SHALL bu holatni birinchi kirish sifatida qabul qilib `Report_Card` ni ko'rsatadi.

---

### Talab 5: Dizayn va mavjud tema bilan moslik

**Foydalanuvchi hikoyasi:** Foydalanuvchi sifatida, hisobot kartasi ilovaning umumiy ko'rinishiga mos kelishini xohlayman, shunda u begona element kabi ko'rinmasin.

#### Qabul qilish mezonlari

1. THE `Report_Card` SHALL mavjud CSS o'zgaruvchilaridan foydalanadi: `--bg`, `--surface`, `--border`, `--accent`, `--text`, `--muted`, `--green`, `--red`.
2. THE `Report_Card` SHALL `backdrop-filter: blur(12px)` va `border: 1px solid var(--border)` bilan `var(--surface)` foniga ega bo'ladi.
3. THE `Report_Card` SHALL sarlavhada `font-family: 'Syne', sans-serif` va `font-weight: 700` ishlatadi.
4. THE `Report_Card` SHALL daromad ko'rsatkichini `var(--green)` rangda, faol ijaralar ko'rsatkichini `var(--accent)` rangda, qarzdorlar ko'rsatkichini `var(--red)` rangda ko'rsatadi.
5. WHERE ekran kengligi 768px dan kichik bo'lsa, THE `Report_Card` SHALL to'liq kenglikda (`width: 100%`) ko'rsatiladi va ko'rsatkichlar vertikal tartibda joylashadi.
6. THE `Report_Card` SHALL mavjud `.stat-card` va `.table-card` elementlari bilan vizual uyg'unlik saqlaydi (bir xil `border-radius: 12px`, bir xil padding uslubi).

---

### Talab 6: Ma'lumot aniqligi va xavfsizligi

**Foydalanuvchi hikoyasi:** Foydalanuvchi sifatida, hisobotdagi raqamlar to'g'ri va ishonchli bo'lishini xohlayman, shunda noto'g'ri qarorlar qabul qilmasam.

#### Qabul qilish mezonlari

1. THE Daily_Report SHALL `Income_Today`, `Active_Count` va `Debtor_Count` qiymatlarini `Report_Card` ko'rsatilishidan oldin hisoblaydi, keshlamaydi.
2. THE Daily_Report SHALL `analyzeIncome('today')`, `analyzeActiveRentals()` va `analyzeDebtors()` funksiyalarini to'g'ridan-to'g'ri chaqiradi (mavjud `ai-chat.js` dagi funksiyalar).
3. THE Daily_Report SHALL daromad qiymatini mavjud `fmt()` funksiyasi orqali formatlaydi (`Number(n).toLocaleString('uz-UZ') + " so'm"` formatida).
4. IF `analyzeIncome`, `analyzeActiveRentals` yoki `analyzeDebtors` funksiyalari xato qaytarsa, THEN THE Daily_Report SHALL xato qiymat o'rniga `0` ni ko'rsatadi va `console.warn()` orqali xatoni qayd etadi.
5. THE Daily_Report SHALL foydalanuvchi kiritgan hech qanday ma'lumotni ko'rsatmaydi — faqat LocalStorage dan hisoblangan statistik qiymatlarni ko'rsatadi.
