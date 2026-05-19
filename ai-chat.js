'use strict';

// ============================================================
// AI Yordamchi Chatbot — ai-chat.js
// Rentify ijara boshqaruv tizimi
// Vanilla JS ES5, 'use strict'
// ============================================================

// ------------------------------------------------------------
// 1. AiChatState — Chat holat boshqaruvi
// ------------------------------------------------------------
var AiChatState = {
  isOpen:     false,
  isLoading:  false,
  messages:   [],    // { id, role: 'user'|'ai', text, ts }
  apiEnabled: false,
  apiKey:     ''
};

// ------------------------------------------------------------
// DEFAULT GOOGLE GEMINI API KEY — Foydalanuvchi tomonidan so'ralmaydi
// ------------------------------------------------------------
var DEFAULT_OPENAI_API_KEY = 'AIzaSyC693EZ_oPM_CDXw5LQkcuiFohBFHwVICQ';

// ------------------------------------------------------------
// 2. AI_INTENTS — Intent turlari (enum)
// ------------------------------------------------------------
var AI_INTENTS = {
  INCOME:   'income',    // daromad, pul, tushum, foyda
  DEBTORS:  'debtors',   // qarzdor, to'lanmagan, nasiya
  ACTIVE:   'active',    // faol, aktiv, hozir, ijarada
  RETURNS:  'returns',   // qaytarish, muddat, due
  STOCK:    'stock',     // mavjud, zaxira, inventar
  PROFIT:   'profit',    // foyda, tushum, margin
  CATALOG:  'catalog',   // katalog, mahsulot, asbob, narx
  CLIENT:   'client',    // mijoz, klient, odam
  STATS:    'stats',     // statistika, hisobot, tahlil
  GREETING: 'greeting',  // salom, assalomu, xayr
  UNKNOWN:  'unknown'    // hech qanday intent mos kelmadi
};

// ------------------------------------------------------------
// 3. INTENT_KEYWORDS — Har bir intent uchun o'zbek sinonimlar
// ------------------------------------------------------------
var INTENT_KEYWORDS = {
  income:   ['daromad', 'pul', 'tushum', 'foyda', 'qancha', 'ishlad', 'topd'],
  debtors:  ['qarzdor', "to'lanmagan", 'nasiya', 'qarz', 'unpaid'],
  active:   ['faol', 'aktiv', 'hozir', 'ijarada', 'berilgan', 'chiqarilgan'],
  returns:  ['qaytar', 'muddat', 'qachon', 'due', 'kechik', 'orqaga', 'kelasi'],
  stock:    ['mavjud', 'zaxira', 'inventar', 'ombor', 'soni', 'qancha bor'],
  profit:   ['foyda', 'tushum', 'margin', 'daromad'],
  catalog:  ['katalog', 'mahsulot', 'asbob', 'narx', 'nechta', 'bor', 'mavjud'],
  client:   ['mijoz', 'klient', 'odam', 'kim', 'shaxs', 'telefon'],
  stats:    ['statistika', 'hisobot', 'tahlil', "eng ko'p", 'top', 'reyting'],
  greeting: ['salom', 'assalomu', 'xayr', 'rahmat', 'hello', 'hi']
};

// ------------------------------------------------------------
// 4. safeReadLS — Xavfsiz LocalStorage o'qish (Requirement 8.1)
// ------------------------------------------------------------
/**
 * LocalStorage dan xavfsiz o'qish.
 * @param {string} key      - LocalStorage kaliti
 * @param {*}      fallback - Xato yoki null bo'lsa qaytariladigan qiymat
 * @returns {*} JSON.parse qilingan qiymat yoki fallback
 */
function safeReadLS(key, fallback) {
  try {
    var raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return fallback;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.warn('[AI Chat] LocalStorage xato:', key, e);
    return fallback;
  }
}

// ------------------------------------------------------------
// 5. analyzeDebtors — Qarzdorlarni tahlil qilish (Requirement 3.2)
// ------------------------------------------------------------
/**
 * payment === 'unpaid' bo'lgan ijaralarni filtrlaydi va
 * mijoz ismlari hamda qarzdorlik miqdorlarini qaytaradi.
 * @returns {Array} Qarzdorlar ro'yxati: [{ name, phone, amount, status }]
 */
