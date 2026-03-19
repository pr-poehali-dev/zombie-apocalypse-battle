import { useEffect, useRef, useState, useCallback } from "react";

const BG_URL = "https://cdn.poehali.dev/projects/5be54ed1-a7a9-40fa-a808-f245193e3bf9/files/f8383550-7c8b-4dd2-95a6-2637b7f9131c.jpg";

// --- Game Constants ---
const CANVAS_W = 390;
const CANVAS_H = 700;
const PLAYER_Y = CANVAS_H - 120;
const PLAYER_SIZE = 28;
const ZOMBIE_SIZE = 26;
const BULLET_SIZE = 5;
const BULLET_SPEED = 10;

const WEAPONS = [
  { id: "pistol", name: "Пистолет", emoji: "🔫", damage: 25, fireRate: 500, ammo: 30, maxAmmo: 30, bulletColor: "#FFD700", spread: 0, pellets: 1, upgradeCost: 0 },
  { id: "shotgun", name: "Дробовик", emoji: "💥", damage: 40, fireRate: 900, ammo: 15, maxAmmo: 15, bulletColor: "#FF6B00", spread: 0.3, pellets: 5, upgradeCost: 150 },
  { id: "ak47", name: "АК-47", emoji: "⚡", damage: 18, fireRate: 120, ammo: 45, maxAmmo: 45, bulletColor: "#00FFFF", spread: 0.08, pellets: 1, upgradeCost: 300 },
];

type Bullet = { x: number; y: number; vx: number; vy: number; damage: number; color: string; id: number };
type Zombie = { x: number; y: number; hp: number; maxHp: number; speed: number; id: number; type: string; hit: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number; id: number };
type FloatingText = { x: number; y: number; text: string; life: number; color: string; id: number };

