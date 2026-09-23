const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const SPARKLES = ["✦", "✧", "⋆", "🐾", "💖"];
const BURST = ["😻", "🐱", "😸", "💖", "✨", "🎀"];

if (!reducedMotion && matchMedia("(pointer: fine)").matches) {
  let last = 0;
  addEventListener("pointermove", (e) => {
    const now = performance.now();
    if (now - last < 45) return;
    last = now;
    spawn("sparkle", SPARKLES, e.clientX, e.clientY);
  });
}

function spawn(className, symbols, x, y) {
  const el = document.createElement("span");
  el.className = className;
  el.textContent = symbols[Math.floor(Math.random() * symbols.length)];
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.addEventListener("animationend", () => el.remove());
  document.body.append(el);
  return el;
}

export function catBurst(target) {
  if (reducedMotion) return;
  const rect = target.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  for (let i = 0; i < 14; i++) {
    const angle = (Math.PI * 2 * i) / 14 + Math.random() * 0.4;
    const dist = 80 + Math.random() * 90;
    const el = spawn("burst", BURST, x, y);
    el.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
    el.style.setProperty("--dy", `${Math.sin(angle) * dist}px`);
    el.style.setProperty("--rot", `${Math.random() * 360 - 180}deg`);
  }
}