function analyzeDebtors() {
  var rentals = safeReadLS(window.DB_PREFIX + 'rentals', []);
  var debtors = [];
  rentals.forEach(function(r) {
    if (r.payment === 'unpaid' && (r.status === 'active' || r.status === 'partial')) {
      debtors.push({
        name: r.clientName || r.name || 'Noma\'lum',
        phone: r.phone || '',
        amount: Number(r.totalPrice || 0),
        status: r.status
      });
    }
  });
  return debtors;
}

// ------------------------------------------------------------
// 6. analyzeActiveRentals — Faol ijaralarni tahlil qilish (Requirement 3.4)
// ------------------------------------------------------------
/**
 * Faol (active yoki partial) ijaralarni filtrlaydi va ro'yxatini qaytaradi.
 * @returns {{ count: number, list: Array }} Faol ijaralar soni va ro'yxati
 */
function analyzeActiveRentals() {
  var rentals = safeReadLS(window.DB_PREFIX + 'rentals', []);
  var active = rentals.filter(function(r) {
    return r.status === 'active' || r.status === 'partial';
  });
  return {
    count: active.length,
    list: active.map(function(r) {
      return {
        name: r.clientName || r.name || 'Noma\'lum',
        phone: r.phone || '',
        startDate: r.startDate || '',
        status: r.status,
        payment: r.payment
      };
    })
  };
}

/* ===== DATA ANALYZER ===== */

/**
 * Berilgan davr uchun umumiy daromadni hisoblaydi.
 * @param {string} period - 'today' | 'week' | 'month'
 * @returns {number} Umumiy daromad (totalPrice yig'indisi)
 * Requirements: 3.1, 3.6
 */
function analyzeIncome(period) {
  var rentals = safeReadLS(window.DB_PREFIX + 'rentals', []);
  var now = new Date();
  var total = 0;
  rentals.forEach(function(r) {
    var date = new Date(r.startDate || r.createdAt || 0);
    var include = false;
    if (period === 'today') {
      include = date.toDateString() === now.toDateString();
    } else if (period === 'week') {
      var weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
      include = date >= weekAgo;
    } else if (period === 'month') {
      include = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    } else {
      include = true;
    }
    if (include) total += Number(r.totalPrice || 0);
  });
  return total;
}

// ------------------------------------------------------------
// analyzeTopItems — Eng ko'p ijaralangan mahsulotni topish (Requirement 3.3)
// ------------------------------------------------------------
/**
 * Barcha ijaralar tarixini tahlil qilib eng ko'p ijaralangan mahsulotni topadi.
 * @returns {{ name: string|null, count: number }}
 */
function analyzeTopItems() {
  var rentals = safeReadLS(window.DB_PREFIX + 'rentals', []);
  var items   = safeReadLS(window.DB_PREFIX + 'items',   []);
  var tools   = safeReadLS(window.DB_PREFIX + 'tools',   []);
  var counts  = {};

  rentals.forEach(function(r) {
    if (!r.items) return;
    r.items.forEach(function(ri) {
      var id = ri.itemId !== undefined
        ? ('item_' + ri.itemId)
        : ('tool_' + ri.toolId);
      counts[id] = (counts[id] || 0) + (ri.qty || 1);
    });
  });

  var top = null;
  var topCount = 0;
  Object.keys(counts).forEach(function(k) {
    if (counts[k] > topCount) {
      topCount = counts[k];
      top = k;
    }
  });

  if (!top) return { name: null, count: 0 };

  var name = top;
  if (top.indexOf('item_') === 0) {
    var id = parseInt(top.replace('item_', ''), 10);
    var found = items.find(function(i) { return i.id === id; });
    if (found) name = found.name || found.plateNumber || top;
  } else {
    var tid    = parseInt(top.replace('tool_', ''), 10);
    var tfound = tools.find(function(t) { return t.id === tid; });
    if (tfound) name = tfound.name || top;
  }

  return { name: name, count: topCount };
}