let _id = 0;
const uid = () => ++_id;

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export default function Index() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgRef = useRef<HTMLImageElement | null>(null);
  const stateRef = useRef({
    phase: "menu" as "menu" | "playing" | "gameover" | "shop",
    player: { x: CANVAS_W / 2, hp: 100, maxHp: 100 },
    bullets: [] as Bullet[],
    zombies: [] as Zombie[],
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    wave: 1,
    score: 0,
    coins: 0,
    kills: 0,
    waveKills: 0,
    waveTotal: 0,
    waveActive: false,
    waveTimer: 0,
    lastShot: 0,
    currentWeapon: 0,
    weapons: WEAPONS.map(w => ({ ...w })),
    unlockedWeapons: [0],
    upgrades: { damage: 0, fireRate: 0, ammo: 0 },
    touching: false,
    touchX: CANVAS_W / 2,
    autoFire: false,
    spawnQueue: 0,
    spawnTimer: 0,
    frameCount: 0,
    shopTab: "weapons" as "weapons" | "upgrades",
  });

  const [uiState, setUiState] = useState({
    phase: "menu" as "menu" | "playing" | "gameover" | "shop",
    hp: 100,
    maxHp: 100,
    ammo: 30,
    maxAmmo: 30,
    score: 0,
    coins: 0,
    wave: 1,
    waveActive: false,
    waveKills: 0,
    waveTotal: 0,
    weaponName: "Пистолет",
    weaponEmoji: "🔫",
    kills: 0,
    shopTab: "weapons" as "weapons" | "upgrades",
    unlockedWeapons: [0],
    currentWeapon: 0,
    upgrades: { damage: 0, fireRate: 0, ammo: 0 },
  });

  const animRef = useRef<number>(0);
  const lastTimeRef = useRef(0);

  const syncUI = useCallback(() => {
    const s = stateRef.current;
    const w = s.weapons[s.currentWeapon];
    setUiState({
      phase: s.phase,
      hp: s.player.hp,
      maxHp: s.player.maxHp,
      ammo: w.ammo,
      maxAmmo: w.maxAmmo,
      score: s.score,
      coins: s.coins,
      wave: s.wave,
      waveActive: s.waveActive,
      waveKills: s.waveKills,
      waveTotal: s.waveTotal,
      weaponName: w.name,
      weaponEmoji: w.emoji,
      kills: s.kills,
      shopTab: s.shopTab,
      unlockedWeapons: [...s.unlockedWeapons],
      currentWeapon: s.currentWeapon,
      upgrades: { ...s.upgrades },
    });
  }, []);

  const spawnParticles = (x: number, y: number, color: string, count = 6) => {
    const s = stateRef.current;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      s.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, color, size: 2 + Math.random() * 4, id: uid() });
    }
  };

  const addFloating = (x: number, y: number, text: string, color = "#FFD700") => {
    stateRef.current.floatingTexts.push({ x, y, text, life: 1, color, id: uid() });
  };

  const shoot = useCallback((now: number) => {
    const s = stateRef.current;
    if (s.phase !== "playing") return;
    const w = s.weapons[s.currentWeapon];
    if (now - s.lastShot < w.fireRate) return;
    if (w.ammo <= 0) { addFloating(s.player.x, PLAYER_Y - 40, "Перезарядка!", "#FF4444"); return; }
    s.lastShot = now;
    w.ammo--;

    for (let p = 0; p < w.pellets; p++) {
      const spread = (Math.random() - 0.5) * w.spread;
      s.bullets.push({ x: s.player.x, y: PLAYER_Y - 20, vx: spread * BULLET_SPEED, vy: -BULLET_SPEED, damage: w.damage * (1 + s.upgrades.damage * 0.2), color: w.bulletColor, id: uid() });
    }
  }, []);

  const startWave = useCallback(() => {
    const s = stateRef.current;
    const zombieCount = 5 + s.wave * 3;
    s.waveActive = true;
    s.waveKills = 0;
    s.waveTotal = zombieCount;
    s.spawnQueue = zombieCount;
    s.spawnTimer = 0;
    s.frameCount = 0;
  }, []);

  const spawnZombie = useCallback(() => {
    const s = stateRef.current;
    const types = ["normal", "fast", "tank"];
    const weights = s.wave < 3 ? [0.8, 0.2, 0] : s.wave < 6 ? [0.5, 0.3, 0.2] : [0.3, 0.4, 0.3];
    const r = Math.random();
    let type = "normal";
    if (r > weights[0] + weights[1]) type = "tank";
    else if (r > weights[0]) type = "fast";

    const configs: Record<string, { hp: number; speed: number }> = {
      normal: { hp: 40 + s.wave * 10, speed: 0.5 + s.wave * 0.05 },
      fast: { hp: 25 + s.wave * 5, speed: 1.2 + s.wave * 0.08 },
      tank: { hp: 120 + s.wave * 20, speed: 0.3 + s.wave * 0.03 },
    };
    const cfg = configs[type];
    const side = Math.random() < 0.3;
    const x = side ? (Math.random() < 0.5 ? -ZOMBIE_SIZE : CANVAS_W + ZOMBIE_SIZE) : Math.random() * (CANVAS_W - 40) + 20;
    const y = side ? Math.random() * (CANVAS_H * 0.4) : -ZOMBIE_SIZE;

    s.zombies.push({ x, y, hp: cfg.hp, maxHp: cfg.hp, speed: cfg.speed, id: uid(), type, hit: 0 });
  }, []);

  const gameLoop = useCallback((timestamp: number) => {
    const dt = Math.min(timestamp - lastTimeRef.current, 50);
    lastTimeRef.current = timestamp;
    const s = stateRef.current;
    const canvas = canvasRef.current;
    if (!canvas) { animRef.current = requestAnimationFrame(gameLoop); return; }
    const ctx = canvas.getContext("2d")!;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    if (bgRef.current) {
      ctx.globalAlpha = 0.7;
      ctx.drawImage(bgRef.current, 0, 0, CANVAS_W, CANVAS_H);
      ctx.globalAlpha = 1;
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      grad.addColorStop(0, "#0a0005");
      grad.addColorStop(0.6, "#1a0510");
      grad.addColorStop(1, "#0d0008");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    // Fog overlay
    const fog = ctx.createLinearGradient(0, CANVAS_H * 0.5, 0, CANVAS_H);
    fog.addColorStop(0, "rgba(0,0,0,0)");
    fog.addColorStop(1, "rgba(0,0,0,0.6)");
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    if (s.phase === "menu" || s.phase === "shop" || s.phase === "gameover") {
      animRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    s.frameCount++;

    // Spawn zombies
    if (s.waveActive && s.spawnQueue > 0) {
      s.spawnTimer += dt;
      const spawnInterval = Math.max(400, 1200 - s.wave * 50);
      if (s.spawnTimer >= spawnInterval) {
        spawnZombie();
        s.spawnQueue--;
        s.spawnTimer = 0;
      }
    }

    // Auto fire
    if (s.autoFire && s.touching) shoot(timestamp);

    // Move bullets
    s.bullets = s.bullets.filter(b => b.y > -20 && b.x > -20 && b.x < CANVAS_W + 20);
    for (const b of s.bullets) { b.x += b.vx; b.y += b.vy; }

    // Move zombies
    for (const z of s.zombies) {
      if (z.hit > 0) z.hit -= dt;
      const dx = s.player.x - z.x;
      const dy = PLAYER_Y - z.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 5) {
        z.x += (dx / dist) * z.speed * (dt / 16);
        z.y += (dy / dist) * z.speed * (dt / 16);
      }
      // Attack player
      if (dist < PLAYER_SIZE + ZOMBIE_SIZE - 10) {
        s.player.hp -= (z.type === "tank" ? 0.15 : z.type === "fast" ? 0.08 : 0.1) * (dt / 16);
        if (s.player.hp <= 0) {
          s.phase = "gameover";
          syncUI();
        }
      }
    }

    // Bullet-Zombie collision
    const bulletsToRemove = new Set<number>();
    const zombiesToRemove = new Set<number>();

    for (const b of s.bullets) {
      for (const z of s.zombies) {
        if (zombiesToRemove.has(z.id)) continue;
        const dx = b.x - z.x;
        const dy = b.y - z.y;
        if (dx * dx + dy * dy < (BULLET_SIZE + ZOMBIE_SIZE) ** 2) {
          z.hp -= b.damage;
          z.hit = 200;
          bulletsToRemove.add(b.id);
          spawnParticles(z.x, z.y, "#8B0000", 4);
          if (z.hp <= 0) {
            zombiesToRemove.add(z.id);
            const reward = z.type === "tank" ? 30 : z.type === "fast" ? 15 : 10;
            const pts = z.type === "tank" ? 50 : z.type === "fast" ? 30 : 20;
            s.coins += reward;
            s.score += pts;
            s.kills++;
            s.waveKills++;
            spawnParticles(z.x, z.y, "#FF2200", 12);
            addFloating(z.x, z.y - 20, `+${pts}`, "#FFD700");
          }
          break;
        }
      }
    }

    s.bullets = s.bullets.filter(b => !bulletsToRemove.has(b.id));
    s.zombies = s.zombies.filter(z => !zombiesToRemove.has(z.id));

    // Wave complete
    if (s.waveActive && s.spawnQueue === 0 && s.zombies.length === 0) {
      s.waveActive = false;
      const bonus = s.wave * 50;
      s.coins += bonus;
      s.score += bonus;
      addFloating(CANVAS_W / 2, CANVAS_H / 2, `Волна ${s.wave} пройдена! +${bonus}`, "#00FF88");
      s.wave++;
      // Reload ammo between waves
      for (const w of s.weapons) w.ammo = w.maxAmmo;
    }

    // Update particles
    s.particles = s.particles.filter(p => p.life > 0);
    for (const p of s.particles) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.life -= 0.025;
    }

    // Update floating texts
    s.floatingTexts = s.floatingTexts.filter(t => t.life > 0);
    for (const t of s.floatingTexts) { t.y -= 0.8; t.life -= 0.02; }

    // --- DRAW ---

    // Particles
    for (const p of s.particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Bullets
    for (const b of s.bullets) {
      ctx.fillStyle = b.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, BULLET_SIZE, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Zombies
    for (const z of s.zombies) {
      const isHit = z.hit > 0;
      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.beginPath();
      ctx.ellipse(z.x, z.y + ZOMBIE_SIZE - 2, ZOMBIE_SIZE * 0.7, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body
      const bodyColor = z.type === "tank" ? (isHit ? "#FF8888" : "#5a0000") :
        z.type === "fast" ? (isHit ? "#FFAAAA" : "#2d0040") :
          (isHit ? "#FF9999" : "#1a2800");
      ctx.fillStyle = bodyColor;
      ctx.shadowBlur = isHit ? 12 : 0;
      ctx.shadowColor = "#FF0000";
      ctx.beginPath();
      ctx.ellipse(z.x, z.y + 4, ZOMBIE_SIZE * 0.55, ZOMBIE_SIZE * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      // Head
      ctx.fillStyle = z.type === "tank" ? "#6b1010" : z.type === "fast" ? "#3d1050" : "#2a3d00";
      ctx.beginPath();
      ctx.arc(z.x, z.y - ZOMBIE_SIZE * 0.6, ZOMBIE_SIZE * 0.42, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      ctx.fillStyle = "#FF0000";
      ctx.shadowBlur = 4;
      ctx.shadowColor = "#FF0000";
      ctx.beginPath();
      ctx.arc(z.x - 5, z.y - ZOMBIE_SIZE * 0.65, 3, 0, Math.PI * 2);
      ctx.arc(z.x + 5, z.y - ZOMBIE_SIZE * 0.65, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // HP bar
      const barW = ZOMBIE_SIZE * 1.4;
      const barX = z.x - barW / 2;
      const barY = z.y - ZOMBIE_SIZE - 14;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      drawRoundRect(ctx, barX - 1, barY - 1, barW + 2, 8, 3);
      ctx.fill();
      const hpFrac = z.hp / z.maxHp;
      ctx.fillStyle = hpFrac > 0.6 ? "#00FF44" : hpFrac > 0.3 ? "#FFAA00" : "#FF2200";
      drawRoundRect(ctx, barX, barY, barW * hpFrac, 6, 3);
      ctx.fill();

      // Type badge
      ctx.font = "10px Oswald";
      ctx.fillStyle = z.type === "tank" ? "#FF6B6B" : z.type === "fast" ? "#CC88FF" : "#88FF88";
      ctx.textAlign = "center";
      ctx.fillText(z.type === "tank" ? "ТАНК" : z.type === "fast" ? "БЫСТРЫЙ" : "", z.x, barY - 3);
    }

    // Player
    {
      const px = s.player.x;
      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.beginPath();
      ctx.ellipse(px, PLAYER_Y + PLAYER_SIZE - 4, PLAYER_SIZE * 0.7, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Glow ring
      ctx.strokeStyle = "rgba(0,200,255,0.3)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(px, PLAYER_Y, PLAYER_SIZE + 4, PLAYER_SIZE + 4, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Body
      const bodyGrad = ctx.createRadialGradient(px - 5, PLAYER_Y - 5, 2, px, PLAYER_Y, PLAYER_SIZE);
      bodyGrad.addColorStop(0, "#4a6fa5");
      bodyGrad.addColorStop(1, "#1a2f4a");
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.ellipse(px, PLAYER_Y + 5, PLAYER_SIZE * 0.6, PLAYER_SIZE * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      // Head
      const headGrad = ctx.createRadialGradient(px - 4, PLAYER_Y - PLAYER_SIZE * 0.6 - 3, 2, px, PLAYER_Y - PLAYER_SIZE * 0.6, PLAYER_SIZE * 0.45);
      headGrad.addColorStop(0, "#c5a880");
      headGrad.addColorStop(1, "#8a6040");
      ctx.fillStyle = headGrad;
      ctx.beginPath();
      ctx.arc(px, PLAYER_Y - PLAYER_SIZE * 0.6, PLAYER_SIZE * 0.45, 0, Math.PI * 2);
      ctx.fill();
      // Weapon
      const w = s.weapons[s.currentWeapon];
      ctx.font = "18px Arial";
      ctx.textAlign = "center";
      ctx.fillText(w.emoji, px + PLAYER_SIZE * 0.8, PLAYER_Y - 5);
    }

    // Floating texts
    for (const t of s.floatingTexts) {
      ctx.globalAlpha = t.life;
      ctx.font = "bold 16px Oswald";
      ctx.fillStyle = t.color;
      ctx.strokeStyle = "rgba(0,0,0,0.8)";
      ctx.lineWidth = 3;
      ctx.textAlign = "center";
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;

    // Sync UI every 10 frames
    if (s.frameCount % 10 === 0) syncUI();

    animRef.current = requestAnimationFrame(gameLoop);
  }, [shoot, spawnZombie, syncUI]);

  useEffect(() => {
    const img = new Image();
    img.src = BG_URL;
    img.onload = () => { bgRef.current = img; };
    animRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animRef.current);
  }, [gameLoop]);

  // Touch handling
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const s = stateRef.current;
    if (s.phase !== "playing") return;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const touch = e.touches[0];
    s.touching = true;
    s.touchX = (touch.clientX - rect.left) * scaleX;
    s.player.x = Math.max(PLAYER_SIZE, Math.min(CANVAS_W - PLAYER_SIZE, s.touchX));
    s.autoFire = true;
    shoot(performance.now());
  }, [shoot]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const s = stateRef.current;
    if (s.phase !== "playing") return;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const touch = e.touches[0];
    s.touchX = (touch.clientX - rect.left) * scaleX;
    s.player.x = Math.max(PLAYER_SIZE, Math.min(CANVAS_W - PLAYER_SIZE, s.touchX));
    shoot(performance.now());
  }, [shoot]);

  const handleTouchEnd = useCallback(() => {
    stateRef.current.touching = false;
    stateRef.current.autoFire = false;
  }, []);

  // Mouse (desktop)
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const s = stateRef.current;
    if (s.phase !== "playing") return;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    s.player.x = Math.max(PLAYER_SIZE, Math.min(CANVAS_W - PLAYER_SIZE, (e.clientX - rect.left) * scaleX));
  }, []);

  const handleClick = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== "playing") return;
    shoot(performance.now());
  }, [shoot]);

  const startGame = useCallback(() => {
    const s = stateRef.current;
    s.phase = "playing";
    s.player = { x: CANVAS_W / 2, hp: 100, maxHp: 100 };
    s.bullets = [];
    s.zombies = [];
    s.particles = [];
    s.floatingTexts = [];
    s.wave = 1;
    s.score = 0;
    s.coins = 0;
    s.kills = 0;
    s.waveKills = 0;
    s.waveTotal = 0;
    s.waveActive = false;
    s.lastShot = 0;
    s.currentWeapon = 0;
    s.weapons = WEAPONS.map(w => ({ ...w }));
    s.unlockedWeapons = [0];
    s.upgrades = { damage: 0, fireRate: 0, ammo: 0 };
    startWave();
    syncUI();
  }, [startWave, syncUI]);

  const openShop = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== "playing" || s.waveActive) return;
    s.phase = "shop";
    syncUI();
  }, [syncUI]);

  const closeShop = useCallback(() => {
    const s = stateRef.current;
    s.phase = "playing";
    startWave();
    syncUI();
  }, [startWave, syncUI]);

  const buyWeapon = useCallback((idx: number) => {
    const s = stateRef.current;
    const w = WEAPONS[idx];
    if (s.coins >= w.upgradeCost && !s.unlockedWeapons.includes(idx)) {
      s.coins -= w.upgradeCost;
      s.unlockedWeapons.push(idx);
      s.weapons[idx] = { ...w };
      syncUI();
    }
  }, [syncUI]);

  const selectWeapon = useCallback((idx: number) => {
    const s = stateRef.current;
    if (s.unlockedWeapons.includes(idx)) {
      s.currentWeapon = idx;
      syncUI();
    }
  }, [syncUI]);

  const buyUpgrade = useCallback((type: "damage" | "fireRate" | "ammo") => {
    const s = stateRef.current;
    const costs = [100, 200, 350, 500];
    const level = s.upgrades[type];
    if (level >= 3) return;
    const cost = costs[level];
    if (s.coins >= cost) {
      s.coins -= cost;
      s.upgrades[type]++;
      if (type === "ammo") {
        for (const w of s.weapons) { w.maxAmmo = Math.round(w.maxAmmo * 1.25); w.ammo = w.maxAmmo; }
      }
      if (type === "fireRate") {
        for (const w of s.weapons) { w.fireRate = Math.round(w.fireRate * 0.8); }
      }
      syncUI();
    }
  }, [syncUI]);

  const { phase, hp, maxHp, ammo, maxAmmo, score, coins, wave, waveActive, waveKills, waveTotal, weaponName, weaponEmoji, kills, shopTab, unlockedWeapons, currentWeapon, upgrades } = uiState;

  const upgradeLabels = { damage: "Урон", fireRate: "Скорострельность", ammo: "Магазин" };
  const upgradeIcons = { damage: "⚔️", fireRate: "⚡", ammo: "🔋" };

  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div style={{ width: CANVAS_W, maxWidth: "100vw", position: "relative", fontFamily: "Oswald, sans-serif" }}>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ display: "block", width: "100%", touchAction: "none", cursor: phase === "playing" ? "crosshair" : "default" }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
        />

        {/* HUD — Playing */}
        {phase === "playing" && (
          <>
            {/* Top bar */}
            <div style={{ position: "absolute", top: 10, left: 10, right: 10, pointerEvents: "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                {/* HP */}
                <div style={{ flex: 1, marginRight: 10 }}>
                  <div style={{ fontSize: 11, color: "#FF4444", letterSpacing: 2, marginBottom: 2 }}>
                    ❤️ {Math.ceil(hp)} / {maxHp}
                  </div>
                  <div style={{ height: 8, background: "rgba(0,0,0,0.5)", borderRadius: 4, overflow: "hidden", border: "1px solid rgba(255,0,0,0.3)" }}>
                    <div style={{ height: "100%", width: `${(hp / maxHp) * 100}%`, background: hp > 60 ? "#00FF44" : hp > 30 ? "#FFAA00" : "#FF2200", borderRadius: 4, transition: "width 0.1s" }} />
                  </div>
                </div>
                {/* Score */}
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 18, color: "#FFD700", fontWeight: 700 }}>⭐ {score}</div>
                  <div style={{ fontSize: 12, color: "#AAFFAA" }}>🪙 {coins}</div>
                </div>
              </div>
              {/* Wave */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 13, color: "#FF8800", letterSpacing: 1 }}>
                  ВОЛНА {wave} {waveActive ? `• Зомби: ${waveTotal - waveKills}` : ""}
                </div>
                {waveActive && (
                  <div style={{ height: 4, flex: 1, marginLeft: 10, background: "rgba(0,0,0,0.5)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(waveKills / waveTotal) * 100}%`, background: "#FF6600", borderRadius: 2, transition: "width 0.2s" }} />
                  </div>
                )}
              </div>
            </div>

            {/* Ammo + Weapon (bottom left) */}
            <div style={{ position: "absolute", bottom: 20, left: 10, pointerEvents: "none" }}>
              <div style={{ fontSize: 14, color: "#FFFFFF", marginBottom: 2 }}>{weaponEmoji} {weaponName}</div>
              <div style={{ display: "flex", gap: 2, flexWrap: "wrap", maxWidth: 150 }}>
                {Array.from({ length: maxAmmo }).map((_, i) => (
                  <div key={i} style={{ width: 6, height: 14, borderRadius: 2, background: i < ammo ? "#FFD700" : "rgba(255,255,255,0.15)" }} />
                ))}
              </div>
            </div>

            {/* Shop button (bottom right) — only between waves */}
            {!waveActive && (
              <button
                onClick={openShop}
                style={{ position: "absolute", bottom: 20, right: 10, background: "linear-gradient(135deg, #1a4a1a, #2a7a2a)", border: "2px solid #44FF44", borderRadius: 12, padding: "10px 16px", color: "#AAFFAA", fontSize: 14, fontFamily: "Oswald", letterSpacing: 1, cursor: "pointer" }}
              >
                🛒 МАГАЗИН
              </button>
            )}

            {/* Kills */}
            <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", pointerEvents: "none" }}>
              <div style={{ fontSize: 12, color: "#FF6666", textAlign: "center" }}>☠️ {kills}</div>
            </div>

            {/* Hint touch */}
            {!waveActive && (
              <div style={{ position: "absolute", top: "45%", left: 0, right: 0, textAlign: "center", pointerEvents: "none" }}>
                <div style={{ fontSize: 18, color: "#FFFFFF", textShadow: "0 0 20px #00FF88", animation: "pulse 1.5s infinite" }}>
                  Волна {wave} начнётся сейчас...
                </div>
              </div>
            )}
          </>
        )}

        {/* MENU */}
        {phase === "menu" && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", padding: 30 }}>
              <div style={{ fontSize: 13, color: "#FF4444", letterSpacing: 8, marginBottom: 8 }}>☣ МОСКВА ☣</div>
              <div style={{ fontSize: 44, fontWeight: 700, color: "#FFFFFF", lineHeight: 1, textShadow: "0 0 30px #FF0000", letterSpacing: 3 }}>МЕРТВА</div>
              <div style={{ fontSize: 13, color: "#888", marginTop: 8, letterSpacing: 3 }}>ЗОМБИ АПОКАЛИПСИС</div>

              <div style={{ marginTop: 40, marginBottom: 30, padding: "20px 0", borderTop: "1px solid rgba(255,0,0,0.2)", borderBottom: "1px solid rgba(255,0,0,0.2)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, textAlign: "center" }}>
                  {[{ icon: "🌊", label: "Волны врагов" }, { icon: "🔫", label: "3 вида оружия" }, { icon: "⬆️", label: "Апгрейды" }].map(f => (
                    <div key={f.label}>
                      <div style={{ fontSize: 28 }}>{f.icon}</div>
                      <div style={{ fontSize: 11, color: "#AAAAAA", marginTop: 4 }}>{f.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={startGame}
                style={{ background: "linear-gradient(135deg, #8B0000, #CC0000)", border: "2px solid #FF4444", borderRadius: 16, padding: "16px 48px", color: "#FFFFFF", fontSize: 22, fontFamily: "Oswald", letterSpacing: 3, cursor: "pointer", boxShadow: "0 0 30px rgba(255,0,0,0.4)", width: "100%" }}
              >
                ▶ НАЧАТЬ
              </button>

              <div style={{ marginTop: 16, fontSize: 12, color: "#555" }}>
                Тапни по экрану чтобы стрелять • Двигай пальцем чтобы идти
              </div>
            </div>
          </div>
        )}

        {/* GAME OVER */}
        {phase === "gameover" && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", padding: 30 }}>
              <div style={{ fontSize: 60, marginBottom: 10 }}>💀</div>
              <div style={{ fontSize: 38, fontWeight: 700, color: "#FF2200", letterSpacing: 3, textShadow: "0 0 20px #FF0000" }}>ВЫ ПАЛИ</div>
              <div style={{ fontSize: 14, color: "#888", marginTop: 4 }}>Москва поглощена тьмой</div>

              <div style={{ marginTop: 30, marginBottom: 30, background: "rgba(255,0,0,0.05)", border: "1px solid rgba(255,0,0,0.2)", borderRadius: 16, padding: "20px 40px" }}>
                <div style={{ fontSize: 36, color: "#FFD700", fontWeight: 700 }}>⭐ {score}</div>
                <div style={{ color: "#888", fontSize: 12, marginTop: 4 }}>ОЧКОВ</div>
                <div style={{ display: "flex", gap: 30, marginTop: 16, justifyContent: "center" }}>
                  <div><div style={{ fontSize: 22, color: "#FF6666" }}>☠️ {kills}</div><div style={{ fontSize: 11, color: "#666" }}>Убито</div></div>
                  <div><div style={{ fontSize: 22, color: "#FF8800" }}>🌊 {wave}</div><div style={{ fontSize: 11, color: "#666" }}>Волна</div></div>
                </div>
              </div>

              <button
                onClick={startGame}
                style={{ background: "linear-gradient(135deg, #8B0000, #CC0000)", border: "2px solid #FF4444", borderRadius: 16, padding: "14px 40px", color: "#FFFFFF", fontSize: 20, fontFamily: "Oswald", letterSpacing: 3, cursor: "pointer", width: "100%" }}
              >
                🔄 СНОВА
              </button>
            </div>
          </div>
        )}

        {/* SHOP */}
        {phase === "shop" && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.95)", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "20px 16px 10px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#FFFFFF", letterSpacing: 2 }}>🛒 МАГАЗИН</div>
                <div style={{ fontSize: 16, color: "#FFD700" }}>🪙 {coins}</div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                {(["weapons", "upgrades"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => { stateRef.current.shopTab = tab; syncUI(); }}
                    style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "Oswald", fontSize: 13, letterSpacing: 1, background: shopTab === tab ? "rgba(255,100,0,0.8)" : "rgba(255,255,255,0.08)", color: shopTab === tab ? "#FFFFFF" : "#888" }}
                  >
                    {tab === "weapons" ? "⚔️ ОРУЖИЕ" : "⬆️ АПГРЕЙДЫ"}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
              {shopTab === "weapons" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {WEAPONS.map((w, idx) => {
                    const unlocked = unlockedWeapons.includes(idx);
                    const selected = currentWeapon === idx;
                    const canBuy = coins >= w.upgradeCost && !unlocked;
                    return (
                      <div
                        key={w.id}
                        onClick={() => unlocked ? selectWeapon(idx) : (canBuy ? buyWeapon(idx) : null)}
                        style={{ background: selected ? "rgba(0,200,100,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${selected ? "#00FF88" : unlocked ? "rgba(255,255,255,0.15)" : "rgba(255,100,0,0.3)"}`, borderRadius: 14, padding: "14px 16px", cursor: unlocked || canBuy ? "pointer" : "default", opacity: !unlocked && !canBuy ? 0.5 : 1 }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: 20 }}>{w.emoji} <span style={{ fontSize: 16, color: "#FFFFFF", fontWeight: 600 }}>{w.name}</span></div>
                            <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
                              Урон: {w.damage} • Скорость: {w.fireRate}мс • Патроны: {w.maxAmmo}
                            </div>
                            {w.pellets > 1 && <div style={{ fontSize: 11, color: "#FF8800" }}>Дробь: {w.pellets} снарядов</div>}
                          </div>
                          <div style={{ textAlign: "right" }}>
                            {unlocked ? (
                              <div style={{ fontSize: 12, color: selected ? "#00FF88" : "#888", fontWeight: 600 }}>
                                {selected ? "✓ ВЫБРАНО" : "ВЫБРАТЬ"}
                              </div>
                            ) : (
                              <div style={{ fontSize: 14, color: canBuy ? "#FFD700" : "#666" }}>🪙 {w.upgradeCost}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {(["damage", "fireRate", "ammo"] as const).map(type => {
                    const costs = [100, 200, 350, 500];
                    const level = upgrades[type];
                    const maxLevel = 3;
                    const cost = level < maxLevel ? costs[level] : 0;
                    const canBuy = coins >= cost && level < maxLevel;
                    return (
                      <div key={type} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "14px 16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <div>
                            <div style={{ fontSize: 16, color: "#FFFFFF" }}>{upgradeIcons[type]} {upgradeLabels[type]}</div>
                            <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                              {type === "damage" ? "+20% урона за уровень" : type === "fireRate" ? "-20% задержки за уровень" : "+25% патронов за уровень"}
                            </div>
                          </div>
                          {level < maxLevel ? (
                            <button
                              onClick={() => buyUpgrade(type)}
                              disabled={!canBuy}
                              style={{ background: canBuy ? "linear-gradient(135deg, #1a4a1a, #2a7a2a)" : "rgba(255,255,255,0.05)", border: `1px solid ${canBuy ? "#44FF44" : "#333"}`, borderRadius: 10, padding: "8px 14px", color: canBuy ? "#AAFFAA" : "#555", fontSize: 13, fontFamily: "Oswald", cursor: canBuy ? "pointer" : "default" }}
                            >
                              🪙 {cost}
                            </button>
                          ) : (
                            <div style={{ fontSize: 12, color: "#FFD700" }}>МАКС ✓</div>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 4 }}>
                          {Array.from({ length: maxLevel }).map((_, i) => (
                            <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < level ? "#FFD700" : "rgba(255,255,255,0.1)" }} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <button
                onClick={closeShop}
                style={{ width: "100%", background: "linear-gradient(135deg, #8B0000, #CC0000)", border: "2px solid #FF4444", borderRadius: 14, padding: "14px", color: "#FFFFFF", fontSize: 18, fontFamily: "Oswald", letterSpacing: 2, cursor: "pointer" }}
              >
                ⚔️ В БОЙ — ВОЛНА {wave}
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  );
}
