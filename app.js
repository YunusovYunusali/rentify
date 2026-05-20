// ImgBB rasm yuklash
async function uploadImageToImgBB(base64data) {
  try {
    var base64 = base64data.replace(/^data:image\/[a-z]+;base64,/, '');
    var formData = new FormData();
    formData.append('image', base64);
    var res = await fetch('https://api.imgbb.com/1/upload?key=079bd6f790fa3a7e6aa29657115e7585', {
      method: 'POST',
      body: formData
    });
    var json = await res.json();
    if (json.success) return json.data.url;
  } catch(e) { console.warn('ImgBB xato:', e); }
  return base64data; // xato bo'lsa base64 ni qaytaradi
}

'use strict';

/* ===== INDEXEDDB — RASM SAQLASH ===== */
var _idb = null; // IndexedDB instance

function openIDB(username) {
  return new Promise(function(resolve, reject) {
    if (_idb) { resolve(_idb); return; }
    var req = indexedDB.open('rentify_' + username, 1);
    req.onupgradeneeded = function(e) {
      var db = e.target.result;
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images', { keyPath: 'key' });
      }
    };
    req.onsuccess = function(e) {
      _idb = e.target.result;
      resolve(_idb);
    };
    req.onerror = function() {
      console.warn('IndexedDB ochilmadi, localStorage ishlatiladi');
      resolve(null);
    };
  });
}

function idbSaveImages(key, images) {
  // key: "ijarabot_{user}_items_{itemId}"
  return openIDB(currentUser).then(function(db) {
    if (!db) return;
    return new Promise(function(resolve) {
      var tx = db.transaction('images', 'readwrite');
      tx.objectStore('images').put({ key: key, images: images });
      tx.oncomplete = resolve;
      tx.onerror = resolve; // xato bo'lsa ham davom et
    });
  });
}

function idbLoadImages(key) {
  return openIDB(currentUser).then(function(db) {
    if (!db) return null;
    return new Promise(function(resolve) {
      var tx = db.transaction('images', 'readonly');
      var req = tx.objectStore('images').get(key);
      req.onsuccess = function() { resolve(req.result ? req.result.images : null); };
      req.onerror = function() { resolve(null); };
    });
  });
}

function idbDeleteImages(key) {
  return openIDB(currentUser).then(function(db) {
    if (!db) return;
    return new Promise(function(resolve) {
      var tx = db.transaction('images', 'readwrite');
      tx.objectStore('images').delete(key);
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    });
  });
}

// Item uchun rasm kaliti
function imgKey(itemId) {
  return DB_PREFIX + 'img_' + itemId;
}

// Barcha items ni IDB dan rasmlarini yuklash
function loadAllItemImages(itemsList) {
  if (!itemsList || !itemsList.length) return Promise.resolve(itemsList);
  var promises = itemsList.map(function(item) {
    return idbLoadImages(imgKey(item.id)).then(function(imgs) {
      if (imgs && imgs.length) {
        item.images = imgs;
        item.imageBase64 = imgs[0].base64 || null;
      } else if (item.imageBase64) {
        item.images = [{ base64: item.imageBase64, name: 'rasm' }];
      }
      return item;
    });
  });
  return Promise.all(promises);
}

/* ===== AUTH ===== */
var currentUser     = null;
var DB_PREFIX       = '';
var currentCategory = null;

function getUsers() {
  return JSON.parse(localStorage.getItem('ijarabot_users') || '{}');
}
async function saveUsers(u) {
  localStorage.setItem('ijarabot_users', JSON.stringify(u));
  try { await db.collection('rentify').doc('users').set({ list: u }); } catch(e) {}
}
async function syncUsersFromFirebase() {
  try {
    var snap = await db.collection('rentify').doc('users').get();
    if (snap.exists) {
      var data = snap.data().list || {};
      localStorage.setItem('ijarabot_users', JSON.stringify(data));
      return data;
    }
  } catch(e) {}
  return JSON.parse(localStorage.getItem('ijarabot_users') || '{}');
}

function showLogin() {
  document.getElementById('login-screen').style.display = 'block';
  document.getElementById('register-screen').style.display = 'none';
  document.getElementById('reset-screen').style.display = 'none';
  document.getElementById('app').style.display = 'none';
}
function showRegister() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('register-screen').style.display = 'block';
  document.getElementById('reset-screen').style.display = 'none';
  document.getElementById('app').style.display = 'none';
}
function showResetPassword() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('register-screen').style.display = 'none';
  document.getElementById('reset-screen').style.display = 'block';
  document.getElementById('app').style.display = 'none';
  // Reset step1 ko'rsat
  document.getElementById('reset-step1').style.display = 'block';
  document.getElementById('reset-step2').style.display = 'none';
  var errEl = document.getElementById('reset-error');
  if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }
  document.getElementById('reset-username').value = '';
}
function clearLoginError() {
  var el = document.getElementById('login-error');
  if (el) { el.style.display = 'none'; el.textContent = ''; }
}
function showLoginError(msg) {
  var el = document.getElementById('login-error');
  if (el) { el.style.display = 'block'; el.textContent = msg; }
}
function showRegError(msg) {
  var el = document.getElementById('reg-error');
  if (el) { el.style.display = 'block'; el.textContent = msg; }
}

