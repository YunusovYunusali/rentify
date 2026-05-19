 # Tasks: Multi-Category Rental

## Implementation Plan

### Phase 1: Auth va Kategoriya Tanlash Tizimi

- [x] 1.1 UserRecord kengaytirish — `category` maydoni qo'shish
  - `doRegister()` funksiyasida yangi foydalanuvchi uchun `category: null` qo'shish
  - `loginSuccess()` funksiyasida `users[username].category` ni o'qish va `currentCategory` ga o'rnatish
  - `checkSession()` da ham kategoriya tekshiruvi qo'shish
  - Relevant files: `app.js`

- [x] 1.2 Kategoriya tanlash ekrani (HTML)
  - `index.html` ga `#category-select-screen` div qo'shish
  - 4 ta kategoriya kartasi: Qurilish asboblari, Avtomobil, Idish-tovoqlar, Kiyimlar
  - Har bir karta: ikonka (SVG yoki emoji), nom, qisqa tavsif, tanlash tugmasi
  - Mavjud login/register ekranlar bilan bir xil dizayn uslubi
  - Relevant files: `index.html`, `style.css`

- [x] 1.3 Kategoriya tanlash logikasi (JS)
  - `showCategorySelect()` funksiyasi — ekranni ko'rsatish
  - `selectCategory(categoryKey)` funksiyasi — validatsiya + saqlash + `loginSuccess()` chaqirish
  - `saveCategoryAndProceed(username, categoryKey)` — localStorage yangilash
  - `loginSuccess()` ni kengaytirish: `category === null` bo'lsa `showCategorySelect()` chaqirish
  - Relevant files: `app.js`

- [x] 1.4 initApp() kengaytirish
  - `currentCategory` global o'zgaruvchi qo'shish
  - `initApp()` da `currentCategory` ni o'rnatish
  - `tools` kategoriyasi uchun `DB_PREFIX + 'tools'` (mavjud), boshqalar uchun `DB_PREFIX + 'items'`
  - Mavjud `rentals` uchun `toolId → itemId` migratsiya funksiyasi
  - Relevant files: `app.js`

---

### Phase 2: Navigatsiya va UI Moslashuvi

- [x] 2.1 Navigatsiya menyusi dinamik nomlash
  - `updateNavLabels(category)` funksiyasi — yon panel va pastki nav nomlarini yangilash
  - Katalog nav item nomi: tools→"Asboblar", cars→"Avtomobillar", dishes→"Idish-tovoqlar", clothes→"Kiyimlar"
  - Sahifa sarlavhasi (`#page-asboblar` `.page-title`) ham yangilanishi
  - Relevant files: `app.js`, `index.html`

- [x] 2.2 Katalog sahifasi routing
  - `renderCatalogPage()` funksiyasi — `currentCategory` ga qarab to'g'ri render chaqirish
  - `showPage('asboblar', el)` da `renderCatalogPage()` chaqirilishi
  - Relevant files: `app.js`

---

### Phase 3: Avtomobil (Cars) Moduli

- [x] 3.1 Cars ma'lumot modeli va CRUD funksiyalari
  - `items` massivi (cars uchun) va `saveItems()` funksiyasi
  - `openCarModal(id)` — qo'shish/tahrirlash modali ochish
  - `saveCar()` — validatsiya (plateNumber, brand majburiy) + base64 rasm + saqlash
  - `deleteCar(id)` — ijarada bo'lmasa o'chirish
  - Relevant files: `app.js`

- [x] 3.2 Rasm yuklash (FileReader API)
  - `loadCarImage(fileInput)` funksiyasi — async FileReader
  - Hajm tekshiruvi: > 2MB → xato toast
  - Tur tekshiruvi: `image/*` emas → xato toast
  - `saveCar()` da `await loadCarImage()` integratsiyasi
  - Relevant files: `app.js`

- [x] 3.3 Cars katalog UI (HTML + CSS)
  - `#tool-modal` ga o'xshash `#car-modal` qo'shish: plateNumber, brand, model, year, color, rasm input, dayRate
  - `renderCars()` funksiyasi — grid ko'rinishida avtomobil kartalar
  - Avtomobil kartasi: rasm thumbnail, davlat raqami, marka/model, narx, mavjudlik, tahrirlash/o'chirish
  - Mobile card ko'rinishi
  - Relevant files: `index.html`, `app.js`, `style.css`

- [x] 3.4 Cars item picker (ijara modalida)
  - `buildCarPicker(selectedItems)` — avtomobillar ro'yxati, rasm thumbnail bilan
  - `getCarInUseQty(itemId, excludeRentalId)` — ijarada bo'lgan avtomobillar
  - `openAddModal()` da `currentCategory === 'cars'` bo'lsa `buildCarPicker()` chaqirish
  - Relevant files: `app.js`

---

### Phase 4: Idish-Tovoqlar Moduli

- [x] 4.1 Dishes ma'lumot modeli va CRUD funksiyalari
  - `openDishModal(id)` — qo'shish/tahrirlash modali
  - `saveDish()` — validatsiya (nom majburiy) + saqlash
  - `deleteDish(id)` — ijarada bo'lmasa o'chirish
  - Relevant files: `app.js`

