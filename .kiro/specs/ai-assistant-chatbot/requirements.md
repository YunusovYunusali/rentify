# Requirements Document

## Introduction

Rentify ijara boshqaruv tizimiga AI Yordamchi (Chatbot) qo'shiladi. Bu feature foydalanuvchiga o'z lokal ma'lumotlari (ijaralar, daromad, qarzdorlar, katalog) haqida tabiiy til orqali savol berish va tezkor javob olish imkonini beradi. Tizim backend-siz ishlaydi — barcha ma'lumotlar LocalStorage va IndexedDB da saqlanadi. AI javoblari lokal mantiq asosida yoki ixtiyoriy tashqi API (masalan OpenAI) orqali shakllantiriladi.

Rentify katalogi endi Restaran / To'yhona, Stadion / Maydon va PlayStation / Kompyuter kabi yangi ijara toifalarini ham qo'llab-quvvatlaydi.

---

## Glossary

- **Chatbot** — Foydalanuvchi bilan matn orqali muloqot qiladigan AI Yordamchi interfeysi.
- **AI_Engine** — Foydalanuvchi savoliga javob tayyorlaydigan mantiq qatlami (lokal yoki API orqali).
- **Data_Analyzer** — LocalStorage va IndexedDB dan ma'lumotlarni o'qib, tahlil qiladigan modul.
- **Chat_UI** — Chatbot suhbat oynasi (foydalanuvchi interfeysi komponenti).
- **Message** — Foydalanuvchi yoki AI tomonidan yozilgan bitta xabar.
- **Context** — Joriy foydalanuvchining barcha lokal ma'lumotlari (ijaralar, asboblar/mahsulotlar, to'lovlar).
- **Intent** — Foydalanuvchi savolining maqsadi (masalan: daromad so'rovi, qarzdorlar ro'yxati, eng ko'p ijaralangan mahsulot).
- **Lokal_Mantiq** — Tashqi API ishlatmasdan, faqat JavaScript kodi orqali javob beruvchi AI_Engine rejimi.
- **API_Rejim** — Tashqi AI API (masalan OpenAI) orqali javob beruvchi AI_Engine rejimi.
- **Rentify** — Ijara boshqaruv tizimining nomi.
- **currentUser** — Tizimga kirgan joriy foydalanuvchi.
- **DB_PREFIX** — Foydalanuvchiga xos LocalStorage kalit prefiksi (`ijarabot_{username}_`).

---

## Requirements

### Requirement 1: Chat oynasini ochish va yopish

**User Story:** As a foydalanuvchi, I want ilovaning istalgan sahifasida AI Yordamchini tezda ochib, savolimni berib, keyin yopishni, so that asosiy ish jarayonim uzilmasin.

#### Acceptance Criteria

1. THE Rentify SHALL asosiy ilovaning barcha sahifalarida (dashboard, ijaralar, katalog, hisobot, sozlamalar) doimo ko'rinadigan AI Yordamchi tugmasini ko'rsatishi kerak.
2. WHEN foydalanuvchi AI Yordamchi tugmasini bosganida, THE Chat_UI SHALL ekranda suhbat oynasini ochishi kerak.
3. WHEN foydalanuvchi yopish tugmasini bosganida yoki oyna tashqarisiga bosganida, THE Chat_UI SHALL suhbat oynasini yopishi kerak.
4. WHILE suhbat oynasi ochiq bo'lganida, THE Chat_UI SHALL asosiy ilovaning ishlashiga to'sqinlik qilmasligi kerak (floating panel sifatida).
5. THE Chat_UI SHALL mobil qurilmalarda (max-width: 768px) to'liq ekran rejimida ko'rsatilishi kerak.
6. THE Chat_UI SHALL desktop qurilmalarda ekranning pastki o'ng burchagida joylashgan floating panel sifatida ko'rsatilishi kerak.

---

### Requirement 2: Xabar yuborish va javob olish

**User Story:** As a foydalanuvchi, I want o'zbek tilida savol yozib tizimdan aniq va tushunarli javob olishni, so that ma'lumotlarni qo'lda qidirmasdan tezda topaman.

#### Acceptance Criteria

1. WHEN foydalanuvchi matn kiritib "Yuborish" tugmasini yoki Enter tugmasini bosganida, THE Chat_UI SHALL xabarni AI_Engine ga uzatishi kerak.
2. WHEN AI_Engine javob tayyorlaganida, THE Chat_UI SHALL javobni suhbat oynasida ko'rsatishi kerak.
3. THE Chat_UI SHALL foydalanuvchi xabarlarini o'ng tomonda, AI javoblarini chap tomonda ko'rsatishi kerak (chat bubble uslubi).
4. WHILE AI_Engine javob tayyorlayotganida, THE Chat_UI SHALL yuklanish indikatorini (typing indicator) ko'rsatishi kerak.
5. IF foydalanuvchi bo'sh xabar yuborishga uringanida, THEN THE Chat_UI SHALL xabarni yubormasligi va foydalanuvchiga ogohlantirishni ko'rsatishi kerak.
6. THE Chat_UI SHALL suhbat tarixini joriy sessiya davomida saqlab turishi kerak (sahifalar orasida o'tganda ham).
7. WHEN yangi xabar qo'shilganida, THE Chat_UI SHALL suhbat oynasini avtomatik ravishda eng pastki xabarga aylantirishi (scroll) kerak.

---

### Requirement 3: Lokal ma'lumotlarni tahlil qilish

**User Story:** As a foydalanuvchi, I want "Bugun qancha daromad bo'ldi?" yoki "Kim qarzdor?" kabi savollarga tizimim ma'lumotlari asosida javob olishni, so that hisobot sahifasiga o'tmasdan ham holat haqida bilib olaman.

#### Acceptance Criteria

1. WHEN foydalanuvchi daromad haqida savol berganida, THE Data_Analyzer SHALL currentUser ning DB_PREFIX bilan LocalStorage dan ijaralar ma'lumotlarini o'qib, bugungi, haftalik va oylik daromadni hisoblashi kerak.
2. WHEN foydalanuvchi qarzdorlar haqida savol berganida, THE Data_Analyzer SHALL to'lov holati "unpaid" bo'lgan barcha faol ijaralarni topib, mijoz ismlari va qarzdorlik miqdorlarini qaytarishi kerak.
3. WHEN foydalanuvchi eng ko'p ijaralangan mahsulot haqida savol berganida, THE Data_Analyzer SHALL barcha ijaralar tarixini tahlil qilib, eng ko'p marta ijaralangan mahsulot nomini va sonini qaytarishi kerak; IF ijara tarixi bo'sh bo'lsa, THEN THE Data_Analyzer SHALL 0 sonini qaytarishi kerak.
4. WHEN foydalanuvchi faol ijaralar haqida savol berganida, THE Data_Analyzer SHALL hozirda "active" yoki "partial" holatdagi ijaralar sonini va ro'yxatini qaytarishi kerak.
5. WHEN foydalanuvchi ma'lum bir mijoz haqida savol berganida, THE Data_Analyzer SHALL o'sha mijozning barcha ijara tarixini, to'lov holatini va umumiy summasini qaytarishi kerak.
6. THE Data_Analyzer SHALL faqat currentUser ga tegishli ma'lumotlarni (DB_PREFIX orqali) o'qishi kerak — boshqa foydalanuvchilar ma'lumotlariga kirish mumkin emas.
7. WHEN foydalanuvchi katalog haqida savol berganida, THE Data_Analyzer SHALL currentUser ning mahsulotlar ro'yxatini o'qib, umumiy soni va mavjudligini qaytarishi kerak.

---

### Requirement 4: Intent aniqlash — Lokal mantiq

**User Story:** As a foydalanuvchi, I want o'zbek tilida erkin yozgan savolimni tizim tushunib to'g'ri ma'lumotni topib berishini, so that aniq buyruq yozishim shart bo'lmasin.

#### Acceptance Criteria

1. THE AI_Engine SHALL kamida quyidagi intent turlarini tanishi kerak: daromad so'rovi, qarzdorlar so'rovi, faol ijaralar so'rovi, katalog so'rovi, mijoz qidirish, statistika so'rovi, umumiy salomlashish.
2. WHEN foydalanuvchi savoli tanilgan intent ga mos kelganida, THE AI_Engine SHALL Data_Analyzer dan tegishli ma'lumotni olib, o'zbek tilida javob shakllantirishi kerak.
3. WHEN foydalanuvchi savoli hech qanday intent ga mos kelmaganida, THE AI_Engine SHALL foydalanuvchiga nima so'rashi mumkinligi haqida yordam xabarini ko'rsatishi kerak.
4. THE AI_Engine SHALL kalit so'zlarni katta-kichik harfga sezgir bo'lmagan holda tahlil qilishi kerak (masalan "Daromad", "daromad", "DAROMAD" bir xil natija berishi kerak).
5. THE AI_Engine SHALL o'zbek tilidagi sinonimlarni tanishi kerak (masalan "pul", "daromad", "tushum" — barchasi daromad so'roviga mos kelishi kerak).

---

### Requirement 5: Tashqi AI API integratsiyasi (ixtiyoriy)

**User Story:** As a foydalanuvchi, I want murakkab savollar uchun chuqurroq tahlil olishni (masalan "Qaysi oy eng foydali bo'ldi?"), so that biznesimni yaxshiroq tushunaman.

#### Acceptance Criteria

1. WHERE API_Rejim yoqilgan bo'lsa, THE AI_Engine SHALL foydalanuvchi savolini va Data_Analyzer dan olingan lokal ma'lumotlarni tashqi AI API ga yuborishi kerak.
2. WHERE API_Rejim yoqilgan bo'lsa, THE AI_Engine SHALL API kalitini foydalanuvchi sozlamalarida xavfsiz saqlashi kerak (LocalStorage da, DB_PREFIX ostida).
3. IF tashqi API javob bermasa yoki xato qaytarsa, THEN THE AI_Engine SHALL avtomatik ravishda Lokal_Mantiq rejimine o'tib, foydalanuvchiga xato haqida xabar berishi kerak.
4. WHERE API_Rejim yoqilgan bo'lsa va shaxsiy ma'lumotlar (mijoz ismlari, telefon raqamlari) mavjud bo'lsa, THE AI_Engine SHALL API rejimi yoqilgan zahoti foydalanuvchidan shaxsiy ma'lumotlarni yuborish uchun ruxsat so'rashi kerak.
5. THE Rentify SHALL sozlamalar sahifasida API kalitini kiritish, API rejimini yoqish/o'chirish va ulanishni tekshirish imkonini berishi kerak.

---

### Requirement 6: Tezkor savol tugmalari (Quick Actions)

**User Story:** As a foydalanuvchi, I want har safar savol yozmasdan tez-tez so'raladigan savollarni bir bosish bilan berishni, so that vaqtimni tejab tezroq javob olaman.

#### Acceptance Criteria

1. THE Chat_UI SHALL suhbat oynasi ochilganida kamida 4 ta tezkor savol tugmasini ko'rsatishi kerak: "Bugungi daromad", "Qarzdorlar", "Faol ijaralar", "Eng ko'p ijaralangan".
2. WHEN foydalanuvchi tezkor savol tugmasini bosganida, THE Chat_UI SHALL o'sha savolni avtomatik ravishda AI_Engine ga yuborishi kerak.
3. WHEN suhbat tarixida xabarlar mavjud bo'lganida, THE Chat_UI SHALL tezkor savol tugmalarini yashirishi kerak (faqat bo'sh suhbatda ko'rsatiladi); WHILE tezkor savol tugmalari yashirilgan bo'lsa, THE Chat_UI SHALL tugmalar orqali savol yuborishni bloklashi kerak.

---

### Requirement 7: Suhbat tarixini boshqarish

**User Story:** As a foydalanuvchi, I want suhbat tarixini tozalab yangi suhbat boshlashni, so that eski savollar chalkashib ketmasin.

#### Acceptance Criteria

1. THE Chat_UI SHALL suhbat oynasida "Tozalash" tugmasini ko'rsatishi kerak.
2. WHEN foydalanuvchi "Tozalash" tugmasini bosganida, THE Chat_UI SHALL suhbat tarixini tozalab tezkor savol tugmalarini qayta ko'rsatishi kerak.
3. THE Chat_UI SHALL suhbat tarixini LocalStorage da currentUser ga xos kalit ostida saqlashi kerak, shunda sahifa yangilanganida ham tarix saqlanib qolsin.
4. THE Chat_UI SHALL suhbat tarixida maksimal 100 ta xabarni saqlashi kerak; bu chegaradan oshganda eng eski xabarlar avtomatik o'chirilishi kerak.

---

### Requirement 8: Xatoliklarni boshqarish

**User Story:** As a foydalanuvchi, I want tizimda xato yuz berganda tushunarli xabar ko'rishni, so that nima qilish kerakligini bilaman.

#### Acceptance Criteria

1. IF LocalStorage dan ma'lumot o'qishda xato yuz bersa, THEN THE Data_Analyzer SHALL xato xabarini loglashi va AI_Engine ga bo'sh ma'lumot o'rniga xato belgisini qaytarishi kerak.
2. IF AI_Engine javob tayyorlashda kutilmagan xato yuz bersa, THEN THE Chat_UI SHALL foydalanuvchiga o'zbek tilida tushunarli xato xabarini ko'rsatishi kerak.
3. IF foydalanuvchi tizimga kirmagan holda Chatbot ga kirmoqchi bo'lsa, THEN THE Chat_UI SHALL foydalanuvchini login sahifasiga yo'naltirishi kerak.
4. WHILE foydalanuvchi tizimga kirmagan bo'lsa, THE Chat_UI SHALL ko'rsatilmasligi kerak.