function simpleHash(str) {
  // Oddiy hash — xavfsizlik uchun emas, faqat parolni ochiq saqlamaslik uchun
  var h = 0;
  for (var i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h.toString(36);
}

function doLogin() {
  var username = (document.getElementById('login-username').value || '').trim().toLowerCase();
  var password = document.getElementById('login-password').value || '';
  if (!username || !password) { showLoginError("Foydalanuvchi nomi va parolni kiriting"); return; }
  var users = getUsers();
  if (!users[username]) { showLoginError("Bunday foydalanuvchi topilmadi"); return; }
  if (users[username].hash !== simpleHash(password)) { showLoginError("Parol noto'g'ri"); return; }
  loginSuccess(username);
}

function doRegister() {
  var username = (document.getElementById('reg-username').value || '').trim().toLowerCase();
  var password = document.getElementById('reg-password').value || '';
  var password2 = document.getElementById('reg-password2').value || '';
  var el = document.getElementById('reg-error');
  if (el) { el.style.display = 'none'; }
  // Role: owner (ijarachi) or customer (mijoz)
  var roleEl = document.querySelector('input[name="reg-role"]:checked');
  var role = roleEl ? roleEl.value : 'owner';

  if (!username) { showRegError("Foydalanuvchi nomini kiriting"); return; }
  if (!/^[a-z0-9_]{3,20}$/.test(username)) { showRegError("Faqat lotin harflari, raqamlar va _ (3-20 belgi)"); return; }
  if (password.length < 4) { showRegError("Parol kamida 4 ta belgi bo'lishi kerak"); return; }
  if (password !== password2) { showRegError("Parollar mos kelmadi"); return; }

  var answer = (document.getElementById('reg-answer').value || '').trim().toLowerCase();
  var question = document.getElementById('reg-question').value;
  if (!answer) { showRegError("Xavfsizlik savoliga javob kiriting"); return; }

  var users = getUsers();
  if (users[username]) { showRegError("Bu nom band, boshqa nom tanlang"); return; }

  var phone = (document.getElementById('reg-phone').value || '').trim();
  if (role === 'owner' && !phone) { showRegError("Iltimos, telefon raqamingizni kiriting"); return; }

  if (role === 'customer') {
    // Mijoz sifatida ro'yxatdan o'tish: joylashuv so'ralmaydi, customer sahifasiga yo'naltiramiz
    showToast && showToast('Mijoz sifatida ro\'yxatdan o\'tildi — katalogga yo\'naltirilmoqda', 'success');
    // Open customer page in same tab
    window.location.href = 'customer.html';
    return;
  }

  // Ijarachi (owner) registratsiyasi — joylashuv talab qilinadi
  var locationAddress = (document.getElementById('reg-location-address').value || '').trim();
  var locationLat = (document.getElementById('reg-location-lat').value || '').trim();
  var locationLng = (document.getElementById('reg-location-lng').value || '').trim();
  var locationConfirmed = (document.getElementById('reg-location-confirmed').value || '0').trim();
  if (!locationAddress || !locationLat || !locationLng) {
    showRegError("Do'kon joylashuvi, shuningdek Lat va Lng majburiy.");
    return;
  }
  if (locationConfirmed !== '1') {
    showRegError("Iltimos, joylashuvni tasdiqlang (Joylashuvni tasdiqlash tugmasi).");
    return;
  }

  users[username] = {
    hash: simpleHash(password),
    question: question,
    answerHash: simpleHash(answer),
    createdAt: new Date().toISOString(),
    category: null,
    phone: phone,
    locationAddress: locationAddress,
    locationLat: locationLat,
    locationLng: locationLng,
    locationLocked: true
  };
  saveUsers(users);
  loginSuccess(username);
}

function detectRegisterLocation() {
  var status = document.getElementById('reg-location-status');
  if (!navigator.geolocation) {
    if (status) { status.textContent = "Brauzeringiz geolokatsiyani qo'llab-quvvatlamaydi."; }
    return;
  }
  if (status) { status.textContent = "Joylashuv so'ralmoqda..."; }
  // Permissions API diagnostics (helps detect 'denied' state)
  if (navigator.permissions && navigator.permissions.query) {
    try {
      navigator.permissions.query({ name: 'geolocation' }).then(function(p) {
        if (p.state === 'denied') {
          if (status) status.textContent = "Brauzer geolokatsiyaga ruxsat bermagan (Permissions: denied).";
        }
      }).catch(function(e){ /* ignore */ });
    } catch(e) { /* ignore */ }
  }
  var accEl = document.getElementById('reg-location-accuracy');
  var confirmBtn = document.getElementById('reg-confirm-btn');
  var retryBtn = document.getElementById('reg-retry-btn');
  var confirmed = document.getElementById('reg-location-confirmed'); if(confirmed) confirmed.value = '0';
  if(accEl){ accEl.style.display='none'; accEl.textContent=''; }
  if(confirmBtn) confirmBtn.style.display='none';
  if(retryBtn) retryBtn.style.display='none';
  // Use watchPosition to collect multiple samples and pick the best (smallest accuracy)
  window._reg_samples = [];
  window._regWatchId = null;
  window._regSamplingTimer = null;
  var samplingStatus = document.getElementById('reg-sampling-status'); if(samplingStatus) { samplingStatus.style.display='block'; samplingStatus.textContent='Namuna yig‘ilmoqda...'; }
  var sampleCount = 0; var maxSamples = 10; var desiredAccuracy = 20; // meters
  try {
    window._regWatchId = navigator.geolocation.watchPosition(function(position){
    sampleCount++;
    var lat = position.coords.latitude;
    var lng = position.coords.longitude;
    var accuracy = position.coords.accuracy || 0;
    window._reg_samples.push({lat:lat,lng:lng,accuracy:accuracy,t:Date.now()});
    if(samplingStatus) samplingStatus.textContent = 'Namuna: ' + sampleCount + ' — aniqlik: ~' + Math.round(accuracy) + ' m';
    // if we have a very good reading, stop early
    if(accuracy <= desiredAccuracy || sampleCount >= maxSamples){
      // pick best
      var best = window._reg_samples.reduce(function(a,b){ return (a.accuracy<=b.accuracy)?a:b; });
      applyBestRegisterSample(best);
      stopRegSampling();
    }
  }, function(error){
    if (status) { status.textContent = "Joylashuvni aniqlashda xato: " + (error.message || error.code); }
    var retry = document.getElementById('reg-retry-btn'); if(retry) retry.style.display='';
    stopRegSampling();
  }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
  } catch(e) {
    // If watchPosition isn't available or throws, fallback to getCurrentPosition
    console.warn('watchPosition failed, falling back to getCurrentPosition', e);
    navigator.geolocation.getCurrentPosition(function(position){
      var lat = position.coords.latitude;
      var lng = position.coords.longitude;
      var accuracy = position.coords.accuracy || 0;
      window._reg_samples.push({lat:lat,lng:lng,accuracy:accuracy,t:Date.now()});
      applyBestRegisterSample(window._reg_samples[0]);
    }, function(error){
      if (status) { status.textContent = "Joylashuvni aniqlashda xato: " + (error.message || error.code); }
      var retry = document.getElementById('reg-retry-btn'); if(retry) retry.style.display='';
    }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
  }
  // safety: stop after 12s
  window._regSamplingTimer = setTimeout(function(){
    if(window._reg_samples && window._reg_samples.length){
      var best = window._reg_samples.reduce(function(a,b){ return (a.accuracy<=b.accuracy)?a:b; });
      applyBestRegisterSample(best);
    } else {
      if(status) status.textContent = 'Namuna olinmadi. Iltimos qayta urinib ko‘ring.';
      var retry = document.getElementById('reg-retry-btn'); if(retry) retry.style.display='';
    }
    stopRegSampling();
  }, 12000);
}

function stopRegSampling(){
  if(window._regWatchId){ navigator.geolocation.clearWatch(window._regWatchId); window._regWatchId = null; }
  if(window._regSamplingTimer){ clearTimeout(window._regSamplingTimer); window._regSamplingTimer = null; }
  var samplingStatus = document.getElementById('reg-sampling-status'); if(samplingStatus) { samplingStatus.textContent='Yig‘ish to‘xtadi.'; }
}

function applyBestRegisterSample(sample){
  if(!sample) return;
  var lat = (sample.lat||0).toFixed(6);
  var lng = (sample.lng||0).toFixed(6);
  var accuracy = Math.round(sample.accuracy||0);
  var latEl = document.getElementById('reg-location-lat');
  var lngEl = document.getElementById('reg-location-lng');
  var status = document.getElementById('reg-location-status');
  var accEl = document.getElementById('reg-location-accuracy');
  var confirmBtn = document.getElementById('reg-confirm-btn');
  var leafletDiv = document.getElementById('reg-location-leaflet');
  if (latEl) { latEl.value = lat; }
  if (lngEl) { lngEl.value = lng; }
  if (status) { status.textContent = 'Eng yaxshi tanlov: aniqlik ~' + accuracy + ' m. Xaritada tekshiring va tasdiqlang.'; }
  if (accEl) { accEl.style.display='block'; accEl.textContent = 'Aniqlik: ~' + accuracy + ' metr'; }
  if (confirmBtn) confirmBtn.style.display = '';
  // initialize leaflet map and marker
  try{
    initRegLeafletMap(parseFloat(lat), parseFloat(lng));
  }catch(e){ console.warn('Leaflet inits error',e); }
  // also refresh iframe map for backward compatibility
  refreshRegisterLocationMap();
  reverseRegisterGeocoding(lat, lng);
}

function initRegLeafletMap(lat,lng){
  var div = document.getElementById('reg-location-leaflet');
  if(!div) return;
  div.style.display = '';
  if(!window._regLeafletMap){
    window._regLeafletMap = L.map('reg-location-leaflet').setView([lat,lng],15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors'}).addTo(window._regLeafletMap);
    window._regLeafletMarker = L.marker([lat,lng],{draggable:true}).addTo(window._regLeafletMap);
    window._regLeafletMarker.on('dragend', function(e){
      var pos = e.target.getLatLng();
      var latEl = document.getElementById('reg-location-lat'); if(latEl) latEl.value = pos.lat.toFixed(6);
      var lngEl = document.getElementById('reg-location-lng'); if(lngEl) lngEl.value = pos.lng.toFixed(6);
      var confirmed = document.getElementById('reg-location-confirmed'); if(confirmed) confirmed.value='0';
      var confirmBtn = document.getElementById('reg-confirm-btn'); if(confirmBtn) confirmBtn.style.display='';
      var status = document.getElementById('reg-location-status'); if(status) status.textContent='Marker surildi — joylashuvni qayta tasdiqlang.';
      refreshRegisterLocationMap();
    });
  } else {
    window._regLeafletMap.setView([lat,lng],15);
    if(window._regLeafletMarker) window._regLeafletMarker.setLatLng([lat,lng]);
  }
}

function confirmRegisterLocation(){
  var status = document.getElementById('reg-location-status');
  var confirmed = document.getElementById('reg-location-confirmed');
  if(confirmed) confirmed.value = '1';
  if(status) status.textContent = 'Joylashuv tasdiqlandi.';
  var btn = document.getElementById('reg-confirm-btn'); if(btn) btn.style.display='none';
}

function buildRegisterMapUrl(lat, lng) {
  if (!lat || !lng) return '';
  return 'https://maps.google.com/maps?q=' + encodeURIComponent(lat + ',' + lng) + '&z=15&output=embed';
}

function refreshRegisterLocationMap() {
  var lat = (document.getElementById('reg-location-lat').value || '').trim();
  var lng = (document.getElementById('reg-location-lng').value || '').trim();
  var status = document.getElementById('reg-location-status');
  if (!lat || !lng) {
    if (status) { status.textContent = "Iltimos, Lat va Lng ni kiriting."; }
    return;
  }
  var map = document.getElementById('reg-location-map');
  if (map) {
    map.src = buildRegisterMapUrl(lat, lng);
    map.style.display = 'block';
    if (status) { status.textContent = "Xarita yangilandi."; }
  }
  var addressEl = document.getElementById('reg-location-address');
  if (addressEl && !addressEl.value.trim()) {
    reverseRegisterGeocoding(lat, lng);
  }
}

function reverseRegisterGeocoding(lat, lng) {
  var status = document.getElementById('reg-location-status');
  var addressEl = document.getElementById('reg-location-address');
  if (status) { status.textContent = "Manzil aniqlanmoqda..."; }
  fetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=' + encodeURIComponent(lat) + '&lon=' + encodeURIComponent(lng))
    .then(function(response) {
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }
      return response.json();
    })
    .then(function(data) {
      if (!data) {
        throw new Error("Manzil ma'lumotlari topilmadi");
      }
      var address = '';
      if (data.address) {
        var addr = data.address;
        var parts = [addr.road || addr.pedestrian || addr.cycleway || addr.footway, addr.house_number, addr.suburb || addr.neighbourhood || addr.city_district, addr.city || addr.town || addr.village, addr.state, addr.country];
        address = parts.filter(function(item) { return !!item; }).join(', ');
      }
      if (!address && data.display_name) {
        address = data.display_name;
      }
      if (addressEl) {
        addressEl.value = address;
      }
      if (status) {
        status.textContent = address ? "Manzil avtomatik to'ldirildi." : "Manzil topilmadi, iltimos qo'lda kiriting.";
      }
    })
    .catch(function(error) {
      if (status) { status.textContent = "Manzilni aniqlash xatosi."; }
      console.warn('Reverse geocoding failed:', error);
    });
}

function updateUserLocationDisplay() {
  var users = getUsers();
  var userInfo = currentUser && users[currentUser] ? users[currentUser] : null;
  var locationText = '—';
  var mapUrl = '';
  if (userInfo && userInfo.locationLat && userInfo.locationLng) {
    locationText = userInfo.locationAddress ? userInfo.locationAddress + ' (' + userInfo.locationLat + ', ' + userInfo.locationLng + ')' : userInfo.locationLat + ', ' + userInfo.locationLng;
    mapUrl = buildRegisterMapUrl(userInfo.locationLat, userInfo.locationLng);
  }
  var headerEl = document.getElementById('header-location');
  if (headerEl) { headerEl.textContent = 'Joylashuv: ' + locationText; }
  var settingsLocation = document.getElementById('settings-location');
  if (settingsLocation) { settingsLocation.textContent = locationText; }
  var settingsMap = document.getElementById('settings-location-map');
  if (settingsMap) {
    if (mapUrl) {
      settingsMap.src = mapUrl;
      settingsMap.style.display = 'block';
    } else {
      settingsMap.style.display = 'none';
      settingsMap.src = '';
    }
  }
}

function loginSuccess(username) {
  currentUser = username;
  DB_PREFIX   = 'ijarabot_' + username + '_';
  _idb = null; // yangi foydalanuvchi uchun IDB ni qayta och
  localStorage.setItem('ijarabot_session', username);
  openIDB(username); // IDB ni oldindan ochib qo'y
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('register-screen').style.display = 'none';
  var el = document.getElementById('header-username');
  if (el) el.textContent = username;

  // Kategoriya tekshiruvi
  var users = getUsers();
  var userCategory = users[username] ? users[username].category : null;
  if (!userCategory) {
    // Kategoriya tanlanmagan — kategoriya tanlash ekranini ko'rsat
    document.getElementById('app').style.display = 'none';
    showCategorySelect();
  } else {
    currentCategory = userCategory;
    document.getElementById('app').style.display = 'block';
    initApp();
  }
}

function showCategorySelect() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('register-screen').style.display = 'none';
  document.getElementById('reset-screen').style.display = 'none';
  document.getElementById('app').style.display = 'none';
  var el = document.getElementById('category-select-screen');
  if (el) el.style.display = 'block';
}

function saveCategoryAndProceed(username, categoryKey) {
  var users = getUsers();
  if (users[username]) {
    users[username].category = categoryKey;
    saveUsers(users);
  }
}

function selectCategory(categoryKey) {
  var validCategories = ['tools', 'cars', 'dishes', 'clothes', 'restaurants', 'stadiums', 'gaming'];
  if (validCategories.indexOf(categoryKey) === -1) {
    console.warn('selectCategory: noto\'g\'ri kategoriya kaliti:', categoryKey);
    return;
  }
  saveCategoryAndProceed(currentUser, categoryKey);
  var el = document.getElementById('category-select-screen');
  if (el) el.style.display = 'none';
  currentCategory = categoryKey;
  document.getElementById('app').style.display = 'block';
  initApp();
}

function doLogout() {
  if (!confirm("Chiqishni xohlaysizmi?")) return;
  localStorage.removeItem('ijarabot_session');
  currentUser     = null;
  DB_PREFIX       = '';
  currentCategory = null;
  rentals = []; tools = [];
  showLogin();
  var aiBtn = document.getElementById('ai-chat-btn');
  var aiPanel = document.getElementById('ai-chat-panel');
  if (aiBtn) aiBtn.style.display = 'none';
  if (aiPanel) aiPanel.style.display = 'none';
}

var QUESTIONS = {
  'shahar': "Tug'ilgan shahringiz?",
  'maktab': "O'qigan maktabingiz raqami?",
  'onaismi': "Onangizning ismi?",
  'hayvon': "Sevimli hayvon?",
  'rang': "Sevimli rang?"
};

function checkResetUser() {
  var username = (document.getElementById('reset-username').value || '').trim().toLowerCase();
  var errEl = document.getElementById('reset-error');
  errEl.style.display = 'none';
  if (!username) { errEl.style.display='block'; errEl.textContent='Foydalanuvchi nomini kiriting'; return; }
  var users = getUsers();
  if (!users[username]) { errEl.style.display='block'; errEl.textContent='Bunday foydalanuvchi topilmadi'; return; }
  var user = users[username];
  if (!user.question || !user.answerHash) {
    errEl.style.display='block';
    errEl.textContent='Bu hisob uchun xavfsizlik savoli o\'rnatilmagan. Eski hisob bo\'lishi mumkin.';
    return;
  }
  // Savolni ko'rsat
  var qLabel = document.getElementById('reset-question-label');
  qLabel.textContent = QUESTIONS[user.question] || user.question;
  document.getElementById('reset-step1').style.display = 'none';
  document.getElementById('reset-step2').style.display = 'block';
  document.getElementById('reset-answer').value = '';
  document.getElementById('reset-newpass').value = '';
  document.getElementById('reset-newpass2').value = '';
}

function doResetPassword() {
  var username = (document.getElementById('reset-username').value || '').trim().toLowerCase();
  var answer   = (document.getElementById('reset-answer').value || '').trim().toLowerCase();
  var newpass  = document.getElementById('reset-newpass').value;
  var newpass2 = document.getElementById('reset-newpass2').value;
  var errEl    = document.getElementById('reset-error');
  errEl.style.display = 'none';

  var users = getUsers();
  var user  = users[username];
  if (!user) return;

  if (simpleHash(answer) !== user.answerHash) {
    errEl.style.display='block'; errEl.textContent='Javob noto\'g\'ri'; return;
  }
  if (newpass.length < 4) {
    errEl.style.display='block'; errEl.textContent='Parol kamida 4 ta belgi bo\'lishi kerak'; return;
  }
  if (newpass !== newpass2) {
    errEl.style.display='block'; errEl.textContent='Parollar mos kelmadi'; return;
  }

  user.hash = simpleHash(newpass);
  users[username] = user;
  saveUsers(users);
  showToast && showToast("Parol muvaffaqiyatli yangilandi!", 'success');
  showLogin();
  setTimeout(function() {
    document.getElementById('login-username').value = username;
  }, 100);
}

function checkSession() {
  var saved = localStorage.getItem('ijarabot_session');
  if (saved) {
    syncUsersFromFirebase().then(function(users) {
      if (users[saved]) { loginSuccess(saved); return; }
      showLogin();
    });
    return;
  }
  showLogin();
}

/* ===== APP INIT ===== */
function migrateExistingRentals(rentals) {
  // toolId → itemId konversiyasi (orqaga moslik)
  rentals.forEach(function(r) {
    if (r.items) {
      r.items.forEach(function(item) {
        if (item.toolId !== undefined && item.itemId === undefined) {
          item.itemId = item.toolId;
        }
      });
    }
    if (r.returns) {
      r.returns.forEach(function(ret) {
        if (ret.items) {
          ret.items.forEach(function(item) {
            if (item.toolId !== undefined && item.itemId === undefined) {
              item.itemId = item.toolId;
            }
          });
        }
      });
    }
  });
  return rentals;
}
function updateNavLabels(category) {
  var info = getCategoryInfo(category);

  var navLabel = document.getElementById('nav-catalog-label');
  if (navLabel) navLabel.textContent = info.nav;

  var bnLabel = document.getElementById('bn-catalog-label');
  if (bnLabel) bnLabel.textContent = info.nav;

  var pageTitle = document.querySelector('#page-asboblar .page-title');
  if (pageTitle) pageTitle.textContent = info.title;

  var pageSub = document.getElementById('catalog-page-sub');
  if (pageSub) pageSub.textContent = info.sub;

  var addBtn = document.getElementById('catalog-add-btn');
  if (addBtn) {
    addBtn.textContent = info.addLabel;
    addBtn.setAttribute('onclick', info.addFn);
  }

  // Qidiruv placeholder
  var searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.placeholder = info.searchPh;

  // Jadval ustunlari
  var thDash = document.getElementById('th-dashboard-items');
  if (thDash) thDash.textContent = info.itemCol;

  var thAll = document.getElementById('th-all-items');
  if (thAll) thAll.textContent = info.itemCol;
}

function getCategoryInfo(categoryKey) {
  var info = {
    tools: {
      nav: 'Asboblar',
      title: 'Asboblar katalogi',
      sub: 'Ijaraga beriladigan asboblar ro\'yxati',
      icon: '⚙️',
      addLabel: '+ Asbob qo\'shish',
      addFn: 'openToolModal()',
      itemCol: 'Asboblar',
      searchPh: 'Mijoz yoki asbob nomi...',
      emptyText: 'Asbob qo\'shilmagan',
      modalTitle: 'Asbob qo\'shish',
      namePlaceholder: 'Asbob nomi',
      typeLabel: 'Turi',
      check: { col: 'Asbob', icon: '⚙️', title: 'Qurilish Asboblari' }
    },
    cars: {
      nav: 'Avtomobillar',
      title: 'Avtomobillar katalogi',
      sub: 'Ijaraga beriladigan avtomobillar ro\'yxati',
      icon: '🚗',
      addLabel: '+ Avtomobil qo\'shish',
      addFn: 'openCarModal()',
      itemCol: 'Avtomobil',
      searchPh: 'Mijoz yoki avtomobil nomi...',
      emptyText: 'Avtomobil qo\'shilmagan',
      modalTitle: 'Avtomobil qo\'shish',
      namePlaceholder: 'Avtomobil nomi',
      typeLabel: 'Turi',
      check: { col: 'Avtomobil', icon: '🚗', title: 'Avtomobil Ijarasi' }
    },
    dishes: {
      nav: 'Idish-tovoqlar',
      title: 'Idish-tovoqlar katalogi',
      sub: 'Ijaraga beriladigan idish-tovoqlar ro\'yxati',
      icon: '🍽️',
      addLabel: '+ Idish qo\'shish',
      addFn: 'openDishModal()',
      itemCol: 'Idish-tovoq',
      searchPh: 'Mijoz yoki idish nomi...',
      emptyText: 'Idish-tovoq qo\'shilmagan',
      modalTitle: 'Idish qo\'shish',
      namePlaceholder: 'Idish nomi',
      typeLabel: 'Turi',
      check: { col: 'Idish', icon: '🍽️', title: 'Idish-Tovoqlar' }
    },
    clothes: {
      nav: 'Kiyimlar',
      title: 'Kiyimlar katalogi',
      sub: 'Ijaraga beriladigan kiyimlar ro\'yxati',
      icon: '👔',
      addLabel: '+ Kiyim qo\'shish',
      addFn: 'openClothesModal()',
      itemCol: 'Kiyim',
      searchPh: 'Mijoz yoki kiyim nomi...',
      emptyText: 'Kiyim qo\'shilmagan',
      modalTitle: 'Kiyim qo\'shish',
      namePlaceholder: 'Kiyim nomi',
      typeLabel: 'Turi',
      check: { col: 'Kiyim', icon: '🤵', title: 'Kiyim Ijarasi' }
    },
    restaurants: {
      nav: 'To\'yxonalar',
      title: 'Restoran / To\'yhona katalogi',
      sub: 'Ijaraga beriladigan restoran va to\'yxonalar ro\'yxati',
      icon: '🍽️',
      addLabel: '+ To\'yxona qo\'shish',
      addFn: 'openDishModal()',
      itemCol: 'To\'yxona',
      searchPh: 'Mijoz yoki to\'yxona nomi...',
      emptyText: 'To\'yxona qo\'shilmagan',
      modalTitle: 'To\'yxona qo\'shish',
      namePlaceholder: 'To\'yxona nomi',
      typeLabel: 'Turi',
      typeOptions: ['Restoran', 'To\'yxona', 'Banket zali', 'Boshqa'],
      check: { col: 'To\'yxona', icon: '🍽️', title: 'Restoran / To\'yhona Ijarasi' }
    },
    stadiums: {
      nav: 'Stadionlar',
      title: 'Stadion / Maydon katalogi',
      sub: 'Ijaraga beriladigan stadionlar va maydonlar ro\'yxati',
      icon: '🏟️',
      addLabel: '+ Stadion qo\'shish',
      addFn: 'openDishModal()',
      itemCol: 'Stadion',
      searchPh: 'Mijoz yoki stadion nomi...',
      emptyText: 'Stadion yoki maydon qo\'shilmagan',
      modalTitle: 'Stadion qo\'shish',
      namePlaceholder: 'Maydon nomi',
      typeLabel: 'Turi',
      typeOptions: ['Stadion', 'Maydon', 'Sport majmuasi', 'Boshqa'],
      check: { col: 'Maydon', icon: '🏟️', title: 'Stadion / Maydon Ijarasi' }
    },
    gaming: {
      nav: 'Gaming',
      title: 'Gaming uskunalari katalogi',
      sub: 'Ijaraga beriladigan PlayStation va kompyuterlar',
      icon: '🎮',
      addLabel: '+ Uskuna qo\'shish',
      addFn: 'openDishModal()',
      itemCol: 'Uskuna',
      searchPh: 'Mijoz yoki uskuna nomi...',
      emptyText: 'Uskuna qo\'shilmagan',
      modalTitle: 'Uskuna qo\'shish',
      namePlaceholder: 'Uskuna nomi',
      typeLabel: 'Turi',
      typeOptions: ['PlayStation', 'Kompyuter', 'Monitor', 'Aksessuar', 'Boshqa'],
      check: { col: 'Uskuna', icon: '🎮', title: 'PlayStation / Kompyuter Ijarasi' }
    }
  };
  return info[categoryKey] || info.tools;
}

function initApp() {
  // Firebase dan yuklash
  db.collection('shops').doc(currentUser).collection('data').doc('rentals').get()
    .then(function(snap) {
      rentals = (snap.exists && snap.data().list) ? snap.data().list : JSON.parse(localStorage.getItem(DB_PREFIX + 'rentals') || '[]');
      rentals = migrateExistingRentals(rentals);
      localStorage.setItem(DB_PREFIX + 'rentals', JSON.stringify(rentals));
    }).catch(function() {
      rentals = JSON.parse(localStorage.getItem(DB_PREFIX + 'rentals') || '[]');
      rentals = migrateExistingRentals(rentals);
    });

  db.collection('shops').doc(currentUser).collection('data').doc('tools').get()
    .then(function(snap) {
      if (snap.exists && snap.data().list) {
        tools = snap.data().list;
        localStorage.setItem(DB_PREFIX + 'tools', JSON.stringify(tools));
      }
    }).catch(function(){});

  db.collection('shops').doc(currentUser).collection('data').doc('items').get()
    .then(function(snap) {
      if (snap.exists && snap.data().list) {
        items = snap.data().list;
        localStorage.setItem(DB_PREFIX + 'items', JSON.stringify(items));
      }
    }).catch(function(){});

  workers = JSON.parse(localStorage.getItem(DB_PREFIX + 'workers') || '[]');
  if (workers.length === 0) {
    workers = ['Xodim 1','Xodim 2','Xodim 3','Xodim 4','Xodim 5'];
    saveWorkersData();
  }
  // Har doim items ni ham yukla
  var rawItems = JSON.parse(localStorage.getItem(DB_PREFIX + 'items') || '[]');
  if (currentCategory === 'tools') {
    tools = JSON.parse(localStorage.getItem(DB_PREFIX + 'tools') || '[]');
  }
  updateNavLabels(currentCategory);

  // Rasmlarni IDB dan yuklab, keyin render qilish
  loadAllItemImages(rawItems).then(function(loadedItems) {
    items = loadedItems;
    renderAll();
    if (typeof initAiChat === 'function') { initAiChat(); }
    if (typeof loadAiSettings === 'function') { loadAiSettings(); }
    if (typeof updateUserLocationDisplay === 'function') { updateUserLocationDisplay(); }
    if (typeof showDailyReportIfNeeded === 'function') { showDailyReportIfNeeded(); }
  });
}

function getTodayDateKey() {
  var d = new Date();
  var month = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + month + '-' + day;
}

function getDailyReportStorageKey() {
  return DB_PREFIX + 'daily_report_date';
}

function shouldShowDailyReport() {
  if (!DB_PREFIX) return false;
  var stored = localStorage.getItem(getDailyReportStorageKey());
  return stored !== getTodayDateKey();
}

function markDailyReportShown() {
  try {
    localStorage.setItem(getDailyReportStorageKey(), getTodayDateKey());
  } catch (e) {
    console.warn('Daily report saqlashda xato:', e);
  }
}

function showDailyReportIfNeeded() {
  if (!currentUser || !DB_PREFIX) return;
  if (!shouldShowDailyReport()) return;
  var todayIncome = analyzeIncome('today');
  var activeCount = analyzeActiveRentals().count;
  var debtorsCount = analyzeDebtors().length;
  var msg = '📊 Bugungi avtomatik hisobot: Daromad ' + fmt(todayIncome) + ', faol ijaralar ' + activeCount + ', qarzdorlar ' + debtorsCount + '.';
  showToast && showToast(msg, 'success');
  markDailyReportShown();
}

var rentals    = [];
var tools      = [];
var items      = [];
var workers    = [];
var editId     = null;
var editToolId = null;
var editItemId = null;
var returnId   = null;

function saveTools() {
  try {
    localStorage.setItem(DB_PREFIX + 'tools', JSON.stringify(tools));
    db.collection('shops').doc(currentUser).collection('data').doc('tools')
      .set({ list: tools }).catch(function(e){ console.warn('FB tools:', e); });
  } catch(e) { showToast && showToast("Xotira to'lib qoldi...", 'error'); }
}
async function saveItems() {
  try {
    var imgPromises = items.map(function(item) {
      var imgs = item.images && item.images.length ? item.images : [];
      return idbSaveImages(imgKey(item.id), imgs);
    });

    // Rasmlarni ImgBB ga yuklash
    var itemsWithUrls = await Promise.all(items.map(async function(item) {
      var copy = Object.assign({}, item);
      if (copy.images && copy.images.length) {
        var urls = await Promise.all(copy.images.map(async function(img) {
          if (img && img.startsWith('http')) return img; // allaqachon URL
          return await uploadImageToImgBB(img);
        }));
        copy.images = urls;
        copy.imageBase64 = urls[0] || null;
      }
      return copy;
    }));

    localStorage.setItem(DB_PREFIX + 'items', JSON.stringify(itemsWithUrls));
    db.collection('shops').doc(currentUser).collection('data').doc('items')
      .set({ list: itemsWithUrls }).catch(function(e){ console.warn('FB items:', e); });

    Promise.all(imgPromises).catch(function(e) {
      console.warn('IDB saqlashda xato:', e);
    });
  } catch(e) {
    showToast && showToast("Xotira to'lib qoldi, eski ma'lumotlarni o'chiring", 'error');
  }
}
function saveRentals() {
  try {
    localStorage.setItem(DB_PREFIX + 'rentals', JSON.stringify(rentals));
    db.collection('shops').doc(currentUser).collection('data').doc('rentals')
      .set({ list: rentals }).catch(function(e){ console.warn('FB rentals:', e); });
  } catch(e) { showToast && showToast("Xotira to'lib qoldi...", 'error'); }
}
function saveWorkersData() { try { localStorage.setItem(DB_PREFIX + 'workers', JSON.stringify(workers)); } catch(e) {} }
function fmt(n)        { return Number(n||0).toLocaleString('uz-UZ') + " so'm"; }
function escHtml(s)    { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }

function formatPhone(inp) {
  var v = inp.value.replace(/\D/g,'');
  if (v.startsWith('998')) v = '+' + v;
  else if (v.length > 0)   v = '+998' + v;
  inp.value = v.slice(0,13);
}
function isValidPhone(p) { return /^\+998\d{9}$/.test(p.replace(/\s/g,'')); }

// Local vaqtni datetime-local formatida qaytaradi (UTC emas)
function localDateTimeStr(date) {
  var d = date || new Date();
  var pad = function(n) { return String(n).padStart(2,'0'); };
  return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes());
}

function calcHours(startStr, endStr) {
  var s = new Date(startStr);
  var e = new Date(endStr);
  var ms = e - s;
  if (ms <= 0) return 0;
  return ms / 3600000; // aniq soat (float)
}

function fmtDuration(hours) {
  if (hours <= 0) return '0 soat';
  var h = Math.floor(hours);
  var m = Math.round((hours - h) * 60);
  if (m === 0) return h + ' soat';
  if (h === 0) return m + ' daqiqa';
  return h + ' soat ' + m + ' daqiqa';
}

function calcRentalPrice(itemsList, hours) {
  var total = 0;
  itemsList.forEach(function(item) {
    var dayRate = 0;
    if (item.toolId !== undefined) {
      var tool = tools.find(function(t) { return t.id === item.toolId; });
      if (tool) dayRate = tool.dayRate || 0;
    } else if (item.itemId !== undefined) {
      var catItem = window.items ? window.items.find(function(c) { return c.id === item.itemId; }) : null;
      if (catItem) dayRate = catItem.dayRate || 0;
    }
    var hourRate = dayRate / 24;
    total += hourRate * (item.qty || 1) * (hours || 0);
  });
  return Math.round(total);
}

function renderPriceRows(containerId, totalId, items, hours) {
  var rows = ''; var total = 0;
  var globalItems = window.items; // global cars/items array (avoid shadowing by parameter name)
  items.forEach(function(item) {
    var name = '';
    var dayRate = 0;
    if (item.toolId !== undefined) {
      var tool = tools.find(function(t) { return t.id === item.toolId; });
      if (!tool) return;
      name = tool.name;
      dayRate = tool.dayRate || 0;
    } else if (item.itemId !== undefined) {
      var catItem = (globalItems || []).find(function(c) { return c.id === item.itemId; });
      if (!catItem) return;
      name = catItem.plateNumber
        ? (escHtml(catItem.plateNumber) + (catItem.brand ? ' ' + escHtml(catItem.brand) : ''))
        : escHtml(catItem.name || '');
      dayRate = catItem.dayRate || 0;
    } else {
      return;
    }
    var hourRate = dayRate / 24;
    var sub = Math.round(hourRate * item.qty * (hours || 0));
    total += sub;
    rows += '<div class="price-table-row">'
      + '<span class="price-table-label">'+escHtml(name)+' &times; '+item.qty+' dona &times; '+fmtDuration(hours||0)+'</span>'
      + '<span style="font-weight:600">'+fmt(sub)+'</span></div>';
  });
  document.getElementById(containerId).innerHTML = rows;
  document.getElementById(totalId).textContent = fmt(total);
  return total;
}

/* ===== TOOL PICKER ===== */
function buildToolPicker(selectedItems) {
  var html = '<div class="tool-picker-head">Asbob nomi — Kunlik narx</div>';
  // tools bo'sh bo'lsa localStorage dan qayta yukla
  if (!tools || tools.length === 0) {
    tools = JSON.parse(localStorage.getItem(DB_PREFIX + 'tools') || '[]');
  }
  if (!tools || tools.length === 0) {
    html += '<div style="padding:14px;color:var(--muted);font-size:13px">Hali asbob qo\'shilmagan. Avval Asboblar bo\'limiga o\'ting.</div>';
    document.getElementById('tool-picker').innerHTML = html;
    return;
  }
  tools.forEach(function(t) {
    var sel = null;
    if (selectedItems) {
      sel = selectedItems.find(function(i) {
        return String(i.toolId) === String(t.id) || String(i.itemId) === String(t.id) || String(i.id) === String(t.id);
      });
    }
    var checked = sel ? 'checked' : '';
    var qtyVal  = sel ? sel.qty : 1;
    var inUse   = getToolInUseQty(t.id, null);
    var avail   = t.qty - inUse + (sel ? sel.qty : 0);
    var soldOut = avail <= 0 && !sel;

    if (soldOut) {
      // Tugagan asbob — disabled ko'rinishda, tanlash mumkin emas
      html += '<div class="tool-picker-item" style="opacity:0.45">'
        + '<input type="checkbox" id="chk-'+t.id+'" disabled>'
        + '<label class="tool-picker-name" style="cursor:not-allowed">'+escHtml(t.name)
        +   ' <span style="font-size:11px;color:var(--red);font-weight:600">Tugagan</span></label>'
        + '<span class="tool-picker-rate">'+fmt(t.dayRate)+'/kun</span>'
        + '<input type="number" class="tool-picker-qty" value="0" disabled style="opacity:0.3">'
        + '</div>';
    } else {
      html += '<div class="tool-picker-item">'
        + '<input type="checkbox" id="chk-'+t.id+'" value="'+t.id+'" '+checked+' onchange="onPickerChange()">'
        + '<label for="chk-'+t.id+'" class="tool-picker-name" style="cursor:pointer">'+escHtml(t.name)
        +   ' <span style="font-size:11px;color:var(--muted)">('+avail+' ta mavjud)</span></label>'
        + '<span class="tool-picker-rate">'+fmt(t.dayRate)+'/kun</span>'
        + '<input type="number" class="tool-picker-qty" id="qty-'+t.id+'" value="'+qtyVal+'" min="1" max="'+avail+'" oninput="onPickerChange()" '+(checked?'':'disabled style="opacity:0.3"')+'>'
        + '</div>';
    }
  });
  document.getElementById('tool-picker').innerHTML = html;
}

/* ===== CAR PICKER ===== */
function buildCarPicker(selectedItems) {
  var html = '<div class="tool-picker-head">Avtomobil — Kunlik narx</div>';
  if (!items || items.length === 0) {
    items = JSON.parse(localStorage.getItem(DB_PREFIX + 'items') || '[]');
  }
  if (!items || items.length === 0) {
    html += '<div style="padding:14px;color:var(--muted);font-size:13px">Hali avtomobil qo\'shilmagan. Avval Avtomobillar bo\'limiga o\'ting.</div>';
    document.getElementById('tool-picker').innerHTML = html;
    return;
  }
  items.forEach(function(car) {
    var sel     = selectedItems ? selectedItems.find(function(i) { return i.itemId === car.id; }) : null;
    var checked = sel ? 'checked' : '';
    var inUse   = getItemInUseQty(car.id) > 0;
    var imgHtml = (car.images && car.images.length)
      ? '<img src="'+car.images[0].base64+'" alt="'+escHtml(car.plateNumber)+'" style="width:40px;height:40px;object-fit:cover;border-radius:4px;margin-right:8px;vertical-align:middle">'
      : car.imageBase64
        ? '<img src="'+car.imageBase64+'" alt="'+escHtml(car.plateNumber)+'" style="width:40px;height:40px;object-fit:cover;border-radius:4px;margin-right:8px;vertical-align:middle">'
        : '<span style="font-size:24px;margin-right:8px;vertical-align:middle">🚗</span>';
    var label = escHtml(car.plateNumber || '') + (car.brand ? ' ' + escHtml(car.brand) : '');

    if (inUse && !sel) {
      html += '<div class="tool-picker-item" style="opacity:0.5">'
        + '<input type="checkbox" id="chk-car-'+car.id+'" disabled>'
        + imgHtml
        + '<label class="tool-picker-name" style="cursor:not-allowed">'+label
        +   ' <span style="font-size:11px;color:var(--red);font-weight:600">Ijarada</span></label>'
        + '<span class="tool-picker-rate">'+fmt(car.dayRate||0)+'/kun</span>'
        + '</div>';
    } else {
      html += '<div class="tool-picker-item">'
        + '<input type="checkbox" id="chk-car-'+car.id+'" value="'+car.id+'" '+checked+' onchange="onPickerChange()">'
        + imgHtml
        + '<label for="chk-car-'+car.id+'" class="tool-picker-name" style="cursor:pointer">'+label+'</label>'
        + '<span class="tool-picker-rate">'+fmt(car.dayRate||0)+'/kun</span>'
        + '</div>';
    }
  });
  document.getElementById('tool-picker').innerHTML = html;
  onPickerChange();
}

/* ===== DISH PICKER ===== */
function buildDishPicker(selectedItems) {
  var html = '<div class="tool-picker-head">Idish nomi — Kunlik narx</div>';
  if (!items || items.length === 0) {
    items = JSON.parse(localStorage.getItem(DB_PREFIX + 'items') || '[]');
  }
  if (!items || items.length === 0) {
    html += '<div style="padding:14px;color:var(--muted);font-size:13px">Hali idish qo\'shilmagan. Avval Idish-tovoqlar bo\'limiga o\'ting.</div>';
    document.getElementById('tool-picker').innerHTML = html;
    return;
  }
  items.forEach(function(dish) {
    var sel     = selectedItems ? selectedItems.find(function(i) { return i.itemId === dish.id; }) : null;
    var checked = sel ? 'checked' : '';
    var qtyVal  = sel ? sel.qty : 1;
    var inUse   = getItemInUseQty(dish.id);
    var avail   = dish.qty - inUse + (sel ? sel.qty : 0);
    var soldOut = avail <= 0 && !sel;
    var label   = escHtml(dish.name) + (dish.type ? ' <span style="font-size:11px;color:var(--muted)">(' + escHtml(dish.type) + ')</span>' : '');
    if (soldOut) {
      html += '<div class="tool-picker-item" style="opacity:0.45">'
        + '<input type="checkbox" id="chk-dish-'+dish.id+'" disabled>'
        + '<label class="tool-picker-name" style="cursor:not-allowed">'+label
        + ' <span style="font-size:11px;color:var(--red);font-weight:600">Tugagan</span></label>'
        + '<span class="tool-picker-rate">'+fmt(dish.dayRate||0)+'/kun</span>'
        + '<input type="number" class="tool-picker-qty" value="0" disabled style="opacity:0.3">'
        + '</div>';
    } else {
      html += '<div class="tool-picker-item">'
        + '<input type="checkbox" id="chk-dish-'+dish.id+'" value="'+dish.id+'" '+checked+' onchange="onPickerChange()">'
        + '<label for="chk-dish-'+dish.id+'" class="tool-picker-name" style="cursor:pointer">'+label
        + ' <span style="font-size:11px;color:var(--muted)">('+avail+' ta mavjud)</span></label>'
        + '<span class="tool-picker-rate">'+fmt(dish.dayRate||0)+'/kun</span>'
        + '<input type="number" class="tool-picker-qty" id="qty-dish-'+dish.id+'" value="'+qtyVal+'" min="1" max="'+avail+'" oninput="onPickerChange()" '+(checked?'':'disabled style="opacity:0.3"')+'>'
        + '</div>';
    }
  });
  document.getElementById('tool-picker').innerHTML = html;
  onPickerChange();
}

/* ===== CLOTHES PICKER ===== */
function buildClothesPicker(selectedItems) {
  var html = '<div class="tool-picker-head">Kiyim nomi — Kunlik narx</div>';
  if (!items || items.length === 0) {
    items = JSON.parse(localStorage.getItem(DB_PREFIX + 'items') || '[]');
  }
  if (!items || items.length === 0) {
    html += '<div style="padding:14px;color:var(--muted);font-size:13px">Hali kiyim qo\'shilmagan. Avval Kiyimlar bo\'limiga o\'ting.</div>';
    document.getElementById('tool-picker').innerHTML = html;
    return;
  }
  items.forEach(function(cloth) {
    var sel     = selectedItems ? selectedItems.find(function(i) { return i.itemId === cloth.id; }) : null;
    var checked = sel ? 'checked' : '';
    var qtyVal  = sel ? sel.qty : 1;
    var inUse   = getItemInUseQty(cloth.id);
    var avail   = cloth.qty - inUse + (sel ? sel.qty : 0);
    var soldOut = avail <= 0 && !sel;
    var meta    = [cloth.size, cloth.type].filter(Boolean).map(escHtml).join(' / ');
    var label   = escHtml(cloth.name) + (meta ? ' <span style="font-size:11px;color:var(--muted)">(' + meta + ')</span>' : '');
    if (soldOut) {
      html += '<div class="tool-picker-item" style="opacity:0.45">'
        + '<input type="checkbox" id="chk-cloth-'+cloth.id+'" disabled>'
        + '<label class="tool-picker-name" style="cursor:not-allowed">'+label
        + ' <span style="font-size:11px;color:var(--red);font-weight:600">Tugagan</span></label>'
        + '<span class="tool-picker-rate">'+fmt(cloth.dayRate||0)+'/kun</span>'
        + '<input type="number" class="tool-picker-qty" value="0" disabled style="opacity:0.3">'
        + '</div>';
    } else {
      html += '<div class="tool-picker-item">'
        + '<input type="checkbox" id="chk-cloth-'+cloth.id+'" value="'+cloth.id+'" '+checked+' onchange="onPickerChange()">'
        + '<label for="chk-cloth-'+cloth.id+'" class="tool-picker-name" style="cursor:pointer">'+label
        + ' <span style="font-size:11px;color:var(--muted)">('+avail+' ta mavjud)</span></label>'
        + '<span class="tool-picker-rate">'+fmt(cloth.dayRate||0)+'/kun</span>'
        + '<input type="number" class="tool-picker-qty" id="qty-cloth-'+cloth.id+'" value="'+qtyVal+'" min="1" max="'+avail+'" oninput="onPickerChange()" '+(checked?'':'disabled style="opacity:0.3"')+'>'
        + '</div>';
    }
  });
  document.getElementById('tool-picker').innerHTML = html;
  onPickerChange();
}

function onPickerChange() {
  var pickerItems = getPickerItems();
  var priceTable = document.getElementById('price-table');
  if (pickerItems.length === 0) { priceTable.style.display = 'none'; return; }
  priceTable.style.display = 'block';
  if (currentCategory === 'tools') {
    tools.forEach(function(t) {
      var chk = document.getElementById('chk-'+t.id);
      var qty = document.getElementById('qty-'+t.id);
      if (chk && qty) { qty.disabled = !chk.checked; qty.style.opacity = chk.checked ? '1' : '0.3'; }
    });
  } else if (currentCategory === 'dishes' || currentCategory === 'restaurants' || currentCategory === 'stadiums' || currentCategory === 'gaming') {
    items.forEach(function(d) {
      var chk = document.getElementById('chk-dish-'+d.id);
      var qty = document.getElementById('qty-dish-'+d.id);
      if (chk && qty) { qty.disabled = !chk.checked; qty.style.opacity = chk.checked ? '1' : '0.3'; }
    });
  } else if (currentCategory === 'clothes') {
    items.forEach(function(c) {
      var chk = document.getElementById('chk-cloth-'+c.id);
      var qty = document.getElementById('qty-cloth-'+c.id);
      if (chk && qty) { qty.disabled = !chk.checked; qty.style.opacity = chk.checked ? '1' : '0.3'; }
    });
  }
  renderPriceRows('price-rows', 'price-total', pickerItems, 1);
}

function getPickerItems() {
  var pickerItems = [];
  if (currentCategory === 'cars') {
    items.forEach(function(car) {
      var chk = document.getElementById('chk-car-'+car.id);
      if (chk && chk.checked) {
        pickerItems.push({ itemId: car.id, qty: 1 });
      }
    });
  } else if (currentCategory === 'dishes' || currentCategory === 'restaurants' || currentCategory === 'stadiums' || currentCategory === 'gaming') {
    items.forEach(function(dish) {
      var chk = document.getElementById('chk-dish-'+dish.id);
      if (chk && chk.checked) {
        var qty = parseInt(document.getElementById('qty-dish-'+dish.id).value) || 1;
        pickerItems.push({ itemId: dish.id, qty: qty });
      }
    });
  } else if (currentCategory === 'clothes') {
    items.forEach(function(cloth) {
      var chk = document.getElementById('chk-cloth-'+cloth.id);
      if (chk && chk.checked) {
        var qty = parseInt(document.getElementById('qty-cloth-'+cloth.id).value) || 1;
        pickerItems.push({ itemId: cloth.id, qty: qty });
      }
    });
  } else {
    tools.forEach(function(t) {
      var chk = document.getElementById('chk-'+t.id);
      if (chk && chk.checked) {
        var qty = parseInt(document.getElementById('qty-'+t.id).value) || 1;
        pickerItems.push({ toolId: t.id, qty: qty });
      }
    });
  }
  return pickerItems;
}

/* ===== IJARA MODAL ===== */
function openAddModal(id) {
  editId = id || null;

  // items/tools bo'sh bo'lsa qayta yukla, keyin modalni och
  if (currentCategory === 'tools' && (!tools || tools.length === 0)) {
    tools = JSON.parse(localStorage.getItem(DB_PREFIX + 'tools') || '[]');
    _openAddModalInner(id);
  } else if (currentCategory !== 'tools' && (!items || items.length === 0)) {
    var rawItems = JSON.parse(localStorage.getItem(DB_PREFIX + 'items') || '[]');
    loadAllItemImages(rawItems).then(function(loaded) {
      items = loaded;
      _openAddModalInner(id);
    });
  } else {
    _openAddModalInner(id);
  }
}

function _openAddModalInner(id) {
  document.getElementById('modal-title').textContent = id ? 'Ijarani tahrirlash' : 'Yangi ijara';
  ['name','phone','start','items'].forEach(function(f) {
    var e = document.getElementById('err-'+f); if (e) e.textContent = '';
  });
  var today = localDateTimeStr();
  var wSel = document.getElementById('f-worker');
  wSel.innerHTML = workers.map(function(w) { return '<option>'+escHtml(w)+'</option>'; }).join('');
  if (id) {
    var r = rentals.find(function(r) { return r.id === id; });
    if (!r) return;
    document.getElementById('f-name').value    = r.name;
    document.getElementById('f-phone').value   = r.phone;
    document.getElementById('f-start').value   = r.start;
    document.getElementById('f-payment').value = r.payment;
    document.getElementById('f-worker').value  = r.worker;
    document.getElementById('f-note').value    = r.note || '';
    if (currentCategory === 'tools') {
      buildToolPicker(r.items);
    } else if (currentCategory === 'cars') {
      buildCarPicker(r.items);
    } else if (currentCategory === 'dishes' || currentCategory === 'restaurants' || currentCategory === 'stadiums' || currentCategory === 'gaming') {
      buildDishPicker(r.items);
    } else if (currentCategory === 'clothes') {
      buildClothesPicker(r.items);
    }
  } else {
    document.getElementById('f-name').value    = '';
    document.getElementById('f-phone').value   = '';
    document.getElementById('f-start').value   = today;
    document.getElementById('f-payment').value = 'unpaid';
    document.getElementById('f-note').value    = '';
    if (currentCategory === 'tools') {
      buildToolPicker(null);
    } else if (currentCategory === 'cars') {
      buildCarPicker(null);
    } else if (currentCategory === 'dishes' || currentCategory === 'restaurants' || currentCategory === 'stadiums' || currentCategory === 'gaming') {
      buildDishPicker(null);
    } else if (currentCategory === 'clothes') {
      buildClothesPicker(null);
    }
  }
  document.getElementById('price-table').style.display = 'none';
  document.getElementById('add-modal').classList.add('open');
}

function saveRental() {
  var name    = document.getElementById('f-name').value.trim();
  var phone   = document.getElementById('f-phone').value.trim();
  var start   = document.getElementById('f-start').value;
  var payment = document.getElementById('f-payment').value;
  var worker  = document.getElementById('f-worker').value;
  var note    = document.getElementById('f-note').value.trim();
  var items   = getPickerItems();
  var valid   = true;
  function setErr(field, msg) {
    var el = document.getElementById('err-'+field);
    if (el) el.textContent = msg;
    if (msg) valid = false;
  }
  setErr('name',  name               ? '' : 'Ism kiritilishi shart');
  setErr('phone', isValidPhone(phone) ? '' : 'Telefon: +998XXXXXXXXX formatida kiriting');
  setErr('start', start              ? '' : 'Boshlanish sanasi kiritilishi shart');
  setErr('items', items.length > 0   ? '' : 'Kamida bitta asbob tanlang');

  // Mavjud dona sonini tekshirish
  if (items.length > 0) {
    var stockErr = '';
    items.forEach(function(item) {
      if (currentCategory === 'tools') {
        var tool = tools.find(function(t) {
          return String(t.id) === String(item.toolId || item.itemId || item.id);
        });
        if (!tool) return;
        var toolId = item.toolId !== undefined ? item.toolId : (item.itemId !== undefined ? item.itemId : item.id);
        var inUse = getToolInUseQty(toolId, editId || null);
        var avail = tool.qty - inUse;
        if (item.qty > avail) {
          stockErr = escHtml(tool.name) + ': faqat ' + avail + ' ta mavjud, ' + item.qty + ' ta so\'raldi';
          valid = false;
        }
      } else if (item.itemId !== undefined || item.id !== undefined) {
        var itemId = item.itemId !== undefined ? item.itemId : item.id;
        var catItem = window.items.find(function(c) { return String(c.id) === String(itemId); });
        if (!catItem) return;
        var inUse2 = getItemInUseQty(itemId, editId || null);
        var avail2 = (catItem.qty || 1) - inUse2;
        if (item.qty > avail2) {
          var itemName = catItem.plateNumber ? (catItem.plateNumber + ' ' + (catItem.brand||'')) : catItem.name;
          stockErr = escHtml(itemName) + ': faqat ' + avail2 + ' ta mavjud, ' + item.qty + ' ta so\'raldi';
          valid = false;
        }
      }
    });
    if (stockErr) {
      var el = document.getElementById('err-items');
      if (el) el.textContent = stockErr;
    }
  }

  if (!valid) return;
  if (editId) {
    var idx = rentals.findIndex(function(r) { return r.id === editId; });
    rentals[idx] = Object.assign({}, rentals[idx], { name:name, phone:phone, start:start, items:items, payment:payment, worker:worker, note:note });
    showToast('Ijara yangilandi', 'success');
  } else {
    rentals.unshift({
      id: Date.now(), name:name, phone:phone, start:start,
      items:items, payment:payment, worker:worker, note:note,
      status:'active', price:0, returnedAt:null,
      createdAt: new Date().toISOString(),
      paidAt: payment==='paid' ? new Date().toISOString() : null
    });
    showToast("Yangi ijara qo'shildi", 'success');
  }
  saveRentals(); closeModal('add-modal'); renderAll();
}

/* ===== QAYTARISH ===== */
function openReturnModal(id) {
  returnId = id;
  var r = rentals.find(function(r) { return r.id === id; });
  if (!r) return;

  // items/tools bo'sh bo'lsa localStorage dan qayta yukla
  if (currentCategory === 'tools' && (!tools || tools.length === 0)) {
    tools = JSON.parse(localStorage.getItem(DB_PREFIX + 'tools') || '[]');
    _openReturnModalInner(r);
  } else if (!items || items.length === 0) {
    var rawItems = JSON.parse(localStorage.getItem(DB_PREFIX + 'items') || '[]');
    loadAllItemImages(rawItems).then(function(loaded) {
      items = loaded;
      _openReturnModalInner(r);
    });
  } else {
    _openReturnModalInner(r);
  }
}

function _openReturnModalInner(r) {
  // Modal sarlavhasi
  var activeItems = getActiveItems(r);
  document.getElementById('return-modal-title').textContent =
    activeItems.length === r.items.length ? 'Asbob qaytarish' : 'Qolgan asboblarni qaytarish';

  // Hozirgi vaqt
  var nowStr = localDateTimeStr();
  document.getElementById('r-date').value = nowStr;
  document.getElementById('r-payment').value = 'unpaid';

  // Qaytarilmagan asboblarni ko'rsat
  buildReturnPicker(r);
  updateReturnCalc();
  document.getElementById('return-modal').classList.add('open');
}

// Bitta asbobdan nechta dona hali ijarada (barcha faol/qisman ijaralar bo'yicha)
function getToolInUseQty(toolId, excludeRentalId) {
  var total = 0;
  rentals.forEach(function(r) {
    if (r.status !== 'active' && r.status !== 'partial') return;
    if (excludeRentalId && r.id === excludeRentalId) return;
    var activeItems = getActiveItems(r);
    var item = activeItems.find(function(i) {
      return String(i.toolId) === String(toolId) || String(i.itemId) === String(toolId) || String(i.id) === String(toolId);
    });
    if (item) total += item.qty;
  });
  return total;
}

// Hali qaytarilmagan elementlarni hisoblash (tools va items uchun)
function getActiveItems(r) {
  if (!r.returns || r.returns.length === 0) return r.items.slice();
  var returnedQty = {};
  r.returns.forEach(function(ret) {
    if (ret.items) {
      ret.items.forEach(function(item) {
        var key = item.itemId !== undefined ? 'i_'+item.itemId : 't_'+item.toolId;
        returnedQty[key] = (returnedQty[key] || 0) + item.qty;
      });
    }
  });
  var active = [];
  r.items.forEach(function(item) {
    var key = item.itemId !== undefined ? 'i_'+item.itemId : 't_'+item.toolId;
    var retQty = returnedQty[key] || 0;
    var remaining = item.qty - retQty;
    if (remaining > 0) {
      var copy = Object.assign({}, item, { qty: remaining });
      active.push(copy);
    }
  });
  return active;
}

function selectAllReturnItems(checked) {
  // Barcha return checkboxlarni belgilash/olib tashlash
  var allChk = document.querySelectorAll('#return-items-picker input[type="checkbox"]:not(#chk-select-all)');
  allChk.forEach(function(chk) {
    if (!chk.disabled) {
      chk.checked = checked;
      // qty inputni ham yoqish/o'chirish
      var id = chk.id.replace('rchk-', '');
      var qtyEl = document.getElementById('rqty-' + id);
      if (qtyEl) {
        qtyEl.disabled = !checked;
        qtyEl.style.opacity = checked ? '1' : '0.3';
      }
    }
  });
  updateReturnCalc();
}

function buildReturnPicker(r) {
  // tools yoki items bo'sh bo'lsa qayta yukla
  if (currentCategory === 'tools' && (!tools || tools.length === 0)) {
    tools = JSON.parse(localStorage.getItem(DB_PREFIX + 'tools') || '[]');
  }
  if (currentCategory !== 'tools' && (!items || items.length === 0)) {
    items = JSON.parse(localStorage.getItem(DB_PREFIX + 'items') || '[]');
  }

  var activeItems = getActiveItems(r);
  var html = '<div class="tool-picker-head" style="display:flex;align-items:center;justify-content:space-between">'
    + '<span>&#10003; Belgilangan = qaytarilayotgan element</span>'
    + '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:var(--accent);font-weight:600">'
    + '<input type="checkbox" id="chk-select-all" onchange="selectAllReturnItems(this.checked)" style="width:16px;height:16px;accent-color:var(--accent);cursor:pointer">'
    + 'Hammasini belgilash</label>'
    + '</div>';
  if (activeItems.length === 0) {
    html += '<div style="padding:14px;color:var(--muted);font-size:13px">Barcha elementlar qaytarilgan</div>';
    document.getElementById('return-items-picker').innerHTML = html;
    return;
  }
  activeItems.forEach(function(item) {
    var id, name, rate, isCar = false;
    if (item.itemId !== undefined) {
      id = 'ri_' + item.itemId;
      var catItem = window.items ? window.items.find(function(c) { return c.id === item.itemId; }) : null;
      if (catItem) {
        name = catItem.plateNumber ? (escHtml(catItem.plateNumber) + ' ' + escHtml(catItem.brand||'')) : escHtml(catItem.name);
        rate = catItem.dayRate || 0;
        isCar = !!catItem.plateNumber;
      } else {
        name = 'Element #' + item.itemId;
        rate = 0;
      }
    } else {
      id = 'rt_' + item.toolId;
      var tool = tools.find(function(t) { return t.id === item.toolId; });
      name = tool ? escHtml(tool.name) : 'Asbob #' + item.toolId;
      rate = tool ? tool.dayRate : 0;
    }
    var showQty = !isCar; // avtomobil uchun qty input ko'rsatilmaydi
    html += '<div class="tool-picker-item">'
      + '<input type="checkbox" id="rchk-'+id+'" value="'+id+'"'
      + ' onchange="'+(showQty ? 'var q=document.getElementById(\'rqty-'+id+'\');q.disabled=!this.checked;q.style.opacity=this.checked?\'1\':\'0.3\';' : '')+'updateReturnCalc()">'
      + '<label for="rchk-'+id+'" class="tool-picker-name" style="cursor:pointer">'
      + name + ' <span style="font-size:11px;color:var(--muted)">(ijarada: '+item.qty+' dona)</span></label>'
      + '<span class="tool-picker-rate">'+fmt(rate)+'/kun</span>'
      + (showQty
        ? '<input type="number" class="tool-picker-qty" id="rqty-'+id+'" value="'+item.qty+'" min="1" max="'+item.qty+'" disabled style="opacity:0.3" oninput="updateReturnCalc()">'
        : '<span style="font-size:12px;color:var(--muted);padding:0 8px">1 dona</span>')
      + '</div>';
  });
  document.getElementById('return-items-picker').innerHTML = html;
}

function getReturnItems() {
  var r = rentals.find(function(r) { return r.id === returnId; });
  if (!r) return [];
  var activeItems = getActiveItems(r);
  var result = [];
  activeItems.forEach(function(item) {
    var id = item.itemId !== undefined ? 'ri_' + item.itemId : 'rt_' + item.toolId;
    var chk = document.getElementById('rchk-'+id);
    if (chk && chk.checked) {
      var qtyEl = document.getElementById('rqty-'+id);
      var qty = qtyEl ? (parseInt(qtyEl.value) || 1) : 1;
      qty = Math.min(qty, item.qty);
      if (item.itemId !== undefined) {
        result.push({ itemId: item.itemId, qty: qty });
      } else {
        result.push({ toolId: item.toolId, qty: qty });
      }
    }
  });
  return result;
}

function setReturnToday() {
  document.getElementById('r-date').value = localDateTimeStr();
  updateReturnCalc();
}

function updateReturnCalc() {
  var r = rentals.find(function(r) { return r.id === returnId; });
  if (!r) return;
  var retDate = document.getElementById('r-date').value;
  if (!retDate) return;
  var hours = calcHours(r.start, retDate);
  var returnItems = getReturnItems();
  renderPriceRows('return-price-rows', 'return-total', returnItems, hours);
  var durEl = document.getElementById('return-duration');
  if (durEl) durEl.textContent = fmtDuration(hours);
}

document.addEventListener('change', function(e) {
  if (e.target && e.target.id === 'r-date') updateReturnCalc();
});

function confirmReturn() {
  var r = rentals.find(function(r) { return r.id === returnId; });
  if (!r) return;
  var retDate = document.getElementById('r-date').value;
  if (!retDate) { showToast('Qaytarilgan vaqtni kiriting', 'warning'); return; }
  var hours = calcHours(r.start, retDate);
  if (hours <= 0) { showToast('Qaytarish vaqti boshlanishdan keyin bo\'lishi kerak', 'warning'); return; }
  var returnItems = getReturnItems();
  if (returnItems.length === 0) { showToast('Kamida bitta asbob tanlang', 'warning'); return; }
  var payment = document.getElementById('r-payment').value;
  var price = calcRentalPrice(returnItems, hours);

  // returns arrayga qo'shish
  if (!r.returns) r.returns = [];
  r.returns.push({
    returnedAt: retDate,
    hours: hours,
    items: returnItems,
    price: price,
    payment: payment,
    paidAt: payment === 'paid' ? new Date().toISOString() : null
  });

  // Umumiy narxni yangilash
  r.price = (r.price || 0) + price;

  // Barcha asboblar qaytarilganmi?
  var remaining = getActiveItems(r);
  if (remaining.length === 0) {
    r.status = 'returned';
    r.returnedAt = retDate;
    r.hours = hours;
  } else {
    r.status = 'partial'; // qisman qaytarilgan
  }

  // To'lov holati
  if (payment === 'paid') {
    r.paidAt = r.paidAt || new Date().toISOString();
  }

  saveRentals(); closeModal('return-modal'); renderAll();
  var msg = returnItems.map(function(item) {
    if (item.itemId !== undefined) {
      var catItem = window.items ? window.items.find(function(c) { return c.id === item.itemId; }) : null;
      var name = catItem ? (catItem.plateNumber ? catItem.plateNumber : catItem.name) : '?';
      return escHtml(name) + ' x' + item.qty;
    }
    var t = tools.find(function(t) { return t.id === item.toolId; });
    return (t ? escHtml(t.name) : '?') + ' x' + item.qty;
  }).join(', ');
  showToast(msg + ' — ' + fmtDuration(hours) + ', ' + fmt(price), 'success');
}

function deleteRental(id) {
  var r = rentals.find(function(r) { return r.id === id; });
  if (!r) return;
  if (r.status === 'returned' || r.payment === 'paid') {
    showToast("To'langan yoki yakunlangan ijarani o'chirib bo'lmaydi. Arxivlash uchun foydalaning.", 'error');
    return;
  }
  if (!confirm("Bu ijarani o'chirishni xohlaysizmi?")) return;
  rentals = rentals.filter(function(r) { return r.id !== id; });
  saveRentals(); renderAll();
  showToast("Ijara o'chirildi", 'warning');
}

function archiveRental(id) {
  var r = rentals.find(function(r) { return r.id === id; });
  if (!r) return;
  if (!confirm("Bu ijarani arxivlashni xohlaysizmi? Arxivlangan ijaralar ro'yxatdan yashiriladi, lekin hisobotda saqlanadi.")) return;
  r.archived = true;
  saveRentals(); renderAll();
  showToast("Ijara arxivlandi", 'warning');
}

function togglePayment(id) {
  var r = rentals.find(function(r) { return r.id === id; });
  if (!r) return;
  r.payment = r.payment === 'paid' ? 'unpaid' : 'paid';
  r.paidAt  = r.payment === 'paid' ? new Date().toISOString() : null;
  saveRentals(); renderAll();
  showToast("To'lov holati yangilandi", 'success');
}

/* ===== ASBOB MODAL ===== */
function openToolModal(id) {
  editToolId = id || null;
  document.getElementById('tool-modal-title').textContent = id ? 'Asbobni tahrirlash' : "Asbob qo'shish";
  var errEl = document.getElementById('err-tname');
  if (errEl) errEl.textContent = '';
  document.getElementById('t-name').classList.remove('error');
  if (id) {
    var t = tools.find(function(t) { return t.id === id; });
    if (!t) return;
    document.getElementById('t-name').value = t.name;
    document.getElementById('t-day').value  = t.dayRate;
    document.getElementById('t-qty').value  = t.qty;
  } else {
    document.getElementById('t-name').value = '';
    document.getElementById('t-day').value  = '';
    document.getElementById('t-qty').value  = '1';
  }
  document.getElementById('tool-modal').classList.add('open');
}

function saveTool() {
  var name    = document.getElementById('t-name').value.trim();
  var dayRate = parseInt(document.getElementById('t-day').value) || 0;
  var qty     = parseInt(document.getElementById('t-qty').value) || 1;
  if (!name) {
    document.getElementById('err-tname').textContent = 'Asbob nomini kiriting!';
    document.getElementById('t-name').classList.add('error');
    return;
  }
  if (editToolId) {
    var idx = tools.findIndex(function(t) { return t.id === editToolId; });
    tools[idx] = Object.assign({}, tools[idx], { name:name, dayRate:dayRate, qty:qty });
    showToast('Asbob yangilandi', 'success');
  } else {
    tools.push({ id:Date.now(), name:name, dayRate:dayRate, qty:qty });
    showToast("Asbob qo'shildi", 'success');
  }
  saveTools(); closeModal('tool-modal'); renderTools(); renderAll();
}

function deleteTool(id) {
  if (rentals.some(function(r) { return r.status==='active' && r.items && r.items.some(function(i){return String(i.toolId)===String(id);}); })) {
    showToast("Bu asbob hozir ijarada, o'chirib bo'lmaydi!", 'error'); return;
  }
  if (!confirm("Bu asbobni o'chirishni xohlaysizmi?")) return;
  tools = tools.filter(function(t) { return t.id !== id; });
  saveTools(); renderTools(); renderAll();
  showToast("Asbob o'chirildi", 'warning');
}

function closeModal(id) { document.getElementById(id).classList.remove('open'); }

/* ===== HELPERS ===== */
function getItemDisplayName(item) {
  // tools yoki items bo'sh bo'lsa qayta yukla
  if (!tools || tools.length === 0) {
    tools = JSON.parse(localStorage.getItem(DB_PREFIX + 'tools') || '[]');
  }
  if (!items || items.length === 0) {
    items = JSON.parse(localStorage.getItem(DB_PREFIX + 'items') || '[]');
  }
  if (item.itemId !== undefined || item.id !== undefined) {
    var lookupId = item.itemId !== undefined ? item.itemId : item.id;
    var catItem = items.find(function(c) { return c.id === lookupId || String(c.id) === String(lookupId); });
    if (catItem) {
      return catItem.plateNumber ? escHtml(catItem.plateNumber + ' ' + (catItem.brand||'')) : escHtml(catItem.name||'?');
    }
    var tool = tools.find(function(t) { return t.id === lookupId || String(t.id) === String(lookupId); });
    if (tool) {
      return escHtml(tool.name || item.name || item.toolName || '?');
    }
    return escHtml(item.name || item.brand || item.type || item.toolName || '?');
  }
  var t = tools.find(function(t) { return t.id === item.toolId || String(t.id) === String(item.toolId) || String(t.id) === String(item.id); });
  if (t) return escHtml(t.name || item.name || item.toolName || '?');
  return escHtml(item.name || item.toolName || '?');
}

function itemsLabel(items) {
  if (!items || !items.length) return '—';
  return items.map(function(item) {
    return getItemDisplayName(item) + (item.qty > 1 ? ' x'+item.qty : '');
  }).join(', ');
}

function itemsTags(items, returns) {
  if (!items || !items.length) return '—';
  var returnedQty = {};
  if (returns && returns.length) {
    returns.forEach(function(ret) {
      if (ret.items) ret.items.forEach(function(i) {
        var key = i.itemId !== undefined ? 'i_'+i.itemId : 't_'+i.toolId;
        returnedQty[key] = (returnedQty[key] || 0) + i.qty;
      });
    });
  }
  return '<div class="items-list">' + items.map(function(item) {
    var key = item.itemId !== undefined ? 'i_'+item.itemId : 't_'+item.toolId;
    var name = getItemDisplayName(item);
    var retQty = returnedQty[key] || 0;
    var activeQty = item.qty - retQty;
    var tag = '';
    if (activeQty > 0) {
      tag += '<span>'+name+(item.qty > 1 ? ' &times;'+activeQty : '')+'</span>';
    }
    if (retQty > 0) {
      tag += '<span style="opacity:0.5;text-decoration:line-through">'+name+(retQty > 1 ? ' &times;'+retQty : '')+'</span>';
    }
    return tag;
  }).join('') + '</div>';
}

function statusBadge(s) {
  if (s === 'active')   return '<span class="badge active">&#9679; Faol</span>';
  if (s === 'partial')  return '<span class="badge" style="background:rgba(52,152,219,0.12);color:var(--blue)">&#9684; Qisman</span>';
  if (s === 'returned') return '<span class="badge returned">&#10003; Qaytarilgan</span>';
  return '';
}
function payBadge(p) {
  return p === 'paid'
    ? '<span class="badge paid">To\'langan</span>'
    : '<span class="badge unpaid">To\'lanmagan</span>';
}
function fmtDate(s) {
  if (!s) return '—';
  var d = new Date(s);
  var pad = function(n) { return String(n).padStart(2,'0'); };
  return d.toLocaleDateString('uz-UZ') + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

/* ===== RENDER DASHBOARD ===== */
function renderDashboard() {
  var active = rentals.filter(function(r) { return r.status === 'active' || r.status === 'partial'; });
  var today  = new Date().toDateString();
  var todayIncome = rentals
    .filter(function(r) { return r.payment==='paid' && r.paidAt && new Date(r.paidAt).toDateString()===today; })
    .reduce(function(s,r) { return s+r.price; }, 0);
  var unpaidTotal = rentals
    .filter(function(r) { return r.payment==='unpaid' && r.status==='returned'; })
    .reduce(function(s,r) { return s+r.price; }, 0);

  document.getElementById('stat-active').textContent = active.length;
  document.getElementById('stat-today').textContent  = fmt(todayIncome);
  document.getElementById('stat-unpaid').textContent = fmt(unpaidTotal);

  // Kategoriyaga qarab "Jami ..." label va qiymat
  var info = getCategoryInfo(currentCategory);
  var totalCount = currentCategory === 'tools' ? tools.length : items.length;
  var statLabel = document.getElementById('stat-tools-label');
  if (statLabel) statLabel.textContent = 'Jami ' + info.nav;
  document.getElementById('stat-tools').textContent = totalCount;
  document.getElementById('h-active').textContent    = active.length;
  document.getElementById('h-pending').textContent   = rentals.filter(function(r){return r.payment==='unpaid';}).length;
  document.getElementById('h-income').textContent    = fmt(todayIncome);
  document.getElementById('hm-active').textContent   = active.length;

  /* Desktop table */
  var tbody = document.getElementById('dashboard-table');
  if (!active.length) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty"><div class="empty-icon">&#128230;</div>Faol ijara yo\'q</div></td></tr>';
  } else {
    tbody.innerHTML = active.slice(0,10).map(function(r) {
      return '<tr>'
        + '<td><div class="td-name">'+escHtml(r.name)+'</div><div class="td-sub">'+escHtml(r.phone)+'</div></td>'
        + '<td>'+itemsTags(r.items, r.returns)+'</td>'
        + '<td>'+fmtDate(r.start)+'</td>'
        + '<td>'+statusBadge(r.status)+'</td>'
        + '<td><span style="color:var(--accent);font-size:12px">Qaytarishda</span></td>'
        + '<td onclick="togglePayment('+r.id+')" style="cursor:pointer">'+payBadge(r.payment)+'</td>'
        + '<td><div class="actions-cell">'
        + '<button class="btn btn-ghost btn-sm" onclick="openAddModal('+r.id+')">&#9998;</button>'
        + '<button class="btn btn-primary btn-sm" onclick="openReturnModal('+r.id+')">&#10003; Qaytarish</button>'
        + '</div></td></tr>';
    }).join('');
  }

  /* Mobile cards */
  var cardsEl = document.getElementById('dashboard-cards');
  if (!active.length) {
    cardsEl.innerHTML = '<div class="empty"><div class="empty-icon">&#128230;</div>Faol ijara yo\'q</div>';
  } else {
    cardsEl.innerHTML = active.slice(0,10).map(function(r) {
      return renderRentalCard(r, true);
    }).join('');
  }
}

/* ===== RENDER ALL TABLE ===== */
function renderAllTable() {
  var q  = (document.getElementById('search-input') || {value:''}).value.toLowerCase();
  var fs = (document.getElementById('filter-status') || {value:''}).value;
  var filtered = rentals.filter(function(r) {
    if (r.archived) return false;
    var label = itemsLabel(r.items).toLowerCase();
    var mQ = !q || r.name.toLowerCase().indexOf(q)>=0 || r.phone.indexOf(q)>=0 || label.indexOf(q)>=0;
    var mS = !fs || r.status === fs;
    return mQ && mS;
  });

  /* Desktop */
  var tbody = document.getElementById('all-table');
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="9"><div class="empty"><div class="empty-icon">&#128203;</div>Ijara topilmadi</div></td></tr>';
  } else {
    tbody.innerHTML = filtered.map(function(r) {
      var priceCell = r.status==='returned' ? fmt(r.price) : '<span style="color:var(--accent);font-size:12px">Qaytarishda</span>';
      return '<tr>'
        + '<td><div class="td-name">'+escHtml(r.name)+'</div></td>'
        + '<td>'+escHtml(r.phone)+'</td>'
        + '<td>'+itemsTags(r.items, r.returns)+'</td>'
        + '<td>'+fmtDate(r.start)+'</td>'
        + '<td>'+(r.returnedAt ? fmtDate(r.returnedAt)+' <span style="color:var(--muted);font-size:11px">('+fmtDuration(r.hours||0)+')</span>' : '—')+'</td>'
        + '<td>'+statusBadge(r.status)+'</td>'
        + '<td>'+priceCell+'</td>'
        + '<td onclick="togglePayment('+r.id+')" style="cursor:pointer">'+payBadge(r.payment)+'</td>'
        + '<td><div class="actions-cell">'
        + (r.status==='active' ? '<button class="btn btn-ghost btn-sm" onclick="openAddModal('+r.id+')">&#9998;</button>' : '')
        + (r.status==='active' || r.status==='partial' ? '<button class="btn btn-primary btn-sm" onclick="openReturnModal('+r.id+')">&#10003;</button>' : '')
        + (r.status==='active' && r.payment==='unpaid' ? '<button class="btn btn-danger btn-sm" onclick="deleteRental('+r.id+')" title="O\'chirish">&#10005;</button>' : '')
        + (r.status==='returned' ? '<button class="btn btn-ghost btn-sm" onclick="archiveRental('+r.id+')" style="font-size:10px">Arxiv</button>' : '')
        + (r.status==='returned' ? '<button class="btn btn-ghost btn-sm" onclick="openCheck('+r.id+')" style="font-size:10px">&#128438;</button>' : '')
        + '</div></td></tr>';
    }).join('');
  }

  /* Mobile cards */
  var cardsEl = document.getElementById('all-cards');
  if (!filtered.length) {
    cardsEl.innerHTML = '<div class="empty"><div class="empty-icon">&#128203;</div>Ijara topilmadi</div>';
  } else {
    cardsEl.innerHTML = filtered.map(function(r) {
      return renderRentalCard(r, false);
    }).join('');
  }
}