// ------------------------------------------------------------
// analyzeClient — Mijoz tarixi va to'lov holati (Requirement 3.5)
// ------------------------------------------------------------
/**
 * Berilgan mijoz nomi bo'yicha ijara tarixini, to'lov holatini
 * va umumiy summani qaytaradi.
 * @param {string} clientName - Mijoz ismi (qisman mos kelishi mumkin)
 * @returns {{ count: number, total: number, list: Array }}
 */
function analyzeClient(clientName) {
  var rentals = safeReadLS(window.DB_PREFIX + 'rentals', []);
  var lower   = (clientName || '').toLowerCase();

  var matched = rentals.filter(function(r) {
    var nameMatch = (r.clientName || r.name || '').toLowerCase().indexOf(lower) !== -1;
    var phoneMatch = (r.phone || '').toLowerCase().indexOf(lower) !== -1;
    return nameMatch || phoneMatch;
  });

  var total = 0;
  matched.forEach(function(r) { total += Number(r.totalPrice || 0); });

  return {
    count: matched.length,
    total: total,
    list: matched.map(function(r) {
      return {
        name:    r.clientName || r.name,
        status:  r.status,
        payment: r.payment,
        amount:  r.totalPrice
      };
    })
  };
}

// ------------------------------------------------------------
// analyzeCatalog — Mahsulotlar ro'yxati va umumiy soni (Requirement 3.7)
// ------------------------------------------------------------
/**
 * items va tools ro'yxatini birlashtiradi va umumiy sonini qaytaradi.
 * @returns {{ total: number, items: Array }}
 */
function analyzeCatalog() {
  var items = safeReadLS(window.DB_PREFIX + 'items', []);
  var tools = safeReadLS(window.DB_PREFIX + 'tools', []);
  var all   = items.concat(tools);

  return {
    total: all.length,
    items: all.map(function(i) {
      return {
        name:    i.name || i.plateNumber || 'Noma\'lum',
        qty:     i.qty     || 1,
        dayRate: i.dayRate || 0
      };
    })
  };
}

function analyzeDueReturns() {
  var rentals = safeReadLS(window.DB_PREFIX + 'rentals', []);
  var now = new Date();
  var soon = [];
  var overdue = [];
  rentals.forEach(function(r) {
    if (!r.returnDate || !r.items) return;
    var due = new Date(r.returnDate);
    var diff = (due - now) / 86400000;
    if (diff < 0 && (r.status === 'active' || r.status === 'partial')) {
      overdue.push(r);
    } else if (diff >= 0 && diff <= 7 && (r.status === 'active' || r.status === 'partial')) {
      soon.push(r);
    }
  });
  return {
    soon: soon,
    overdue: overdue,
    soonCount: soon.length,
    overdueCount: overdue.length
  };
}

function analyzeInventory() {
  var items = safeReadLS(window.DB_PREFIX + 'items', []);
  var tools = safeReadLS(window.DB_PREFIX + 'tools', []);
  var totalTypes = items.length + tools.length;
  var totalQty = 0;
  items.concat(tools).forEach(function(i) { totalQty += Number(i.qty || 0); });
  return {
    totalTypes: totalTypes,
    totalQty: totalQty
  };
}

function analyzeProfit() {
  var rentals = safeReadLS(window.DB_PREFIX + 'rentals', []);
  var revenue = 0;
  var unpaid = 0;
  rentals.forEach(function(r) {
    var amount = Number(r.totalPrice || 0);
    if (r.payment === 'paid') revenue += amount;
    else unpaid += amount;
  });
  return {
    revenue: revenue,
    unpaid: unpaid,
    total: revenue + unpaid
  };
}

/* ===== AI ENGINE ===== */

/**
 * Matn bo'yicha intent aniqlash.
 * Matnni toLowerCase() bilan normallashtiradi va INTENT_KEYWORDS
 * bo'yicha kalit so'z qidiradi.
 * @param {string} text - Foydalanuvchi matni
 * @returns {string} Mos intent yoki AI_INTENTS.UNKNOWN
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
function detectIntent(text) {
  if (!text) return AI_INTENTS.UNKNOWN;
  var lower = text.toLowerCase();
  var intents = Object.keys(INTENT_KEYWORDS);
  for (var i = 0; i < intents.length; i++) {
    var intent = intents[i];
    var keywords = INTENT_KEYWORDS[intent];
    for (var j = 0; j < keywords.length; j++) {
      if (lower.indexOf(keywords[j]) !== -1) {
        return AI_INTENTS[intent.toUpperCase()] || intent;
      }
    }
  }
  return AI_INTENTS.UNKNOWN;
}

/* ===== HISTORY MANAGEMENT ===== */

