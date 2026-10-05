if (!panel) {
  console.error('[guide] panel is unavailable');
  return;
}

var wrap =
  panel.querySelector('[data-ans-particles]') ||
  panel.querySelector('.ans-guide-particles');
if (!wrap) {
  console.error('[guide] particle container is missing');
  return;
}

var particles = [];
var raf = 0;
var last = 0;
var hideTimer = 0;

function removeParticles() {
  if (raf) {
    cancelAnimationFrame(raf);
    raf = 0;
  }
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = 0;
  }
  particles.forEach(function (el) {
    el.remove();
  });
  particles = [];
}

function spawn() {
  if (particles.length) return;
  var rect = panel.getBoundingClientRect();
  var width = rect.width || 800;
  var height = rect.height || 520;
  var i;
  for (i = 0; i < 10; i++) {
    var dot = document.createElement('span');
    dot.className = 'ans-guide-dot';
    dot._x = Math.random() * width;
    dot._y = Math.random() * height;
    dot._vx = (Math.random() - 0.5) * 36;
    dot._vy = (Math.random() - 0.5) * 36;
    dot.style.left = dot._x + 'px';
    dot.style.top = dot._y + 'px';
    wrap.appendChild(dot);
    particles.push(dot);
  }
  for (i = 0; i < 3; i++) {
    var orb = document.createElement('span');
    orb.className = 'ans-guide-orb';
    var size = 200 + Math.random() * 120;
    orb.style.width = size + 'px';
    orb.style.height = size + 'px';
    orb._x = Math.random() * width;
    orb._y = Math.random() * height;
    orb._vx = (Math.random() - 0.5) * 22;
    orb._vy = (Math.random() - 0.5) * 22;
    orb.style.left = orb._x + 'px';
    orb.style.top = orb._y + 'px';
    wrap.appendChild(orb);
    particles.push(orb);
  }
}

function step(now) {
  var dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  var rect = panel.getBoundingClientRect();
  var width = rect.width;
  var height = rect.height;
  if (!width || !height) {
    raf = 0;
    return;
  }
  for (var i = 0; i < particles.length; i++) {
    var el = particles[i];
    var margin = 16;
    el._x += el._vx * dt;
    el._y += el._vy * dt;
    if (el._x < -margin) el._x = width + margin;
    else if (el._x > width + margin) el._x = -margin;
    if (el._y < -margin) el._y = height + margin;
    else if (el._y > height + margin) el._y = -margin;
    el.style.left = el._x + 'px';
    el.style.top = el._y + 'px';
  }
  raf = requestAnimationFrame(step);
}

function show() {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = 0;
  }
  spawn();
  void panel.offsetWidth;
  particles.forEach(function (el) {
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
    raf = 0;
  }
  particles.forEach(function (el) {
    el.style.opacity = '0';
  });
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = window.setTimeout(removeParticles, 650);
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
    scope.listen(panel, 'mouseenter', show);
    scope.listen(panel, 'mouseleave', hide);
    scope.onCleanup(removeParticles);
  });
} else {
  console.error('[guide] lifecycle API is unavailable');
}