/* ===== RENTAL CARD (mobile) ===== */
function renderRentalCard(r, dashboardMode) {
  var priceHtml = r.status === 'returned'
    ? '<span class="rc-price green">'+fmt(r.price)+'</span>'
    : '<span class="rc-price accent">Qaytarishda</span>';

  var dateInfo = r.status === 'returned' && r.returnedAt
    ? fmtDate(r.start) + ' → ' + fmtDate(r.returnedAt) + ' (' + fmtDuration(r.hours||0) + ')'
    : fmtDate(r.start) + ' dan';

  var actions = '';
  if (r.status === 'active' || r.status === 'partial') {
    if (r.status === 'active') {
      actions += '<button class="btn btn-ghost" onclick="openAddModal('+r.id+')">&#9998; Tahrirlash</button>';
    }
    actions += '<button class="btn btn-primary" onclick="openReturnModal('+r.id+')">&#10003; Qaytarish</button>';
    if (r.status === 'active' && r.payment === 'unpaid') {
      actions += '<button class="btn btn-danger" onclick="deleteRental('+r.id+')" style="flex:0 0 auto;min-width:44px">&#10005;</button>';
    }
  } else {
    actions += '<button class="btn btn-ghost" onclick="archiveRental('+r.id+')" style="font-size:12px">Arxivlash</button>';
    actions += '<button class="btn btn-ghost" onclick="openCheck('+r.id+')" style="font-size:12px">&#128438; Chek</button>';
  }

  return '<div class="rental-card">'
    + '<div class="rc-top">'
    + '<div><div class="rc-name">'+escHtml(r.name)+'</div><div class="rc-phone">'+escHtml(r.phone)+'</div></div>'
    + statusBadge(r.status)
    + '</div>'
    + '<div class="rc-items">'+itemsLabel(r.items)+'</div>'
    + '<div class="rc-footer">'
    + '<span class="rc-date">'+dateInfo+'</span>'
    + priceHtml
    + '</div>'
    + '<div class="rc-pay-row">'
    + '<span class="rc-pay-label">To\'lov holati</span>'
    + '<span onclick="togglePayment('+r.id+')" style="cursor:pointer">'+payBadge(r.payment)+'</span>'
    + '</div>'
    + '<div class="rc-actions">'+actions+'</div>'
    + '</div>';
}

