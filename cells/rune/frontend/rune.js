if (!panel) {
  console.error('[rune] panel is unavailable');
  return;
}

var dateEl = panel.querySelector('.ans-rune-date');
var sealEl = panel.querySelector('.ans-rune-seal');
var catEl = panel.querySelector('.ans-rune-cat');
var topicEl = panel.querySelector('.ans-rune-topic');
var nameEl = panel.querySelector('.ans-rune-name');
var meaningEl = panel.querySelector('.ans-rune-meaning');
var guideEl = panel.querySelector('.ans-rune-guide');
var countdownEl = panel.querySelector('.ans-rune-countdown');
var deckEl = panel.querySelector('[data-ans-rune-deck]');
if (!dateEl || !sealEl || !deckEl) {
  console.error('[rune] required panel elements are missing');
  return;
}

var data = (api && api.data) || {};
var deck = Array.isArray(data.deck) ? data.deck : [];
if (!deck.length) {
  try {
    var parsedDeck = JSON.parse(deckEl.textContent || '[]');
    if (Array.isArray(parsedDeck)) {
      deck = parsedDeck;
    } else {
      console.error('[rune] embedded deck must be an array');
    }
  } catch (error) {
    console.error('[rune] failed to parse embedded deck', error);
  }
}
var storageKey =
  typeof data.storage_key === 'string' && data.storage_key
    ? data.storage_key
    : 'ans-rune-daily';

function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}

function todayKey() {
  var d = new Date();
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

function normalize(raw) {
  if (Array.isArray(raw)) {
    return raw.slice(0, 7).map(function (x) {
      return String(x == null ? '' : x);
    });
  }
  if (raw && typeof raw === 'object') {
    return [
      raw.path || '',
      raw.name || '',
      raw.name_zh || '',
      raw.topic || '',
      raw.category || '',
      raw.meaning || '',
      raw.homework || '',
    ];
  }
  return null;
}

function startCountdown(scope) {
  if (!countdownEl) return;
  function tick() {
    var now = new Date();
    var mid = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    var s = Math.max(0, Math.floor((mid.getTime() - now.getTime()) / 1000));
    countdownEl.textContent =
      '距离下次占卜：' +
      pad2(Math.floor(s / 3600)) +
      ':' +
      pad2(Math.floor((s % 3600) / 60)) +
      ':' +
      pad2(s % 60);
  }
  tick();
  scope.setInterval(tick, 1000);
}

function refresh(scope) {
  var today = todayKey();
  var idx = null;

  try {
    var raw = JSON.parse(window.localStorage.getItem(storageKey) || 'null');
    if (raw && raw.date === today && Number.isInteger(raw.index)) {
      idx = raw.index;
    }
  } catch (error) {
    console.warn('[rune] unable to read daily draw from local storage', error);
  }

  if (!deck.length) {
    dateEl.textContent = today + ' · 每日一签';
    sealEl.replaceChildren();
    if (catEl) catEl.textContent = '';
    if (topicEl) topicEl.textContent = '';
    if (nameEl) nameEl.textContent = '';
    if (meaningEl) meaningEl.textContent = '牌组为空';
    if (guideEl) guideEl.textContent = '';
    startCountdown(scope);
    return;
  }

  if (idx === null) {
    idx = Math.floor(Math.random() * deck.length);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ date: today, index: idx }));
    } catch (error) {
      console.warn('[rune] unable to save daily draw to local storage', error);
    }
  }

  if (idx < 0 || idx >= deck.length) idx = Math.max(0, deck.length - 1);
  var it = normalize(deck[idx]);
  if (!it || it.length < 7) {
    console.error('[rune] selected deck entry is invalid');
    dateEl.textContent = today + ' · 每日一签';
    startCountdown(scope);
    return;
  }

  dateEl.textContent = today + ' · 每日一签';
  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', it[0]);
  svg.appendChild(path);
  sealEl.replaceChildren(svg);
  if (catEl) catEl.textContent = it[4];
  if (topicEl) topicEl.textContent = it[3];
  if (nameEl) nameEl.textContent = it[1] + ' · ' + it[2];
  if (meaningEl) meaningEl.textContent = it[5];
  if (guideEl) guideEl.textContent = '今日功课：' + it[6];
  startCountdown(scope);
}

if (api && typeof api.onOpen === 'function') {
  api.onOpen(function (scope) {
    var moving = false;
    scope.listen(panel, 'mousemove', function (event) {
      var rect = panel.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      var px = (event.clientX - rect.left) / rect.width - 0.5;
      var py = (event.clientY - rect.top) / rect.height - 0.5;
      if (!moving) {
        moving = true;
        panel.style.transition = 'none';
      }
      panel.style.transform =
        'rotateX(' + (-py * 8).toFixed(2) + 'deg) rotateY(' + (px * 8).toFixed(2) + 'deg)';
    });
    function resetTilt() {
      moving = false;
      panel.style.transition = 'transform .5s cubic-bezier(.23,1,.32,1)';
      panel.style.transform = 'rotateX(0deg) rotateY(0deg)';
    }
    scope.listen(panel, 'mouseleave', resetTilt);
    scope.onCleanup(resetTilt);
    refresh(scope);
  });
} else {
  console.error('[rune] lifecycle API is unavailable');
}
