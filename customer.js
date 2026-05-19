'use strict';
var shops = [];
var items = [];
var currentShop = '';
var currentCategory = 'all';
var customerLat = null;
var customerLng = null;
window.addEventListener('DOMContentLoaded', initCustomerPage);
function initCustomerPage() {
  renderCategories();
  var shop = getQueryParam('shop') || '';
  if (shop) {
    document.getElementById('shop-input').value = shop;
    currentShop = shop.toLowerCase();
  }
  loadCustomerLocationFromQuery();
  loadAllData();
}
function getQueryParam(name) {
  var params = new URLSearchParams(window.location.search);
  return params.get(name) || '';
}
function loadCustomerLocationFromQuery() {
  var lat = getQueryParam('lat');
  var lng = getQueryParam('lng');
  if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
    setCustomerLocation(parseFloat(lat), parseFloat(lng));
  }
}
function loadShopFromInput() {
  var shop = (document.getElementById('shop-input').value || '').trim().toLowerCase();
  currentShop = shop;
  if (currentShop && currentShop.indexOf(' ') !== -1) {
    updateStatus('Do‘kon nomida bo‘shliq bo‘lmasligi kerak. Foydalanuvchi nomini kiriting.');
    return;
  }
  loadAllData();
}
function detectCustomerLocation() {
  if (!navigator.geolocation) {
    updateStatus('Brauzeringiz geolokatsiyani qo‘llab-quvvatlamaydi.');
    return;
  }
  updateStatus('Joylashuv aniqlanyapti...');
  navigator.geolocation.getCurrentPosition(function(position) {
    setCustomerLocation(position.coords.latitude, position.coords.longitude);
    updateStatus('Joylashuv topildi. Manzil aniqlanmoqda...');
    reverseCustomerGeocoding(position.coords.latitude, position.coords.longitude);
  }, function(error) {
    updateStatus('Joylashuvni aniqlash xatosi: ' + (error.message || 'aniq emas'));
  }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 });
}