/* ===== RENDER TOOLS ===== */
function renderTools() {
  var grid     = document.getElementById('tools-grid');
  var cardsEl  = document.getElementById('tools-cards');

  if (!tools.length) {
    var empty = '<div class="empty" style="grid-column:1/-1"><div class="empty-icon">&#9881;</div>Asbob qo\'shilmagan</div>';
    grid.innerHTML    = empty;
    cardsEl.innerHTML = '<div class="empty"><div class="empty-icon">&#9881;</div>Asbob qo\'shilmagan</div>';
    return;
  }

  var html = tools.map(function(t) {
    var inUse = getToolInUseQty(t.id, null);
    var avail = t.qty - inUse;
    return '<div class="tool-card">'
      + '<div class="tool-card-top">'
      + '<div class="tool-name">'+escHtml(t.name)+'</div>'
      + '<span class="badge '+(inUse>0?'active':'available')+'">'+(inUse>0?inUse+' ta ijarada':"Bo'sh")+'</span>'
      + '</div>'
      + '<div class="tool-rates">'
      + '<div class="rate-pill">Kunlik: <span>'+Number(t.dayRate).toLocaleString()+'</span></div>'
      + '<div class="rate-pill">Jami: <span>'+t.qty+' dona</span></div>'
      + '<div class="rate-pill">Mavjud: <span>'+avail+' dona</span></div>'
      + '</div>'
      + '<div class="tool-actions">'
      + '<button class="btn btn-ghost btn-sm" style="flex:1" onclick="openToolModal('+t.id+')">&#9998; Tahrirlash</button>'
      + '<button class="btn btn-danger btn-sm" onclick="deleteTool('+t.id+')">&#10005;</button>'
      + '</div></div>';
  }).join('');

  grid.innerHTML = html;

  /* Mobile tool cards */
  cardsEl.innerHTML = tools.map(function(t) {
    var inUse = getToolInUseQty(t.id, null);
    var avail = t.qty - inUse;
    return '<div class="tool-card-mobile">'
      + '<div class="tcm-top">'
      + '<div class="tcm-name">'+escHtml(t.name)+'</div>'
      + '<span class="badge '+(inUse>0?'active':'available')+'">'+(inUse>0?inUse+' ta ijarada':"Bo'sh")+'</span>'
      + '</div>'
      + '<div class="tcm-rates">'
      + '<div class="rate-pill">Kunlik: <span>'+Number(t.dayRate).toLocaleString()+'</span></div>'
      + '<div class="rate-pill">Jami: <span>'+t.qty+' dona</span></div>'
      + '<div class="rate-pill">Mavjud: <span>'+avail+' dona</span></div>'
      + '</div>'
      + '<div class="tcm-actions">'
      + '<button class="btn btn-ghost" style="flex:1;justify-content:center" onclick="openToolModal('+t.id+')">&#9998; Tahrirlash</button>'
      + '<button class="btn btn-danger" onclick="deleteTool('+t.id+')" style="flex:0 0 auto;min-width:44px">&#10005;</button>'
      + '</div></div>';
  }).join('');
}

