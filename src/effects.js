let audioCtx = null;

function blip(freq = 440, duration = 0.07, type = "sine", gain = 0.035) {
  try {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const amp = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    amp.gain.setValueAtTime(0, now);
    amp.gain.linearRampToValueAtTime(gain, now + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(amp).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  } catch {
    // Audio feedback is optional.
  }
}

function retriggerClass(el, className) {
  if (!el) return;
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
}

export function playSelectEffect(pieceEl, cellEl) {
  retriggerClass(pieceEl, "select-pop");
  retriggerClass(cellEl, "select-ring");
  setTimeout(() => cellEl?.classList.remove("select-ring"), 300);
  blip(740, 0.055, "triangle", 0.025);
}

function makeTrail(fromRect, toRect) {
  const trail = document.createElement("div");
  const x1 = fromRect.left + fromRect.width / 2;
  const y1 = fromRect.top + fromRect.height / 2;
  const x2 = toRect.left + toRect.width / 2;
  const y2 = toRect.top + toRect.height / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  trail.className = "move-trail";
  trail.style.left = `${x1}px`;
  trail.style.top = `${y1}px`;
  trail.style.width = `${Math.hypot(dx, dy)}px`;
  trail.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
  document.body.appendChild(trail);
  setTimeout(() => trail.remove(), 260);
}

export function playMoveEffect(pieceEl, fromCellEl, toCellEl, { capture = false } = {}) {
  return new Promise((resolve) => {
    if (!pieceEl || !fromCellEl || !toCellEl) {
      resolve();
      return;
    }

    const from = fromCellEl.getBoundingClientRect();
    const to = toCellEl.getBoundingClientRect();
    const dx = from.left - to.left;
    const dy = from.top - to.top;

    makeTrail(from, to);
    blip(capture ? 360 : 520, 0.08, "triangle", 0.03);

    pieceEl.classList.add("moving");
    pieceEl.style.transition = "none";
    pieceEl.style.transform = `translate(${dx}px, ${dy}px) scale(1.05)`;

    requestAnimationFrame(() => {
      pieceEl.style.transition = "transform 180ms cubic-bezier(0.16, 0.9, 0.24, 1.2), filter 120ms ease";
      pieceEl.style.transform = "translate(0, 0) scale(1)";
    });

    setTimeout(() => {
      pieceEl.classList.remove("moving");
      pieceEl.style.transition = "";
      pieceEl.style.transform = "";
      resolve();
    }, 205);
  });
}

function spawnCaptureShards(rect) {
  for (let i = 0; i < 9; i++) {
    const shard = document.createElement("span");
    const angle = (Math.PI * 2 * i) / 9;
    const distance = 18 + (i % 3) * 8;
    shard.className = "capture-shard";
    shard.style.left = `${rect.left + rect.width / 2}px`;
    shard.style.top = `${rect.top + rect.height / 2}px`;
    shard.style.setProperty("--sx", `${Math.cos(angle) * distance}px`);
    shard.style.setProperty("--sy", `${Math.sin(angle) * distance}px`);
    document.body.appendChild(shard);
    setTimeout(() => shard.remove(), 360);
  }
}

function spawnSoulMotes(rect, count = 5) {
  const target = document.getElementById("soulText")?.getBoundingClientRect();
  if (!target) return;
  for (let i = 0; i < count; i++) {
    const mote = document.createElement("span");
    const startX = rect.left + rect.width * (0.35 + Math.random() * 0.3);
    const startY = rect.top + rect.height * (0.35 + Math.random() * 0.3);
    mote.className = "soul-mote";
    mote.style.left = `${startX}px`;
    mote.style.top = `${startY}px`;
    mote.style.setProperty("--tx", `${target.left + target.width / 2 - startX}px`);
    mote.style.setProperty("--ty", `${target.top + target.height / 2 - startY}px`);
    mote.style.animationDelay = `${i * 28}ms`;
    document.body.appendChild(mote);
    setTimeout(() => mote.remove(), 680);
  }
}

export function playCaptureEffect(el, { soulGain = 0 } = {}) {
  return new Promise((resolve) => {
    if (!el) {
      resolve();
      return;
    }

    const rect = el.getBoundingClientRect();
    spawnCaptureShards(rect);
    spawnSoulMotes(rect, Math.max(4, Math.min(9, soulGain + 4)));
    blip(180, 0.12, "sawtooth", 0.028);
    setTimeout(() => blip(620, 0.09, "triangle", 0.02), 55);

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      el.remove();
      resolve();
    };
    el.addEventListener("transitionend", finish, { once: true });
    setTimeout(finish, 180);
    requestAnimationFrame(() => el.classList.add("capturing"));
  });
}