function reverseCustomerGeocoding(lat, lng) {
  var summary = document.getElementById('customer-summary');
  if (summary) { summary.textContent = 'Manzil aniqlanmoqda...'; }
  fetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=' + encodeURIComponent(lat) + '&lon=' + encodeURIComponent(lng))
    .then(function(res){ if(!res.ok) throw new Error('HTTP '+res.status); return res.json(); })
    .then(function(data){
      var address = '';
      if (data && data.address) {
        var a = data.address;
        var parts = [a.road || a.pedestrian || a.footway, a.house_number, a.suburb || a.neighbourhood || a.city_district, a.city || a.town || a.village, a.state, a.country];
        address = parts.filter(function(p){return !!p;}).join(', ');
      } else if (data && data.display_name) {
        address = data.display_name;
      }
      var summaryText = (address ? address + ' — ' : '') + 'Koordinatalar: ' + lat.toFixed(6) + ', ' + lng.toFixed(6) + '. '
        + 'Xaritada tekshirish uchun: ' + ('https://maps.google.com?q=' + encodeURIComponent(lat + ',' + lng));
      if (summary) { summary.innerHTML = summaryText; }
    })
    .catch(function(err){ if (summary) { summary.textContent = 'Manzil aniqlanmadi. Koordinatalar: ' + lat.toFixed(6) + ', ' + lng.toFixed(6); } });
}
function applyCustomerLocation() {
  var lat = parseFloat((document.getElementById('customer-lat').value || '').trim());
  var lng = parseFloat((document.getElementById('customer-lng').value || '').trim());
  if (isNaN(lat) || isNaN(lng)) {
    updateStatus('Iltimos, to‘g‘ri Lat va Lng kiriting.');
    return;
  }
  setCustomerLocation(lat, lng);
  updateStatus('Joylashuv yangilandi. Yaqin ijaralar qayta tartiblandi.');
}
function setCustomerLocation(lat, lng) {
  customerLat = Number(lat);
  customerLng = Number(lng);
  updateLocationInputs(customerLat, customerLng);
  if (items.length > 0) {
    updateItemDistances();
    renderCatalog();
  }
}
function updateLocationInputs(lat, lng) {
  var latEl = document.getElementById('customer-lat');
  var lngEl = document.getElementById('customer-lng');
  if (latEl) latEl.value = lat.toFixed(6);
  if (lngEl) lngEl.value = lng.toFixed(6);
}
function updateStatus(text) {
  var el = document.getElementById('customer-status');
  if (el) { el.textContent = text; }
}
function loadAllData() {
  shops = getAllShops();
  items = [];
  var matchingShop = null;
  if (currentShop) {
    matchingShop = shops.find(function(shop) { return shop.username === currentShop; });
  }
  loadItemsForShops().then(function() {
    if (items.length === 0) {
      items = getDemoItems();
      if (currentShop && !matchingShop) {
        updateStatus('Do‘kon topilmadi: ' + currentShop + '. Mavjud do‘konlar demo sifatida ko‘rsatilmoqda.');
      } else {
        updateStatus('Do‘kon maʼlumotlari topilmadi, demo katalog ko‘rsatilmoqda.');
      }
    } else {
      var msg = 'Yaqin atrofdagi ijaralar yuklandi. Do‘konlar: ' + shops.length + ', mahsulotlar: ' + items.length + '.';
      if (currentShop) {
        msg += ' Siz tanlagan do‘kon: ' + currentShop + (matchingShop ? ' (topildi).' : ' (topilmadi).');
      }
      updateStatus(msg);
    }
    if (customerLat !== null && customerLng !== null) {
      updateItemDistances();
    }
    renderCatalog();
  });
}
function getAllShops() {
  var raw = localStorage.getItem('ijarabot_users');
  if (!raw) return [];
  var users = {};
  try { users = JSON.parse(raw) || {}; } catch (e) { users = {}; }
  return Object.keys(users).map(function(username) {
    var user = users[username] || {};
    return {
      username: username,
      label: username,
      phone: user.phone || '',
      locationLat: user.locationLat !== undefined ? (parseFloat(user.locationLat) || null) : null,
      locationLng: user.locationLng !== undefined ? (parseFloat(user.locationLng) || null) : null,
      address: user.locationAddress || '',
      category: user.category || ''
    };
  });
}
function loadItemsForShops() {
  var promises = shops.map(function(shop) {
    return loadItemsForShop(shop);
  });
  return Promise.all(promises);
}
function loadItemsForShop(shop) {
  return new Promise(function(resolve) {
    var shopItems = [];
    var itemKeys = ['items', 'tools'];
    itemKeys.forEach(function(keyName) {
      var key = 'ijarabot_' + shop.username + '_' + keyName;
      var stored = localStorage.getItem(key);
      var loaded = [];
      try { loaded = JSON.parse(stored) || []; } catch (e) { loaded = []; }
      loaded.forEach(function(item) {
        var normalized = Object.assign({}, item, {
          shopUsername: shop.username,
          shopName: shop.label,
          shopPhone: shop.phone,
          shopAddress: shop.address,
          shopLat: shop.locationLat,
          shopLng: shop.locationLng,
          shopCategory: shop.category,
          distanceKm: null
        });
        if (keyName === 'tools') {
          normalized.category = 'tools';
          normalized.name = normalized.name || '(Asbob)';
          normalized.dayRate = normalized.dayRate || normalized.price || 0;
        }
        shopItems.push(normalized);
      });
    });
    loadShopRentals(shop.username).then(function(rentals) {
      var rentedCounts = getActiveRentalCounts(rentals, shopItems);
      shopItems.forEach(function(item) {
        item.qty = item.qty !== undefined ? Number(item.qty) : null;
        var key = item.category === 'tools' ? 't_' + item.id : 'i_' + item.id;
        var used = rentedCounts[key] || 0;
        if (item.qty !== null) {
          item.availableQty = Math.max(0, item.qty - used);
        } else {
          item.availableQty = null;
        }
      });
      if (!currentShop || currentShop === shop.username) {
        items = items.concat(shopItems);
      }
      Promise.all(shopItems.map(function(item) {
        return loadItemImages(shop.username, item);
      })).then(function() {
        resolve();
      });
    }).catch(function() {
      if (!currentShop || currentShop === shop.username) {
        items = items.concat(shopItems);
      }
      Promise.all(shopItems.map(function(item) {
        return loadItemImages(shop.username, item);
      })).then(function() {
        resolve();
      });
    });
  });
}