var AI_HISTORY_KEY_SUFFIX = 'ai_history';
var AI_MAX_MESSAGES = 100;

function loadAiHistory() {
  var key = window.DB_PREFIX + AI_HISTORY_KEY_SUFFIX;
  var history = safeReadLS(key, []);
  if (!Array.isArray(history)) history = [];
  AiChatState.messages = history;
  return history;
}

function saveAiHistory() {
  var key = window.DB_PREFIX + AI_HISTORY_KEY_SUFFIX;
  var msgs = AiChatState.messages;
  // Maksimal 100 ta xabar — oshganda eng eskisini o'chirish
  if (msgs.length > AI_MAX_MESSAGES) {
    msgs = msgs.slice(msgs.length - AI_MAX_MESSAGES);
    AiChatState.messages = msgs;
  }
  try {
    localStorage.setItem(key, JSON.stringify(msgs));
  } catch (e) {
    console.warn('[AI Chat] Tarix saqlashda xato:', e);
  }
}

// ------------------------------------------------------------
// clearAiChat — Suhbat tarixini tozalash (Requirements 7.1, 7.2)
// ------------------------------------------------------------
/**
 * Suhbat tarixini to'liq tozalaydi:
 * - AiChatState.messages ni bo'shatadi
 * - LocalStorage dan ai_history ni o'chiradi
 * - Xabarlar DOM ni tozalaydi
 * - Quick action tugmalarini qayta ko'rsatadi
 */
function clearAiChat() {
  AiChatState.messages = [];
  try {
    localStorage.removeItem(window.DB_PREFIX + AI_HISTORY_KEY_SUFFIX);
  } catch (e) {
    console.warn('[AI Chat] Tarix o\'chirishda xato:', e);
  }
  var messagesEl = document.getElementById('ai-chat-messages');
  if (messagesEl) messagesEl.innerHTML = '';
  var quickEl = document.getElementById('ai-chat-quick');
  if (quickEl) quickEl.style.display = 'block';
}

/* ===== GOOGLE GEMINI API (ixtiyoriy) ===== */

function callGeminiAI(text, context) {
  var settings = safeReadLS(window.DB_PREFIX + 'ai_settings', {});
  var apiKey = settings.apiKey || AiChatState.apiKey || DEFAULT_OPENAI_API_KEY;
  if (!apiKey || apiKey === 'PASTE_YOUR_OPENAI_KEY_HERE') return Promise.resolve(null);

  var systemPrompt = "Siz Rentify ijara boshqaruv tizimining AI yordamchisisiz. O'zbek tilida qisqa va aniq javob bering. Foydalanuvchi ma'lumotlari: " + JSON.stringify(context);
  var fullText = systemPrompt + "\n\nFoydalanuvchi so'rovi: " + text;

  var controller = null;
  var timeoutId = null;
  var fetchPromise;
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + encodeURIComponent(apiKey);

  try {
    if (typeof AbortController !== 'undefined') {
      controller = new AbortController();
      timeoutId = setTimeout(function() { controller.abort(); }, 10000);
      fetchPromise = fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: fullText }]
          }]
        }),
        signal: controller.signal
      });
    } else {
      fetchPromise = fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: fullText }]
          }]
        })
      });
    }
  } catch (e) {
    return Promise.resolve(null);
  }

  return fetchPromise.then(function(res) {
    if (timeoutId) clearTimeout(timeoutId);
    if (!res.ok) return null;
    return res.json().then(function(data) {
      if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
        var parts = data.candidates[0].content.parts;
        if (parts.length > 0 && parts[0].text) {
          return parts[0].text;
        }
      }
      return null;
    });
  }).catch(function(e) {
    if (timeoutId) clearTimeout(timeoutId);
    console.warn('[AI Chat] Gemini API xato:', e);
    return null;
  });
}

