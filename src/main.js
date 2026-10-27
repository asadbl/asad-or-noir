import { Watch } from './watch.js';
import { BUILD_STEPS, COMPONENTS, SPECS } from './content.js';

const $ = (sel) => document.querySelector(sel);
const pad = (n) => String(n).padStart(2, '0');
const isTouch = matchMedia('(pointer: coarse)').matches;

/* ---------- Static content ---------- */

$('#atelier-steps').innerHTML = BUILD_STEPS.map(
  (s, i) => `<li data-step="${i}"><span class="n">${pad(i + 1)}</span><span class="t">${s.label}</span></li>`
).join('');

$('#cards').innerHTML = COMPONENTS.map(
  (c, i) => `
  <article class="card" data-index="${i}">
    <div class="card__body">
      <span class="card__index">${pad(i + 1)} / ${pad(COMPONENTS.length)}</span>
      <h3 class="card__title">${c.name}</h3>
      <p class="card__spec">${c.spec}</p>
      <p class="card__text">${c.text}</p>
    </div>
  </article>`
).join('');

$('#spec-list').innerHTML = SPECS.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');

/* ---------- Reveal on scroll ---------- */

const revealObserver = new IntersectionObserver(
  (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('is-visible')),
  { threshold: 0.2 }
);
document.querySelectorAll('.reveal, .card').forEach((el) => revealObserver.observe(el));

/* ---------- Local time chip ---------- */

const timeEl = $('#local-time');
const tickClock = () => {
  const d = new Date();
  timeEl.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
tickClock();
setInterval(tickClock, 250);

/* ---------- 3D watch ---------- */

const watch = new Watch($('#scene'));
const loaderBar = $('#loader-bar');
let fake = 0;
const fakeTimer = setInterval(() => {
  fake = Math.min(0.9, fake + (0.9 - fake) * 0.08);
  loaderBar.style.transform = `scaleX(${fake})`;
}, 60);

let ready = false;
let manualExplode = false;
let activeCard = -1;

watch
  .load()
  .then(() => {
    clearInterval(fakeTimer);
    loaderBar.style.transform = 'scaleX(1)';
    ready = true;
    setTimeout(() => document.body.classList.add('is-loaded'), 350);
    const steps = document.querySelectorAll('#atelier-steps li');
    watch.startIntro(BUILD_STEPS, {
      onStep: (i) => {
        steps.forEach((li, j) => li.classList.toggle('is-active', j === i));
        steps[i].classList.add('is-done');
        $('#atelier-count').textContent = `${pad(i + 1)} / ${pad(BUILD_STEPS.length)}`;
      },
      onDone: () => {
        steps.forEach((li) => li.classList.remove('is-active'));
        document.body.classList.add('intro-done');
      },
    });
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) watch.skipIntro();
  })
  .catch((err) => {
    console.error(err);
    $('.loader__caption').textContent = 'The 3D model could not be loaded. Please refresh.';
  });

$('#skip-intro').addEventListener('click', () => watch.skipIntro());

/* ---------- Stage targets (where the watch sits for each section) ---------- */

const sections = [...document.querySelectorAll('[data-stage]')];

function currentStage() {
  const mid = innerHeight * 0.5;
  let best = sections[0];
  for (const s of sections) {
    const r = s.getBoundingClientRect();
    if (r.top <= mid && r.bottom > mid) best = s;
  }
  return best.dataset.stage;
}

// Half the visible width, in scene units at the watch's depth.
const halfWidth = () => 640 * (innerWidth / innerHeight);

function stageTargets(stage, time) {
  const narrow = innerWidth < 900;
  const hw = halfWidth();
  const sway = Math.sin(time * 0.35) * 0.12;
  const explode = manualExplode ? 1 : 0;

  // Phones: the watch sits in the upper part of the screen and the copy scrolls below it.
  const fit = narrow ? 0.56 : 1;
  const top = narrow ? 545 : 0;

  if (watch.introRunning) {
    return { x: narrow ? 0 : hw * 0.3, y: top, rotY: 0.95 - (1 - Math.min(1, time / 8)) * 0.3, rotX: 0.12, explode: 0, stageZoom: fit };
  }
  switch (stage) {
    case 'anatomy':
      return { x: narrow ? -60 : -hw * 0.44, y: narrow ? 585 : 0, rotY: 0.92 + sway * 0.4, rotX: 0.14, explode: 1, stageZoom: narrow ? 0.42 : 0.8 };
    case 'specs':
      return { x: narrow ? 0 : hw * 0.34, y: top, rotY: -0.5 + sway, rotX: 0.06, explode, stageZoom: fit };
    case 'explore':
      if (narrow) return { x: 0, y: -420, rotY: -0.25 + sway * 0.5, rotX: 0.05, explode, stageZoom: 0.48 * (explode ? 0.62 : 1) };
      return { x: 0, y: explode ? -175 : -70, rotY: -0.25 + sway * 0.5, rotX: 0.05, explode, stageZoom: 0.92 * (explode ? 0.66 : 1) };
    case 'reserve':
      return { x: narrow ? 0 : hw * 0.32, y: top, rotY: -0.65 + sway, rotX: 0.05, explode, stageZoom: fit };
    default:
      return { x: narrow ? 0 : hw * 0.3, y: top, rotY: -0.42 + sway, rotX: 0.06, explode, stageZoom: fit };
  }
}

