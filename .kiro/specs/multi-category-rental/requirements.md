# Requirements: Multi-Category Rental

## Introduction

BuildZone ijarasi boshqaruv tizimini kengaytirish — bir platformada bir nechta ijara kategoriyalarini qo'llab-quvvatlash. Har bir foydalanuvchi o'z kategoriyasini bir marta tanlaydi va keyingi kirish­larda to'g'ridan-to'g'ri o'sha kategoriyaga xos interfeys bilan ishlaydi. Mavjud qurilish asboblari funksionalligiga ta'sir qilinmaydi.

---

## Requirements

### Requirement 1: Kategoriya Tanlash Tizimi

**User Story**: Yangi foydalanuvchi sifatida, ro'yxatdan o'tgandan so'ng o'zimga mos ijara kategoriyasini bir marta tanlamoqchiman, shunda tizim menga o'sha kategoriyaga xos interfeys ko'rsatsin.

#### Acceptance Criteria

1.1. WHEN foydalanuvchi ro'yxatdan o'tishni muvaffaqiyatli yakunlasa THEN tizim kategoriya tanlash ekranini ko'rsatishi KERAK.

1.2. WHEN kategoriya tanlash ekrani ko'rsatilsa THEN quyidagi 4 ta kategoriya ko'rsatilishi KERAK: "Qurilish asboblari", "Avtomobil (RentCar)", "Idish-tovoqlar", "Kiyimlar" — har biri ikonka va qisqa tavsif bilan.

1.3. WHEN foydalanuvchi kategoriya tanlasa THEN tanlangan kategoriya `users[username].category` maydoniga saqlanishi KERAK va kategoriya tanlash ekrani qayta ko'rsatilmasligi KERAK.

1.4. WHEN mavjud foydalanuvchi (category ≠ null) tizimga kirsa THEN kategoriya tanlash ekrani ko'rsatilmasligi KERAK va to'g'ridan-to'g'ri asosiy ilovaga o'tilishi KERAK.

1.5. WHEN eski hisob egasi (category = null) tizimga kirsa THEN kategoriya tanlash ekrani ko'rsatilishi KERAK va mavjud ma'lumotlari (tools, rentals) saqlanib qolishi KERAK.

---

### Requirement 2: Qurilish Asboblari Moduli (Mavjud)

**User Story**: Qurilish asboblari kategoriyasini tanlagan foydalanuvchi sifatida, mavjud funksionallik to'liq ishlashini xohlayman.

#### Acceptance Criteria

2.1. WHEN foydalanuvchi `category = 'tools'` bilan kirsa THEN mavjud asboblar katalogi, ijara yaratish, qaytarish va hisobot funksiyalari o'zgarishsiz ishlashi KERAK.

2.2. WHEN `category = 'tools'` bo'lsa THEN navigatsiya menyusida "Asboblar katalogi" ko'rsatilishi KERAK.

2.3. WHEN mavjud `tools` foydalanuvchisi kategoriya tanlasa THEN `ijarabot_{username}_tools` va `ijarabot_{username}_rentals` ma'lumotlari o'chirilmasligi KERAK.

---

### Requirement 3: Avtomobil (RentCar) Moduli

**User Story**: Avtomobil ijarasi bilan shug'ullanuvchi foydalanuvchi sifatida, har bir avtomobil uchun davlat raqami, marka, model, yil, rang va rasm saqlashni, shuningdek kunlik narx asosida ijara boshqarishni xohlayman.

#### Acceptance Criteria

3.1. WHEN `category = 'cars'` bo'lsa THEN avtomobil qo'shish modali quyidagi majburiy maydonlarni ko'rsatishi KERAK: davlat raqami, marka, kunlik narx.

3.2. WHEN avtomobil qo'shish modali ko'rsatilsa THEN ixtiyoriy maydonlar ham bo'lishi KERAK: model, yil, rang, rasm yuklash.

3.3. WHEN foydalanuvchi rasm yuklasa THEN rasm `FileReader API` orqali base64 formatiga aylantirilishi va `imageBase64` maydonida saqlanishi KERAK.

3.4. WHEN yuklangan rasm hajmi 2MB dan oshsa THEN xato xabari ko'rsatilishi KERAK va rasm saqlanmasligi KERAK.

3.5. WHEN avtomobil katalogi ko'rsatilsa THEN har bir avtomobil kartasida rasm (agar mavjud bo'lsa), davlat raqami, marka/model, kunlik narx va mavjudlik holati ko'rsatilishi KERAK.

3.6. WHEN avtomobil ijarada bo'lsa THEN u boshqa ijaraga berilmasligi KERAK (qty = 1 qoida).

---

### Requirement 4: Idish-Tovoqlar Moduli

**User Story**: Idish-tovoq ijarasi bilan shug'ullanuvchi foydalanuvchi sifatida, har bir idish turi uchun nom, tur, miqdor va kunlik narx saqlashni xohlayman.

#### Acceptance Criteria

