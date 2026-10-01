import * as THREE from "three";

const canvas = document.getElementById("scene");
const body = document.body;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const small = Math.min(innerWidth, innerHeight) < 700;
const orbitSvg = document.querySelector(".orbit");
const navEl = document.querySelector(".nav");

/* ---------- renderer / camera ---------- */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2));
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 400);

/* ---------- moon ---------- */
const loader = new THREE.TextureLoader();
const maxAniso = renderer.capabilities.getMaxAnisotropy();
function tex(url, srgb) {
  return new Promise((resolve) => loader.load(url, (t) => {
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = maxAniso;
    resolve(t);
  }, undefined, () => resolve(null)));
}

const seg = small ? [160, 80] : [320, 160];
const moonMat = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, color: 0xffffff });
const moon = new THREE.Mesh(new THREE.SphereGeometry(1, ...seg), moonMat);
moon.rotation.set(0.1, -1.9, 0.04);
scene.add(moon);

const sun = new THREE.DirectionalLight(0xfff4e6, 3.4);
sun.position.set(-5, 1.4, 2.6);
scene.add(sun);
// faint, cool earthshine so the night side is not pure black
scene.add(new THREE.HemisphereLight(0x6f8fd6, 0x000000, 0.05));

let ready = false;
Promise.all([
  tex("assets/moon/moon-color-2k.webp", true),
  tex(small ? "assets/moon/moon-elev-1k.webp" : "assets/moon/moon-elev-2k.webp", false),
]).then(([color, elev]) => {
  moonMat.map = color;
  if (elev) {
    moonMat.bumpMap = elev;
    moonMat.bumpScale = 3;
    moonMat.displacementMap = elev;
    moonMat.displacementScale = 0.014;
    moonMat.displacementBias = -0.007;
  }
  moonMat.needsUpdate = true;
  ready = true;
  if (!small && innerWidth > 1100) {
    tex("assets/moon/moon-color-4k.webp", true).then((hi) => {
      if (hi) { moonMat.map = hi; moonMat.needsUpdate = true; color?.dispose(); }
    });
  }
  if (reduced) render();
});

/* ---------- stars: three layers with their own size, brightness and twinkle ---------- */
const starVert = /* glsl */ `
  attribute float aSize; attribute float aBright; attribute float aSpeed; attribute float aPhase; attribute vec3 aTint;
  uniform float uTime; uniform float uPR; uniform float uFade;
  varying float vAlpha; varying vec3 vTint;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPR;
    float tw = 0.72 + 0.28 * sin(uTime * aSpeed + aPhase);
    vAlpha = aBright * tw * uFade;
    vTint = aTint;
  }`;
const starFrag = /* glsl */ `
  varying float vAlpha; varying vec3 vTint;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float core = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vTint, vAlpha * core * core);
  }`;

