/* =========================================================================
   GACHA — banner, pity, roster, wallet. Pure logic + a thin DOM layer.
   Loaded before game.js; also importable from node for tests.
   ========================================================================= */
(function (root) {
  "use strict";

  const PULL_COST = 160;
  const SAVE_KEY = "ledger-gacha";

  // stats merge onto defaultPlayer(); weapons merge onto player.weapons
  const CHARS = [
    { id: "clerk",   r: 0, icon: "🧑‍💼", color: "#4dd0ff", name: "Clerk",         desc: "Baseline. Free forever.",            stats: {}, weapons: {} },
    { id: "cfo",     r: 5, icon: "💼", color: "#ffcf4d", name: "The CFO",       desc: "Starts with Audit Pulse. +35% dmg",  stats: { dmgMult: 1.35, hp: 90, maxHp: 90 }, weapons: { audit: 1 }, featured: true },
    { id: "auditor", r: 5, icon: "🕵️", color: "#c46bff", name: "Night Auditor", desc: "Fast, rapid-fire stapler Lv2",       stats: { speed: 3.3, fireRateMult: 0.8, hp: 80, maxHp: 80 }, weapons: { stapler: 2 } },
    { id: "hr",      r: 5, icon: "🧑‍⚖️", color: "#7fd17f", name: "Head of HR",    desc: "160 HP, regen, Orbit Coins Lv2",     stats: { hp: 160, maxHp: 160, regen: 0.05 }, weapons: { coin: 2 } },
    { id: "intern",  r: 4, icon: "☕", color: "#f0a56b", name: "Intern",        desc: "Caffeinated: +15% speed & fire rate", stats: { speed: 3.0, fireRateMult: 0.85 }, weapons: {} },
    { id: "acct",    r: 4, icon: "🧮", color: "#ff7b54", name: "Accountant",    desc: "+20% damage",                        stats: { dmgMult: 1.2 }, weapons: {} },
    { id: "janitor", r: 4, icon: "🧹", color: "#9aa6c4", name: "Janitor",       desc: "120 HP, starts with Orbit Coins",   stats: { hp: 120, maxHp: 120 }, weapons: { coin: 1 } },
    { id: "barista", r: 4, icon: "🥤", color: "#f7b2d9", name: "Barista",       desc: "Regen + wide coin magnet",           stats: { regen: 0.03, pickupRange: 90 }, weapons: {} },
  ];
  // 3★ filler: refunds a few payslips, like weapon fodder
  const ITEMS = [
    { id: "clip", r: 3, icon: "📎", name: "Paperclip" },
    { id: "note", r: 3, icon: "🗒️", name: "Sticky Note" },
    { id: "stamp", r: 3, icon: "📮", name: "Stamp" },
  ];
  const REFUND3 = 20;
  const byId = Object.fromEntries([...CHARS, ...ITEMS].map((c) => [c.id, c]));

  const fresh = () => ({ payslips: 1600, pity5: 0, pity4: 0, guaranteed: false, owned: { clerk: 1 }, selected: "clerk" });
  let s = fresh();
  try { Object.assign(s, JSON.parse(root.localStorage?.getItem(SAVE_KEY) || "{}")); } catch (_) {}
  const save = () => { try { root.localStorage?.setItem(SAVE_KEY, JSON.stringify(s)); } catch (_) {} };

  const Gacha = { CHARS, ITEMS, PULL_COST, state: s, rng: Math.random };

  // Wuthering-style: 0.8% base, soft pity ramps from 66, hard pity 80,
  // 4★-or-better every 10, 50/50 on the featured 5★ with loss guarantee.
  Gacha.roll = function () {
    s.pity5++; s.pity4++;
    const p5 = 0.008 + Math.max(0, s.pity5 - 65) * 0.06;
    let pool;
    if (s.pity5 >= 80 || Gacha.rng() < p5) {
      s.pity5 = 0; s.pity4 = 0;
      const featured = s.guaranteed || Gacha.rng() < 0.5;
      s.guaranteed = !featured;
      pool = CHARS.filter((c) => c.r === 5 && !!c.featured === featured);
    } else if (s.pity4 >= 10 || Gacha.rng() < 0.06) {
      s.pity4 = 0;
      pool = CHARS.filter((c) => c.r === 4);
    } else pool = ITEMS;
    const got = pool[Math.min(pool.length - 1, (Gacha.rng() * pool.length) | 0)];
    let isNew = false;
    if (got.r >= 4) { isNew = !s.owned[got.id]; s.owned[got.id] = (s.owned[got.id] || 0) + 1; }
    else s.payslips += REFUND3;
    return { ...got, isNew };
  };

  Gacha.pull = function (n) {
    if (s.payslips < PULL_COST * n) return null;
    s.payslips -= PULL_COST * n;
    const out = Array.from({ length: n }, Gacha.roll);
    save();
    return out;
  };

  Gacha.earn = function (n) { s.payslips += n; save(); return n; };
  Gacha.select = function (id) { if (s.owned[id]) { s.selected = id; save(); } };
  Gacha.selected = function () { const c = byId[s.selected] || CHARS[0]; return { ...c, dupes: Math.min(6, (s.owned[c.id] || 1) - 1) }; };
  Gacha.reset = function () { s = Object.assign(s, fresh()); save(); };

  // ---- DOM (browser only) -------------------------------------------------
  if (typeof document !== "undefined") {
    const $ = (id) => document.getElementById(id);
    const stars = (r) => "★".repeat(r);
    const card = (c, extra) => `<div class="card r${c.r}"><div class="icon">${c.icon}</div><div class="name">${c.name}</div><div class="desc">${extra}</div></div>`;

    Gacha.refresh = function () {
      for (const el of document.querySelectorAll(".payslips")) el.textContent = s.payslips;
      $("pity").textContent = `5★ pity ${s.pity5}/80 · 4★ pity ${s.pity4}/10 · ${s.guaranteed ? "next 5★ is guaranteed featured" : "50/50 on next 5★"}`;
      const roster = $("roster");
      roster.innerHTML = "";
      for (const c of CHARS) {
        const owned = s.owned[c.id];
        const el = document.createElement("div");
        el.innerHTML = card(c, owned ? (c.r ? `${stars(c.r)} S${Math.min(6, owned - 1)}` : "default") : "not owned");
        const node = el.firstChild;
        node.classList.toggle("locked", !owned);
        node.classList.toggle("selected", s.selected === c.id);
        node.title = c.desc;
        node.onclick = () => { Gacha.select(c.id); Gacha.refresh(); };
        roster.appendChild(node);
      }
    };

    const doPull = (n) => {
      const res = Gacha.pull(n);
      const box = $("pulls");
      if (!res) { box.innerHTML = `<p class="sub">Not enough payslips. Survive a shift to earn more.</p>`; return; }
      box.innerHTML = res.map((g) => card(g, g.r >= 4 ? (g.isNew ? "NEW!" : "dupe → +1 Sequence") : `+${REFUND3} 💸`)).join("");
      Gacha.refresh();
    };
    $("pull1").onclick = () => doPull(1);
    $("pull10").onclick = () => doPull(10);
    $("summonBtn").onclick = () => { $("title").classList.add("hidden"); $("summon").classList.remove("hidden"); $("pulls").innerHTML = ""; };
    $("summonBack").onclick = () => { $("summon").classList.add("hidden"); $("title").classList.remove("hidden"); };
    Gacha.refresh();
  }

  root.Gacha = Gacha;
  if (typeof module !== "undefined") module.exports = Gacha;
})(typeof window !== "undefined" ? window : globalThis);
