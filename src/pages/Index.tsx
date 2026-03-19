import { useEffect, useRef, useState, useCallback } from "react";

const BG_URL = "https://cdn.poehali.dev/projects/5be54ed1-a7a9-40fa-a808-f245193e3bf9/files/52dbf1a1-daaf-4ada-afd2-0a6d7e8cec83.jpg";

// ── Canvas dimensions ──
const CW = 420;
const CH = 700;

// ── Unique id ──
let _uid = 0;
const uid = () => ++_uid;

// ── Types ──
type Vec2 = { x: number; y: number };
type Entity = Vec2 & { id: number };

type Player = Entity & {
  vx: number; vy: number;
  hp: number; maxHp: number;
  stamina: number;
  invincible: number;
  dashCd: number;
  kills: number;
  money: number;
  weapon: "knife" | "gun";
  ammo: number;
  maxAmmo: number;
  reloading: number;
  angle: number;
};

type Cop = Entity & {
  vx: number; vy: number;
  hp: number; maxHp: number;
  type: "rookie" | "officer" | "swat";
  state: "chase" | "shoot" | "stun";
  stunTimer: number;
  shootCd: number;
  hitFlash: number;
};

type Bullet = Entity & { vx: number; vy: number; fromPlayer: boolean; dmg: number; life: number };
type Particle = Entity & { vx: number; vy: number; life: number; maxLife: number; color: string; size: number; type: "blood" | "spark" | "smoke" };
type FloatText = Entity & { text: string; vy: number; life: number; color: string };
type Obstacle = { x: number; y: number; w: number; h: number; color: string };

// ── Building / obstacle layouts ──
const OBSTACLE_COLORS = ["#1a1a2e", "#16213e", "#0f3460", "#1a0a2e", "#0d0d1a"];

function makeObstacles(offsetY: number): Obstacle[] {
  const obs: Obstacle[] = [];
  obs.push({ x: 0, y: offsetY, w: 70, h: 120 + Math.random() * 80, color: OBSTACLE_COLORS[Math.floor(Math.random() * OBSTACLE_COLORS.length)] });
  obs.push({ x: CW - 75, y: offsetY, w: 75, h: 100 + Math.random() * 100, color: OBSTACLE_COLORS[Math.floor(Math.random() * OBSTACLE_COLORS.length)] });
  if (Math.random() > 0.5) {
    obs.push({ x: 80 + Math.random() * (CW - 200), y: offsetY + 60, w: 38, h: 22, color: "#2a0a0a" });
  }
  return obs;
}

// ── Neon signs ──
const SIGNS = ["РЕСТОРАН", "КАЗИНО", "ОТЕЛЬ", "БАР", "НОЧНОЙ", "КАБАРЕ", "ЛОМБАРД", "АПТЕКА"];
type Sign = { x: number; y: number; text: string; color: string; blink: number };

function makeSign(y: number): Sign {
  const colors = ["#ff0044", "#00ffcc", "#ff6600", "#cc00ff", "#ffcc00", "#0088ff"];
  return { x: 5 + Math.random() * (CW - 90), y, text: SIGNS[Math.floor(Math.random() * SIGNS.length)], color: colors[Math.floor(Math.random() * colors.length)], blink: Math.random() * Math.PI * 2 };
}

// ── Cops config ──
const COP_CONFIGS = {
  rookie:  { hp: 60,  speed: 1.3, shootRange: 180, shootCd: 1800, dmg: 8,  color: "#3a7aff", hatColor: "#1144cc", reward: 50 },
  officer: { hp: 100, speed: 1.6, shootRange: 220, shootCd: 1200, dmg: 14, color: "#1a5aff", hatColor: "#0033aa", reward: 100 },
  swat:    { hp: 200, speed: 1.1, shootRange: 280, shootCd: 900,  dmg: 22, color: "#111",    hatColor: "#000",    reward: 200 },
};

// ── Helpers ──
function circleRect(cx: number, cy: number, cr: number, rx: number, ry: number, rw: number, rh: number) {
  const nearX = Math.max(rx, Math.min(cx, rx + rw));
  const nearY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nearX, dy = cy - nearY;
  return dx * dx + dy * dy < cr * cr;
}

function dist(a: Vec2, b: Vec2) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function normalize(dx: number, dy: number) {
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  return { x: dx / d, y: dy / d };
}

