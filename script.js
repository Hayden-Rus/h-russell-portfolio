(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const button = document.querySelector('#motion-toggle');
  const canvas = document.querySelector('#sculpture');
  const ctx = canvas.getContext('2d');
  const chapters = [...document.querySelectorAll('[data-chapter]')];
  const rail = [...document.querySelectorAll('.chapter-rail a')];
  const jobs = [...document.querySelectorAll('.experience-item')];
  const heroTitle = document.querySelector('.hero-title');
  const labels = ['01 — A LITTLE CURIOSITY', '02 — CONNECTING THE DOTS', '03 — IDEAS IN MOTION', '04 — WHAT COMES NEXT'];
  let paused = reduced.matches, width = 0, height = 0, scroll = 0, chapter = 0;
  let phase = 0, lastTime = 0, frame = 0, targetMorph = 0, morph = 0;
  let pointerX = 0, pointerY = 0, lastRender = 0;
  root.classList.add('js');

  function setMotion(value) {
    paused = value;
    root.classList.toggle('motion-paused', paused);
    button.setAttribute('aria-pressed', String(paused));
    button.setAttribute('aria-label', paused ? 'Resume animations' : 'Pause animations');
    document.querySelector('#motion-label').textContent = paused ? 'off' : 'on';
    if (paused) { cancelAnimationFrame(frame); frame = 0; morph = targetMorph; draw(); }
    else start();
    updateScroll();
  }
  button.addEventListener('click', () => setMotion(!paused));
  reduced.addEventListener('change', event => setMotion(event.matches));

  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target); }
    });
  }, { threshold: .08 });
  document.querySelectorAll('.reveal').forEach(item => revealObserver.observe(item));

  function updateScroll() {
    scroll = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - innerHeight;
    root.style.setProperty('--progress', maxScroll > 0 ? scroll / maxScroll : 0);
    const focus = innerHeight * .5;
    chapter = 0;
    chapters.forEach((section, index) => { if (section.getBoundingClientRect().top <= focus) chapter = index; });
    targetMorph = chapter;
    root.style.setProperty('--hue', `${chapter * 28}deg`);
    rail.forEach((link, index) => {
      if (index === chapter) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    document.querySelector('#shape-label').textContent = labels[chapter];
    let nearest = jobs[0], distance = Infinity;
    jobs.forEach(job => {
      const rect = job.getBoundingClientRect();
      const nextDistance = Math.abs(rect.top + rect.height / 2 - focus);
      if (nextDistance < distance) { nearest = job; distance = nextDistance; }
    });
    jobs.forEach(job => job.classList.toggle('is-active', job === nearest));
    heroTitle.style.transform = paused ? '' : `translateY(${Math.min(scroll * .14, 150)}px)`;
    if (paused) { morph = targetMorph; draw(); }
  }
  let scrollQueued = false;
  addEventListener('scroll', () => {
    if (!scrollQueued) requestAnimationFrame(() => { updateScroll(); scrollQueued = false; });
    scrollQueued = true;
  }, { passive: true });

  function resize() {
    width = innerWidth; height = innerHeight;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
    updateScroll(); draw();
  }
  // One wire sculpture, continuously interpolated between four arrangements.
  function point(u, v, state) {
    const a = u * Math.PI * 2, b = v * Math.PI * 2;
    if (state === 0) { const r = .65 + .25 * Math.cos(b); return [r * Math.cos(a), r * Math.sin(a), .25 * Math.sin(b)]; }
    if (state === 1) return [.79 * Math.sin(b / 2) * Math.cos(a), .79 * Math.cos(b / 2), .79 * Math.sin(b / 2) * Math.sin(a)];
    if (state === 2) return [(u - .5) * 1.8, (v - .5) * 1.8, .23 * Math.sin(a * 1.8 + phase) * Math.cos(b + phase * .4)];
    return [( .55 + .2 * Math.cos(b)) * Math.cos(a), (.55 + .2 * Math.cos(b)) * Math.sin(a), .3 * Math.sin(b + a * 2)];
  }
  function draw() {
    if (!ctx || !width) return;
    ctx.clearRect(0, 0, width, height);
    const mobile = width <= 700;
    const size = mobile ? Math.min(width * .43, 220) : Math.min(width * .23, height * .36);
    const cx = width * (mobile ? .69 : .77) + pointerX * 12;
    const cy = height * (mobile ? .5 : .45) + pointerY * 12;
    const from = Math.floor(morph), to = Math.min(from + 1, 3), blend = morph - from;
    const rotation = phase * .17 + scroll * .00032;
    const tilt = -.65 + Math.sin(phase * .12) * .18;
    const project = (u, v) => {
      const p = point(u, v, from), q = point(u, v, to);
      let x = p[0] + (q[0] - p[0]) * blend;
      let y = p[1] + (q[1] - p[1]) * blend;
      let z = p[2] + (q[2] - p[2]) * blend;
      const tx = x * Math.cos(rotation) - z * Math.sin(rotation);
      z = x * Math.sin(rotation) + z * Math.cos(rotation); x = tx;
      const ty = y * Math.cos(tilt) - z * Math.sin(tilt);
      z = y * Math.sin(tilt) + z * Math.cos(tilt); y = ty;
      const perspective = 3 / (3 - z * .4);
      return [cx + x * size * perspective, cy + y * size * perspective, z];
    };
    ctx.lineWidth = .65;
    const hue = 94 + morph * 28;
    const opacity = chapter === 0 ? (mobile ? .34 : .67) : .16;
    for (let line = 0; line < 26; line++) {
      ctx.beginPath();
      for (let step = 0; step <= 80; step++) {
        const p = project(step / 80, line / 26);
        if (step === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
      }
      ctx.strokeStyle = `hsla(${hue},70%,72%,${opacity * .65})`; ctx.stroke();
    }
    for (let line = 0; line < 32; line++) {
      ctx.beginPath();
      for (let step = 0; step <= 40; step++) {
        const p = project(line / 32, step / 40);
        if (step === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
      }
      ctx.strokeStyle = `hsla(${hue},80%,78%,${opacity})`; ctx.stroke();
    }
  }
  function tick(now) {
    if (paused || document.hidden) { frame = 0; return; }
    const delta = lastTime ? Math.min((now - lastTime) / 1000, .05) : 0;
    lastTime = now; phase += delta;
    morph += (targetMorph - morph) * Math.min(delta * 2.5, 1);
    if (Math.abs(morph - targetMorph) < .001) morph = targetMorph;
    if (now - lastRender > 30) { draw(); lastRender = now; }
    frame = requestAnimationFrame(tick);
  }
  function start() { if (!frame && !paused && !document.hidden) { lastTime = 0; frame = requestAnimationFrame(tick); } }
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else start(); });
  addEventListener('resize', resize, { passive: true });
  addEventListener('pointermove', event => {
    if (!paused && finePointer.matches) { pointerX = event.clientX / width - .5; pointerY = event.clientY / height - .5; }
  }, { passive: true });
  document.querySelectorAll('[data-tilt]').forEach(card => {
    card.addEventListener('pointermove', event => {
      if (paused || !finePointer.matches) return;
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width, y = (event.clientY - rect.top) / rect.height;
      card.style.setProperty('--rx', `${(y - .5) * -5}deg`);
      card.style.setProperty('--ry', `${(x - .5) * 5}deg`);
      card.style.setProperty('--mx', `${x * 100}%`); card.style.setProperty('--my', `${y * 100}%`);
    });
    card.addEventListener('pointerleave', () => { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
  });
  resize(); setMotion(paused);
})();