const uniforms = { uTime: { value: 0 }, uPR: { value: renderer.getPixelRatio() }, uFade: { value: 0 } };
const layers = [];
function makeLayer(count, radius, size, bright, speed) {
  const pos = new Float32Array(count * 3), sz = new Float32Array(count), br = new Float32Array(count),
    sp = new Float32Array(count), ph = new Float32Array(count), tint = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = radius * (0.85 + Math.random() * 0.3);
    const s = Math.sqrt(1 - u * u);
    pos.set([r * s * Math.cos(th), r * u, r * s * Math.sin(th) - 20], i * 3);
    const k = Math.pow(Math.random(), 3);
    sz[i] = size[0] + (size[1] - size[0]) * k;
    br[i] = bright[0] + (bright[1] - bright[0]) * Math.random();
    sp[i] = speed[0] + (speed[1] - speed[0]) * Math.random();
    ph[i] = Math.random() * 6.283;
    const warm = Math.random();
    tint.set(warm < 0.15 ? [1, 0.9, 0.78] : warm > 0.8 ? [0.78, 0.87, 1] : [0.95, 0.96, 1], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aSize", new THREE.BufferAttribute(sz, 1));
  g.setAttribute("aBright", new THREE.BufferAttribute(br, 1));
  g.setAttribute("aSpeed", new THREE.BufferAttribute(sp, 1));
  g.setAttribute("aPhase", new THREE.BufferAttribute(ph, 1));
  g.setAttribute("aTint", new THREE.BufferAttribute(tint, 3));
  const m = new THREE.ShaderMaterial({ vertexShader: starVert, fragmentShader: starFrag, uniforms,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(g, m);
  scene.add(pts);
  layers.push(pts);
}
const n = small ? 0.45 : 1;
makeLayer(Math.round(4200 * n), 150, [1.2, 2.2], [0.35, 0.75], [0.3, 1.2]);  // far dust
makeLayer(Math.round(1100 * n), 110, [1.8, 3.4], [0.55, 0.95], [0.6, 2.0]);  // mid
makeLayer(Math.round(160 * n), 80, [3.0, 5.2], [0.8, 1.0], [0.8, 2.6]);     // near, bright
const layerDepth = [0.25, 0.6, 1];

/* ---------- framing ---------- */
let vw = innerWidth, vh = innerHeight, aspect = vw / vh;
const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
// distance where the moon fills `frac` of the limiting screen dimension
const distFor = (frac) => 1 / (frac * tanHalf * Math.min(1, aspect));
const portrait = () => aspect < 0.85;

function resize() {
  vw = innerWidth; vh = innerHeight; aspect = vw / vh;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  renderer.setSize(vw, vh, false);
  if (reduced) render();
}
addEventListener("resize", resize);
resize();

/* poses: [cam x, cam y, cam z, light] — the camera looks straight ahead, so moving it slides the moon */
function pose(stage) {
  const z0 = distFor(portrait() ? 0.78 : 0.62);
  if (stage === 0) return [0, 0, z0, 1];
  if (stage === 1) {
    const z = z0 * (portrait() ? 1.08 : 0.9);
    const hw = z * tanHalf * aspect, hh = z * tanHalf;
    return portrait() ? [0, -0.4 * hh, z, 1] : [-0.54 * hw, -0.02 * hh, z, 1];
  }
  // push in until only the lit limb of a huge moon remains at the edge, dimmed behind the content
  const z = z0 * (portrait() ? 0.5 : 0.42);
  const hw = z * tanHalf * aspect, hh = z * tanHalf;
  return portrait()
    ? [-(0.55 * hw + 0.7), -(0.78 * hh + 0.75), z, 0.28]
    : [-(0.74 * hw + 1), -0.1 * hh, z, 0.4];
}
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);
const mix = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));

function targetPose() {
  if (reduced) return pose(2);
  const heroRange = document.querySelector(".hero").offsetHeight - vh;
  const y = scrollY;
  if (y <= heroRange) return mix(pose(0), pose(1), ease(Math.min(1, y / heroRange)));
  return mix(pose(1), pose(2), ease(Math.min(1, (y - heroRange) / (vh * 0.9))));
}

/* ---------- intro gate: reveal the words on the first scroll / touch ---------- */
function reveal() {
  if (!body.classList.contains("intro")) return;
  body.classList.remove("intro");
}
if (reduced || scrollY > 10 || location.hash) reveal();
addEventListener("scroll", () => { if (scrollY > 6) reveal(); }, { passive: true });
addEventListener("wheel", reveal, { passive: true, once: true });
addEventListener("keydown", (e) => { if (["ArrowDown", "PageDown", " ", "End"].includes(e.key)) reveal(); });
const goToCopy = () => { reveal(); scrollTo({ top: document.querySelector(".hero").offsetHeight - vh, behavior: reduced ? "auto" : "smooth" }); };
document.querySelector(".hint").addEventListener("click", goToCopy);
document.querySelector(".hero-stage").addEventListener("click", (e) => { if (body.classList.contains("intro")) goToCopy(); });
addEventListener("touchstart", reveal, { passive: true, once: true });

/* ---------- mouse parallax ---------- */
const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
addEventListener("pointermove", (e) => {
  if (e.pointerType !== "mouse") return;
  mouse.x = (e.clientX / vw) * 2 - 1;
  mouse.y = (e.clientY / vh) * 2 - 1;
});