/* ---------- Anatomy cards drive the highlighted component ---------- */

const cards = [...document.querySelectorAll('.card')];
const cardObserver = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) setActiveCard(Number(e.target.dataset.index));
    }
  },
  { rootMargin: '-45% 0px -45% 0px' }
);
cards.forEach((c) => cardObserver.observe(c));

function setActiveCard(i) {
  if (i === activeCard) return;
  activeCard = i;
  cards.forEach((c, j) => c.classList.toggle('is-active', j === i));
  watch.setActiveParts(i >= 0 ? COMPONENTS[i].parts : []);
}

/* ---------- Controls ---------- */

const zoomLabel = $('#zoom-level');
const explodeBtn = $('#explode-btn');
const spinBtn = $('#spin-btn');

function setExplode(on) {
  manualExplode = on;
  explodeBtn.setAttribute('aria-pressed', String(on));
  explodeBtn.textContent = on ? 'Assemble' : 'Explode';
}

function setSpin(on) {
  watch.setSpin(on);
  spinBtn.setAttribute('aria-pressed', String(on));
}

const actions = {
  'zoom-in': () => watch.zoomBy(1.18),
  'zoom-out': () => watch.zoomBy(1 / 1.18),
  explode: () => setExplode(!manualExplode),
  spin: () => setSpin(!watch.spinOn),
  reset: () => {
    watch.reset();
    setExplode(false);
    setSpin(false);
  },
};

document.querySelector('.dock').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (btn) actions[btn.dataset.action]?.();
});

addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea')) return;
  if (e.key === '+' || e.key === '=') actions['zoom-in']();
  else if (e.key === '-' || e.key === '_') actions['zoom-out']();
  else if (e.key === 'e' || e.key === 'E') actions.explode();
  else if (e.key === 'r' || e.key === 'R') actions.reset();
});

// Trackpad pinch arrives as ctrl+wheel; plain wheel keeps scrolling the page.
addEventListener(
  'wheel',
  (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    watch.zoomBy(Math.exp(-e.deltaY * 0.01));
  },
  { passive: false }
);

// Touch pinch on the canvas.
let pinchDist = 0;
const canvas = $('#scene');
canvas.addEventListener('touchstart', (e) => {
  if (e.touches.length === 2) pinchDist = touchDist(e.touches);
});
canvas.addEventListener(
  'touchmove',
  (e) => {
    if (e.touches.length !== 2 || !pinchDist) return;
    const d = touchDist(e.touches);
    watch.zoomBy(d / pinchDist);
    pinchDist = d;
  },
  { passive: true }
);
canvas.addEventListener('touchend', () => (pinchDist = 0));
function touchDist(t) {
  return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
}

/* ---------- Main loop ---------- */

let last = performance.now();
let lastStage = '';
const start = last;

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  const stage = currentStage();
  if (stage !== lastStage) {
    document.body.dataset.stage = stage;
    if (stage !== 'anatomy') setActiveCard(-1);
    // Each section starts from its composed view: drop the manual explode and any orbiting.
    if (lastStage) {
      setExplode(false);
      if (ready) watch.resetCamera();
    }
    lastStage = stage;
  }
  // On touch screens the canvas only takes gestures in the Explore section, so the page scrolls freely.
  canvas.style.pointerEvents = !isTouch || stage === 'explore' ? 'auto' : 'none';

  if (ready) {
    const tgt = stageTargets(stage, (now - start) / 1000);
    watch.setTarget(tgt);
    watch.update(dt);
    zoomLabel.textContent = `${Math.round(watch.view.zoom * 100)}%`;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