/* ===== RENDER REPORT ===== */
function renderReport() {
  var total = rentals.filter(function(r){return r.status==='returned';}).reduce(function(s,r){return s+r.price;},0);
  var paid  = rentals.filter(function(r){return r.payment==='paid'&&r.status==='returned';}).reduce(function(s,r){return s+r.price;},0);
  var debt  = rentals.filter(function(r){return r.payment==='unpaid'&&r.status==='returned';}).reduce(function(s,r){return s+r.price;},0);
  document.getElementById('r-total').textContent = fmt(total);
  document.getElementById('r-paid').textContent  = fmt(paid);
  document.getElementById('r-debt').textContent  = fmt(debt);
  document.getElementById('r-count').textContent = rentals.length;

  var toolCounts = {};
  rentals.forEach(function(r) {
    if (r.items) r.items.forEach(function(item) {
      var t = tools.find(function(t){return String(t.id)===String(item.toolId);});
      var name = t ? t.name : "Noma'lum";
      toolCounts[name] = (toolCounts[name]||0) + 1;
    });
  });
  var sorted = Object.entries(toolCounts).sort(function(a,b){return b[1]-a[1];}).slice(0,5);
  document.getElementById('top-tools').innerHTML = sorted.length
    ? sorted.map(function(e){return '<div class="report-item"><span>'+escHtml(e[0])+'</span><span class="report-amount" style="color:var(--accent)">'+e[1]+' marta</span></div>';}).join('')
    : '<div style="color:var(--muted);font-size:13px;padding:8px 0">Ma\'lumot yo\'q</div>';

  var paidList = rentals.filter(function(r){return r.payment==='paid'&&r.status==='returned';})
    .sort(function(a,b){return new Date(b.paidAt||b.createdAt)-new Date(a.paidAt||a.createdAt);}).slice(0,5);
  document.getElementById('recent-payments').innerHTML = paidList.length
    ? paidList.map(function(r){return '<div class="report-item"><span>'+escHtml(r.name)+'<br><span style="font-size:11px;color:var(--muted)">'+itemsLabel(r.items)+'</span></span><span class="report-amount" style="color:var(--green)">'+fmt(r.price)+'</span></div>';}).join('')
    : '<div style="color:var(--muted);font-size:13px;padding:8px 0">To\'lov yo\'q</div>';

  renderWeeklyReport();
}