/* ---------- SVG orbit: keep the far half behind the moon ---------- */
const maskCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
if (orbitSvg) {
  const ns = "http://www.w3.org/2000/svg";
  const defs = document.createElementNS(ns, "defs");
  const mask = document.createElementNS(ns, "mask");
  mask.id = "behind-moon";
  Object.entries({ maskUnits: "userSpaceOnUse", x: -600, y: -600, width: 1200, height: 1200 }).forEach(([k, v]) => mask.setAttribute(k, v));
  const all = document.createElementNS(ns, "rect");
  Object.entries({ x: -600, y: -600, width: 1200, height: 1200, fill: "#fff" }).forEach(([k, v]) => all.setAttribute(k, v));
  const lowerHalf = document.createElementNS(ns, "path");
  lowerHalf.setAttribute("d", "M-600 0 H600 V600 H-600 Z");
  lowerHalf.setAttribute("transform", "rotate(-12)");
  lowerHalf.setAttribute("fill", "#fff");
  maskCircle.setAttribute("fill", "#000");
  const g = document.createElementNS(ns, "g");
  g.append(maskCircle, lowerHalf);
  mask.append(all, g);
  defs.append(mask);
  orbitSvg.prepend(defs);
  const ellipse = orbitSvg.querySelector("ellipse");
  const wrap = document.createElementNS(ns, "g");
  wrap.setAttribute("mask", "url(#behind-moon)");
  ellipse.replaceWith(wrap);
  wrap.append(ellipse);
}

/* ---------- loop ---------- */
const cam = pose(0).slice();
const clock = new THREE.Clock();
let fadeIn = 0;

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  if (ready) fadeIn = Math.min(1, fadeIn + dt / 2.8);
  const f = ease(fadeIn);

  const target = targetPose();
  const k = 1 - Math.exp(-dt * 3.2);
  for (let i = 0; i < 4; i++) cam[i] = lerp(cam[i], target[i], k);
  mouse.sx = lerp(mouse.sx, mouse.x, 1 - Math.exp(-dt * 2));
  mouse.sy = lerp(mouse.sy, mouse.y, 1 - Math.exp(-dt * 2));

  camera.position.set(cam[0] + mouse.sx * 0.05, cam[1] - mouse.sy * 0.035, cam[2]);
  camera.lookAt(camera.position.x, camera.position.y, -100);
  moon.rotation.y += dt * 0.022;
  sun.intensity = 3.4 * cam[3];
  renderer.toneMappingExposure = 1.55 * f;
  uniforms.uFade.value = 0.25 + 0.75 * ease(Math.min(1, t / 2.2));
  uniforms.uTime.value = t;

  const scrollTurn = scrollY / vh;
  layers.forEach((l, i) => {
    const d = layerDepth[i];
    l.rotation.y = -mouse.sx * 0.012 * d - scrollTurn * 0.006 * d + t * 0.0012 * d;
    l.rotation.x = mouse.sy * 0.008 * d + scrollTurn * 0.012 * d;
  });

  updateOrbit();
  updateNav();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

function updateNav() { navEl.classList.toggle("solid", scrollY > vh * 0.6); }

function updateOrbit() {
  if (!orbitSvg) return;
  const p = Math.min(1, scrollY / Math.max(1, document.querySelector(".hero").offsetHeight - vh));
  orbitSvg.style.opacity = String(Math.max(0, 1 - p * 2.2) * ease(Math.min(1, fadeIn * 1.4)));
  // moon radius on screen, in the SVG's own units
  const pxPerUnit = vh / (2 * cam[2] * tanHalf);
  const svgPx = orbitSvg.getBoundingClientRect().width || 1;
  maskCircle.setAttribute("r", String((pxPerUnit * 1.012 * 1000) / svgPx));
}

function render() {
  const p = targetPose();
  camera.position.set(p[0], p[1], p[2]);
  camera.lookAt(p[0], p[1], -100);
  sun.intensity = 3.4 * p[3];
  renderer.toneMappingExposure = 1.55;
  uniforms.uFade.value = 1;
  renderer.render(scene, camera);
}

if (reduced) {
  if (orbitSvg) orbitSvg.style.display = "none";
  addEventListener("scroll", () => { render(); updateNav(); }, { passive: true });
  updateNav();
  render();
} else {
  requestAnimationFrame(frame);
}
