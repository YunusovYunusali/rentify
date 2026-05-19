# Implementation Plan: AI Yordamchi Chatbot

## Overview

Rentify ijaraboshqaruv tizimiga Vanilla JS (ES5 `'use strict'`) asosida AI Yordamchi Chatbot qo'shiladi. Barcha mantiq `ai-chat.js` faylida joylashadi; `index.html` va `style.css` ga qo'shimchalar kiritiladi. Backend yo'q — LocalStorage va IndexedDB ishlatiladi.

## Tasks

- [x] 1. Loyiha tuzilmasi va asosiy o'zgaruvchilarni sozlash
  - `ai-chat.js` faylini yaratish: `'use strict'` direktivi, `AiChatState` obyekti, `AI_INTENTS` va `INTENT_KEYWORDS` konstantalarini aniqlash
  - `AiChatState = { isOpen, isLoading, messages, apiEnabled, apiKey }` tuzilmasini yozish
  - `AI_INTENTS` enum va `INTENT_KEYWORDS` xaritasini (o'zbek sinonimlar bilan) yozish
  - _Requirements: 4.1, 4.4, 4.5_

  - [x] 1.1 `AiChatState`, `AI_INTENTS`, `INTENT_KEYWORDS` konstantalarini yozish
    - Barcha intent turlari: income, debtors, active, catalog, client, stats, greeting, unknown
    - Har bir intent uchun o'zbek sinonimlar ro'yxati
    - _Requirements: 4.1, 4.4, 4.5_

- [ ] 2. Data_Analyzer modulini implement qilish
  - [x] 2.1 `safeReadLS(key, fallback)` funksiyasini yozish
    - `try/catch` bilan xavfsiz LocalStorage o'qish
    - Xato bo'lsa `fallback` qaytarish, `console.warn` bilan log qilish
    - _Requirements: 8.1_

  - [ ]* 2.2 `safeReadLS` uchun property test yozish
    - **Property 8: Foydalanuvchi ma'lumot izolyatsiyasi**
    - **Validates: Requirements 3.6**
    - fast-check bilan: har qanday `DB_PREFIX` uchun faqat shu prefix ostidagi kalitlar o'qilishini tekshirish

  - [x] 2.3 `analyzeIncome(period)` funksiyasini yozish
    - `period`: `'today'` | `'week'` | `'month'`
    - `DB_PREFIX + 'rentals'` dan ijaralarni o'qib, `totalPrice` yig'indisini hisoblash
    - Faqat `currentUser` ga tegishli ma'lumotlar (`DB_PREFIX` orqali)
    - _Requirements: 3.1, 3.6_

  - [ ]* 2.4 `analyzeIncome` uchun property test yozish
    - **Property 5: Daromad hisoblash to'g'riligi**
    - **Validates: Requirements 3.1**
    - fast-check bilan: ixtiyoriy ijara to'plami uchun hisoblangan daromad `totalPrice` yig'indisiga teng ekanligini tekshirish

  - [x] 2.5 `analyzeDebtors()` funksiyasini yozish
    - `payment === 'unpaid'` bo'lgan ijaralarni filtrlash
    - Mijoz ismlari va qarzdorlik miqdorlarini qaytarish
    - _Requirements: 3.2_

  - [ ]* 2.6 `analyzeDebtors` uchun property test yozish
    - **Property 6: Qarzdorlar filtrlash**
    - **Validates: Requirements 3.2**
    - fast-check bilan: natijada faqat `payment === 'unpaid'` ijaralar borligini tekshirish

  - [x] 2.7 `analyzeActiveRentals()` funksiyasini yozish
    - `status === 'active'` yoki `status === 'partial'` ijaralarni filtrlash
    - Faol ijaralar soni va ro'yxatini qaytarish
    - _Requirements: 3.4_

  - [ ]* 2.8 `analyzeActiveRentals` uchun property test yozish
    - **Property 7: Faol ijaralar filtrlash**
    - **Validates: Requirements 3.4**
    - fast-check bilan: natijada faqat `status === 'active'` yoki `'partial'` ijaralar borligini tekshirish

  - [x] 2.9 `analyzeTopItems()`, `analyzeClient(name)`, `analyzeCatalog()` funksiyalarini yozish
    - `analyzeTopItems`: barcha ijaralar tarixini tahlil qilib eng ko'p ijaralangan mahsulotni topish
    - `analyzeClient(name)`: mijoz tarixi, to'lov holati, umumiy summa
    - `analyzeCatalog()`: mahsulotlar ro'yxati, umumiy soni
    - _Requirements: 3.3, 3.5, 3.7_

- [x] 3. Checkpoint — Data_Analyzer testlarini tekshirish
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. AI_Engine modulini implement qilish
  - [x] 4.1 `detectIntent(text)` funksiyasini yozish
    - Matnni `toLowerCase()` bilan normallashtirish (katta-kichik harf mustaqilligi)
    - `INTENT_KEYWORDS` bo'yicha kalit so'z qidirish
    - Mos intent qaytarish, mos kelmasa `AI_INTENTS.UNKNOWN` qaytarish
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 4.2 `detectIntent` uchun property test yozish (katta-kichik harf)
    - **Property 9: Intent aniqlash — katta-kichik harf mustaqilligi**
    - **Validates: Requirements 4.4**
    - fast-check bilan: `'daromad'`, `'DAROMAD'`, `'Daromad'` bir xil intent qaytarishini tekshirish

  - [ ]* 4.3 `detectIntent` uchun property test yozish (sinonimlar)
    - **Property 10: Sinonim intent aniqlash**
    - **Validates: Requirements 4.5**
    - fast-check bilan: har bir intent uchun barcha sinonimlar bir xil intent qaytarishini tekshirish

  - [ ]* 4.4 `detectIntent` uchun property test yozish (fallback)
    - **Property 11: Tanilmagan savol — fallback javob**
    - **Validates: Requirements 4.3**
    - fast-check bilan: hech qanday kalit so'zga mos kelmaydigan matn uchun `UNKNOWN` qaytarishini tekshirish

  - [x] 4.5 `generateResponse(intent, text)` funksiyasini yozish
    - Har bir intent uchun Data_Analyzer chaqirib o'zbek tilida javob shakllantirish
    - `UNKNOWN` intent uchun yordam xabari qaytarish
    - Barcha xatolarni `try/catch` bilan ushlab, o'zbek tilida xato xabari qaytarish
    - _Requirements: 4.2, 4.3, 8.2_

  - [ ]* 4.6 `generateResponse` uchun property test yozish (xato holati)
    - **Property 15: AI xatosi — foydalanuvchiga xabar**
    - **Validates: Requirements 8.2**
    - fast-check bilan: exception yuz berganda bo'sh string emas, o'zbek tilida xato xabari qaytarishini tekshirish

  - [x] 4.7 `callOpenAI(text, context)` funksiyasini yozish (ixtiyoriy API rejim)
    - `fetch` bilan OpenAI API ga so'rov yuborish
    - 10 soniya timeout
    - Xato (network, 4xx, 5xx) bo'lsa lokal rejimga o'tish
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ]* 4.8 `callOpenAI` uchun property test yozish (API xatosi fallback)
    - **Property 12: API xatosi — lokal rejimga o'tish**
    - **Validates: Requirements 5.3**
    - fast-check bilan: har qanday API xatosida `null` yoki exception emas, lokal javob qaytarishini tekshirish