function renderWeeklyReport() {
  var tbody = document.getElementById('weekly-table');
  if (!tbody) return;

  // Foydalanuvchi hisobga kirgan kunni aniqlash
  var users = getUsers();
  var userInfo = currentUser && users[currentUser] ? users[currentUser] : null;
  var startDate;
  if (userInfo && userInfo.createdAt) {
    startDate = new Date(userInfo.createdAt);
    startDate.setHours(0,0,0,0);
  } else {
    // Fallback: bugundan 6 kun oldin
    startDate = new Date();
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0,0,0,0);
  }

  // Bugundan boshlab 7 kun oralig'ini hisoblash
  // startDate dan bugunga qadar, lekin max 7 kun
  var now = new Date();
  now.setHours(0,0,0,0);
  var days = [];
  var d = new Date(startDate);
  while (d <= now && days.length < 7) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  // Agar 7 kundan kam bo'lsa, bugunni ham qo'sh
  if (days.length === 0) days.push(new Date(now));

  var rows = days.map(function(day) {
    var dayStr  = day.getFullYear() + '-'
      + String(day.getMonth()+1).padStart(2,'0') + '-'
      + String(day.getDate()).padStart(2,'0');

    // r.start va r.returnedAt datetime string bo'lishi mumkin, slice(0,10) bilan solishtir
    var started  = rentals.filter(function(r) {
      return r.start && r.start.slice(0,10) === dayStr;
    });
    var returned = rentals.filter(function(r) {
      return r.returnedAt && r.returnedAt.slice(0,10) === dayStr && r.status === 'returned';
    });

    // Daromad: o'sha kuni to'langan ijaralar
    var income = rentals.filter(function(r) {
      return r.payment === 'paid' && r.paidAt && r.paidAt.slice(0,10) === dayStr;
    }).reduce(function(s,r){ return s + (r.price||0); }, 0);

    // To'langan: o'sha kuni to'langan summa
    var paidAmt = income;

    // Qarzdorlik: o'sha kuni qaytarilgan lekin to'lanmagan
    var debtAmt = returned.filter(function(r){
      return r.payment === 'unpaid';
    }).reduce(function(s,r){ return s + (r.price||0); }, 0);

    var isToday  = day.toDateString() === new Date().toDateString();
    var label    = day.toLocaleDateString('uz-UZ', {weekday:'short', month:'short', day:'numeric'});
    var rowStyle = isToday ? ' style="background:rgba(245,166,35,0.07)"' : '';

    return '<tr'+rowStyle+'>'
      + '<td><span style="font-weight:500'+(isToday?';color:var(--accent)':'')+'\">'+(isToday?'Bugun — ':'')+label+'</span></td>'
      + '<td style="text-align:center">'+started.length+'</td>'
      + '<td style="text-align:center">'+returned.length+'</td>'
      + '<td style="color:var(--green);font-weight:600">'+(income>0?fmt(income):'—')+'</td>'
      + '<td style="color:var(--blue)">'+(paidAmt>0?fmt(paidAmt):'—')+'</td>'
      + '<td style="color:var(--red)">'+(debtAmt>0?fmt(debtAmt):'—')+'</td>'
      + '</tr>';
  });
  tbody.innerHTML = rows.join('');
}

function resetReport() {
  if (!confirm("Barcha ijara tarixi o'chiriladi (asboblar saqlanib qoladi). Davom etasizmi?")) return;
  rentals = [];
  saveRentals(); renderAll();
  showToast("Hisobot tozalandi", 'warning');
}

/* ===== XODIMLAR SOZLAMASI ===== */
function renderWorkerSettings() {
  var list = document.getElementById('workers-list');
  if (!list) return;
  if (!workers || workers.length === 0) {
    workers = ['Xodim 1','Xodim 2','Xodim 3'];
    saveWorkersData();
  }
  list.innerHTML = workers.map(function(w, i) {
    return '<div style="display:flex;gap:8px;margin-bottom:8px;align-items:center">'
      + '<input type="text" id="worker-'+i+'" value="'+escHtml(w)+'" placeholder="Xodim ismi" style="flex:1">'
      + '<button class="btn btn-danger btn-sm" onclick="removeWorker('+i+')" style="flex-shrink:0;min-height:36px">&#10005;</button>'
      + '</div>';
  }).join('');
}

function addWorkerRow() {
  workers.push('');
  saveWorkers();
  renderWorkerSettings();
  // Focus last input
  setTimeout(function() {
    var inputs = document.querySelectorAll('#workers-list input');
    if (inputs.length) inputs[inputs.length-1].focus();
  }, 50);
}

function removeWorker(idx) {
  if (workers.length <= 1) { showToast("Kamida 1 ta xodim bo'lishi kerak", 'warning'); return; }
  workers.splice(idx, 1);
  saveWorkers();
  renderWorkerSettings();
}

function saveWorkers() {
  // Input lardan yangi qiymatlarni olish
  var inputs = document.querySelectorAll('#workers-list input');
  if (inputs.length) {
    workers = Array.from(inputs).map(function(inp) { return inp.value.trim() || 'Xodim'; });
  }
  saveWorkersData();
  showToast("Xodimlar saqlandi", 'success');
  renderWorkerSettings();
}

/* ===== IJARA CHEKI ===== */
/* ===== IJARA CHEKI ===== */
function openCheck(id) {
  var r = rentals.find(function(r) { return r.id === id; });
  if (!r) return;
  var price = r.price || 0;

  // Kategoriyaga qarab ustun nomi
  var cat = getCategoryInfo(currentCategory).check;

  // Har bir element uchun nom va narxni olish
  var itemsHtml = (r.items || []).map(function(item) {
    var name = '', dayRate = 0, qty = item.qty || 1;

    if (item.toolId !== undefined) {
      // Asboblar
      var t = tools.find(function(t) { return t.id === item.toolId; });
      name    = t ? escHtml(t.name) : "Noma'lum";
      dayRate = t ? (t.dayRate || 0) : 0;
    } else if (item.itemId !== undefined) {
      // Cars / dishes / clothes
      var catItem = window.items ? window.items.find(function(c) { return c.id === item.itemId; }) : null;
      if (catItem) {
        if (catItem.plateNumber) {
          // Avtomobil
          name = escHtml(catItem.plateNumber) + (catItem.brand ? ' ' + escHtml(catItem.brand) : '');
        } else {
          name = escHtml(catItem.name || "Noma'lum");
        }
        dayRate = catItem.dayRate || 0;
      } else {
        name = "Noma'lum";
      }
    }

    var hours = r.hours || 0;
    var hourRate = dayRate / 24;
    var sub = Math.round(hourRate * qty * hours);

    return '<tr>'
      + '<td style="padding:6px 0;border-bottom:1px dashed #ddd">'+name+'</td>'
      + '<td style="padding:6px 0;border-bottom:1px dashed #ddd;text-align:center">'+qty+' dona</td>'
      + '<td style="padding:6px 0;border-bottom:1px dashed #ddd;text-align:right">'+Number(dayRate).toLocaleString()+'</td>'
      + '<td style="padding:6px 0;border-bottom:1px dashed #ddd;text-align:right;font-weight:600">'+Number(sub).toLocaleString()+'</td>'
      + '</tr>';
  }).join('');

  var html = '<div id="printable-check" style="font-family:monospace;font-size:13px;color:#111;background:#fff;padding:20px">'
    // Header
    + '<div style="text-align:center;margin-bottom:16px">'
    + '<div style="font-size:22px;font-weight:900;letter-spacing:2px">RENTIFY</div>'
    + '<div style="font-size:10px;letter-spacing:3px;color:#666;margin-top:2px">'+cat.icon+' '+cat.title.toUpperCase()+'</div>'
    + '<div style="border-top:2px solid #111;margin:10px 0"></div>'
    + '</div>'
    // Mijoz ma'lumotlari
    + '<div style="margin-bottom:10px">'
    + '<div><b>Mijoz:</b> '+escHtml(r.name)+'</div>'
    + '<div><b>Telefon:</b> '+escHtml(r.phone)+'</div>'
    + '<div><b>Xodim:</b> '+escHtml(r.worker||'—')+'</div>'
    + '<div><b>Boshlanish:</b> '+fmtDate(r.start)+'</div>'
    + '<div><b>Qaytarilgan:</b> '+fmtDate(r.returnedAt)+'</div>'
    + '<div><b>Davomiylik:</b> '+fmtDuration(r.hours||0)+'</div>'
    + '</div>'
    + '<div style="border-top:1px dashed #999;margin:10px 0"></div>'
    // Jadval
    + '<table style="width:100%;border-collapse:collapse">'
    + '<thead><tr style="background:#f5f5f5">'
    + '<th style="text-align:left;padding:6px 4px;font-size:11px;text-transform:uppercase">'+cat.col+'</th>'
    + '<th style="text-align:center;padding:6px 4px;font-size:11px;text-transform:uppercase">Dona</th>'
    + '<th style="text-align:right;padding:6px 4px;font-size:11px;text-transform:uppercase">Narx/kun</th>'
    + '<th style="text-align:right;padding:6px 4px;font-size:11px;text-transform:uppercase">Jami</th>'
    + '</tr></thead>'
    + '<tbody>'+itemsHtml+'</tbody>'
    + '</table>'
    + '<div style="border-top:2px solid #111;margin:10px 0"></div>'
    // Jami
    + '<div style="display:flex;justify-content:space-between;font-size:16px;font-weight:900">'
    + '<span>JAMI TO\'LOV:</span><span>'+Number(price).toLocaleString()+' so\'m</span>'
    + '</div>'
    + '<div style="display:flex;justify-content:space-between;margin-top:6px;font-size:13px">'
    + '<span>To\'lov holati:</span>'
    + '<span style="font-weight:700;color:'+(r.payment==='paid'?'green':'red')+'">'+(r.payment==='paid'?'TO\'LANGAN':'TO\'LANMAGAN')+'</span>'
    + '</div>'
    // Footer
    + '<div style="border-top:1px dashed #999;margin:14px 0;text-align:center;font-size:10px;color:#999">'
    + 'Chek sanasi: '+new Date().toLocaleDateString('uz-UZ')+' | Rentify'
    + '</div>'
    + '</div>';

  document.getElementById('check-content').innerHTML = html;
  document.getElementById('check-modal').classList.add('open');
}

function printCheck() {
  var content = document.getElementById('printable-check');
  if (!content) return;
  var win = window.open('', '_blank', 'width=400,height=600');
  win.document.write('<html><head><title>Ijara cheki</title>'
    + '<style>body{margin:0;padding:0;background:#fff}@media print{body{margin:0}}</style>'
    + '</head><body>');
  win.document.write(content.outerHTML);
  win.document.write('</body></html>');
  win.document.close();
  win.focus();
  setTimeout(function() { win.print(); }, 300);
}

/* ===== RENDER ALL ===== */
function renderAll() {
  // tools yoki items bo'sh bo'lsa localStorage dan qayta yukla
  if (currentCategory === 'tools' && (!tools || tools.length === 0)) {
    tools = JSON.parse(localStorage.getItem(DB_PREFIX + 'tools') || '[]');
  }
  if (currentCategory !== 'tools' && (!items || items.length === 0)) {
    var rawItems = JSON.parse(localStorage.getItem(DB_PREFIX + 'items') || '[]');
    loadAllItemImages(rawItems).then(function(loaded) {
      items = loaded;
      renderDashboard();
      renderAllTable();
      renderCatalogPage();
      renderReport();
    });
    return;
  }
  renderDashboard();
  renderAllTable();
  renderCatalogPage();
  renderReport();
}

/* ===== CATALOG PAGE ROUTING ===== */
function renderCatalogPage() {
  // Grid class va cards visibility ni reset qilish
  var grid    = document.getElementById('tools-grid');
  var cardsEl = document.getElementById('tools-cards');
  if (grid) grid.className = 'tools-grid desktop-table';
  if (cardsEl) cardsEl.style.display = '';

  if (currentCategory === 'tools') renderTools();
  else if (currentCategory === 'cars') renderCars();
  else if (currentCategory === 'dishes' || currentCategory === 'restaurants' || currentCategory === 'stadiums' || currentCategory === 'gaming') renderDishes();
  else if (currentCategory === 'clothes') renderClothes();
}

/* ===== ITEM IN USE (cars/dishes/clothes uchun) ===== */
function getItemInUseQty(itemId, excludeRentalId) {
  var total = 0;
  rentals.forEach(function(r) {
    if (r.status !== 'active' && r.status !== 'partial') return;
    if (excludeRentalId && r.id === excludeRentalId) return;
    var activeItems = getActiveItems(r);
    var found = activeItems.find(function(i) { return String(i.itemId || i.toolId) === String(itemId); });
    if (found) total += found.qty;
  });
  return total;
}

/* ===== CARS CRUD ===== */
// Yangi rasmlar (modal ochiq paytda saqlash uchun)
var carPendingImages = []; // [{base64, name}]