// ── Draw player ──
function drawPlayer(ctx: CanvasRenderingContext2D, p: Player, sy: number) {
  const sx = p.x, py2 = p.y - sy;
  const flash = p.invincible > 0 && Math.floor(p.invincible / 80) % 2 === 0;
  if (flash) return;
  ctx.save();
  ctx.translate(sx, py2);
  ctx.rotate(p.angle + Math.PI / 2);
  ctx.shadowColor = "#ff003388";
  ctx.shadowBlur = 20;
  const coat = ctx.createRadialGradient(0, 0, 2, 0, 0, 20);
  coat.addColorStop(0, "#2a2a2a");
  coat.addColorStop(1, "#111");
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.ellipse(0, 2, 14, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.moveTo(-6, -10); ctx.lineTo(0, -5); ctx.lineTo(6, -10);
  ctx.lineTo(4, -18); ctx.lineTo(0, -14); ctx.lineTo(-4, -18);
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  const headGrad = ctx.createRadialGradient(-2, -22, 1, 0, -22, 10);
  headGrad.addColorStop(0, "#c8956a");
  headGrad.addColorStop(1, "#7a5035");
  ctx.fillStyle = headGrad;
  ctx.beginPath(); ctx.arc(0, -22, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(-10, -34, 20, 5);
  ctx.beginPath(); ctx.ellipse(0, -34, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
  if (p.weapon === "knife") {
    ctx.strokeStyle = "#ddd"; ctx.lineWidth = 2;
    ctx.shadowColor = "#ffffff88"; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.moveTo(10, -8); ctx.lineTo(22, -20); ctx.stroke();
  } else {
    ctx.fillStyle = "#333"; ctx.shadowColor = "#ff880088"; ctx.shadowBlur = 8;
    ctx.fillRect(8, -5, 18, 7);
  }
  ctx.restore();
}

// ── Draw cop ──
function drawCop(ctx: CanvasRenderingContext2D, c: Cop, sy: number) {
  const cx2 = c.x, cy2 = c.y - sy;
  const cfg = COP_CONFIGS[c.type];
  ctx.save();
  ctx.translate(cx2, cy2);
  ctx.shadowColor = cfg.color;
  ctx.shadowBlur = c.hitFlash > 0 ? 24 : 8;
  const bodyGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 15);
  bodyGrad.addColorStop(0, c.hitFlash > 0 ? "#ff4444" : cfg.color);
  bodyGrad.addColorStop(1, cfg.hatColor);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath(); ctx.ellipse(0, 3, 12, 16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = c.type === "swat" ? "#222" : "#c89060";
  ctx.beginPath(); ctx.arc(0, -18, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = cfg.hatColor;
  if (c.type === "swat") {
    ctx.beginPath(); ctx.arc(0, -20, 10, Math.PI, 0); ctx.fill();
  } else {
    ctx.fillRect(-9, -28, 18, 5);
    ctx.beginPath(); ctx.ellipse(0, -28, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = "#ffdd00"; ctx.shadowColor = "#ffdd00"; ctx.shadowBlur = 4;
  ctx.beginPath(); ctx.arc(-4, 0, 3, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  const bw = 30, bh = 4;
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(-bw / 2, -34, bw, bh);
  ctx.fillStyle = c.hp / c.maxHp > 0.5 ? "#00ff88" : c.hp / c.maxHp > 0.25 ? "#ffaa00" : "#ff2200";
  ctx.fillRect(-bw / 2, -34, bw * (c.hp / c.maxHp), bh);
  ctx.restore();
}

// ── Main component ──
export default function Index() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgImgRef = useRef<HTMLImageElement | null>(null);
  const animRef = useRef(0);
  const lastRef = useRef(0);

  const [screen, setScreen] = useState<"menu" | "playing" | "dead">("menu");
  const [hud, setHud] = useState({ hp: 100, maxHp: 100, ammo: 6, maxAmmo: 6, reloading: false, stamina: 100, wave: 1, money: 0, kills: 0, weapon: "knife" as "knife" | "gun", wantedLevel: 1 });

  const G = useRef({
    player: null as unknown as Player,
    cops: [] as Cop[],
    bullets: [] as Bullet[],
    particles: [] as Particle[],
    floats: [] as FloatText[],
    obstacles: [] as Obstacle[],
    signs: [] as Sign[],
    scrollY: 0,
    chunkY: 0,
    wave: 1,
    waveTimer: 0,
    spawnQueue: 0,
    spawnTimer: 0,
    frameN: 0,
    keys: {} as Record<string, boolean>,
    touch: { active: false, x: CW / 2, y: CH / 2, startX: 0, startY: 0 },
    rain: Array.from({ length: 60 }, () => ({ x: Math.random() * CW, y: Math.random() * CH, speed: 8 + Math.random() * 6, len: 10 + Math.random() * 15 })),
    wantedLevel: 1,
    screenRef: "menu" as "menu" | "playing" | "dead",
  });

  const fillWorld = useCallback(() => {
    const g = G.current;
    while (g.chunkY > g.scrollY - CH * 2) {
      g.obstacles.push(...makeObstacles(g.chunkY - CH));
      g.signs.push(makeSign(g.chunkY - CH * 0.3));
      g.chunkY -= CH;
    }
    g.obstacles = g.obstacles.filter(o => o.y - g.scrollY < CH + 200);
    g.signs = g.signs.filter(s => s.y - g.scrollY < CH + 100);
  }, []);

  const spawnWave = useCallback((wave: number) => {
    const g = G.current;
    g.spawnQueue = 3 + wave * 2;
    g.spawnTimer = 0;
  }, []);

  const spawnCop = useCallback(() => {
    const g = G.current;
    const wave = g.wave;
    let type: Cop["type"] = "rookie";
    const r = Math.random();
    if (wave >= 5 && r < 0.3) type = "swat";
    else if (wave >= 3 && r < 0.5) type = "officer";
    const cfg = COP_CONFIGS[type];
    const side = Math.random();
    let sx = 100 + Math.random() * (CW - 200);
    let sy = g.scrollY - 40;
    if (side < 0.2) { sx = -20; sy = g.scrollY + Math.random() * CH * 0.5; }
    if (side > 0.8) { sx = CW + 20; sy = g.scrollY + Math.random() * CH * 0.5; }
    g.cops.push({ id: uid(), x: sx, y: sy, vx: 0, vy: 0, hp: cfg.hp, maxHp: cfg.hp, type, state: "chase", stunTimer: 0, shootCd: 0, hitFlash: 0 });
  }, []);

  const splat = useCallback((x: number, y: number, color: string, n = 8, type: Particle["type"] = "blood") => {
    const g = G.current;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1 + Math.random() * 4;
      g.particles.push({ id: uid(), x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, maxLife: 1, color, size: 2 + Math.random() * 5, type });
    }
  }, []);

  const floatText = useCallback((x: number, y: number, text: string, color = "#fff") => {
    G.current.floats.push({ id: uid(), x, y, text, vy: -1.2, life: 1, color });
  }, []);

  const playerAttack = useCallback(() => {
    const g = G.current;
    const p = g.player;
    if (!p || g.screenRef !== "playing") return;
    if (p.weapon === "knife") {
      for (const c of g.cops) {
        if (dist(p, c) < 55) {
          const dmg = 30 + g.wave * 5;
          c.hp -= dmg;
          c.hitFlash = 200;
          c.state = "stun"; c.stunTimer = 400;
          splat(c.x, c.y, "#cc0000", 10);
          floatText(c.x, c.y - 20, `-${dmg}`, "#ff4444");
          if (c.hp <= 0) {
            p.kills++;
            p.money += COP_CONFIGS[c.type].reward;
            splat(c.x, c.y, "#880000", 20);
            floatText(c.x, c.y - 30, `+$${COP_CONFIGS[c.type].reward}`, "#ffcc00");
          }
        }
      }
      g.cops = g.cops.filter(c => c.hp > 0);
      splat(p.x + Math.cos(p.angle) * 40, p.y + Math.sin(p.angle) * 40, "#cc0000", 5, "spark");
    } else {
      if (p.ammo <= 0 || p.reloading > 0) {
        floatText(p.x, p.y - 30, "ПЕРЕЗАРЯДКА!", "#ffaa00");
        return;
      }
      p.ammo--;
      const dx = Math.cos(p.angle), dy = Math.sin(p.angle);
      g.bullets.push({ id: uid(), x: p.x + dx * 20, y: p.y + dy * 20, vx: dx * 12, vy: dy * 12, fromPlayer: true, dmg: 25 + g.wave * 3, life: 1 });
      splat(p.x + dx * 25, p.y + dy * 25, "#ffcc00", 4, "spark");
      if (p.ammo === 0) p.reloading = 2000;
    }
  }, [splat, floatText]);

  const loop = useCallback((ts: number) => {
    const dt = Math.min(ts - lastRef.current, 50);
    lastRef.current = ts;
    const g = G.current;
    const canvas = canvasRef.current;
    if (!canvas) { animRef.current = requestAnimationFrame(loop); return; }
    const ctx = canvas.getContext("2d")!;
    const p = g.player;

    g.frameN++;

    if (p && g.screenRef === "playing") {
      g.scrollY = p.y - CH * 0.6;
      fillWorld();
    }

    // ── PLAYER MOVEMENT ──
    if (p && g.screenRef === "playing") {
      let mx = 0, my = 0;
      if (g.keys["ArrowLeft"] || g.keys["a"]) mx -= 1;
      if (g.keys["ArrowRight"] || g.keys["d"]) mx += 1;
      if (g.keys["ArrowUp"] || g.keys["w"]) my -= 1;
      if (g.keys["ArrowDown"] || g.keys["s"]) my += 1;

      if (g.touch.active) {
        const dx = g.touch.x - g.touch.startX;
        const dy = g.touch.y - g.touch.startY;
        const m = Math.sqrt(dx * dx + dy * dy);
        if (m > 10) { mx = dx / m; my = dy / m; }
      }

      const spd = 2.8 * (dt / 16);
      p.vx = mx * spd; p.vy = my * spd;
      if (mx !== 0 || my !== 0) p.angle = Math.atan2(my, mx) - Math.PI / 2;

      if (g.cops.length > 0) {
        let nearest = g.cops[0], nd = dist(p, nearest);
        for (const c of g.cops) { const d2 = dist(p, c); if (d2 < nd) { nd = d2; nearest = c; } }
        p.angle = Math.atan2(nearest.y - p.y, nearest.x - p.x);
      }

      const nx = p.x + p.vx, ny = p.y + p.vy;
      let blocked = false;
      for (const o of g.obstacles) { if (circleRect(nx, ny, 14, o.x, o.y, o.w, o.h)) { blocked = true; break; } }
      if (!blocked) { p.x = Math.max(14, Math.min(CW - 14, nx)); p.y = ny; }
      else {
        const bx2 = p.x + p.vx;
        if (!g.obstacles.some(o => circleRect(bx2, p.y, 14, o.x, o.y, o.w, o.h))) p.x = Math.max(14, Math.min(CW - 14, bx2));
        const by2 = p.y + p.vy;
        if (!g.obstacles.some(o => circleRect(p.x, by2, 14, o.x, o.y, o.w, o.h))) p.y = by2;
      }

      if (g.keys[" "] || g.keys["f"] || g.keys["e"]) { if (g.frameN % 12 === 0) playerAttack(); }
      if (p.invincible > 0) p.invincible -= dt;
      if (p.reloading > 0) { p.reloading -= dt; if (p.reloading <= 0) { p.reloading = 0; p.ammo = p.maxAmmo; } }
    }

    // ── WAVE LOGIC ──
    if (p && g.screenRef === "playing") {
      g.waveTimer += dt;
      if (g.spawnQueue > 0) {
        g.spawnTimer += dt;
        if (g.spawnTimer > Math.max(600, 1500 - g.wave * 80)) { spawnCop(); g.spawnQueue--; g.spawnTimer = 0; }
      }
      if (g.spawnQueue === 0 && g.cops.length === 0 && g.waveTimer > 2000) {
        g.wave++;
        g.wantedLevel = Math.min(5, Math.ceil(g.wave / 2));
        spawnWave(g.wave);
        g.waveTimer = 0;
        floatText(CW / 2, CH * 0.4 + g.scrollY, `★ ВОЛНА ${g.wave}`, "#ffcc00");
      }
    }

    // ── COP AI ──
    if (p && g.screenRef === "playing") {
      for (const c of g.cops) {
        if (c.hitFlash > 0) c.hitFlash -= dt;
        if (c.state === "stun") { c.stunTimer -= dt; if (c.stunTimer <= 0) c.state = "chase"; continue; }
        const cfg = COP_CONFIGS[c.type];
        const d = dist(c, p);
        if (d < cfg.shootRange && d > 50) {
          c.state = "shoot";
          const n = normalize(p.x - c.x, p.y - c.y);
          c.vx = n.x * 0.5; c.vy = n.y * 0.5;
          c.shootCd -= dt;
          if (c.shootCd <= 0) {
            c.shootCd = cfg.shootCd;
            const spread = (Math.random() - 0.5) * 0.25;
            const a = Math.atan2(p.y - c.y, p.x - c.x) + spread;
            g.bullets.push({ id: uid(), x: c.x, y: c.y, vx: Math.cos(a) * 9, vy: Math.sin(a) * 9, fromPlayer: false, dmg: cfg.dmg, life: 1 });
          }
        } else {
          c.state = "chase";
          const n = normalize(p.x - c.x, p.y - c.y);
          const spd = cfg.speed * (dt / 16);
          c.vx = n.x * spd; c.vy = n.y * spd;
          if (d < 35 && p.invincible <= 0) {
            p.hp -= cfg.dmg * 0.05 * (dt / 16);
            p.invincible = 300;
            splat(p.x, p.y, "#cc0000", 6);
            if (p.hp <= 0) { g.screenRef = "dead"; setScreen("dead"); }
          }
        }
        const ncx = c.x + c.vx, ncy = c.y + c.vy;
        if (!g.obstacles.some(o => circleRect(ncx, ncy, 13, o.x, o.y, o.w, o.h))) { c.x = ncx; c.y = ncy; }
      }
    }

    // ── BULLETS ──
    if (g.screenRef === "playing") {
      for (const b of g.bullets) { b.x += b.vx * (dt / 16); b.y += b.vy * (dt / 16); b.life -= 0.008 * (dt / 16); }
      const deadBullets = new Set<number>(), deadCops = new Set<number>();
      for (const b of g.bullets) {
        if (!b.fromPlayer || !p) continue;
        for (const c of g.cops) {
          if (deadCops.has(c.id)) continue;
          if (dist(b, c) < 18) {
            c.hp -= b.dmg; c.hitFlash = 200; c.state = "stun"; c.stunTimer = 200;
            deadBullets.add(b.id);
            splat(c.x, c.y, "#cc0000", 6);
            floatText(c.x, c.y - 20, `-${b.dmg}`, "#ff4444");
            if (c.hp <= 0) { deadCops.add(c.id); p.kills++; p.money += COP_CONFIGS[c.type].reward; splat(c.x, c.y, "#880000", 16); floatText(c.x, c.y - 35, `+$${COP_CONFIGS[c.type].reward}`, "#ffcc00"); }
            break;
          }
        }
      }
      for (const b of g.bullets) {
        if (b.fromPlayer || !p) continue;
        if (dist(b, p) < 16 && p.invincible <= 0) {
          p.hp -= b.dmg; p.invincible = 500; deadBullets.add(b.id);
          splat(p.x, p.y, "#cc0000", 8);
          floatText(p.x, p.y - 20, `-${b.dmg}`, "#ff6666");
          if (p.hp <= 0) { g.screenRef = "dead"; setScreen("dead"); }
        }
      }
      for (const b of g.bullets) { if (g.obstacles.some(o => circleRect(b.x, b.y, 6, o.x, o.y, o.w, o.h))) { deadBullets.add(b.id); splat(b.x, b.y, "#888", 3, "spark"); } }
      g.bullets = g.bullets.filter(b => !deadBullets.has(b.id) && b.life > 0);
      g.cops = g.cops.filter(c => !deadCops.has(c.id));
    }

    // ── PARTICLES / FLOATS ──
    for (const pt of g.particles) { pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.05; pt.life -= 0.018 * (dt / 16); }
    g.particles = g.particles.filter(pt => pt.life > 0);
    for (const ft of g.floats) { ft.y += ft.vy; ft.life -= 0.015 * (dt / 16); }
    g.floats = g.floats.filter(ft => ft.life > 0);
    for (const r of g.rain) { r.y += r.speed * (dt / 16); if (r.y > CH) { r.y = -20; r.x = Math.random() * CW; } }

    // ── HUD sync ──
    if (g.frameN % 6 === 0 && p) {
      setHud({ hp: p.hp, maxHp: p.maxHp, ammo: p.ammo, maxAmmo: p.maxAmmo, reloading: p.reloading > 0, stamina: p.stamina, wave: g.wave, money: p.money, kills: p.kills, weapon: p.weapon, wantedLevel: g.wantedLevel });
    }

    // ═══════════════════ DRAW ═══════════════════
    ctx.clearRect(0, 0, CW, CH);
    const sy = g.scrollY;

    // Background tiled
    if (bgImgRef.current && bgImgRef.current.complete) {
      const imgH = bgImgRef.current.naturalHeight || CH;
      const imgW = bgImgRef.current.naturalWidth || CW;
      const scaledH = (imgW > 0) ? (CW / imgW) * imgH : CH;
      const startY = (((-sy) % scaledH) + scaledH) % scaledH - scaledH;
      for (let yy = startY; yy < CH; yy += scaledH) ctx.drawImage(bgImgRef.current, 0, yy, CW, Math.ceil(scaledH));
    } else {
      const bgG = ctx.createLinearGradient(0, 0, 0, CH);
      bgG.addColorStop(0, "#04000a"); bgG.addColorStop(1, "#08001a");
      ctx.fillStyle = bgG; ctx.fillRect(0, 0, CW, CH);
    }

    // Dark mood overlay
    ctx.fillStyle = "rgba(2,0,10,0.55)"; ctx.fillRect(0, 0, CW, CH);

    // Road center line
    ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.lineWidth = 2;
    ctx.setLineDash([30, 20]); ctx.lineDashOffset = (sy * 0.8) % 50;
    ctx.beginPath(); ctx.moveTo(CW / 2, 0); ctx.lineTo(CW / 2, CH); ctx.stroke();
    ctx.setLineDash([]);

    // Obstacles
    for (const o of g.obstacles) {
      const oy = o.y - sy;
      if (oy > CH + 50 || oy + o.h < -50) continue;
      const oGrad = ctx.createLinearGradient(o.x, oy, o.x + o.w, oy + o.h);
      oGrad.addColorStop(0, o.color); oGrad.addColorStop(1, "#050010");
      ctx.fillStyle = oGrad; ctx.fillRect(o.x, oy, o.w, o.h);
      if (o.h > 50) {
        for (let wy = oy + 10; wy < oy + o.h - 10; wy += 18) {
          for (let wx = o.x + 8; wx < o.x + o.w - 8; wx += 14) {
            if ((g.frameN + wx + wy) % 7 > 2) { ctx.fillStyle = "rgba(255,200,50,0.12)"; ctx.fillRect(wx, wy, 8, 10); }
          }
        }
      }
    }

    // Neon signs
    for (const s of g.signs) {
      const sy2 = s.y - sy;
      if (sy2 < -30 || sy2 > CH + 30) continue;
      const blink = Math.sin(g.frameN * 0.04 + s.blink) > 0.3 ? 1 : 0.3;
      ctx.globalAlpha = blink;
      ctx.font = "bold 11px 'IBM Plex Mono', monospace";
      ctx.fillStyle = s.color; ctx.shadowColor = s.color; ctx.shadowBlur = 12;
      ctx.fillText(s.text, s.x, sy2);
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }

    // Rain
    ctx.strokeStyle = "rgba(130,170,255,0.18)"; ctx.lineWidth = 1;
    for (const r of g.rain) { ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x - 1, r.y + r.len); ctx.stroke(); }

    // Particles
    for (const pt of g.particles) {
      const py3 = pt.y - sy;
      ctx.globalAlpha = pt.life; ctx.fillStyle = pt.color;
      if (pt.type === "spark") { ctx.shadowColor = "#ffcc00"; ctx.shadowBlur = 6; }
      ctx.beginPath(); ctx.arc(pt.x, py3, pt.size * pt.life, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;

    // Enemy bullets
    for (const b of g.bullets) {
      if (b.fromPlayer) continue;
      const by2 = b.y - sy;
      ctx.fillStyle = "#ffaa00"; ctx.shadowColor = "#ffaa00"; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(b.x, by2, 4, 0, Math.PI * 2); ctx.fill();
    }
    // Player bullets
    for (const b of g.bullets) {
      if (!b.fromPlayer) continue;
      const by2 = b.y - sy;
      ctx.fillStyle = "#ff4400"; ctx.shadowColor = "#ff4400"; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(b.x, by2, 5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Cops
    for (const c of g.cops) drawCop(ctx, c, sy);

    // Player
    if (p) drawPlayer(ctx, p, sy);

    // Float texts
    ctx.textAlign = "center";
    for (const ft of g.floats) {
      const fy = ft.y - sy;
      if (fy < -20 || fy > CH + 20) continue;
      ctx.globalAlpha = ft.life;
      ctx.font = "bold 15px 'Bebas Neue', sans-serif";
      ctx.fillStyle = ft.color; ctx.strokeStyle = "rgba(0,0,0,0.8)"; ctx.lineWidth = 3;
      ctx.strokeText(ft.text, ft.x, fy); ctx.fillText(ft.text, ft.x, fy);
    }
    ctx.globalAlpha = 1; ctx.textAlign = "left";

    animRef.current = requestAnimationFrame(loop);
  }, [fillWorld, spawnCop, spawnWave, splat, floatText, playerAttack]);

  const startGame = useCallback(() => {
    const g = G.current;
    g.player = { id: uid(), x: CW / 2, y: 3000, vx: 0, vy: 0, hp: 100, maxHp: 100, stamina: 100, invincible: 0, dashCd: 0, kills: 0, money: 0, weapon: "knife", ammo: 6, maxAmmo: 6, reloading: 0, angle: -Math.PI / 2 };
    g.cops = []; g.bullets = []; g.particles = []; g.floats = [];
    g.obstacles = []; g.signs = [];
    g.scrollY = g.player.y - CH * 0.6;
    g.chunkY = g.scrollY + CH;
    g.wave = 1; g.waveTimer = 0; g.wantedLevel = 1;
    g.screenRef = "playing";
    fillWorld(); spawnWave(1);
    setScreen("playing");
    setHud({ hp: 100, maxHp: 100, ammo: 6, maxAmmo: 6, reloading: false, stamina: 100, wave: 1, money: 0, kills: 0, weapon: "knife", wantedLevel: 1 });
  }, [fillWorld, spawnWave]);

  useEffect(() => {
    const g = G.current;
    const kd = (e: KeyboardEvent) => {
      g.keys[e.key] = true;
      if (e.key === "e" || e.key === "E") playerAttack();
      if ((e.key === "q" || e.key === "Q") && g.player) g.player.weapon = g.player.weapon === "knife" ? "gun" : "knife";
      if (e.key === "r" && g.player && g.player.weapon === "gun" && g.player.ammo < g.player.maxAmmo) g.player.reloading = 2000;
    };
    const ku = (e: KeyboardEvent) => { g.keys[e.key] = false; };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); };
  }, [playerAttack]);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const g = G.current;
    if (g.screenRef !== "playing") return;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CW / rect.width, scaleY = CH / rect.height;
    for (const t of Array.from(e.changedTouches)) {
      const tx = (t.clientX - rect.left) * scaleX;
      const ty = (t.clientY - rect.top) * scaleY;
      if (tx < CW * 0.55) { g.touch.active = true; g.touch.startX = tx; g.touch.startY = ty; g.touch.x = tx; g.touch.y = ty; }
      else { playerAttack(); }
    }
  }, [playerAttack]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const g = G.current;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CW / rect.width;
    for (const t of Array.from(e.changedTouches)) {
      const tx = (t.clientX - rect.left) * scaleX;
      if (tx < CW * 0.55) { g.touch.x = tx; g.touch.y = (t.clientY - rect.top) * (CH / rect.height); }
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    G.current.touch.active = false;
  }, []);

  useEffect(() => {
    const img = new Image();
    img.src = BG_URL;
    img.onload = () => { bgImgRef.current = img; };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [loop]);

  const wantedStars = "★".repeat(hud.wantedLevel) + "☆".repeat(5 - hud.wantedLevel);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#000", fontFamily: "'Montserrat', sans-serif" }}>
      <div style={{ position: "relative", width: CW, maxWidth: "100vw" }}>

        <canvas
          ref={canvasRef}
          width={CW} height={CH}
          style={{ display: "block", width: "100%", touchAction: "none", cursor: screen === "playing" ? "crosshair" : "default" }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />

        {/* HUD */}
        {screen === "playing" && (
          <>
            <div style={{ position: "absolute", top: 12, left: 12, right: 12, pointerEvents: "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, marginRight: 12 }}>
                  <div style={{ fontSize: 10, color: "#ff4444", letterSpacing: 3, marginBottom: 3, fontFamily: "'IBM Plex Mono'" }}>HP {Math.ceil(hud.hp)}/{hud.maxHp}</div>
                  <div style={{ height: 6, background: "rgba(0,0,0,0.6)", borderRadius: 3, overflow: "hidden", border: "1px solid rgba(255,0,0,0.3)" }}>
                    <div style={{ height: "100%", width: `${Math.max(0, (hud.hp / hud.maxHp) * 100)}%`, background: hud.hp > 60 ? "#00ff88" : hud.hp > 30 ? "#ffaa00" : "#ff2200", borderRadius: 3, transition: "width 0.1s" }} />
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, color: "#ffcc00", letterSpacing: 1, fontFamily: "'Bebas Neue'" }}>{wantedStars}</div>
                  <div style={{ fontSize: 10, color: "#aaa", fontFamily: "'IBM Plex Mono'" }}>WAVE {hud.wave}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
                <div style={{ fontSize: 13, color: "#ffcc00", fontFamily: "'Bebas Neue'", letterSpacing: 1 }}>${hud.money}</div>
                <div style={{ fontSize: 13, color: "#ff4444", fontFamily: "'Bebas Neue'", letterSpacing: 1 }}>☠ {hud.kills}</div>
              </div>
            </div>

            <div style={{ position: "absolute", bottom: 80, left: 12, pointerEvents: "none" }}>
              <div style={{ fontSize: 12, color: "#fff", fontFamily: "'IBM Plex Mono'", marginBottom: 4 }}>
                {hud.weapon === "knife" ? "🔪 НОЖ" : `🔫 ${hud.ammo}/${hud.maxAmmo}`}
              </div>
              {hud.weapon === "gun" && hud.reloading && <div style={{ fontSize: 10, color: "#ffaa00", fontFamily: "'IBM Plex Mono'" }}>ПЕРЕЗАРЯДКА...</div>}
              {hud.weapon === "gun" && !hud.reloading && (
                <div style={{ display: "flex", gap: 3 }}>
                  {Array.from({ length: hud.maxAmmo }).map((_, i) => (
                    <div key={i} style={{ width: 5, height: 14, borderRadius: 2, background: i < hud.ammo ? "#ff4400" : "rgba(255,255,255,0.1)" }} />
                  ))}
                </div>
              )}
            </div>

            {/* Mobile buttons */}
            <div style={{ position: "absolute", bottom: 12, left: 0, right: 0, display: "flex", justifyContent: "space-between", padding: "0 16px" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "'IBM Plex Mono'", textAlign: "center" }}>MOVE</span>
              </div>
              <div
                onPointerDown={(e) => { e.preventDefault(); playerAttack(); }}
                style={{ width: 72, height: 72, borderRadius: "50%", border: "2px solid rgba(255,60,0,0.5)", background: "rgba(255,60,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                <span style={{ fontSize: 10, color: "rgba(255,100,0,0.7)", fontFamily: "'IBM Plex Mono'" }}>ATK</span>
              </div>
            </div>

            {/* Weapon switch hint */}
            <div style={{ position: "absolute", bottom: 36, left: "50%", transform: "translateX(-50%)", pointerEvents: "none" }}>
              <div
                onPointerDown={(e) => { e.preventDefault(); const g = G.current; if (g.player) g.player.weapon = g.player.weapon === "knife" ? "gun" : "knife"; }}
                style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'IBM Plex Mono'", pointerEvents: "all", cursor: "pointer", padding: "4px 10px", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6 }}
              >
                Q — сменить оружие
              </div>
            </div>
          </>
        )}

        {/* MENU */}
        {screen === "menu" && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,8,0.93)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", padding: "0 30px", position: "relative", zIndex: 1 }}>
              <div style={{ fontSize: 11, letterSpacing: 6, color: "#ff4444", fontFamily: "'IBM Plex Mono'", marginBottom: 16 }}>НУАР · ЭКШН</div>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 62, lineHeight: 0.9, color: "#fff", textShadow: "0 0 40px rgba(255,0,0,0.6)", letterSpacing: 4 }}>
                НОЧНОЙ<br /><span style={{ color: "#ff2200" }}>БЕГЛЕЦ</span>
              </div>
              <div style={{ width: 80, height: 2, background: "linear-gradient(90deg, transparent, #ff2200, transparent)", margin: "16px auto" }} />
              <div style={{ fontSize: 13, color: "#666", fontFamily: "'Montserrat'", fontWeight: 300, marginBottom: 36, letterSpacing: 0.5, lineHeight: 1.8 }}>
                Киллер. Засвечен. Полиция на хвосте.<br />
                <span style={{ color: "#888" }}>Единственный выход — устранить всех.</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 36 }}>
                {[{ e: "🔪", t: "Нож" }, { e: "🔫", t: "Пистолет" }, { e: "🌊", t: "Волны" }].map(f => (
                  <div key={f.t} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "14px 8px" }}>
                    <div style={{ fontSize: 26, marginBottom: 4 }}>{f.e}</div>
                    <div style={{ fontSize: 11, color: "#777", fontFamily: "'IBM Plex Mono'" }}>{f.t}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={startGame}
                style={{ width: "100%", padding: "16px", background: "linear-gradient(135deg, #8B0000, #ff2200)", border: "none", borderRadius: 12, color: "#fff", fontSize: 22, fontFamily: "'Bebas Neue'", letterSpacing: 5, cursor: "pointer", boxShadow: "0 0 40px rgba(255,0,0,0.35)" }}
              >
                НАЧАТЬ ПОБЕГ
              </button>
              <div style={{ marginTop: 18, fontSize: 10, color: "#333", fontFamily: "'IBM Plex Mono'", lineHeight: 2.2 }}>
                WASD — движение &nbsp;|&nbsp; E / SPACE — атака<br />
                Q — смена оружия &nbsp;|&nbsp; R — перезарядка<br />
                МОБИЛЬНЫЙ: тап слева — движение, справа — атака
              </div>
            </div>
          </div>
        )}

        {/* GAME OVER */}
        {screen === "dead" && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.93)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", padding: "0 30px" }}>
              <div style={{ fontSize: 72, marginBottom: 8 }}>💀</div>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 52, color: "#ff2200", letterSpacing: 4, textShadow: "0 0 30px rgba(255,0,0,0.7)" }}>ПОЙМАН</div>
              <div style={{ fontSize: 12, color: "#444", fontFamily: "'IBM Plex Mono'", marginBottom: 28 }}>конец побега</div>
              <div style={{ background: "rgba(255,0,0,0.05)", border: "1px solid rgba(255,0,0,0.12)", borderRadius: 16, padding: "24px 36px", marginBottom: 28 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                  {[{ v: `☠ ${hud.kills}`, l: "уничтожено" }, { v: `$${hud.money}`, l: "заработано" }, { v: `W${hud.wave}`, l: "волна" }, { v: wantedStars, l: "розыск" }].map(s => (
                    <div key={s.l}>
                      <div style={{ fontSize: 28, color: "#ffcc00", fontFamily: "'Bebas Neue'" }}>{s.v}</div>
                      <div style={{ fontSize: 10, color: "#444", fontFamily: "'IBM Plex Mono'" }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={startGame}
                style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg, #8B0000, #ff2200)", border: "none", borderRadius: 12, color: "#fff", fontSize: 20, fontFamily: "'Bebas Neue'", letterSpacing: 4, cursor: "pointer", boxShadow: "0 0 28px rgba(255,0,0,0.3)" }}
              >
                🔄 СНОВА В БЕГСТВО
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
