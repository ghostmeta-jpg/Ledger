/* =========================================================================
   LEDGER SURVIVORS
   A compact Vampire-Survivors-style roguelite. Pure canvas, no dependencies.
   ========================================================================= */
(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  // ---- DOM ----------------------------------------------------------------
  const titleEl = document.getElementById("title");
  const levelupEl = document.getElementById("levelup");
  const gameoverEl = document.getElementById("gameover");
  const choicesEl = document.getElementById("choices");
  const finalStatsEl = document.getElementById("finalStats");
  document.getElementById("startBtn").onclick = startGame;
  document.getElementById("retryBtn").onclick = startGame;

  // ---- Input --------------------------------------------------------------
  const keys = {};
  const down = (e) => {
    const k = e.key.toLowerCase();
    keys[k] = true;
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
  };
  const up = (e) => { keys[e.key.toLowerCase()] = false; };
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);

  // ---- Helpers ------------------------------------------------------------
  const rand = (a, b) => a + Math.random() * (b - a);
  const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;

  // ---- Game State ---------------------------------------------------------
  let state = "title"; // title | playing | levelup | dead
  let player, enemies, bullets, gems, particles, orbs;
  let time, spawnTimer, killCount, difficulty, screenShake, frozen;

  function defaultPlayer() {
    return {
      x: W / 2, y: H / 2, r: 12,
      speed: 2.6, hp: 100, maxHp: 100,
      level: 1, xp: 0, xpToNext: 5,
      pickupRange: 60, regen: 0,
      iframe: 0,
      // weapon levels (0 = not owned)
      weapons: {
        stapler: 1,   // homing projectiles
        coin: 0,      // orbiting coins
        audit: 0,     // periodic AoE shockwave
      },
      // multipliers / mods
      dmgMult: 1, fireRateMult: 1, projectiles: 1,
      cooldowns: { stapler: 0, audit: 0 },
      orbAngle: 0,
    };
  }

  // ---- Upgrade pool -------------------------------------------------------
  const UPGRADES = [
    { id: "stapler+", icon: "📎", name: "Stapler", desc: "+1 projectile, more damage",
      get: (p) => `Lv ${p.weapons.stapler}`, can: (p) => p.weapons.stapler < 8,
      apply: (p) => { p.weapons.stapler++; if (p.weapons.stapler % 2 === 0) p.projectiles++; } },
    { id: "coin", icon: "🪙", name: "Orbit Coins", desc: "Coins orbit you, shredding bills",
      get: (p) => p.weapons.coin ? `Lv ${p.weapons.coin}` : "NEW", can: (p) => p.weapons.coin < 8,
      apply: (p) => { p.weapons.coin++; } },
    { id: "audit", icon: "💥", name: "Audit Pulse", desc: "Periodic shockwave damages all nearby",
      get: (p) => p.weapons.audit ? `Lv ${p.weapons.audit}` : "NEW", can: (p) => p.weapons.audit < 8,
      apply: (p) => { p.weapons.audit++; } },
    { id: "dmg", icon: "⚔️", name: "Red Ink", desc: "+20% damage to everything",
      get: () => "", can: () => true,
      apply: (p) => { p.dmgMult += 0.2; } },
    { id: "rate", icon: "⚡", name: "Caffeine", desc: "+18% attack speed",
      get: () => "", can: (p) => p.fireRateMult > 0.45,
      apply: (p) => { p.fireRateMult *= 0.82; } },
    { id: "speed", icon: "👟", name: "Running Shoes", desc: "+12% move speed",
      get: () => "", can: () => true,
      apply: (p) => { p.speed *= 1.12; } },
    { id: "hp", icon: "❤️", name: "Health Plan", desc: "+25 max HP and full heal",
      get: () => "", can: () => true,
      apply: (p) => { p.maxHp += 25; p.hp = p.maxHp; } },
    { id: "magnet", icon: "🧲", name: "Coin Magnet", desc: "+50% coin pickup range",
      get: () => "", can: () => true,
      apply: (p) => { p.pickupRange *= 1.5; } },
    { id: "regen", icon: "🌿", name: "Pension", desc: "Slowly regenerate health",
      get: () => "", can: () => true,
      apply: (p) => { p.regen += 0.04; } },
  ];

  // ---- Lifecycle ----------------------------------------------------------
  function startGame() {
    player = defaultPlayer();
    enemies = []; bullets = []; gems = []; particles = []; orbs = [];
    time = 0; spawnTimer = 0; killCount = 0; difficulty = 1;
    screenShake = 0; frozen = false;
    titleEl.classList.add("hidden");
    gameoverEl.classList.add("hidden");
    levelupEl.classList.add("hidden");
    state = "playing";
  }

  function gameOver() {
    state = "dead";
    finalStatsEl.innerHTML =
      `Survived <b>${fmtTime(time)}</b> &nbsp;·&nbsp; Level <b>${player.level}</b> ` +
      `&nbsp;·&nbsp; <b>${killCount}</b> bills shredded`;
    gameoverEl.classList.remove("hidden");
  }

  // ---- Spawning -----------------------------------------------------------
  const ENEMY_TYPES = [
    { id: "bill",    color: "#7fd17f", r: 11, hp: 10, speed: 1.05, dmg: 8,  xp: 1, char: "$" },
    { id: "invoice", color: "#f0c14b", r: 14, hp: 26, speed: 0.9,  dmg: 12, xp: 2, char: "🧾" },
    { id: "tax",     color: "#ff7b54", r: 18, hp: 60, speed: 0.7,  dmg: 18, xp: 4, char: "%" },
    { id: "audit",   color: "#c46bff", r: 13, hp: 18, speed: 1.6,  dmg: 14, xp: 3, char: "!" },
  ];

  function spawnEnemy() {
    // pick type weighted by elapsed time
    let pool = [ENEMY_TYPES[0]];
    if (time > 25) pool.push(ENEMY_TYPES[1]);
    if (time > 55) pool.push(ENEMY_TYPES[3]);
    if (time > 80) pool.push(ENEMY_TYPES[2]);
    const t = pool[(Math.random() * pool.length) | 0];

    // spawn just off a random edge
    const edge = (Math.random() * 4) | 0;
    let x, y;
    if (edge === 0) { x = rand(0, W); y = -20; }
    else if (edge === 1) { x = W + 20; y = rand(0, H); }
    else if (edge === 2) { x = rand(0, W); y = H + 20; }
    else { x = -20; y = rand(0, H); }

    const scale = 1 + time / 110; // enemies get tankier over time
    enemies.push({
      x, y, r: t.r, color: t.color, char: t.char,
      hp: t.hp * scale, maxHp: t.hp * scale,
      speed: t.speed * (1 + time / 600),
      dmg: t.dmg, xp: t.xp, hitFlash: 0,
    });
  }

  // ---- Combat -------------------------------------------------------------
  function nearestEnemy(x, y) {
    let best = null, bd = Infinity;
    for (const e of enemies) {
      const d = dist2(x, y, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  function fireStapler() {
    const lvl = player.weapons.stapler;
    if (!lvl) return;
    const count = player.projectiles;
    const target = nearestEnemy(player.x, player.y);
    if (!target) return;
    const baseAng = Math.atan2(target.y - player.y, target.x - player.x);
    const spread = 0.18;
    for (let i = 0; i < count; i++) {
      const off = (i - (count - 1) / 2) * spread;
      const ang = baseAng + off;
      bullets.push({
        x: player.x, y: player.y,
        vx: Math.cos(ang) * 6.5, vy: Math.sin(ang) * 6.5,
        r: 5, dmg: (6 + lvl * 2) * player.dmgMult,
        pierce: 1 + Math.floor(lvl / 3), life: 90, hit: new Set(),
      });
    }
  }

  function auditPulse() {
    const lvl = player.weapons.audit;
    if (!lvl) return;
    const radius = 90 + lvl * 22;
    const dmg = (14 + lvl * 8) * player.dmgMult;
    for (const e of enemies) {
      if (dist2(player.x, player.y, e.x, e.y) < radius * radius) {
        damageEnemy(e, dmg);
        const a = Math.atan2(e.y - player.y, e.x - player.x);
        e.x += Math.cos(a) * 14; e.y += Math.sin(a) * 14; // knockback
      }
    }
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * TAU;
      particles.push({ x: player.x, y: player.y, vx: Math.cos(a) * 4, vy: Math.sin(a) * 4,
        r: 3, life: 24, color: "#4dd0ff" });
    }
    screenShake = 6;
  }

  function damageEnemy(e, dmg) {
    e.hp -= dmg;
    e.hitFlash = 4;
    if (e.hp <= 0) killEnemy(e);
  }

  function killEnemy(e) {
    e.dead = true;
    killCount++;
    gems.push({ x: e.x, y: e.y, xp: e.xp, r: 4, vx: 0, vy: 0 });
    for (let i = 0; i < 6; i++) {
      const a = rand(0, TAU);
      particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * rand(1, 3), vy: Math.sin(a) * rand(1, 3),
        r: rand(2, 4), life: rand(14, 26), color: e.color });
    }
  }

  // ---- Level up -----------------------------------------------------------
  function gainXp(n) {
    player.xp += n;
    while (player.xp >= player.xpToNext) {
      player.xp -= player.xpToNext;
      player.level++;
      player.xpToNext = Math.round(player.xpToNext * 1.32 + 2);
      openLevelUp();
    }
  }

  function openLevelUp() {
    state = "levelup";
    const pool = UPGRADES.filter((u) => u.can(player));
    // shuffle, take 3
    for (let i = pool.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0; [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const picks = pool.slice(0, 3);
    choicesEl.innerHTML = "";
    for (const u of picks) {
      const card = document.createElement("div");
      card.className = "card";
      const tag = u.get(player);
      card.innerHTML =
        `<div class="icon">${u.icon}</div>` +
        `<div class="name">${u.name}</div>` +
        `<div class="desc">${u.desc}</div>` +
        (tag ? `<div class="lvl">${tag}</div>` : "");
      card.onclick = () => {
        u.apply(player);
        levelupEl.classList.add("hidden");
        state = "playing";
      };
      choicesEl.appendChild(card);
    }
    levelupEl.classList.remove("hidden");
  }

  // ---- Update -------------------------------------------------------------
  function update() {
    time += 1 / 60;
    difficulty = 1 + time / 30;

    // spawn rate ramps up
    spawnTimer -= 1;
    const interval = Math.max(8, 48 - time * 0.35);
    if (spawnTimer <= 0) {
      const burst = 1 + Math.floor(time / 45);
      for (let i = 0; i < burst; i++) spawnEnemy();
      spawnTimer = interval;
    }

    // --- player movement ---
    let mx = 0, my = 0;
    if (keys["w"] || keys["arrowup"]) my -= 1;
    if (keys["s"] || keys["arrowdown"]) my += 1;
    if (keys["a"] || keys["arrowleft"]) mx -= 1;
    if (keys["d"] || keys["arrowright"]) mx += 1;
    if (mx || my) {
      const len = Math.hypot(mx, my);
      player.x = clamp(player.x + (mx / len) * player.speed, player.r, W - player.r);
      player.y = clamp(player.y + (my / len) * player.speed, player.r, H - player.r);
    }
    if (player.regen) player.hp = Math.min(player.maxHp, player.hp + player.regen);
    if (player.iframe > 0) player.iframe--;

    // --- weapon cooldowns ---
    player.cooldowns.stapler -= 1;
    if (player.cooldowns.stapler <= 0) {
      fireStapler();
      player.cooldowns.stapler = Math.max(8, 34 * player.fireRateMult);
    }
    if (player.weapons.audit) {
      player.cooldowns.audit -= 1;
      if (player.cooldowns.audit <= 0) {
        auditPulse();
        player.cooldowns.audit = Math.max(60, 180 - player.weapons.audit * 12);
      }
    }

    // --- orbiting coins ---
    orbs.length = 0;
    if (player.weapons.coin) {
      player.orbAngle += 0.05;
      const n = player.weapons.coin + 1;
      const radius = 52;
      for (let i = 0; i < n; i++) {
        const a = player.orbAngle + (i / n) * TAU;
        orbs.push({ x: player.x + Math.cos(a) * radius, y: player.y + Math.sin(a) * radius, r: 9 });
      }
    }

    // --- bullets ---
    for (const b of bullets) {
      b.x += b.vx; b.y += b.vy; b.life--;
      for (const e of enemies) {
        if (e.dead || b.hit.has(e)) continue;
        const rr = b.r + e.r;
        if (dist2(b.x, b.y, e.x, e.y) < rr * rr) {
          damageEnemy(e, b.dmg);
          b.hit.add(e);
          b.pierce--;
          if (b.pierce <= 0) { b.life = 0; break; }
        }
      }
      if (b.x < -30 || b.x > W + 30 || b.y < -30 || b.y > H + 30) b.life = 0;
    }
    bullets = bullets.filter((b) => b.life > 0);

    // --- enemies ---
    for (const e of enemies) {
      if (e.dead) continue;
      if (e.hitFlash > 0) e.hitFlash--;
      const a = Math.atan2(player.y - e.y, player.x - e.x);
      e.x += Math.cos(a) * e.speed;
      e.y += Math.sin(a) * e.speed;

      // orbiting coins damage
      for (const o of orbs) {
        const rr = o.r + e.r;
        if (dist2(o.x, o.y, e.x, e.y) < rr * rr) {
          damageEnemy(e, (2 + player.weapons.coin * 0.8) * player.dmgMult);
        }
      }

      // touch player
      const rr = e.r + player.r;
      if (!e.dead && dist2(e.x, e.y, player.x, player.y) < rr * rr && player.iframe <= 0) {
        player.hp -= e.dmg;
        player.iframe = 30;
        screenShake = 5;
        if (player.hp <= 0) { player.hp = 0; gameOver(); return; }
      }
    }
    // separate overlapping enemies a touch (anti-stacking)
    enemies = enemies.filter((e) => !e.dead);

    // --- gems ---
    const pr2 = player.pickupRange * player.pickupRange;
    for (const g of gems) {
      const d = dist2(g.x, g.y, player.x, player.y);
      if (d < pr2) {
        const a = Math.atan2(player.y - g.y, player.x - g.x);
        const pull = clamp(8 - Math.sqrt(d) / 12, 1.5, 8);
        g.x += Math.cos(a) * pull; g.y += Math.sin(a) * pull;
      }
      if (d < (player.r + 8) ** 2) { g.got = true; gainXp(g.xp); }
    }
    gems = gems.filter((g) => !g.got);

    // --- particles ---
    for (const p of particles) { p.x += p.vx; p.y += p.vy; p.vx *= 0.92; p.vy *= 0.92; p.life--; }
    particles = particles.filter((p) => p.life > 0);

    if (screenShake > 0) screenShake *= 0.85;
  }

  // ---- Render -------------------------------------------------------------
  function drawGrid() {
    ctx.strokeStyle = "rgba(60, 72, 110, 0.18)";
    ctx.lineWidth = 1;
    const s = 40;
    ctx.beginPath();
    for (let x = 0; x <= W; x += s) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = 0; y <= H; y += s) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
  }

  function render() {
    ctx.save();
    if (screenShake > 0.4) ctx.translate(rand(-screenShake, screenShake), rand(-screenShake, screenShake));

    ctx.clearRect(-20, -20, W + 40, H + 40);
    ctx.fillStyle = "#0c0f1a";
    ctx.fillRect(-20, -20, W + 40, H + 40);
    drawGrid();

    // gems
    for (const g of gems) {
      ctx.fillStyle = "#ffd24d";
      ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, TAU); ctx.fill();
      ctx.fillStyle = "rgba(255,210,77,0.25)";
      ctx.beginPath(); ctx.arc(g.x, g.y, g.r + 3, 0, TAU); ctx.fill();
    }

    // particles
    for (const p of particles) {
      ctx.globalAlpha = clamp(p.life / 24, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // enemies
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const e of enemies) {
      ctx.fillStyle = e.hitFlash > 0 ? "#ffffff" : e.color;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, TAU); ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.font = `${e.r}px sans-serif`;
      ctx.fillText(e.char, e.x, e.y + 1);
      // hp bar
      if (e.hp < e.maxHp) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(e.x - e.r, e.y - e.r - 6, e.r * 2, 3);
        ctx.fillStyle = "#ff5d6c";
        ctx.fillRect(e.x - e.r, e.y - e.r - 6, e.r * 2 * (e.hp / e.maxHp), 3);
      }
    }

    // bullets
    ctx.fillStyle = "#9fe8ff";
    for (const b of bullets) { ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill(); }

    // orbiting coins
    for (const o of orbs) {
      ctx.fillStyle = "#ffcf4d";
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, TAU); ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.font = "11px sans-serif";
      ctx.fillText("$", o.x, o.y + 1);
    }

    // player
    if (!(player.iframe > 0 && (player.iframe >> 2) & 1)) {
      ctx.fillStyle = "#4dd0ff";
      ctx.beginPath(); ctx.arc(player.x, player.y, player.r, 0, TAU); ctx.fill();
      ctx.fillStyle = "#0c0f1a"; ctx.font = "13px sans-serif";
      ctx.fillText("🧑‍💼", player.x, player.y + 1);
    }

    ctx.restore();
    drawHUD();
  }

  function fmtTime(t) {
    const m = Math.floor(t / 60), s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  function drawHUD() {
    // HP bar
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(14, 14, 220, 16);
    ctx.fillStyle = "#ff5d6c";
    ctx.fillRect(14, 14, 220 * clamp(player.hp / player.maxHp, 0, 1), 16);
    ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.strokeRect(14, 14, 220, 16);
    ctx.fillStyle = "#fff"; ctx.font = "11px sans-serif"; ctx.textAlign = "left";
    ctx.fillText(`${Math.ceil(player.hp)} / ${player.maxHp}`, 20, 22);

    // XP bar
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(14, 34, 220, 8);
    ctx.fillStyle = "#ffd24d";
    ctx.fillRect(14, 34, 220 * clamp(player.xp / player.xpToNext, 0, 1), 8);

    // stats
    ctx.fillStyle = "#e8ecf5"; ctx.font = "bold 13px sans-serif";
    ctx.fillText(`LV ${player.level}`, 244, 26);
    ctx.textAlign = "center"; ctx.font = "bold 20px sans-serif";
    ctx.fillText(fmtTime(time), W / 2, 28);
    ctx.textAlign = "right"; ctx.font = "13px sans-serif";
    ctx.fillText(`💀 ${killCount}`, W - 16, 26);
    ctx.textAlign = "left";
  }

  // ---- Main loop ----------------------------------------------------------
  function loop() {
    if (state === "playing") update();
    if (state === "playing" || state === "levelup" || state === "dead") {
      if (player) render();
    }
    requestAnimationFrame(loop);
  }
  loop();
})();
