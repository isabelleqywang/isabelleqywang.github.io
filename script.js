// Starfield with twinkling stars and occasional shooting stars
const canvas = document.getElementById("stars");
const ctx = canvas.getContext("2d");
let stars = [];
let shooting = null;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const count = Math.floor((innerWidth * innerHeight) / 4000);
  stars = Array.from({ length: count }, () => ({
    x: Math.random() * innerWidth,
    y: Math.random() * innerHeight,
    r: Math.random() * 1.3 + 0.2,
    a: Math.random(),
    speed: Math.random() * 0.02 + 0.005,
    drift: Math.random() * 0.05 + 0.01,
  }));
}

function draw() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  for (const s of stars) {
    s.a += s.speed;
    s.y -= s.drift;
    if (s.y < 0) s.y = innerHeight;
    const alpha = 0.4 + Math.abs(Math.sin(s.a)) * 0.6;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(220, 228, 255, ${alpha})`;
    ctx.fill();
  }

  if (!shooting && Math.random() < 0.004) {
    shooting = { x: Math.random() * innerWidth, y: Math.random() * innerHeight * 0.4, len: 0, life: 1 };
  }
  if (shooting) {
    const s = shooting;
    s.x += 9; s.y += 4; s.len = Math.min(s.len + 12, 140); s.life -= 0.015;
    const grad = ctx.createLinearGradient(s.x, s.y, s.x - s.len, s.y - s.len * 0.45);
    grad.addColorStop(0, `rgba(255,255,255,${s.life})`);
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x - s.len, s.y - s.len * 0.45);
    ctx.stroke();
    if (s.life <= 0) shooting = null;
  }
  requestAnimationFrame(draw);
}

addEventListener("resize", resize);
resize();
if (!matchMedia("(prefers-reduced-motion: reduce)").matches) draw();
else { for (const s of stars) { ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fillStyle = "#dce4ff"; ctx.fill(); } }

// Reveal sections on scroll
const io = new IntersectionObserver(
  (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("visible")),
  { threshold: 0.12 }
);
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
