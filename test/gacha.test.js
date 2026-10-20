const assert = require("node:assert");
const G = require("../src/gacha.js");

// Always-fail RNG: only pity can grant anything.
G.rng = () => 0.999;
G.reset();
G.state.payslips = 1e6;
const res = G.pull(80);
const fives = res.map((r, i) => (r.r === 5 ? i + 1 : 0)).filter(Boolean);
assert.deepStrictEqual(fives, [80], "hard pity fires exactly at pull 80");
const fours = res.filter((r) => r.r === 4).length;
assert.strictEqual(fours, 7, "4★ guaranteed every 10th pull until the 5★ reset (pulls 10..70)");
assert.strictEqual(G.state.pity5, 0);
assert.strictEqual(G.state.guaranteed, true, "lost the 50/50 (rng 0.999 >= 0.5)");
assert.ok(!res[79].featured, "a lost 50/50 gives a standard 5★");

// Guarantee converts: next 5★ must be featured.
const next = G.pull(80)[79];
assert.strictEqual(next.featured, true);
assert.strictEqual(G.state.guaranteed, false);
assert.strictEqual(G.state.owned.cfo, 1);

// Wallet: can't pull without funds; 3★ refunds.
G.reset();
G.state.payslips = 159;
assert.strictEqual(G.pull(1), null);
G.state.payslips = 160;
assert.strictEqual(G.pull(1)[0].r, 3);
assert.strictEqual(G.state.payslips, 20);

// Selection only works for owned characters; dupes cap at S6.
G.select("cfo");
assert.strictEqual(G.selected().id, "clerk");
G.state.owned.cfo = 9; G.select("cfo");
assert.strictEqual(G.selected().dupes, 6);
console.log("gacha ok");