function previewCarImages(input) {
  var files = Array.from(input.files);
  var preview = document.getElementById('car-imgs-preview');
  // Mavjud pending + yangi = max 6
  var remaining = 6 - carPendingImages.length;
  if (files.length > remaining) {
    showToast("Maksimal 6 ta rasm yuklash mumkin. Faqat birinchi " + remaining + " tasi qabul qilindi.", 'warning');
    files = files.slice(0, remaining);
  }
  var loaded = 0;
  files.forEach(function(file) {
    if (file.size > 2 * 1024 * 1024) { showToast(file.name + ": 2MB dan oshmasligi kerak", 'error'); return; }
    if (!file.type.startsWith('image/')) { showToast("Faqat rasm fayllari qabul qilinadi", 'error'); return; }
    var reader = new FileReader();
    reader.onload = function(e) {
      carPendingImages.push({ base64: e.target.result, name: file.name });
      renderCarImgPreview();
    };
    reader.readAsDataURL(file);
  });
  input.value = '';
}

function renderCarImgPreview() {
  var preview = document.getElementById('car-imgs-preview');
  if (!preview) return;
  preview.innerHTML = carPendingImages.map(function(img, idx) {
    return '<div style="position:relative;display:inline-block">'
      + '<img src="'+img.base64+'" style="width:80px;height:80px;object-fit:cover;border-radius:6px;border:2px solid var(--border)">'
      + '<button onclick="removeCarImg('+idx+')" style="position:absolute;top:-6px;right:-6px;background:var(--red);color:#fff;border:none;border-radius:50%;width:20px;height:20px;font-size:12px;cursor:pointer;line-height:1;padding:0">&#10005;</button>'
      + '</div>';
  }).join('');
  if (carPendingImages.length < 6) {
    preview.innerHTML += '<label style="width:80px;height:80px;border:2px dashed var(--border);border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--muted);font-size:24px" title="Rasm qo\'shish"><input type="file" accept="image/*" multiple style="display:none" onchange="previewCarImages(this)">+</label>';
  }
}

function removeCarImg(idx) {
  carPendingImages.splice(idx, 1);
  renderCarImgPreview();
}

function openCarModal(id) {
  editItemId = id || null;
  carPendingImages = [];
  document.getElementById('car-modal-title').textContent = id ? 'Avtomobilni tahrirlash' : "Avtomobil qo'shish";
  var errEl = document.getElementById('err-car-plate');
  if (errEl) errEl.textContent = '';
  var errBrand = document.getElementById('err-car-brand');
  if (errBrand) errBrand.textContent = '';

  var info = getCategoryInfo(currentCategory);
  document.getElementById('dish-modal-title').textContent = info.modalTitle;
  document.getElementById('dish-name').placeholder = info.namePlaceholder;

  if (id) {
    var car = items.find(function(c) { return c.id === id; });
    if (!car) return;
    document.getElementById('car-plate').value = car.plateNumber || '';
    document.getElementById('car-brand').value = car.brand || '';
    document.getElementById('car-model').value = car.model || '';
    document.getElementById('car-year').value  = car.year || '';
    document.getElementById('car-color').value = car.color || '';
    document.getElementById('car-day').value   = car.dayRate || '';
    // Mavjud rasmlarni pending ga yuklash
    var imgs = car.images || (car.imageBase64 ? [{ base64: car.imageBase64, name: 'rasm' }] : []);
    carPendingImages = imgs.slice(0, 6);
  } else {
    document.getElementById('car-plate').value = '';
    document.getElementById('car-brand').value = '';
    document.getElementById('car-model').value = '';
    document.getElementById('car-year').value  = '';
    document.getElementById('car-color').value = '';
    document.getElementById('car-day').value   = '';
  }
  renderCarImgPreview();
  document.getElementById('car-modal').classList.add('open');
}

function saveCar() {
  var plateNumber = document.getElementById('car-plate').value.trim();
  var brand       = document.getElementById('car-brand').value.trim();
  var model       = document.getElementById('car-model').value.trim();
  var year        = parseInt(document.getElementById('car-year').value) || null;
  var color       = document.getElementById('car-color').value.trim();
  var dayRate     = parseFloat(document.getElementById('car-day').value) || 0;

  var errPlate = document.getElementById('err-car-plate');
  var errBrand = document.getElementById('err-car-brand');
  if (errPlate) errPlate.textContent = '';
  if (errBrand) errBrand.textContent = '';

  var valid = true;
  if (!plateNumber) { if (errPlate) errPlate.textContent = "Davlat raqami kiritilishi shart"; valid = false; }
  if (!brand)       { if (errBrand) errBrand.textContent = "Marka kiritilishi shart"; valid = false; }
  if (dayRate < 0) dayRate = 0;
  if (!valid) return;

  var images = carPendingImages.slice(0, 6);
  // Orqaga moslik uchun birinchi rasmni imageBase64 ga ham saqlash
  var imageBase64 = images.length > 0 ? images[0].base64 : null;

  if (editItemId) {
    var idx = items.findIndex(function(c) { return c.id === editItemId; });
    if (idx !== -1) {
      var existing = items[idx];
      items[idx] = Object.assign({}, existing, {
        plateNumber: plateNumber,
        brand: brand,
        model: model || existing.model,
        year: year !== null ? year : existing.year,
        color: color || existing.color,
        dayRate: dayRate,
        images: images,
        imageBase64: imageBase64
      });
    }
  } else {
    items.push({
      id: Date.now(),
      plateNumber: plateNumber,
      brand: brand,
      model: model,
      year: year,
      color: color,
      images: images,
      imageBase64: imageBase64,
      dayRate: dayRate,
      qty: 1
    });
  }
  try { saveItems(); } catch(e) { showToast("Xotira to'lib qoldi, eski ma'lumotlarni o'chiring", 'error'); return; }
  closeModal('car-modal');
  renderCars();
  showToast("Avtomobil saqlandi", 'success');
}

function deleteCar(id) {
  if (getItemInUseQty(id) > 0) {
    showToast("Bu avtomobil hozir ijarada, o'chirib bo'lmaydi!", 'error');
    return;
  }
  if (!confirm("Bu avtomobilni o'chirishni xohlaysizmi?")) return;
  idbDeleteImages(imgKey(id)); // IDB dan rasmlarni o'chir
  items = items.filter(function(c) { return c.id !== id; });
  saveItems();
  renderCars();
  showToast("Avtomobil o'chirildi", 'warning');
}

/* ===== DISHES CRUD ===== */
var dishPendingImages = []; // [{base64, name}]

function previewDishImages(input) {
  var files = Array.from(input.files);
  var remaining = 6 - dishPendingImages.length;
  if (files.length > remaining) {
    showToast("Maksimal 6 ta rasm yuklash mumkin. Faqat birinchi " + remaining + " tasi qabul qilindi.", 'warning');
    files = files.slice(0, remaining);
  }
  files.forEach(function(file) {
    if (file.size > 2 * 1024 * 1024) { showToast(file.name + ": 2MB dan oshmasligi kerak", 'error'); return; }
    if (!file.type.startsWith('image/')) { showToast("Faqat rasm fayllari qabul qilinadi", 'error'); return; }
    var reader = new FileReader();
    reader.onload = function(e) {
      dishPendingImages.push({ base64: e.target.result, name: file.name });
      renderDishImgPreview();
    };
    reader.readAsDataURL(file);
  });
  input.value = '';
}

function renderDishImgPreview() {
  var preview = document.getElementById('dish-imgs-preview');
  if (!preview) return;
  preview.innerHTML = dishPendingImages.map(function(img, idx) {
    return '<div style="position:relative;display:inline-block">'
      + '<img src="'+img.base64+'" style="width:80px;height:80px;object-fit:cover;border-radius:6px;border:2px solid var(--border)">'
      + '<button onclick="removeDishImg('+idx+')" style="position:absolute;top:-6px;right:-6px;background:var(--red);color:#fff;border:none;border-radius:50%;width:20px;height:20px;font-size:12px;cursor:pointer;line-height:1;padding:0">&#10005;</button>'
      + '</div>';
  }).join('');
  if (dishPendingImages.length < 6) {
    preview.innerHTML += '<label style="width:80px;height:80px;border:2px dashed var(--border);border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--muted);font-size:24px" title="Rasm qo\'shish"><input type="file" accept="image/*" multiple style="display:none" onchange="previewDishImages(this)">+</label>';
  }
}

function removeDishImg(idx) {
  dishPendingImages.splice(idx, 1);
  renderDishImgPreview();
}

function openDishModal(id) {
  editItemId = id || null;
  dishPendingImages = [];
  var info = getCategoryInfo(currentCategory);
  document.getElementById('dish-modal-title').textContent = id ? info.modalTitle.replace('qo\'shish','tahrirlash') : info.modalTitle;
  document.getElementById('dish-name').placeholder = info.namePlaceholder;
  var errName = document.getElementById('err-dish-name');
  var errQty  = document.getElementById('err-dish-qty');
  if (errName) errName.textContent = '';
  if (errQty)  errQty.textContent  = '';

  if (id) {
    var dish = items.find(function(d) { return d.id === id; });
    if (!dish) return;
    renderDishTypeOptions(info, dish.type);
    document.getElementById('dish-name').value = dish.name    || '';
    document.getElementById('dish-type').value = dish.type    || (info.typeOptions && info.typeOptions[0]) || 'Lagan';
    document.getElementById('dish-qty').value  = dish.qty     || '';
    document.getElementById('dish-day').value  = dish.dayRate || '';
    // Mavjud rasmlarni pending ga yuklash
    var imgs = dish.images || (dish.imageBase64 ? [{ base64: dish.imageBase64, name: 'rasm' }] : []);
    dishPendingImages = imgs.slice(0, 6);
  } else {
    renderDishTypeOptions(info, null);
    document.getElementById('dish-name').value = '';
    document.getElementById('dish-type').value = (info.typeOptions && info.typeOptions[0]) || 'Lagan';
    document.getElementById('dish-qty').value  = '';
    document.getElementById('dish-day').value  = '';
  }
  renderDishImgPreview();
  document.getElementById('dish-modal').classList.add('open');
}

function renderDishTypeOptions(info, selectedType) {
  var typeSelect = document.getElementById('dish-type');
  if (!typeSelect) return;
  var options = Array.isArray(info.typeOptions) ? info.typeOptions : ['Lagan', 'Piyola', 'Qozon', 'Kosa', 'Boshqa'];
  typeSelect.innerHTML = options.map(function(opt) {
    var safe = escHtml(opt);
    var sel = selectedType && selectedType === opt ? ' selected' : '';
    return '<option value="' + safe + '"' + sel + '>' + safe + '</option>';
  }).join('');
}

function saveDish() {
  var name    = document.getElementById('dish-name').value.trim();
  var type    = document.getElementById('dish-type').value;
  var qty     = parseInt(document.getElementById('dish-qty').value)   || 0;
  var dayRate = parseFloat(document.getElementById('dish-day').value) || 0;

  var valid   = true;
  var errName = document.getElementById('err-dish-name');
  var errQty  = document.getElementById('err-dish-qty');
  if (errName) errName.textContent = '';
  if (errQty)  errQty.textContent  = '';

  if (!name) {
    if (errName) errName.textContent = "Idish nomi kiritilishi shart";
    valid = false;
  }
  if (qty < 1) {
    if (errQty) errQty.textContent = "Miqdor kamida 1 bo'lishi kerak";
    valid = false;
  }
  if (dayRate < 0) { dayRate = 0; }
  if (!valid) return;

  var images = dishPendingImages.slice(0, 6);
  var imageBase64 = images.length > 0 ? images[0].base64 : null;

  if (editItemId) {
    var idx = items.findIndex(function(d) { return d.id === editItemId; });
    if (idx !== -1) {
      items[idx] = Object.assign({}, items[idx], {
        name: name, type: type, qty: qty, dayRate: dayRate,
        images: images,
        imageBase64: imageBase64 !== null ? imageBase64 : items[idx].imageBase64
      });
    }
  } else {
    items.push({ id: Date.now(), name: name, type: type, qty: qty, dayRate: dayRate, images: images, imageBase64: imageBase64 });
  }
  try {
    saveItems();
  } catch (e) {
    showToast("Xotira to'lib qoldi, eski ma'lumotlarni o'chiring", 'error');
    return;
  }
  closeModal('dish-modal');
  renderDishes();
  showToast("Idish saqlandi", 'success');
}

function deleteDish(id) {
  if (getItemInUseQty(id) > 0) {
    showToast("Bu idish hozir ijarada, o'chirib bo'lmaydi!", 'error');
    return;
  }
  if (!confirm("Bu idishni o'chirishni xohlaysizmi?")) return;
  idbDeleteImages(imgKey(id));
  items = items.filter(function(d) { return d.id !== id; });
  saveItems();
  renderDishes();
  showToast("Idish o'chirildi", 'warning');
}

/* ===== CLOTHES CRUD ===== */
var clothesPendingImages = []; // [{base64, name}]

function previewClothesImages(input) {
  var files = Array.from(input.files);
  var remaining = 6 - clothesPendingImages.length;
  if (files.length > remaining) {
    showToast("Maksimal 6 ta rasm yuklash mumkin. Faqat birinchi " + remaining + " tasi qabul qilindi.", 'warning');
    files = files.slice(0, remaining);
  }
  files.forEach(function(file) {
    if (file.size > 2 * 1024 * 1024) { showToast(file.name + ": 2MB dan oshmasligi kerak", 'error'); return; }
    if (!file.type.startsWith('image/')) { showToast("Faqat rasm fayllari qabul qilinadi", 'error'); return; }
    var reader = new FileReader();
    reader.onload = function(e) {
      clothesPendingImages.push({ base64: e.target.result, name: file.name });
      renderClothesImgPreview();
    };
    reader.readAsDataURL(file);
  });
  input.value = '';
}

function renderClothesImgPreview() {
  var preview = document.getElementById('clothes-imgs-preview');
  if (!preview) return;
  preview.innerHTML = clothesPendingImages.map(function(img, idx) {
    return '<div style="position:relative;display:inline-block">'
      + '<img src="'+img.base64+'" style="width:80px;height:80px;object-fit:cover;border-radius:6px;border:2px solid var(--border)">'
      + '<button onclick="removeClothesImg('+idx+')" style="position:absolute;top:-6px;right:-6px;background:var(--red);color:#fff;border:none;border-radius:50%;width:20px;height:20px;font-size:12px;cursor:pointer;line-height:1;padding:0">&#10005;</button>'
      + '</div>';
  }).join('');
  if (clothesPendingImages.length < 6) {
    preview.innerHTML += '<label style="width:80px;height:80px;border:2px dashed var(--border);border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--muted);font-size:24px" title="Rasm qo\'shish"><input type="file" accept="image/*" multiple style="display:none" onchange="previewClothesImages(this)">+</label>';
  }
}

function removeClothesImg(idx) {
  clothesPendingImages.splice(idx, 1);
  renderClothesImgPreview();
}

function openClothesModal(id) {
  editItemId = id || null;
  clothesPendingImages = [];
  document.getElementById('clothes-modal-title').textContent = id ? 'Kiyimni tahrirlash' : "Kiyim qo'shish";
  var errName = document.getElementById('err-clothes-name');
  var errQty  = document.getElementById('err-clothes-qty');
  if (errName) errName.textContent = '';
  if (errQty)  errQty.textContent  = '';
  if (id) {
    var cloth = items.find(function(c) { return c.id === id; });
    if (!cloth) return;
    document.getElementById('clothes-name').value = cloth.name    || '';
    document.getElementById('clothes-size').value = cloth.size    || 'M';
    document.getElementById('clothes-type').value = cloth.type    || "Ko'ylak";
    document.getElementById('clothes-qty').value  = cloth.qty     || '';
    document.getElementById('clothes-day').value  = cloth.dayRate || '';
    // Mavjud rasmlarni pending ga yuklash
    var imgs = cloth.images || (cloth.imageBase64 ? [{ base64: cloth.imageBase64, name: 'rasm' }] : []);
    clothesPendingImages = imgs.slice(0, 6);
  } else {
    document.getElementById('clothes-name').value = '';
    document.getElementById('clothes-size').value = 'M';
    document.getElementById('clothes-type').value = "Ko'ylak";
    document.getElementById('clothes-qty').value  = '';
    document.getElementById('clothes-day').value  = '';
  }
  renderClothesImgPreview();
  document.getElementById('clothes-modal').classList.add('open');
}

function saveClothes() {
  var name    = document.getElementById('clothes-name').value.trim();
  var size    = document.getElementById('clothes-size').value;
  var type    = document.getElementById('clothes-type').value;
  var qty     = parseInt(document.getElementById('clothes-qty').value)   || 0;
  var dayRate = parseFloat(document.getElementById('clothes-day').value) || 0;
  var valid   = true;
  var errName = document.getElementById('err-clothes-name');
  var errQty  = document.getElementById('err-clothes-qty');
  if (errName) errName.textContent = '';
  if (errQty)  errQty.textContent  = '';
  if (!name) { if (errName) errName.textContent = "Kiyim nomi kiritilishi shart"; valid = false; }
  if (qty < 1) { if (errQty) errQty.textContent = "Miqdor kamida 1 bo'lishi kerak"; valid = false; }
  if (dayRate < 0) dayRate = 0;
  if (!valid) return;

  var images = clothesPendingImages.slice(0, 6);
  var imageBase64 = images.length > 0 ? images[0].base64 : null;

  if (editItemId) {
    var idx = items.findIndex(function(c) { return c.id === editItemId; });
    if (idx !== -1) items[idx] = Object.assign({}, items[idx], {
      name:name, size:size, type:type, qty:qty, dayRate:dayRate,
      images: images,
      imageBase64: imageBase64 !== null ? imageBase64 : items[idx].imageBase64
    });
  } else {
    items.push({ id: Date.now(), name:name, size:size, type:type, qty:qty, dayRate:dayRate, images:images, imageBase64:imageBase64 });
  }
  try { saveItems(); } catch(e) { showToast("Xotira to'lib qoldi, eski ma'lumotlarni o'chiring", 'error'); return; }
  closeModal('clothes-modal');
  renderClothes();
  showToast("Kiyim saqlandi", 'success');
}

