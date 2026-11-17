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
  const nextRoleLink = document.querySelector('.section-mark');
  const labels = ['01 — A LITTLE CURIOSITY', '02 — CONNECTING THE DOTS', '03 — GO GATORS', '04 — WHAT COMES NEXT'];
  let paused = reduced.matches, width = 0, height = 0, scroll = 0, chapter = 0;
  let phase = 0, lastTime = 0, frame = 0, targetMorph = 0, morph = 0;
  let pointerX = 0, pointerY = 0, lastRender = 0;
  let orientation = 0;
  let gatorIdlePhase = 0, lastScrollAt = 0;
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
  nextRoleLink.addEventListener('click', event => {
    const target = document.querySelector(nextRoleLink.getAttribute('href'));
    if (!target) return;
    event.preventDefault();
    // Center the requested role so the scroll highlight selects that same role.
    const rect = target.getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + rect.top + rect.height / 2 - innerHeight / 2, behavior: paused ? 'instant' : 'smooth' });
  });
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
    if (chapter === 2 && targetMorph !== 2) gatorIdlePhase = 0;
    targetMorph = chapter;
    canvas.dataset.shape = ['torus', 'sphere', 'gator', 'ribbon'][chapter];
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
    const nextJob = jobs[jobs.indexOf(nearest) + 1];
    nextRoleLink.href = nextJob ? `#${nextJob.id}` : '#education';
    nextRoleLink.setAttribute('aria-label', nextJob ? `Continue to ${nextJob.querySelector('h3').textContent.trim()}` : 'Continue to education');
    nextRoleLink.querySelector('span').textContent = nextJob ? 'Next role' : 'Education';
    heroTitle.style.transform = paused ? '' : `translateY(${Math.min(scroll * .14, 150)}px)`;
    if (paused) { morph = targetMorph; orientation = targetMorph === 2 ? -.16 : phase * .17 + scroll * .00032; draw(); }
  }
  let scrollQueued = false;
  addEventListener('scroll', () => {
    lastScrollAt = performance.now();
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
  // Curved tail, low armored torso, raised brow, and a broad alligator snout.
  // Each station is x, height, vertical radius, width, and lateral offset.
  const gatorProfile = [
    [-2.68,-.30,.004,.006,-.37],[-2.35,-.29,.025,.03,-.39],
    [-2.02,-.23,.05,.06,-.34],[-1.70,-.13,.08,.10,-.24],
    [-1.4,-.045,.115,.14,-.12],[-1.12,0,.16,.185,-.035],
    [-.86,0,.205,.23,0],[-.56,0,.245,.32,0],[-.24,0,.255,.35,0],
    [.05,.005,.23,.30,0],[.30,-.015,.19,.235,0],
    [.48,-.065,.18,.24,0],[.64,-.10,.145,.27,0],
    [.81,-.065,.09,.255,0],[1.04,-.04,.065,.235,0],
    [1.30,-.025,.055,.205,0],[1.48,-.025,.05,.18,0],
    [1.56,-.025,.035,.105,0],[1.58,-.025,.008,.015,0]
  ];
  function gatorPoint(u, v) {
    const segment = Math.min(Math.floor(u * (gatorProfile.length - 1)), gatorProfile.length - 2);
    const t = u * (gatorProfile.length - 1) - segment;
    const p = gatorProfile[segment], q = gatorProfile[segment + 1];
    const value = i => p[i] + (q[i] - p[i]) * t;
    const angle = v * Math.PI * 2;
    // The tail sways, while the head stays steady and readable.
    const tail = Math.max(0, -value(0) - .7);
    const sway = Math.sin(phase * .8) * .035 * tail;
    return [value(0), value(1) + Math.cos(angle) * value(2), value(4) + Math.sin(angle) * value(3) + sway];
  }
  // One wire sculpture, continuously interpolated between four arrangements.
  function point(u, v, state) {
    const a = u * Math.PI * 2, b = v * Math.PI * 2;
    if (state === 0) { const r = .65 + .25 * Math.cos(b); return [r * Math.cos(a), r * Math.sin(a), .25 * Math.sin(b)]; }
    if (state === 2) return gatorPoint(u, v);
    if (state === 1) return [.79 * Math.sin(b / 2) * Math.cos(a), .79 * Math.cos(b / 2), .79 * Math.sin(b / 2) * Math.sin(a)];
    return [( .55 + .2 * Math.cos(b)) * Math.cos(a), (.55 + .2 * Math.cos(b)) * Math.sin(a), .3 * Math.sin(b + a * 2)];
  }
  function draw() {
    if (!ctx || !width) return;
    ctx.clearRect(0, 0, width, height);
    const mobile = width <= 700;
    const gatorWeight = Math.max(0, 1 - Math.abs(morph - 2));
    const baseSize = mobile ? Math.min(width * .43, 220) : Math.min(width * .23, height * .36);
    const size = baseSize * (1 - gatorWeight * (mobile ? .51 : .23));
    const cx = width * ((mobile ? .69 : .77) * (1 - gatorWeight) + (mobile ? .50 : .56) * gatorWeight) + pointerX * 12;
    const cy = height * ((mobile ? .5 : .45) * (1 - gatorWeight) + .64 * gatorWeight) + pointerY * 12;
    const from = Math.floor(morph), to = Math.min(from + 1, 3), blend = morph - from;
    // Settle into a readable side view instead of spinning the gator end-on.
    // Orientation is eased by the animation loop, never interpolated from an
    // accumulated multi-revolution angle into the gator's fixed side view.
    const rotation = orientation;
    const tilt = (-.65 + Math.sin(phase * .12) * .18) * (1 - gatorWeight) - .55 * gatorWeight;
    const projectWorld = (position) => {
      let [x, y, z] = position;
      x += .55 * gatorWeight; // Center the longer tail and snout together.
      const tx = x * Math.cos(rotation) - z * Math.sin(rotation);
      z = x * Math.sin(rotation) + z * Math.cos(rotation); x = tx;
      const ty = y * Math.cos(tilt) - z * Math.sin(tilt);
      z = y * Math.sin(tilt) + z * Math.cos(tilt); y = ty;
      const perspective = 3 / (3 - z * .4);
      return [cx + x * size * perspective, cy + y * size * perspective, z];
    };
    const project = (u, v) => {
      const p = point(u, v, from), q = point(u, v, to);
      return projectWorld(p.map((value, i) => value + (q[i] - value) * blend));
    };
    ctx.lineWidth = .65;
    const hue = (94 + morph * 28) * (1 - gatorWeight) + 102 * gatorWeight;
    const opacity = (chapter === 0 ? (mobile ? .34 : .67) : .16) * (1 - gatorWeight * gatorWeight);
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
    if (gatorWeight > .01) {
      const alpha = gatorWeight * gatorWeight;
      const faces = [];
      function face(points, tone = 0, wire = .22) {
        const projected = points.map(projectWorld);
        faces.push({points: projected, depth: projected.reduce((sum,p)=>sum+p[2],0)/projected.length, tone, wire});
      }
      function surface(fn, rows, columns, tone = 0, wire = .22) {
        const grid = Array.from({length:rows+1},(_,i)=>Array.from({length:columns+1},(_,j)=>fn(i/rows,j/columns)));
        for(let i=0;i<rows;i++) for(let j=0;j<columns;j++) {
          const points=[grid[i][j],grid[i+1][j],grid[i+1][j+1],grid[i][j+1]];
          const light = Math.max(0, -points.reduce((sum,p)=>sum+p[1],0)/4) * 25;
          face(points,tone+light,wire);
        }
      }
      function ellipsoid(center, radius, tone = 0, rows = 12, columns = 10) {
        surface((u,v)=>{
          const a=u*Math.PI,b=v*Math.PI*2;
          return [center[0]+radius[0]*Math.cos(a),center[1]+radius[1]*Math.sin(a)*Math.cos(b),center[2]+radius[2]*Math.sin(a)*Math.sin(b)];
        },rows,columns,tone);
      }
      function limb(a,b,r1,r2) {
        const direction=b.map((x,i)=>x-a[i]);
        const length=Math.hypot(...direction);
        const axis=direction.map(x=>x/length);
        const helper=Math.abs(axis[1])>.9?[1,0,0]:[0,1,0];
        const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
        let side=cross(axis,helper);const norm=Math.hypot(...side);side=side.map(x=>x/norm);
        const up=cross(axis,side);
        surface((u,v)=>{
          const radius=r1+(r2-r1)*u,angle=v*Math.PI*2;
          return a.map((x,i)=>x+direction[i]*u+radius*(side[i]*Math.cos(angle)+up[i]*Math.sin(angle)));
        },5,8,2);
      }
      surface(gatorPoint,48,20,4,.28);
      // The jaw begins inside the skull: its broad hinge shares the cheek volume.
      const jaw = [
        [.38,.035,.10,.18],[.53,.052,.10,.225],[.72,.075,.078,.24],
        [.92,.102,.06,.23],[1.14,.133,.05,.21],[1.35,.153,.045,.185],
        [1.49,.16,.038,.145],[1.56,.155,.022,.08],[1.58,.15,.003,.009]
      ];
      surface((u,v)=>{
        const segment=Math.min(Math.floor(u*(jaw.length-1)),jaw.length-2);
        const t=u*(jaw.length-1)-segment;
        const p=jaw[segment],q=jaw[segment+1],at=i=>p[i]+(q[i]-p[i])*t;
        const angle=v*Math.PI*2;
        return [at(0),at(1)+Math.cos(angle)*at(2),Math.sin(angle)*at(3)];
      },28,14,4);
      // One continuous sweep per leg, from a buried shoulder to the toe bed.
      // Smooth tangents and radius changes remove the separate cylinder joints.
      function catmull(values,t) {
        const segment=Math.min(Math.floor(t*(values.length-1)),values.length-2);
        const f=t*(values.length-1)-segment;
        const a=values[Math.max(0,segment-1)],b=values[segment];
        const c=values[segment+1],d=values[Math.min(values.length-1,segment+2)];
        return b.map((_,i)=>.5*((2*b[i])+(-a[i]+c[i])*f+(2*a[i]-5*b[i]+4*c[i]-d[i])*f*f+(-a[i]+3*b[i]-3*c[i]+d[i])*f*f*f));
      }
      for(const side of [-1,1]) for(const hip of [-.64,.27]) {
        const rear=hip<0;
        const knee=hip+(rear?-.17:.13),ankle=hip+(rear?-.04:-.035);
        // x, y, z, radius. Roots overlap the torso well inside its visible surface.
        const path=[
          [hip,.015,side*.075,rear?.17:.145],
          [hip,.09,side*.255,rear?.16:.13],
          [knee,.20,side*.40,rear?.115:.10],
          [ankle-.025,.305,side*.51,.067],
          [ankle+.045,.335,side*.54,.06],
          [ankle+.14,.345,side*.55,.042],
          [ankle+.185,.347,side*.55,.009]
        ];
        surface((u,v)=>{
          const center=catmull(path,u),before=catmull(path,Math.max(0,u-.002)),after=catmull(path,Math.min(1,u+.002));
          const delta=after.slice(0,3).map((x,i)=>x-before[i]),length=Math.hypot(...delta);
          const axis=delta.map(x=>x/length);
          const sideAxis=[axis[2],0,-axis[0]],norm=Math.hypot(...sideAxis);
          const a=sideAxis.map(x=>x/norm);
          const b=[axis[1]*a[2]-axis[2]*a[1],axis[2]*a[0]-axis[0]*a[2],axis[0]*a[1]-axis[1]*a[0]];
          const angle=v*Math.PI*2,r=Math.max(.002,center[3]);
          const flatten=1-.45*Math.max(0,(u-.62)/.38);
          return center.slice(0,3).map((x,i)=>x+r*(a[i]*Math.cos(angle)+b[i]*Math.sin(angle)*flatten));
        },32,12,4);
        for(let toe=0;toe<3;toe++) {
          const z=side*.55+(toe-1)*.035;
          limb([ankle+.12,.345,z],[ankle+.24,.355,z+side*.018],.018,.003);
        }
      }
      // Paired rows of raised armor, following the back and continuing down the tail.
      for(let i=3;i<12;i++) {
        const [x,y,ry,rz,zc]=gatorProfile[i];
        for(const side of [-1,1]) {
          const z=zc+side*rz*.46,base=y-ry*.88,peak=base-(i<5?.06:.045);
          face([[x-.085,base,z-.025],[x+.07,base,z-.025],[x+.015,peak,z],[x+.07,base,z+.025],[x-.085,base,z+.025]],12,.42);
        }
      }
      // Heavy brows and inset eyes; depth sorting hides the far side naturally.
      for(const side of [-1,1]) {
        ellipsoid([.63,-.205,side*.175],[.12,.075,.095],7);
        ellipsoid([.672,-.226,side*.245],[.04,.035,.018],65,8,8);
        ellipsoid([.68,-.229,side*.262],[.009,.026,.006],-18,6,6);
        ellipsoid([1.43,-.074,side*.11],[.035,.012,.022],-12,6,6);
        // Alternating small teeth along the edges of both jaws.
        for(let i=0;i<7;i++) {
          const x=.84+i*.094,z=side*(.245-(x-.8)*.085),top=.012;
          const length=i%3===0?.067:.045;
          face([[x,top,z],[x+.025,top+length,z],[x+.045,top,z]],55,.65);
          if(i<6) {
            const y=.075+(x-.72)*.105-.04;
            face([[x+.03,y,z*.87],[x+.05,y-.039,z*.87],[x+.07,y,z*.87]],42,.5);
          }
        }
      }
      // Unfilled, low-contrast mesh keeps the gator as subtle as the other sculptures.
      faces.sort((a,b)=>a.depth-b.depth);
      ctx.lineWidth=.6;
      for(const f of faces) {
        ctx.beginPath();f.points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();
        ctx.strokeStyle=`rgba(185,239,146,${alpha*f.wire*.32})`;ctx.stroke();
      }
    }
  }
  function tick(now) {
    if (paused || document.hidden) { frame = 0; return; }
    const delta = lastTime ? Math.min((now - lastTime) / 1000, .05) : 0;
    lastTime = now; phase += delta;
    // A gentle side-to-side turn peaks at the other shapes' .17 rad/s pace.
    // Begin after scrolling and morphing settle, keeping the gator recognizable.
    if (targetMorph === 2 && Math.abs(morph - 2) < .03 && now - lastScrollAt > 350) {
      gatorIdlePhase += delta * .34;
    }
    const desiredYaw = targetMorph === 2 ? -.16 + Math.sin(gatorIdlePhase) * .5 : phase * .17 + scroll * .00032;
    // Take the shortest turn and cap its speed, including after long idle periods.
    const yawDifference = Math.atan2(Math.sin(desiredYaw - orientation), Math.cos(desiredYaw - orientation));
    const maxTurn = .65 * delta;
    orientation += Math.max(-maxTurn, Math.min(maxTurn, yawDifference * Math.min(delta * 3, 1)));
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
  resize(); setMotion(paused);
})();