/* ===== CHAT UI ===== */

function initAiChat() {
  var btn = document.getElementById('ai-chat-btn');
  var panel = document.getElementById('ai-chat-panel');
  if (!btn || !panel) return;

  // Login tekshiruvi
  if (!window.currentUser) {
    btn.style.display = 'none';
    panel.style.display = 'none';
    return;
  }

  // Tugmani ko'rsat
  btn.style.display = 'flex';

  // Tarixni yukla va render qil
  loadAiHistory();
  renderAiMessages();

  // Tashqi bosishda yopish
  document.addEventListener('click', function(e) {
    if (AiChatState.isOpen) {
      var panelEl = document.getElementById('ai-chat-panel');
      var btnEl = document.getElementById('ai-chat-btn');
      if (panelEl && !panelEl.contains(e.target) && btnEl && !btnEl.contains(e.target)) {
        closeAiChat();
      }
    }
  });
}

function openAiChat() {
  AiChatState.isOpen = true;
  var panel = document.getElementById('ai-chat-panel');
  var btn = document.getElementById('ai-chat-btn');
  if (panel) panel.style.display = 'flex';
  if (btn) btn.style.display = 'none';
  // Input ga focus
  setTimeout(function() {
    var input = document.getElementById('ai-chat-input');
    if (input) input.focus();
  }, 100);
}

function closeAiChat() {
  AiChatState.isOpen = false;
  var panel = document.getElementById('ai-chat-panel');
  var btn = document.getElementById('ai-chat-btn');
  if (panel) panel.style.display = 'none';
  if (btn) btn.style.display = 'flex';
}

// ------------------------------------------------------------
// generateResponse — Intent bo'yicha o'zbek tilida javob shakllantirish
// (Requirements 4.2, 4.3, 8.2)
// ------------------------------------------------------------
/**
 * Berilgan intent va matn asosida o'zbek tilida javob qaytaradi.
 * Har bir intent uchun Data_Analyzer funksiyalarini chaqiradi.
 * UNKNOWN intent uchun yordam xabari qaytaradi.
 * Barcha xatolar try/catch bilan ushlanadi.
 * @param {string} intent - AI_INTENTS dan biri
 * @param {string} text   - Foydalanuvchi matni (CLIENT intent uchun ishlatiladi)
 * @returns {string} O'zbek tilida javob matni
 */