4.1. WHEN `category = 'dishes'` bo'lsa THEN idish qo'shish modali quyidagi maydonlarni ko'rsatishi KERAK: nom (majburiy), tur (Lagan/Piyola/Qozon/Boshqa), miqdor, kunlik narx.

4.2. WHEN idish katalogi ko'rsatilsa THEN har bir idish kartasida nom, tur, umumiy miqdor, mavjud miqdor va kunlik narx ko'rsatilishi KERAK.

4.3. WHEN idish ijarada bo'lsa THEN mavjud miqdor shunga mos kamayishi KERAK.

---

### Requirement 5: Kiyimlar Moduli

**User Story**: Kiyim ijarasi bilan shug'ullanuvchi foydalanuvchi sifatida, har bir kiyim uchun nom, o'lcham, tur, miqdor va kunlik narx saqlashni xohlayman.

#### Acceptance Criteria

5.1. WHEN `category = 'clothes'` bo'lsa THEN kiyim qo'shish modali quyidagi maydonlarni ko'rsatishi KERAK: nom (majburiy), o'lcham (S/M/L/XL/XXL/Boshqa), tur (Ko'ylak/Shim/Kostyum/Boshqa), miqdor, kunlik narx.

5.2. WHEN kiyim katalogi ko'rsatilsa THEN har bir kiyim kartasida nom, o'lcham, tur, umumiy miqdor, mavjud miqdor va kunlik narx ko'rsatilishi KERAK.

5.3. WHEN kiyim ijarada bo'lsa THEN mavjud miqdor shunga mos kamayishi KERAK.

---

### Requirement 6: Kategoriyaga Mos Ijara Oqimi

**User Story**: Har qanday kategoriya foydalanuvchisi sifatida, o'z kategoriyamga xos elementlarni ijaraga berish, qaytarish va to'lov boshqarishni xohlayman.

#### Acceptance Criteria

6.1. WHEN ijara yaratish modali ochilsa THEN faqat joriy kategoriyaga tegishli elementlar ko'rsatilishi KERAK.

6.2. WHEN element ijarada bo'lsa THEN uning mavjud miqdori kamayishi va picker da "Tugagan" yoki disabled holda ko'rsatilishi KERAK.

6.3. WHEN ijara narxi hisoblanayotganda THEN `dayRate / 24 * hours` formulasi ishlatilishi KERAK (barcha kategoriyalar uchun bir xil).

6.4. WHEN ijara qaytarilsa THEN element miqdori yana mavjud bo'lib qolishi KERAK.

6.5. WHEN `category = 'cars'` bo'lsa THEN ijara picker da avtomobil rasmi (thumbnail) ko'rsatilishi KERAK (agar mavjud bo'lsa).

---

### Requirement 7: Ma'lumotlar Saqlash va Migratsiya

**User Story**: Tizim administratori sifatida, mavjud foydalanuvchilar ma'lumotlari yangi tizimga o'tishda yo'qolmasligini xohlayman.

#### Acceptance Criteria

7.1. WHEN yangi kategoriya tizimi ishga tushganda THEN `tools` va `cars/dishes/clothes` uchun alohida localStorage kalitlari ishlatilishi KERAK: `tools` uchun `DB_PREFIX + 'tools'`, boshqalar uchun `DB_PREFIX + 'items'`.

7.2. WHEN mavjud `rentals` ma'lumotlari o'qilganda THEN `item.toolId` mavjud bo'lsa `item.itemId` sifatida ham ishlatilishi KERAK (orqaga moslik).

7.3. WHEN foydalanuvchi tizimdan chiqsa THEN `currentCategory` null ga qaytishi KERAK.

7.4. WHEN localStorage `QuotaExceededError` xatosi bersa THEN foydalanuvchiga tushunarli xato xabari ko'rsatilishi KERAK.

---

### Requirement 8: Navigatsiya va UI Moslashuvi

**User Story**: Har qanday kategoriya foydalanuvchisi sifatida, navigatsiya menyusi va sahifa sarlavhalari o'z kategoriyamga mos nomlar bilan ko'rsatilishini xohlayman.

#### Acceptance Criteria

8.1. WHEN foydalanuvchi tizimga kirsa THEN yon panel va pastki navigatsiyadagi "Katalog" bo'limi nomi joriy kategoriyaga mos bo'lishi KERAK:
- `tools` → "Asboblar"
- `cars` → "Avtomobillar"
- `dishes` → "Idish-tovoqlar"
- `clothes` → "Kiyimlar"

8.2. WHEN katalog sahifasi ko'rsatilsa THEN sahifa sarlavhasi kategoriyaga mos bo'lishi KERAK.

8.3. WHEN mobil qurilmada ko'rsatilsa THEN barcha yangi ekranlar (kategoriya tanlash, yangi modallar) responsive bo'lishi KERAK.

8.4. WHEN ilovaning mavjud dizayn tizimi (dark theme, Syne/DM Sans shriftlar, rang o'zgaruvchilari) ishlatilsa THEN yangi komponentlar ham shu dizayn tizimiga mos bo'lishi KERAK.
