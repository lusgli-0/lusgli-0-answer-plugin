if (!panel) {
  console.error('[lite-runtime-demo] panel is unavailable');
  return;
}

var countEl = panel.querySelector('[data-lrd-count]');
var statusEl = panel.querySelector('[data-lrd-status]');
var overlayStateEl = panel.querySelector('[data-lrd-overlay-state]');
var opensEl = panel.querySelector('[data-lrd-opens]');
var inputEl = panel.querySelector('[data-lrd-input]');
var previewEl = panel.querySelector('[data-lrd-preview]');
var addButton = panel.querySelector('[data-lrd-add]');
var resetButton = panel.querySelector('[data-lrd-reset]');
var updateButton = panel.querySelector('[data-lrd-update]');
var closeButton = panel.querySelector('.ans-lrd-close');
if (
  !countEl ||
  !statusEl ||
  !overlayStateEl ||
  !opensEl ||
  !inputEl ||
  !previewEl ||
  !addButton ||
  !resetButton ||
  !updateButton ||
  !closeButton
) {
  console.error('[lite-runtime-demo] required panel elements are missing');
  return;
}

var clicks = 0;
var opens = 0;
var closeEffectCanvas = null;
var closeEffectFrame = 0;

function clearCloseEffect() {
  if (closeEffectFrame) {
    cancelAnimationFrame(closeEffectFrame);
    closeEffectFrame = 0;
  }
  if (closeEffectCanvas) {
    closeEffectCanvas.remove();
    closeEffectCanvas = null;
  }
}

function playCloseEffect() {
  clearCloseEffect();

  var rect = panel.getBoundingClientRect();
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText =
    'position:fixed;inset:0;width:100%;height:100%;z-index:1060;pointer-events:none';
  document.body.appendChild(canvas);
  closeEffectCanvas = canvas;
  ctx.scale(dpr, dpr);

  var centerX = rect.left + rect.width / 2;
  var centerY = rect.top + rect.height / 2;
  var colors = ['#fff2ae', '#ffd166', '#ff8fab', '#9bf6ff', '#c8b6ff'];
  var particles = [];
  var particleCount = 64;
  var startedAt = performance.now();
  var lastFrameAt = startedAt;
  var duration = 1000;

  for (var i = 0; i < particleCount; i += 1) {
    var angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.28;
    var speed = 120 + Math.random() * 330;
    particles.push({
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 1.5 + Math.random() * 3.5,
      spin: (Math.random() - 0.5) * 9,
      rotation: Math.random() * Math.PI,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }

  function draw(now) {
    var elapsed = now - startedAt;
    var progress = Math.min(elapsed / duration, 1);
    var seconds = Math.min((now - lastFrameAt) / 1000, 0.05);
    lastFrameAt = now;
    var width = window.innerWidth;
    var height = window.innerHeight;
    ctx.clearRect(0, 0, width, height);

    var ringProgress = Math.min(progress * 1.2, 1);
    ctx.save();
    ctx.globalAlpha = (1 - ringProgress) * 0.9;
    ctx.strokeStyle = '#ffe7a3';
    ctx.lineWidth = 2.5 * (1 - ringProgress) + 0.5;
    ctx.shadowColor = '#ffb84d';
    ctx.shadowBlur = 22 * (1 - ringProgress);
    ctx.beginPath();
    ctx.arc(centerX, centerY, 12 + ringProgress * 150, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    for (var j = 0; j < particles.length; j += 1) {
      var particle = particles[j];
      var life = Math.max(0, 1 - progress * (0.8 + (j % 5) * 0.08));
      particle.x += particle.vx * seconds;
      particle.y += particle.vy * seconds + 150 * seconds * seconds;
      particle.vy += 300 * seconds;
      particle.rotation += particle.spin * seconds;

      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      ctx.globalAlpha = life;
      ctx.fillStyle = particle.color;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(0, -particle.size);
      ctx.lineTo(particle.size * 0.45, -particle.size * 0.35);
      ctx.lineTo(particle.size, 0);
      ctx.lineTo(particle.size * 0.35, particle.size * 0.4);
      ctx.lineTo(0, particle.size);
      ctx.lineTo(-particle.size * 0.35, particle.size * 0.4);
      ctx.lineTo(-particle.size, 0);
      ctx.lineTo(-particle.size * 0.45, -particle.size * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    if (progress < 1 && closeEffectCanvas === canvas) {
      closeEffectFrame = requestAnimationFrame(draw);
    } else {
      clearCloseEffect();
    }
  }

  closeEffectFrame = requestAnimationFrame(draw);
}

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
  scope.listen(panel, 'mouseleave', function () {
    moving = false;
    panel.style.transition = 'transform .5s cubic-bezier(.23,1,.32,1)';
    panel.style.transform = 'rotateX(0deg) rotateY(0deg)';
  });
  scope.onCleanup(function () {
    moving = false;
    panel.style.transition = 'transform .5s cubic-bezier(.23,1,.32,1)';
    panel.style.transform = 'rotateX(0deg) rotateY(0deg)';
  });
  scope.listen(addButton, 'click', function () {
    clicks += 1;
    countEl.textContent = String(clicks);
  });

  scope.listen(resetButton, 'click', function () {
    clicks = 0;
    countEl.textContent = '0';
  });

  scope.listen(updateButton, 'click', function () {
    previewEl.textContent = inputEl.value.trim() || '请输入一些内容';
  });

  scope.listen(closeButton, 'click', function () {
    var backdrop = overlay.querySelector('.ans-ov-backdrop');
    if (backdrop) backdrop.click();
  });
  clearCloseEffect();
  opens += 1;
  opensEl.textContent = String(opens);
  statusEl.textContent = '已打开';
  overlayStateEl.textContent = overlay.classList.contains('is-open') ? '显示中' : '已隐藏';
});

api.onClose(function () {
  statusEl.textContent = '已关闭';
  overlayStateEl.textContent = overlay.classList.contains('is-open') ? '显示中' : '已隐藏';
  playCloseEffect();
});