function generateResponse(intent, text) {
  try {
    var fmt = function(n) { return Number(n||0).toLocaleString('uz-UZ') + " so'm"; };

    if (intent === AI_INTENTS.GREETING) {
      return "Assalomu alaykum! Men Rentify AI Yordamchiman. Quyidagi savollarni bera olasiz:\n• Bugungi daromad\n• Qarzdorlar\n• Faol ijaralar\n• Katalog ma'lumotlari\n• Mijoz tarixi";
    }

    if (intent === AI_INTENTS.INCOME) {
      var today = analyzeIncome('today');
      var week  = analyzeIncome('week');
      var month = analyzeIncome('month');
      return "💰 Daromad hisoboti:\n• Bugun: " + fmt(today) + "\n• Bu hafta: " + fmt(week) + "\n• Bu oy: " + fmt(month);
    }

    if (intent === AI_INTENTS.DEBTORS) {
      var debtors = analyzeDebtors();
      if (!debtors.length) return "✅ Hozirda qarzdor mijozlar yo'q!";
      var total = 0;
      var lines = debtors.map(function(d) {
        total += d.amount;
        return "• " + d.name + (d.phone ? " (" + d.phone + ")" : "") + " — " + fmt(d.amount);
      });
      return "⚠️ Qarzdorlar (" + debtors.length + " ta):\n" + lines.join('\n') + "\n\nJami qarzdorlik: " + fmt(total);
    }

    if (intent === AI_INTENTS.ACTIVE) {
      var result = analyzeActiveRentals();
      if (!result.count) return "📋 Hozirda faol ijara yo'q.";
      var lines2 = result.list.map(function(r) {
        return "• " + r.name + (r.payment === 'unpaid' ? " ⚠️ to'lanmagan" : " ✅ to'langan");
      });
      return "📋 Faol ijaralar (" + result.count + " ta):\n" + lines2.join('\n');
    }

    if (intent === AI_INTENTS.CATALOG) {
      var cat = analyzeCatalog();
      if (!cat.total) return "📦 Katalog bo'sh. Hali mahsulot qo'shilmagan.";
      var lines3 = cat.items.slice(0, 5).map(function(i) {
        return "• " + i.name + " — " + fmt(i.dayRate) + "/kun (" + i.qty + " ta)";
      });
      var more = cat.total > 5 ? "\n... va yana " + (cat.total - 5) + " ta" : '';
      return "📦 Katalog (" + cat.total + " ta mahsulot):\n" + lines3.join('\n') + more;
    }

    if (intent === AI_INTENTS.RETURNS) {
      var due = analyzeDueReturns();
      if (!due.soonCount && !due.overdueCount) return "✅ Qaytarish uchun hozircha hech qanday ijara yo'q.";
      var parts = [];
      if (due.overdueCount) parts.push("⛔ Kechikkan ijaralar: " + due.overdueCount + " ta");
      if (due.soonCount) parts.push("⚠️ Kelasi 7 kunda qaytarilishi kerak: " + due.soonCount + " ta");
      return "📅 Qaytarishlar bo'yicha ma'lumot:\n" + parts.join("\n");
    }

    if (intent === AI_INTENTS.STOCK) {
      var inventory = analyzeInventory();
      return "📦 Inventar:\n• Mahsulot turlari: " + inventory.totalTypes + " ta\n• Umumiy miqdor: " + inventory.totalQty + " dona";
    }

    if (intent === AI_INTENTS.PROFIT) {
      var profit = analyzeProfit();
      return "💰 Tushum hisobot:\n• To'langan daromad: " + fmt(profit.revenue) + "\n• To'lanmagan summalar: " + fmt(profit.unpaid) + "\n• Jami summalar: " + fmt(profit.total);
    }

    if (intent === AI_INTENTS.STATS) {
      var top = analyzeTopItems();
      var active2 = analyzeActiveRentals();
      var income2 = analyzeIncome('month');
      var dueInfo = analyzeDueReturns();
      var debtors2 = analyzeDebtors();
      var debtTotal = 0;
      debtors2.forEach(function(d) { debtTotal += d.amount; });
      var topLine = top.name ? "🏆 Eng ko'p ijaralangan: " + top.name + " (" + top.count + " marta)" : "🏆 Hali ijara tarixi yo'q";
      return "📊 Statistika:\n" + topLine + "\n📋 Faol ijaralar: " + active2.count + " ta\n💰 Bu oylik daromad: " + fmt(income2) + "\n⚠️ Jami qarzdorlik: " + fmt(debtTotal) + "\n⏳ Qaytarilishi kerak: " + dueInfo.soonCount + " ta";
    }

    if (intent === AI_INTENTS.CLIENT) {
      var phoneMatch = text.match(/\+998\d{9}/);
      var clientName = '';
      if (phoneMatch) {
        clientName = phoneMatch[0];
      } else {
        var words = text.split(/\s+/);
        var stopWords = ['mijoz', 'klient', 'haqida', 'tarixi', 'kim', 'odam', 'shaxs', 'telefon', 'raqami', 'raqam'];
        words.forEach(function(w) {
          var lower = w.toLowerCase();
          if (stopWords.indexOf(lower) === -1 && w.length > 2) {
            clientName += (clientName ? ' ' : '') + w;
          }
        });
      }
      if (!clientName) return "Qaysi mijoz haqida ma'lumot olmoqchisiz? Ism yoki telefon raqamini kiriting.";
      var cResult = analyzeClient(clientName);
      if (!cResult.count) return "\"" + clientName + "\" nomli mijoz topilmadi.";
      var lines = cResult.list.slice(0, 3).map(function(r) {
        return "• " + r.name + " — " + (r.payment === 'unpaid' ? 'to\'lanmagan' : 'to\'langan') + " — " + r.status + " — " + fmt(r.amount);
      });
      return "👤 \"" + clientName + "\" bo'yicha " + cResult.count + " ta ijara topildi.\nJami summa: " + fmt(cResult.total) + "\n" + lines.join('\n');
    }

    // UNKNOWN
    return "Kechirasiz, bu savolni tushunmadim. Quyidagilarni so'rashingiz mumkin:\n• \"Bugungi daromad qancha?\"\n• \"Kimlar qarzdor?\"\n• \"Faol ijaralar nechta?\"\n• \"Qaytarishlar qachon?\"\n• \"Inventar holati\"\n• \"[Mijoz ismi yoki +998XXXXXXXXX] haqida\"";

  } catch (e) {
    console.warn('[AI Chat] generateResponse xato:', e);
    return "Kechirasiz, javob tayyorlashda xato yuz berdi. Qayta urinib ko'ring.";
  }
}