- [x] 5. Checkpoint — AI_Engine testlarini tekshirish
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Chat_UI — HTML markup va CSS stillarini qo'shish
  - [x] 6.1 `index.html` ga chatbot HTML markup qo'shish (`</body>` oldidan)
    - `#ai-chat-btn` — floating trigger tugmasi (pastki o'ng, `position:fixed`)
    - `#ai-chat-panel` — asosiy suhbat paneli
    - `#ai-chat-header` — sarlavha + yopish + tozalash tugmalari
    - `#ai-chat-messages` — xabarlar ro'yxati (scroll)
    - `#ai-chat-quick` — quick action tugmalari (4 ta: Bugungi daromad, Qarzdorlar, Faol ijaralar, Eng ko'p ijaralangan)
    - `#ai-chat-input-row` — matn kiritish + yuborish tugmasi
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 6.1_

  - [x] 6.2 `style.css` ga chatbot CSS stillarini qo'shish
    - Floating panel: `position:fixed`, pastki o'ng burchak, `z-index:300`
    - Desktop: `width:360px`, `height:520px`, `border-radius:16px`
    - Mobil (`max-width:768px`): to'liq ekran (`width:100%`, `height:100vh`, `bottom:0`, `right:0`)
    - User xabari: o'ng tomonda (`.ai-msg-user`), AI javobi: chap tomonda (`.ai-msg-ai`)
    - Typing indicator animatsiyasi (3 nuqta)
    - Quick action tugmalari stili
    - Login bo'lmagan holda `display:none`
    - _Requirements: 1.5, 1.6, 2.3_

- [x] 7. Chat_UI — JavaScript funksiyalarini implement qilish
  - [x] 7.1 `initAiChat()`, `openAiChat()`, `closeAiChat()` funksiyalarini yozish
    - `initAiChat()`: `currentUser` tekshirish, null bo'lsa yashirish; `loadAiHistory()` chaqirish; event listener'larni bog'lash
    - `openAiChat()` / `closeAiChat()`: `AiChatState.isOpen` yangilash, panel ko'rsatish/yashirish
    - _Requirements: 1.2, 1.3, 1.4, 8.3, 8.4_

  - [ ]* 7.2 Login holati uchun property test yozish
    - **Property 16: Login bo'lmagan holda chatbot ko'rinmasligi**
    - **Validates: Requirements 8.4**
    - fast-check bilan: `currentUser === null` bo'lganda `#ai-chat-btn` `display:none` ekanligini tekshirish

  - [x] 7.3 `sendAiMessage(text)` funksiyasini yozish
    - Bo'sh/whitespace matn validatsiyasi — yubormaslik
    - User xabarini `AiChatState.messages` ga qo'shish
    - Typing indicator ko'rsatish
    - `generateResponse()` chaqirish (async)
    - AI javobini qo'shish, typing indicator yashirish
    - `saveAiHistory()` chaqirish
    - _Requirements: 2.1, 2.2, 2.4, 2.5_

  - [ ]* 7.4 Bo'sh xabar validatsiyasi uchun property test yozish
    - **Property 1: Xabar yuborish — non-empty validatsiya**
    - **Validates: Requirements 2.5**
    - fast-check bilan: faqat whitespace matn uchun `AiChatState.messages` o'zgarmasligini tekshirish

  - [x] 7.5 `renderAiMessages()` funksiyasini yozish
    - Har bir xabarni `role` ga qarab o'ng/chap tomonda render qilish
    - Typing indicator DOM elementi
    - Yangi xabar qo'shilganda avtomatik scroll pastga
    - Quick action tugmalarini xabarlar mavjudligida yashirish
    - _Requirements: 2.3, 2.7, 6.3_

  - [ ]* 7.6 Xabar ko'rsatish tomoni uchun property test yozish
    - **Property 2: Xabar ko'rsatish tomoni**
    - **Validates: Requirements 2.3**
    - fast-check bilan: `role === 'user'` xabar `.ai-msg-user` klassida, `role === 'ai'` xabar `.ai-msg-ai` klassida ekanligini tekshirish

  - [ ]* 7.7 Quick action yashirish uchun property test yozish
    - **Property 13: Quick action — xabarlar mavjudligida yashirish**
    - **Validates: Requirements 6.3**
    - fast-check bilan: non-empty `messages` ro'yxatida `#ai-chat-quick` yashirilganligini tekshirish

- [x] 8. Suhbat tarixi boshqaruvi
  - [x] 8.1 `loadAiHistory()` va `saveAiHistory()` funksiyalarini yozish
    - `DB_PREFIX + 'ai_history'` kaliti ostida LocalStorage da saqlash/yuklash
    - Maksimal 100 ta xabar chegarasi — oshganda eng eski xabarlarni o'chirish
    - _Requirements: 7.3, 7.4_

  - [ ]* 8.2 Suhbat tarixi persistence uchun property test yozish
    - **Property 3: Suhbat tarixi persistence (round-trip)**
    - **Validates: Requirements 2.6, 7.3**
    - fast-check bilan: ixtiyoriy xabar to'plami saqlangandan keyin qayta o'qilganda `id`, `role`, `text`, `ts` maydonlari saqlanishini tekshirish

  - [ ]* 8.3 Xabarlar soni chegarasi uchun property test yozish
    - **Property 4: Xabarlar soni chegarasi**
    - **Validates: Requirements 7.4**
    - fast-check bilan: 100 dan ortiq xabar qo'shilganda umumiy son hech qachon 100 dan oshmasligini tekshirish

  - [x] 8.4 `clearAiChat()` funksiyasini yozish
    - `AiChatState.messages` ni bo'shatish
    - `DB_PREFIX + 'ai_history'` ni LocalStorage dan o'chirish
    - Quick action tugmalarini qayta ko'rsatish
    - _Requirements: 7.1, 7.2_

  - [ ]* 8.5 Tozalash invarianti uchun property test yozish
    - **Property 14: Tozalash — bo'sh holat invarianti**
    - **Validates: Requirements 7.2**
    - fast-check bilan: `clearAiChat()` dan keyin `messages` bo'sh, LocalStorage tarix o'chirilgan, quick action ko'rinishini tekshirish

- [x] 9. Checkpoint — Chat_UI testlarini tekshirish
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Sozlamalar integratsiyasi (API rejim)
  - [x] 10.1 Sozlamalar sahifasiga API kalit kiritish UI qo'shish (`index.html`)
    - `#ai-settings-section` bloki: API kalitini kiritish input, yoqish/o'chirish toggle, ulanishni tekshirish tugmasi
    - _Requirements: 5.4, 5.5_

  - [x] 10.2 `loadAiSettings()` va `saveAiSettings()` funksiyalarini yozish
    - `DB_PREFIX + 'ai_settings'` kaliti ostida `{ apiEnabled, apiKey, privacyConsented }` saqlash
    - API rejim yoqilganda shaxsiy ma'lumot yuborish uchun ruxsat dialogi ko'rsatish
    - _Requirements: 5.2, 5.4_

- [x] 11. `initApp()` ga integratsiya
  - [x] 11.1 `index.html` ga `<script src="ai-chat.js"></script>` qo'shish
    - `app.js` dan keyin, `</body>` oldidan
    - _Requirements: 1.1_

  - [x] 11.2 `app.js` dagi `initApp()` funksiyasiga `initAiChat()` chaqiruvini qo'shish
    - `renderAll()` chaqiruvidan keyin `initAiChat()` qo'shish
    - `doLogout()` da chatbot elementlarini yashirish
    - _Requirements: 1.1, 8.4_

- [ ] 12. Test fayllarini yaratish
  - [ ]* 12.1 `tests/ai-chat.unit.test.js` faylini yaratish
    - Intent aniqlash: har bir intent uchun 2-3 namunaviy savol
    - Quick action tugmalari: 4 ta tugma mavjudligi
    - API rejim: ruxsat dialog ko'rsatilishi
    - Login yo'q holat: chatbot yashirilishi
    - _Requirements: 4.1, 6.1, 5.4, 8.4_

  - [ ]* 12.2 `tests/ai-chat.property.test.js` faylini yaratish (fast-check)
    - Barcha 16 ta property uchun fast-check testlarini yozish
    - Har bir test kamida 100 iteratsiya bilan
    - Tag format: `// Feature: ai-assistant-chatbot, Property N: <property_text>`
    - _Requirements: barcha requirements_

- [x] 13. Final checkpoint — Barcha testlarni tekshirish
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Vazifalar `*` bilan belgilanganlari ixtiyoriy — tezroq MVP uchun o'tkazib yuborish mumkin
- Har bir vazifa tegishli requirements ga havola qiladi
- Checkpointlar inkremental validatsiyani ta'minlaydi
- Property testlar universal to'g'rilik xususiyatlarini tekshiradi
- Unit testlar aniq misollar va edge case'larni tekshiradi
- Barcha kod Vanilla JS ES5 `'use strict'` uslubida yoziladi — hech qanday framework yo'q
- `safeReadLS` funksiyasi barcha LocalStorage o'qishlarida ishlatilishi shart

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "6.1", "6.2"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.5", "2.7", "2.9"] },
    { "id": 3, "tasks": ["2.4", "2.6", "2.8", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "4.4", "4.5"] },
    { "id": 5, "tasks": ["4.6", "4.7", "7.1", "7.3", "7.5", "8.1", "8.4"] },
    { "id": 6, "tasks": ["4.8", "7.2", "7.4", "7.6", "7.7", "8.2", "8.3", "8.5", "10.1"] },
    { "id": 7, "tasks": ["10.2", "11.1"] },
    { "id": 8, "tasks": ["11.2"] },
    { "id": 9, "tasks": ["12.1", "12.2"] }
  ]
}
```