function loadShopRentals(shopUsername) {
  return new Promise(function(resolve) {
    var stored = localStorage.getItem('ijarabot_' + shopUsername + '_rentals');
    if (!stored) { resolve([]); return; }
    try {
      resolve(JSON.parse(stored) || []);
    } catch (e) {
      resolve([]);
    }
  });
}

function getRentalItemKey(item, shopItems) {
  var id = item.toolId !== undefined ? item.toolId : (item.itemId !== undefined ? item.itemId : item.id);
  if (id === undefined || id === null) return null;
  if (item.toolId !== undefined) {
    return 't_' + id;
  }
  if (shopItems && shopItems.some(function(shopItem) { return shopItem.category === 'tools' && String(shopItem.id) === String(id); })) {
    return 't_' + id;
  }
  return 'i_' + id;
}

function getActiveRentalCounts(rentals, shopItems) {
  var counts = {};
  (rentals || []).filter(function(r) {
    return r.status === 'active' || r.status === 'partial';
  }).forEach(function(rental) {
    var activeItems = getRentalActiveItems(rental, shopItems);
    activeItems.forEach(function(item) {
      var key = getRentalItemKey(item, shopItems);
      if (!key) return;
      counts[key] = (counts[key] || 0) + (Number(item.qty) || 0);
    });
  });
  return counts;
}