// ------------------------------------------------------------
// sendAiMessage — Xabar yuborish (Requirements 2.1, 2.2, 2.4, 2.5)
// ------------------------------------------------------------
/**
 * Foydalanuvchi xabarini qayta ishlaydi:
 * - Bo'sh/whitespace matnni rad etadi
 * - User xabarini AiChatState.messages ga qo'shadi
 * - Typing indicator ko'rsatadi
 * - generateResponse() chaqiradi (async yoki lokal)
 * - AI javobini qo'shadi, typing indicator yashiradi
 * - saveAiHistory() chaqiradi
 * @param {string} text - Foydalanuvchi kiritgan matn
 */
function sendAiMessage(text) {
  if (!text || !text.trim()) return;
  var trimmed = text.trim();

  // Input ni tozalash
  var inputEl = document.getElementById('ai-chat-input');
  if (inputEl) inputEl.value = '';

  // User xabarini qo'shish
  var userMsg = { id: String(Date.now()) + String(Math.random()), role: 'user', text: trimmed, ts: Date.now() };
  AiChatState.messages.push(userMsg);
  renderAiMessages();

  // Typing indicator
  AiChatState.isLoading = true;
  showAiTyping();

  // Intent aniqlash va javob
  var intent = detectIntent(trimmed);

  // API rejim yoki lokal
  var settings = safeReadLS(window.DB_PREFIX + 'ai_settings', {});
  var apiKey = settings.apiKey || AiChatState.apiKey || DEFAULT_OPENAI_API_KEY;
  var useApi = Boolean(apiKey);

  function addAiResponse(responseText) {
    AiChatState.isLoading = false;
    hideAiTyping();
    var aiMsg = { id: String(Date.now()) + String(Math.random()), role: 'ai', text: responseText, ts: Date.now() };
    AiChatState.messages.push(aiMsg);
    renderAiMessages();
    saveAiHistory();
  }

  if (useApi) {
    var context = {
      income: { today: analyzeIncome('today'), month: analyzeIncome('month') },
      activeCount: analyzeActiveRentals().count,
      debtorCount: analyzeDebtors().length
    };
    callGeminiAI(trimmed, context).then(function(apiResponse) {
      if (apiResponse) {
        addAiResponse(apiResponse);
      } else {
        // Fallback to local
        addAiResponse(generateResponse(intent, trimmed));
      }
    }).catch(function() {
      addAiResponse(generateResponse(intent, trimmed));
    });
  } else {
    // Lokal mantiq — kichik kechikish bilan (natural feel)
    setTimeout(function() {
      addAiResponse(generateResponse(intent, trimmed));
    }, 400);
  }
}

// ------------------------------------------------------------
// showAiTyping — Typing indicator ko'rsatish (Requirement 2.4)
// ------------------------------------------------------------
/**
 * AI javob tayyorlayotganini ko'rsatuvchi animatsiyali indicator qo'shadi.
 */
