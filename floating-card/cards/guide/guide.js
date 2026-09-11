/**
 * 社区公告自己的粒子。壳已经建好 overlay，这里只往 panel 里塞光点。
 *
 * 怎么改：
 *  - 小绿点数量：下面 for 循环的 10
 *  - 大光斑数量 / 直径：第二个 for 的 3，以及 size = 120 + 随机
 *  - 颜色在 guide.css 的 .ans-guide-dot / .ans-guide-orb
 * 绿斑只在鼠标进入面板时出现（mouseenter），离开就拆掉。
 * 改完保存文件，刷新前台即可（后端会从 cards/ 再读一遍）。改 js 后必须整页刷新，不要只靠热更新。
 */
if (!panel) return;
if (api && api.bindTilt) api.bindTilt(panel);

var wrap =
  panel.querySelector('[data-ans-particles]') ||
  panel.querySelector('.ans-guide-particles');
if (!wrap) return;

var arr = [];
var raf = null;
var last = 0;
var hideTimer = null;

function spawn() {
  if (arr.length) return;
  var r = panel.getBoundingClientRect();
  var W = r.width || 800;
  var H = r.height || 520;
  var i;
  // 小光点
  for (i = 0; i < 10; i++) {
    var d = document.createElement('span');
    d.className = 'ans-guide-dot';
    d._x = Math.random() * W;
    d._y = Math.random() * H;
    // 小光点速度
    d._vx = (Math.random() - 0.5) * 36;
    d._vy = (Math.random() - 0.5) * 36;
    d.style.left = d._x + 'px';
    d.style.top = d._y + 'px';
    wrap.appendChild(d);
    arr.push(d);
  }
  // 大光斑
  for (i = 0; i < 3; i++) {
    var o = document.createElement('span');
    o.className = 'ans-guide-orb';
     // 光斑直径
    var size = 200 + Math.random() * 120;
    o.style.width = size + 'px';
    o.style.height = size + 'px';
    o._x = Math.random() * W;
    o._y = Math.random() * H;
    // 光斑速度
    o._vx = (Math.random() - 0.5) * 22;
    o._vy = (Math.random() - 0.5) * 22;
    o.style.left = o._x + 'px';
    o.style.top = o._y + 'px';
    wrap.appendChild(o);
    arr.push(o);
  }
}

function step(now) {
  var dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  var r = panel.getBoundingClientRect();
  var W = r.width;
  var H = r.height;
  if (!W || !H) {
    raf = null;
    return;
  }
  for (var i = 0; i < arr.length; i++) {
    var el = arr[i];
    var m = 16;
    el._x += el._vx * dt;
    el._y += el._vy * dt;
    if (el._x < -m) el._x = W + m;
    else if (el._x > W + m) el._x = -m;
    if (el._y < -m) el._y = H + m;
    else if (el._y > H + m) el._y = -m;
    el.style.left = el._x + 'px';
    el.style.top = el._y + 'px';
  }
  raf = requestAnimationFrame(step);
}

function show() {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  spawn();
  void panel.offsetWidth;
  arr.forEach(function (el) {
    el.style.opacity = el.className.indexOf('orb') > -1 ? '.7' : '.9';
  });
  if (!raf) {
    last = performance.now();
    raf = requestAnimationFrame(step);
  }
}

function hide() {
  if (raf) {
    cancelAnimationFrame(raf);
    raf = null;
  }
  arr.forEach(function (el) {
    el.style.opacity = '0';
  });
  var old = arr;
  arr = [];
  hideTimer = setTimeout(function () {
    old.forEach(function (el) {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    hideTimer = null;
  }, 650);
}

panel.addEventListener('mouseenter', show);
panel.addEventListener('mouseleave', hide);
if (api && api.onClose) api.onClose(hide);
