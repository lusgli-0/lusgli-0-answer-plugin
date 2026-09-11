/**
 * 符文占卜自己的每日一签。壳已经建好 overlay，这里只往面板空位填签。
 *
 * 约定：壳用 new Function('panel','overlay','api', 本文件) 调用。
 * api.data.deck / api.data.storage_key 来自这张卡的 data（牌组在 deck.json，
 * 后台没填时 Go 会补上）。api.todayKey() 是本地日历日，和倒计时同一套时区。
 * api.onOpen：每次打开 overlay 调一次（读缓存或抽新签）。
 * api.onClose：关掉时清 interval，别在后台空转。
 */
if (!panel) return;
if (api && api.bindTilt) api.bindTilt(panel);

var dateEl = panel.querySelector('.ans-rune-date');
var sealEl = panel.querySelector('.ans-rune-seal');
var catEl = panel.querySelector('.ans-rune-cat');
var topicEl = panel.querySelector('.ans-rune-topic');
var nameEl = panel.querySelector('.ans-rune-name');
var meaningEl = panel.querySelector('.ans-rune-meaning');
var guideEl = panel.querySelector('.ans-rune-guide');
var countdownEl = panel.querySelector('.ans-rune-countdown');
if (!dateEl || !sealEl) return;

var data = (api && api.data) || {};
var deck = Array.isArray(data.deck) ? data.deck : [];
var storageKey =
  typeof data.storage_key === 'string' && data.storage_key
    ? data.storage_key
    : 'ans-rune-daily';

function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}

function todayKey() {
  if (api && typeof api.todayKey === 'function') return api.todayKey();
  var d = new Date();
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

function normalize(raw) {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    var row = raw.map(function (x) {
      return String(x == null ? '' : x);
    });
    if (!row.length) return null;
    return [
      row[0] || '',
      row[1] || '',
      row[2] || '',
      row[3] || '',
      row[4] || '',
      row[5] || '',
      row[6] || '',
    ];
  }
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

var timer = null;

function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function startCountdown() {
  if (timer) clearInterval(timer);
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
  timer = setInterval(tick, 1000);
}

function refresh() {
  var today = todayKey();
  var idx = null;

  try {
    var raw = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (raw && raw.date === today && typeof raw.index === 'number') {
      idx = raw.index;
    }
  } catch (e) {
    /* JSON 坏了当没抽过 */
  }

  if (idx === null) {
    var len = deck.length;
    if (!len) {
      dateEl.textContent = today + ' · 每日一签';
      sealEl.innerHTML = '';
      if (catEl) catEl.textContent = '';
      if (topicEl) topicEl.textContent = '';
      if (nameEl) nameEl.textContent = '';
      if (meaningEl) meaningEl.textContent = '牌组为空';
      if (guideEl) guideEl.textContent = '';
      startCountdown();
      return;
    }
    idx = Math.floor(Math.random() * len);
    try {
      localStorage.setItem(storageKey, JSON.stringify({ date: today, index: idx }));
    } catch (e) {
      /* 隐私模式：当面这张签照样能看 */
    }
  }

  if (idx < 0 || idx >= deck.length) {
    idx = Math.max(0, deck.length - 1);
  }

  var it = normalize(deck[idx]);
  if (!it) {
    dateEl.textContent = today + ' · 每日一签';
    startCountdown();
    return;
  }

  dateEl.textContent = today + ' · 每日一签';
  sealEl.innerHTML = '<svg viewBox="0 0 24 24"><path d="' + it[0] + '"/></svg>';
  if (catEl) catEl.textContent = it[4];
  if (topicEl) topicEl.textContent = it[3];
  if (nameEl) nameEl.textContent = it[1] + ' · ' + it[2];
  if (meaningEl) meaningEl.textContent = it[5];
  if (guideEl) guideEl.textContent = '今日功课：' + it[6];
  startCountdown();
}

if (api) {
  if (api.onOpen) api.onOpen(refresh);
  if (api.onClose) api.onClose(stop);
}