function showAiTyping() {
  var messagesEl = document.getElementById('ai-chat-messages');
  if (!messagesEl) return;
  var typing = document.createElement('div');
  typing.className = 'ai-typing';
  typing.id = 'ai-typing-indicator';
  typing.innerHTML = '<span></span><span></span><span></span>';
  messagesEl.appendChild(typing);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// ------------------------------------------------------------
// hideAiTyping — Typing indicator yashirish (Requirement 2.4)
// ------------------------------------------------------------
/**
 * Typing indicator ni DOM dan olib tashlaydi.
 */
function hideAiTyping() {
  var typing = document.getElementById('ai-typing-indicator');
  if (typing) typing.parentNode.removeChild(typing);
}

// ------------------------------------------------------------
// renderAiMessages — Xabarlarni DOM ga chizish (Requirements 2.3, 2.7, 6.3)
// ------------------------------------------------------------
/**
 * AiChatState.messages ro'yxatini DOM ga render qiladi.
 * - Har bir xabarni role ga qarab o'ng (user) yoki chap (ai) tomonda ko'rsatadi
 * - Quick action tugmalarini xabarlar mavjudligida yashiradi
 * - Yangi xabar qo'shilganda avtomatik scroll pastga
 * Requirements: 2.3, 2.7, 6.3
 */
function renderAiMessages() {
  var messagesEl = document.getElementById('ai-chat-messages');
  var quickEl = document.getElementById('ai-chat-quick');
  if (!messagesEl) return;

  // Quick actions: xabarlar bo'lsa yashir
  if (quickEl) {
    quickEl.style.display = AiChatState.messages.length > 0 ? 'none' : 'block';
  }

  // Xabarlarni render qilish
  var html = '';
  AiChatState.messages.forEach(function(msg) {
    var cls = msg.role === 'user' ? 'ai-msg-user' : 'ai-msg-ai';
    // Matnni xavfsiz ko'rsatish (newline → <br>)
    var safeText = String(msg.text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
    html += '<div class="' + cls + '">' + safeText + '</div>';
  });
  messagesEl.innerHTML = html;

  // Avtomatik scroll pastga
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

/* ===== AI SETTINGS ===== */

function loadAiSettings() {
  var settings = safeReadLS(window.DB_PREFIX + 'ai_settings', {});
  AiChatState.apiEnabled = true;
  AiChatState.apiKey = settings.apiKey || DEFAULT_OPENAI_API_KEY;

  var keyInput = document.getElementById('ai-api-key-input');
  var toggle = document.getElementById('ai-api-enabled-toggle');
  if (keyInput) keyInput.value = AiChatState.apiKey;
  if (toggle) toggle.checked = AiChatState.apiEnabled;
}

function saveAiSettings() {
  var apiKey = DEFAULT_OPENAI_API_KEY;
  var apiEnabled = true;
  var statusEl = document.getElementById('ai-settings-status');

  var newSettings = {
    apiEnabled: apiEnabled,
    apiKey: apiKey,
    privacyConsented: true
  };

  try {
    localStorage.setItem(window.DB_PREFIX + 'ai_settings', JSON.stringify(newSettings));
    AiChatState.apiEnabled = apiEnabled;
    AiChatState.apiKey = apiKey;
    if (statusEl) {
      statusEl.style.color = 'var(--green)';
      statusEl.textContent = '✓ Sozlamalar saqlandi';
      setTimeout(function() { if (statusEl) statusEl.textContent = ''; }, 3000);
    }
    if (typeof showToast === 'function') showToast('AI sozlamalari saqlandi', 'success');
  } catch (e) {
    if (statusEl) {
      statusEl.style.color = 'var(--red)';
      statusEl.textContent = 'Saqlashda xato yuz berdi';
    }
  }
}

function testAiApiConnection() {
  var statusEl = document.getElementById('ai-settings-status');
  var keyInput = document.getElementById('ai-api-key-input');
  var apiKey = keyInput ? keyInput.value.trim() : AiChatState.apiKey;

  if (!apiKey) {
    if (statusEl) { statusEl.style.color = 'var(--red)'; statusEl.textContent = 'API kalitini kiriting'; }
    return;
  }
  if (statusEl) { statusEl.style.color = 'var(--muted)'; statusEl.textContent = 'Tekshirilmoqda...'; }

  callGeminiAI('Salom', {}).then(function(result) {
    if (statusEl) {
      if (result !== null) {
        statusEl.style.color = 'var(--green)';
        statusEl.textContent = '✓ API ulanishi muvaffaqiyatli';
      } else {
        statusEl.style.color = 'var(--red)';
        statusEl.textContent = '✗ API ulanishda xato. Kalitni tekshiring.';
      }
    }
  });
}