function deleteClothes(id) {
  if (getItemInUseQty(id) > 0) { showToast("Bu kiyim hozir ijarada, o'chirib bo'lmaydi!", 'error'); return; }
  if (!confirm("Bu kiyimni o'chirishni xohlaysizmi?")) return;
  idbDeleteImages(imgKey(id));
  items = items.filter(function(c) { return c.id !== id; });
  saveItems();
  renderClothes();
  showToast("Kiyim o'chirildi", 'warning');
}

function carImgGallery(car) {
  var imgs = car.images && car.images.length ? car.images : (car.imageBase64 ? [{base64: car.imageBase64}] : []);
  if (!imgs.length) return '<div class="car-img-placeholder">&#128663;</div>';
  if (imgs.length === 1) return '<img class="car-img-thumb" src="'+imgs[0].base64+'" alt="rasm">';
  var id = 'gal-'+car.id;
  var dots = imgs.map(function(_, i) {
    return '<span onclick="carGalNav(\''+id+'\','+i+')" style="width:8px;height:8px;border-radius:50%;background:'+(i===0?'var(--accent)':'var(--border)')+';display:inline-block;cursor:pointer;margin:0 2px" id="'+id+'-dot-'+i+'"></span>';
  }).join('');
  return '<div id="'+id+'" style="position:relative">'
    + '<img class="car-img-thumb" id="'+id+'-img" src="'+imgs[0].base64+'" alt="rasm">'
    + '<button onclick="carGalNav(\''+id+'\',-1)" style="position:absolute;left:4px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.5);color:#fff;border:none;border-radius:50%;width:26px;height:26px;cursor:pointer;font-size:14px">&#8249;</button>'
    + '<button onclick="carGalNav(\''+id+'\',1)" style="position:absolute;right:4px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.5);color:#fff;border:none;border-radius:50%;width:26px;height:26px;cursor:pointer;font-size:14px">&#8250;</button>'
    + '<div style="position:absolute;bottom:6px;left:0;right:0;text-align:center">'+dots+'</div>'
    + '</div>';
}

function carGalNav(id, dir) {
  // id formatlar: 'gal-{carId}', 'gal-dish-{dishId}', 'gal-cloth-{clothId}'
  var item = null;
  if (id.startsWith('gal-dish-')) {
    var dishId = parseInt(id.replace('gal-dish-', ''));
    item = items.find(function(c) { return c.id === dishId; });
  } else if (id.startsWith('gal-cloth-')) {
    var clothId = parseInt(id.replace('gal-cloth-', ''));
    item = items.find(function(c) { return c.id === clothId; });
  } else {
    item = items.find(function(c) { return 'gal-'+c.id === id; });
  }
  if (!item) return;
  var imgs = item.images && item.images.length ? item.images : (item.imageBase64 ? [{base64: item.imageBase64}] : []);
  var imgEl = document.getElementById(id+'-img');
  if (!imgEl) return;
  var cur = parseInt(imgEl.getAttribute('data-idx') || '0');
  var next;
  if (dir === -1) next = (cur - 1 + imgs.length) % imgs.length;
  else if (dir === 1) next = (cur + 1) % imgs.length;
  else next = dir; // to'g'ridan indeks
  imgEl.src = imgs[next].base64;
  imgEl.setAttribute('data-idx', next);
  imgs.forEach(function(_, i) {
    var dot = document.getElementById(id+'-dot-'+i);
    if (dot) {
      dot.classList.toggle('active', i === next);
      dot.style.background = '';
    }
  });
}

function renderCars() {
  var grid    = document.getElementById('tools-grid');
  var cardsEl = document.getElementById('tools-cards');
  if (!grid || !cardsEl) return;

  if (!items.length) {
    grid.innerHTML    = '<div class="empty" style="grid-column:1/-1"><div class="empty-icon">&#128663;</div>Avtomobil qo\'shilmagan</div>';
    cardsEl.innerHTML = '<div class="empty"><div class="empty-icon">&#128663;</div>Avtomobil qo\'shilmagan</div>';
    return;
  }

  var cardsHtml = items.map(function(car) {
    var inUse  = getItemInUseQty(car.id) > 0;
    var imgs   = car.images && car.images.length ? car.images : (car.imageBase64 ? [{base64: car.imageBase64}] : []);
    var galId  = 'gal-'+car.id;
    var meta   = [car.year ? String(car.year) : '', car.color ? escHtml(car.color) : ''].filter(Boolean).join(' · ');

    // Rasm qismi
    var imgSection;
    if (!imgs.length) {
      imgSection = '<div class="car-card-img-placeholder">&#128663;</div>';
    } else if (imgs.length === 1) {
      imgSection = '<img class="car-card-img" src="'+imgs[0].base64+'" alt="rasm">';
    } else {
      imgSection = '<div class="car-gal-wrap" id="'+galId+'">'
        + '<img class="car-card-img" id="'+galId+'-img" src="'+imgs[0].base64+'" data-idx="0" alt="rasm">'
        + '<button class="car-gal-btn car-gal-prev" onclick="carGalNav(\''+galId+'\',-1)">&#8249;</button>'
        + '<button class="car-gal-btn car-gal-next" onclick="carGalNav(\''+galId+'\',1)">&#8250;</button>'
        + '</div>';
    }

    // Dots rasm tashqarisida
    var dotsHtml = '';
    if (imgs.length > 1) {
      dotsHtml = '<div class="car-gal-dots">'
        + imgs.map(function(_, i) {
            return '<span id="'+galId+'-dot-'+i+'" onclick="carGalNav(\''+galId+'\','+i+')" class="car-gal-dot'+(i===0?' active':'')+'" ></span>';
          }).join('')
        + '</div>';
    } else if (imgs.length === 1) {
      dotsHtml = '<div class="car-gal-dots"><span class="car-gal-dot active"></span></div>';
    }

    return '<div class="car-card">'
      + imgSection
      + dotsHtml
      + '<div class="car-card-body">'
      + '<div class="car-card-category-line">'+(inUse ? '<span class="car-badge-status car-badge-busy">Ijarada</span>' : '<span class="car-badge-status car-badge-free">Bo\'sh</span>')+'</div>'
      + '<div class="car-card-name">'+escHtml(car.brand)+(car.model?' '+escHtml(car.model):'')+'</div>'
      + '<div class="car-card-plate">'+escHtml(car.plateNumber)+(meta?' · '+meta:'')+'</div>'
      + '<div class="car-card-price">'+Number(car.dayRate||0).toLocaleString()+' so\'m/kun</div>'
      + '<div class="car-card-actions">'
      + '<button class="car-btn-bron" onclick="openCarModal('+car.id+')">&#9998; Tahrirlash</button>'
      + '</div>'
      + '<button onclick="deleteCar('+car.id+')" style="margin-top:6px;background:none;border:none;color:#e74c3c;font-size:12px;cursor:pointer;text-align:left;padding:0">&#10005; O\'chirish</button>'
      + '</div>'
      + '</div>';
  }).join('');

  // Desktop va mobile uchun bir xil car-card grid
  // tools-grid ni cars uchun ishlatamiz, tools-cards ni yashiramiz
  grid.className = 'tools-grid cars-grid';
  cardsEl.style.display = 'none';
  grid.innerHTML = cardsHtml;
}
function renderDishes() {
  var grid    = document.getElementById('tools-grid');
  var cardsEl = document.getElementById('tools-cards');
  if (!grid || !cardsEl) return;

  var info = getCategoryInfo(currentCategory);
  if (!items.length) {
    grid.innerHTML    = '<div class="empty" style="grid-column:1/-1"><div class="empty-icon">&#127859;</div>' + info.emptyText + '</div>';
    cardsEl.innerHTML = '<div class="empty"><div class="empty-icon">&#127859;</div>' + info.emptyText + '</div>';
    cardsEl.style.display = '';
    grid.className = 'tools-grid cars-grid';
    return;
  }

  var cardsHtml = items.map(function(dish) {
    var inUseQty = getItemInUseQty(dish.id);
    var avail    = (dish.qty || 0) - inUseQty;
    var inUse    = inUseQty > 0;
    var imgs     = dish.images && dish.images.length ? dish.images : (dish.imageBase64 ? [{base64: dish.imageBase64}] : []);
    var galId    = 'gal-dish-'+dish.id;

    // Rasm qismi
    var imgSection;
    if (!imgs.length) {
      imgSection = '<div class="car-card-img-placeholder">&#127859;</div>';
    } else if (imgs.length === 1) {
      imgSection = '<img class="car-card-img" src="'+imgs[0].base64+'" alt="rasm">';
    } else {
      imgSection = '<div class="car-gal-wrap" id="'+galId+'">'
        + '<img class="car-card-img" id="'+galId+'-img" src="'+imgs[0].base64+'" data-idx="0" alt="rasm">'
        + '<button class="car-gal-btn car-gal-prev" onclick="carGalNav(\''+galId+'\',-1)">&#8249;</button>'
        + '<button class="car-gal-btn car-gal-next" onclick="carGalNav(\''+galId+'\',1)">&#8250;</button>'
        + '</div>';
    }

    // Dots
    var dotsHtml = '';
    if (imgs.length > 1) {
      dotsHtml = '<div class="car-gal-dots">'
        + imgs.map(function(_, i) {
            return '<span id="'+galId+'-dot-'+i+'" onclick="carGalNav(\''+galId+'\','+i+')" class="car-gal-dot'+(i===0?' active':'')+'" ></span>';
          }).join('')
        + '</div>';
    } else if (imgs.length === 1) {
      dotsHtml = '<div class="car-gal-dots"><span class="car-gal-dot active"></span></div>';
    }

    return '<div class="car-card">'
      + imgSection
      + dotsHtml
      + '<div class="car-card-body">'
      + '<div class="car-card-category-line">'+(inUse ? '<span class="car-badge-status car-badge-busy">Ijarada</span>' : '<span class="car-badge-status car-badge-free">Bo\'sh</span>')+'</div>'
      + '<div class="car-card-name">'+escHtml(dish.name)+'</div>'
      + '<div class="car-card-plate">'+escHtml(dish.type||'Boshqa')+' &middot; Jami: '+dish.qty+' | Mavjud: '+avail+'</div>'
      + '<div class="car-card-price">'+Number(dish.dayRate||0).toLocaleString()+' so\'m/kun</div>'
      + '<div class="car-card-actions">'
      + '<button class="car-btn-bron" onclick="openDishModal('+dish.id+')">&#9998; Tahrirlash</button>'
      + '</div>'
      + '<button onclick="deleteDish('+dish.id+')" style="margin-top:6px;background:none;border:none;color:#e74c3c;font-size:12px;cursor:pointer;text-align:left;padding:0">&#10005; O\'chirish</button>'
      + '</div>'
      + '</div>';
  }).join('');

  grid.className = 'tools-grid cars-grid';
  cardsEl.style.display = 'none';
  grid.innerHTML = cardsHtml;
}
function renderClothes() {
  var grid    = document.getElementById('tools-grid');
  var cardsEl = document.getElementById('tools-cards');
  if (!grid || !cardsEl) return;
  if (!items.length) {
    grid.innerHTML    = '<div class="empty" style="grid-column:1/-1"><div class="empty-icon">&#129333;</div>Kiyim qo\'shilmagan</div>';
    cardsEl.innerHTML = '<div class="empty"><div class="empty-icon">&#129333;</div>Kiyim qo\'shilmagan</div>';
    cardsEl.style.display = '';
    grid.className = 'tools-grid cars-grid';
    return;
  }

  var cardsHtml = items.map(function(cloth) {
    var inUseQty = getItemInUseQty(cloth.id);
    var avail    = (cloth.qty || 0) - inUseQty;
    var inUse    = inUseQty > 0;
    var imgs     = cloth.images && cloth.images.length ? cloth.images : (cloth.imageBase64 ? [{base64: cloth.imageBase64}] : []);
    var galId    = 'gal-cloth-'+cloth.id;
    var meta     = [cloth.size, cloth.type].filter(Boolean).map(escHtml).join(' / ');

    // Rasm qismi
    var imgSection;
    if (!imgs.length) {
      imgSection = '<div class="car-card-img-placeholder">&#129333;</div>';
    } else if (imgs.length === 1) {
      imgSection = '<img class="car-card-img" src="'+imgs[0].base64+'" alt="rasm">';
    } else {
      imgSection = '<div class="car-gal-wrap" id="'+galId+'">'
        + '<img class="car-card-img" id="'+galId+'-img" src="'+imgs[0].base64+'" data-idx="0" alt="rasm">'
        + '<button class="car-gal-btn car-gal-prev" onclick="carGalNav(\''+galId+'\',-1)">&#8249;</button>'
        + '<button class="car-gal-btn car-gal-next" onclick="carGalNav(\''+galId+'\',1)">&#8250;</button>'
        + '</div>';
    }

    // Dots
    var dotsHtml = '';
    if (imgs.length > 1) {
      dotsHtml = '<div class="car-gal-dots">'
        + imgs.map(function(_, i) {
            return '<span id="'+galId+'-dot-'+i+'" onclick="carGalNav(\''+galId+'\','+i+')" class="car-gal-dot'+(i===0?' active':'')+'" ></span>';
          }).join('')
        + '</div>';
    } else if (imgs.length === 1) {
      dotsHtml = '<div class="car-gal-dots"><span class="car-gal-dot active"></span></div>';
    }

    return '<div class="car-card">'
      + imgSection
      + dotsHtml
      + '<div class="car-card-body">'
      + '<div class="car-card-category-line">'+(inUse ? '<span class="car-badge-status car-badge-busy">Ijarada</span>' : '<span class="car-badge-status car-badge-free">Bo\'sh</span>')+'</div>'
      + '<div class="car-card-name">'+escHtml(cloth.name)+'</div>'
      + '<div class="car-card-plate">'+(meta ? meta+' &middot; ' : '')+'Jami: '+cloth.qty+' | Mavjud: '+avail+'</div>'
      + '<div class="car-card-price">'+Number(cloth.dayRate||0).toLocaleString()+' so\'m/kun</div>'
      + '<div class="car-card-actions">'
      + '<button class="car-btn-bron" onclick="openClothesModal('+cloth.id+')">&#9998; Tahrirlash</button>'
      + '</div>'
      + '<button onclick="deleteClothes('+cloth.id+')" style="margin-top:6px;background:none;border:none;color:#e74c3c;font-size:12px;cursor:pointer;text-align:left;padding:0">&#10005; O\'chirish</button>'
      + '</div>'
      + '</div>';
  }).join('');

  grid.className = 'tools-grid cars-grid';
  cardsEl.style.display = 'none';
  grid.innerHTML = cardsHtml;
}

/* ===== PAGE NAVIGATION ===== */
function showPage(id, el) {
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});
  document.querySelectorAll('.nav-item').forEach(function(n){n.classList.remove('active');});
  document.querySelectorAll('.bn-item').forEach(function(n){n.classList.remove('active');});
  document.getElementById('page-'+id).classList.add('active');
  if (el) el.classList.add('active');
  if (id === 'sozlamalar') {
    setTimeout(function() {
      renderWorkerSettings();
      var el = document.getElementById('settings-username');
      if (el) el.textContent = currentUser || '—';
      var catEl = document.getElementById('settings-category');
      if (catEl) {
        catEl.textContent = getCategoryInfo(currentCategory).nav || '—';
      }
    }, 0);
  }
  if (id === 'asboblar') {
    renderCatalogPage();
  }
  renderAll();
}

// Orqaga tugmasi bosilganda sahifani almashtirish
window.addEventListener('popstate', function(e) {
  if (e.state && e.state.page) {
    showPage(e.state.page, null, true);
  } else {
    showPage('dashboard', null, true);
  }
});

/* ===== TOAST ===== */
function showToast(msg, type) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'show ' + (type||'');
  setTimeout(function(){t.className='';}, 3000);
}

/* ===== MODAL CLOSE ===== */
document.querySelectorAll('.modal-overlay').forEach(function(el) {
  el.addEventListener('click', function(e){ if(e.target===el) el.classList.remove('open'); });
});
document.addEventListener('keydown', function(e) {
  if (e.key==='Escape') document.querySelectorAll('.modal-overlay.open').forEach(function(el){el.classList.remove('open');});
});

// Contact popup
function toggleContactPopup() {
  var popup = document.getElementById('contact-popup');
  if (popup) popup.classList.toggle('open');
}
// Tashqariga bosganda yopilsin
document.addEventListener('click', function(e) {
  var popup = document.getElementById('contact-popup');
  if (!popup) return;
  var logoBtn = document.querySelector('.logo-btn');
  if (popup.classList.contains('open') && !popup.contains(e.target) && logoBtn && !logoBtn.contains(e.target)) {
    popup.classList.remove('open');
  }
});

checkSession();

checkSession();

// Service Worker ro'yxatdan o'tkazish (PWA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js').catch(function(err) {
      console.log('SW registration failed:', err);
    });
  });
}

// Scroll tugmalari — main elementni scroll qilish
function scrollMainBy(amount) {
  var mainEl = document.querySelector('main');
  if (mainEl) {
    mainEl.scrollBy({ top: amount, behavior: 'smooth' });
  } else {
    window.scrollBy({ top: amount, behavior: 'smooth' });
  }
}