- [x] 4.2 Dishes katalog UI (HTML + CSS)
  - `#dish-modal` qo'shish: nom, tur (select: Lagan/Piyola/Qozon/Boshqa), miqdor, kunlik narx
  - `renderDishes()` funksiyasi — grid ko'rinishida idish kartalar
  - Idish kartasi: nom, tur badge, miqdor, mavjud miqdor, narx, tahrirlash/o'chirish
  - Relevant files: `index.html`, `app.js`, `style.css`

- [x] 4.3 Dishes item picker (ijara modalida)
  - `buildDishPicker(selectedItems)` — idishlar ro'yxati
  - `openAddModal()` da `currentCategory === 'dishes'` bo'lsa `buildDishPicker()` chaqirish
  - Relevant files: `app.js`

---

### Phase 5: Kiyimlar Moduli

- [x] 5.1 Clothes ma'lumot modeli va CRUD funksiyalari
  - `openClothesModal(id)` — qo'shish/tahrirlash modali
  - `saveClothes()` — validatsiya (nom majburiy) + saqlash
  - `deleteClothes(id)` — ijarada bo'lmasa o'chirish
  - Relevant files: `app.js`

- [x] 5.2 Clothes katalog UI (HTML + CSS)
  - `#clothes-modal` qo'shish: nom, o'lcham (S/M/L/XL/XXL/Boshqa), tur (Ko'ylak/Shim/Kostyum/Boshqa), miqdor, kunlik narx
  - `renderClothes()` funksiyasi — grid ko'rinishida kiyim kartalar
  - Kiyim kartasi: nom, o'lcham + tur badge, miqdor, mavjud miqdor, narx, tahrirlash/o'chirish
  - Relevant files: `index.html`, `app.js`, `style.css`

- [x] 5.3 Clothes item picker (ijara modalida)
  - `buildClothesPicker(selectedItems)` — kiyimlar ro'yxati
  - `openAddModal()` da `currentCategory === 'clothes'` bo'lsa `buildClothesPicker()` chaqirish
  - Relevant files: `app.js`

---

### Phase 6: Umumiy Ijara Oqimi Integratsiyasi

- [x] 6.1 openAddModal() va saveRental() kengaytirish
  - `openAddModal()` da `currentCategory` ga qarab to'g'ri picker chaqirish
  - `saveRental()` da `items` massivi `itemId` ishlatishi (toolId ham qabul qilinadi — orqaga moslik)
  - Relevant files: `app.js`

- [x] 6.2 getItemInUseQty() umumiy funksiya
  - `getToolInUseQty()` ni `getItemInUseQty(itemId, excludeRentalId)` ga rename qilish
  - `toolId || itemId` pattern bilan orqaga moslik
  - Barcha picker funksiyalari bu umumiy funksiyani ishlatishi
  - Relevant files: `app.js`

- [x] 6.3 Qaytarish modali kengaytirish
  - `buildReturnPicker()` da `currentCategory` ga qarab to'g'ri element nomlari ko'rsatilishi
  - Cars uchun: davlat raqami + marka ko'rsatilishi
  - Relevant files: `app.js`

---

### Phase 7: Ma'lumotlar Saqlash va Xatolik Boshqaruvi

- [x] 7.1 localStorage xatolik boshqaruvi
  - `saveItems()`, `saveRentals()`, `saveTools()` funksiyalarini `try/catch` bilan o'rash
  - `QuotaExceededError` uchun: toast "Xotira to'lib qoldi, eski ma'lumotlarni o'chiring"
  - Relevant files: `app.js`

- [x] 7.2 Migratsiya funksiyasi
  - `migrateExistingRentals(rentals)` — `toolId → itemId` konversiyasi
  - `initApp()` da rentals yuklanayotganda migratsiya chaqirish
  - Idempotent: ikki marta chaqirilsa ham natija bir xil
  - Relevant files: `app.js`

---

### Phase 8: Sozlamalar va Polishing

- [x] 8.1 Sozlamalar sahifasida kategoriya ko'rsatish
  - `#settings-username` yonida joriy kategoriya nomi ko'rsatish
  - Ixtiyoriy: kategoriyani qayta tanlash imkoniyati (faqat items bo'sh bo'lsa)
  - Relevant files: `index.html`, `app.js`

- [x] 8.2 Kategoriya tanlash ekrani CSS
  - Kategoriya kartalar grid layout (2x2)
  - Hover effekti, tanlangan holat highlight
  - Mobile responsive (1 ustun)
  - Mavjud dark theme bilan mos
  - Relevant files: `style.css`

- [x] 8.3 PWA manifest yangilash
  - `manifest.json` da `name` va `description` ni umumiyroq qilish: "BuildZone — Ijara Boshqaruvi"
  - `short_name` ni "BuildZone" saqlab qolish
  - Relevant files: `manifest.json`

- [x] 8.4 Yakuniy test va polishing
  - Barcha 4 kategoriya uchun to'liq oqimni tekshirish: ro'yxat → kategoriya → element qo'shish → ijara → qaytarish
  - Mavjud `tools` foydalanuvchisi uchun migratsiya oqimini tekshirish
  - Mobile responsive tekshiruvi
  - localStorage limit tekshiruvi (base64 rasmlar bilan)