function getRentalActiveItems(rental, shopItems) {
  var returnedQty = {};
  (rental.returns || []).forEach(function(ret) {
    (ret.items || []).forEach(function(item) {
      var key = getRentalItemKey(item, shopItems);
      if (!key) return;
      returnedQty[key] = (returnedQty[key] || 0) + Number(item.qty || 0);
    });
  });
  return (rental.items || []).map(function(item) {
    var key = getRentalItemKey(item, shopItems);
    if (!key) return null;
    var qty = Number(item.qty || 0);
    var remaining = Math.max(0, qty - (returnedQty[key] || 0));
    return remaining > 0 ? Object.assign({}, item, { qty: remaining }) : null;
  }).filter(Boolean);
}
function loadItemImages(shop, item) {
  return idbLoadImages('ijarabot_' + shop + '_img_' + item.id, shop).then(function(imgs) {
    if (imgs && imgs.length) {
      item.images = imgs.map(function(img) { return img.base64 || img.data || null; }).filter(Boolean);
      item.imageBase64 = item.images[0] || null;
    } else {
      item.images = [];
      item.imageBase64 = null;
    }
  });
}
function updateItemDistances() {
  items.forEach(function(item) {
    if (customerLat !== null && customerLng !== null && item.shopLat !== null && item.shopLng !== null) {
      item.distanceKm = haversineDistance(customerLat, customerLng, item.shopLat, item.shopLng);
    } else {
      item.distanceKm = null;
    }
  });
}
function renderCategories() {
  var categories = [
    { key: 'all', label: 'Barchasi' },
    { key: 'tools', label: 'Asboblar' },
    { key: 'cars', label: 'Avtomobillar' },
    { key: 'dishes', label: 'Idish-tovoqlar' },
    { key: 'clothes', label: 'Kiyimlar' },
    { key: 'restaurants', label: 'To‘yxonalar' },
    { key: 'stadiums', label: 'Stadionlar' },
    { key: 'gaming', label: 'Gaming' }
  ];
  var wrapper = document.getElementById('category-buttons');
  if (!wrapper) return;
  wrapper.innerHTML = categories.map(function(cat) {
    return '<button class="btn btn-ghost category-btn' + (cat.key === 'all' ? ' active' : '') + '" onclick="selectCategory(\'' + cat.key + '\', this)">' + cat.label + '</button>';
  }).join('');
}
function selectCategory(categoryKey, button) {
  currentCategory = categoryKey;
  var buttons = document.querySelectorAll('.category-btn');
  buttons.forEach(function(btn) { btn.classList.remove('active'); });
  if (button) { button.classList.add('active'); }
  renderCatalog();
}
function renderCatalog() {
  var query = (document.getElementById('customer-search') ? document.getElementById('customer-search').value : '').trim().toLowerCase();
  var filtered = items.filter(function(item) {
    var name = (item.name || item.plateNumber || '').toLowerCase();
    var note = (item.brand || item.type || item.model || item.category || item.shopCategory || item.shopAddress || '').toLowerCase();
    var matchesSearch = !query || name.indexOf(query) !== -1 || note.indexOf(query) !== -1 || (item.shopName || '').toLowerCase().indexOf(query) !== -1;
    var itemCategory = inferItemCategory(item);
    var matchesCategory = currentCategory === 'all' || itemCategory === currentCategory;
    return matchesSearch && matchesCategory;
  });
  filtered.sort(function(a, b) {
    if (a.distanceKm === null && b.distanceKm === null) return 0;
    if (a.distanceKm === null) return 1;
    if (b.distanceKm === null) return -1;
    return a.distanceKm - b.distanceKm;
  });
  var summary = document.getElementById('customer-summary');
  if (summary) {
    var shopsCount = new Set(filtered.map(function(item) { return item.shopUsername; })).size;
    var locText = (customerLat !== null && customerLng !== null) ? 'Sizning joylashuvingizga yaqin' : 'Joylashuv belgilanmagan';
    summary.textContent = locText + ' — ' + filtered.length + ' ta taklif, ' + shopsCount + ' ta do‘kon.';
  }
  var grid = document.getElementById('catalog-grid');
  var empty = document.getElementById('catalog-empty');
  if (!grid) return;
  if (filtered.length === 0) {
    grid.innerHTML = '';
    if (empty) { empty.style.display = 'block'; }
    return;
  }
  if (empty) { empty.style.display = 'none'; }
  grid.innerHTML = filtered.map(function(item) {
    var title = escHtml(item.name || item.plateNumber || 'Noma’lum');
    var subtitle = escHtml(item.brand || item.type || item.model || item.shopAddress || item.shopName || '');
    var price = fmt(item.dayRate || item.price || item.rate || 0) + '/kun';
    var distance = item.distanceKm !== null ? 'Yaqin: ' + fmtDistance(item.distanceKm) : 'Joylashuv belgilanmagan';
    var shopLabel = escHtml(item.shopName || 'Do‘kon');
    var shopAddress = item.shopAddress || '';
    var shopAddressText = shopAddress ? escHtml(shopAddress) : 'Joylashuv belgilanmagan';
    var hasCoords = item.shopLat !== null && item.shopLng !== null && !isNaN(item.shopLat) && !isNaN(item.shopLng);
    var shopLocationLink = hasCoords ? 'https://maps.google.com?q=' + encodeURIComponent(item.shopLat + ',' + item.shopLng) : '';
    var shopAddressLink = hasCoords ? '<a href="' + shopLocationLink + '" target="_blank" rel="noreferrer" style="color:var(--accent);text-decoration:none;">' + shopAddressText + '</a>' : shopAddressText;
    var shopPhoneRaw = item.shopPhone || '';
    var shopPhone = shopPhoneRaw ? escHtml(shopPhoneRaw) : 'Telefon mavjud emas';
    var phoneLinkNumber = shopPhoneRaw.replace(/[^0-9+]/g, '');
    var phoneLink = shopPhoneRaw ? '<a href="tel:' + escHtml(phoneLinkNumber) + '" style="color:var(--accent);text-decoration:none;">' + shopPhone + '</a>' : shopPhone;
    var availableText = '';
    if (item.availableQty !== null) {
      availableText = 'Qolgan: ' + item.availableQty + ' dona';
    } else if (item.qty !== null) {
      availableText = 'Soni: ' + item.qty + ' dona';
    }
    var imageGallery = '';
    if (item.images && item.images.length) {
      imageGallery = '<div class="tool-image-grid">' + item.images.map(function(src) {
        return '<img src="' + src + '" alt="' + title + '" class="car-img-thumb">';
      }).join('') + '</div>';
    } else {
      imageGallery = '<div class="car-img-placeholder">📷</div>';
    }
    return '<div class="tool-card">'
      + imageGallery
      + '<div class="tool-card-top"><div><div class="tool-name">' + title + '</div><div class="rate-pill" style="margin-top:8px;">' + price + '</div></div></div>'
      + '<div class="tool-actions"><div style="color:var(--muted);font-size:13px;">' + shopLabel + '</div>'
      + (availableText ? '<div style="color:var(--muted);font-size:13px;margin-top:6px;">' + escHtml(availableText) + '</div>' : '')
      + '<div style="color:var(--muted);font-size:13px;margin-top:6px;">Joylashuv: ' + shopAddressLink + '</div>'
      + '<div style="color:var(--muted);font-size:13px;margin-top:6px;">Telefon: ' + phoneLink + ' · ' + distance + '</div></div>'
      + '<button class="btn btn-primary btn-sm" style="margin-top:14px;width:100%;" onclick="contactOwner(\'' + escapeJsString(title) + '\',\'' + escapeJsString(item.shopPhone || '') + '\',\'' + escapeJsString(item.shopLat !== null && item.shopLat !== undefined ? item.shopLat : '') + '\',\'' + escapeJsString(item.shopLng !== null && item.shopLng !== undefined ? item.shopLng : '') + '\',\'' + escapeJsString(item.shopAddress || '') + '\')">Bog\'lanish</button>'
      + '</div>';
  }).join('');
}
function inferItemCategory(item) {
  var category = (item.category || item.type || item.shopCategory || '').toString().toLowerCase();
  if (category.indexOf('tool') !== -1 || category.indexOf('asbob') !== -1) return 'tools';
  if (category.indexOf('car') !== -1 || category.indexOf('avtomobil') !== -1 || item.plateNumber) return 'cars';
  if (category.indexOf('dish') !== -1 || category.indexOf('idish') !== -1 || category.indexOf('tovoq') !== -1) return 'dishes';
  if (category.indexOf('cloth') !== -1 || category.indexOf('kiyim') !== -1) return 'clothes';
  if (category.indexOf('restoran') !== -1 || category.indexOf("to'yxona") !== -1 || category.indexOf('to\'yxona') !== -1) return 'restaurants';
  if (category.indexOf('stadion') !== -1 || category.indexOf('maydon') !== -1 || category.indexOf('stadi') !== -1) return 'stadiums';
  if (category.indexOf('playstation') !== -1 || category.indexOf('plastation') !== -1 || category.indexOf('play station') !== -1 || category.indexOf('kompyuter') !== -1 || category.indexOf('gaming') !== -1 || category.indexOf('pc') !== -1) return 'gaming';
  return 'all';
}
function openRequestModal(itemName) {
  var modal = document.getElementById('request-modal');
  if (!modal) return;
  document.getElementById('request-item').value = itemName;
  document.getElementById('request-name').value = '';
  document.getElementById('request-phone').value = '';
  document.getElementById('request-note').value = '';
  document.getElementById('request-error').textContent = '';
  modal.classList.add('open');
}
function contactOwner(itemName, phone, lat, lng, address) {
  var isMobile = window.matchMedia('(max-width: 768px)').matches;
  var cleanPhone = String(phone || '').replace(/[^0-9+]/g, '');
  if (isMobile && cleanPhone) {
    window.location.href = 'tel:' + cleanPhone;
    return;
  }
  var mapLink = '';
  if (lat && lng) {
    mapLink = 'https://maps.google.com?q=' + encodeURIComponent(lat + ',' + lng);
  } else if (address) {
    mapLink = 'https://maps.google.com/search/' + encodeURIComponent(address);
  }
  if (mapLink) {
    window.open(mapLink, '_blank');
    return;
  }
  var status = document.getElementById('customer-status');
  if (status) {
    status.textContent = isMobile ? 'Telefon raqami mavjud emas' : 'Ijarachi lokatsiyasi mavjud emas';
  }
}
function closeModal() {
  var modal = document.getElementById('request-modal');
  if (!modal) return;
  modal.classList.remove('open');
}
function submitRequest() {
  var name = (document.getElementById('request-name').value || '').trim();
  var phone = (document.getElementById('request-phone').value || '').trim();
  var note = (document.getElementById('request-note').value || '').trim();
  var item = (document.getElementById('request-item').value || '').trim();
  var err = document.getElementById('request-error');
  err.textContent = '';
  if (!name) { err.textContent = 'Iltimos, ismingizni kiriting.'; return; }
  if (!phone) { err.textContent = 'Telefon raqamini kiriting.'; return; }
  var requests = JSON.parse(localStorage.getItem('rentify_customer_requests') || '[]');
  requests.push({ shop: currentShop || 'all', item: item, name: name, phone: phone, note: note, date: new Date().toISOString() });
  localStorage.setItem('rentify_customer_requests', JSON.stringify(requests));
  closeModal();
  updateStatus('So‘rov saqlandi. Do‘kon bilan bog‘lanish uchun ma’lumot yuborildi.');
}
function getDemoItems() {
  return [
    { id: 'demo-1', name: 'Elektr burgʻugʻi', type: 'Asbob', dayRate: 25000, category: 'tools', shopName: 'Demo Do‘kon' },
    { id: 'demo-2', name: 'Oshxona to‘plami', type: 'Idish', dayRate: 18000, category: 'dishes', shopName: 'Demo Do‘kon' },
    { id: 'demo-3', name: 'Chevrolet Spark', brand: 'Spark', dayRate: 120000, category: 'cars', shopName: 'Demo Do‘kon' },
    { id: 'demo-4', name: 'Kuzovli palto', type: 'Kiyim', dayRate: 14000, category: 'clothes', shopName: 'Demo Do‘kon' }
  ];
}
function fmt(n) {
  return Number(n || 0).toLocaleString('uz-UZ') + ' so‘m';
}
function fmtDistance(km) {
  if (km === null || km === undefined) return 'Noma’lum';
  if (km < 1) return Math.round(km * 1000) + ' m';
  return km.toFixed(1) + ' km';
}
function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function escapeJsString(s) {
  return String(s || '').replace(/'/g, "\\'").replace(/\"/g, '\\"');
}
function haversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return null;
  var toRad = function(x) { return x * Math.PI / 180; };
  var dLat = toRad(lat2 - lat1);
  var dLon = toRad(lon2 - lon1);
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
}
function openIDB(shop) {
  return new Promise(function(resolve) {
    if (!shop) { resolve(null); return; }
    var req = indexedDB.open('rentify_' + shop, 1);
    req.onupgradeneeded = function() { resolve(null); };
    req.onsuccess = function(e) { resolve(e.target.result); };
    req.onerror = function() { resolve(null); };
  });
}
function idbLoadImages(key, shop) {
  return openIDB(shop).then(function(db) {
    if (!db) return null;
    return new Promise(function(resolve) {
      var tx = db.transaction('images', 'readonly');
      var req = tx.objectStore('images').get(key);
      req.onsuccess = function() { resolve(req.result ? req.result.images : null); };
      req.onerror = function() { resolve(null); };
    });
  });
}
function loadShopImages(shop) {
  if (!shop || !items || !items.length) return Promise.resolve();
  var promises = items.map(function(item) {
    var key = 'ijarabot_' + shop + '_img_' + item.id;
    return idbLoadImages(key, shop).then(function(imgs) {
      if (imgs && imgs.length) {
        item.imageBase64 = imgs[0].base64 || imgs[0].data || null;
      }
    });
  });
  return Promise.all(promises);
}
