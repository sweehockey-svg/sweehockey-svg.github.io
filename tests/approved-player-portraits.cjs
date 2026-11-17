const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const approved = "https://example.test/web-images/player-portraits/11918.png.webp";
function portrait(src, id = "") {
  return { nodeType: 1, isConnected: true, src, dataset: { sehPortraitId: id },
    matches: () => true, getAttribute() { return this.src; },
    addEventListener(event, callback) { this[event] = callback; } };
}

(async () => {
  const legacy = portrait("web-images/players/11918.png.webp");
  const missing = portrait("players/1DEFAULTBILDID.png", "11918");
  const unapproved = portrait("players/123.png");
  const custom = portrait("https://example.test/other.jpg", "11918");
  const unsafe = portrait("players/99.png");
  const images = [legacy, missing, unapproved, custom, unsafe];
  const root = { nodeType: 1, matches: () => false, querySelectorAll: () => images };
  const location = { hash: "#/sasong/ecl27winter" };
  let mount, observe, calls = 0;
  const window = { location, EHOCKEY_CONFIG: { supabaseUrl: "https://example.test", supabasePublishableKey: "test" },
    addEventListener(_event, callback) { mount = callback; } };
  const fetch = async url => {
    calls++;
    assert.match(url, /sports_gamer_player_id/);
    return { ok: true, json: async () => [
      { sports_gamer_player_id: 11918, image_url: approved },
      { sports_gamer_player_id: 11918, image_url: "https://example.test/older.png" },
      { sports_gamer_player_id: 99, image_url: "javascript:alert(1)" }
    ] };
  };
  vm.runInNewContext(fs.readFileSync(require("node:path").join(__dirname, "../approved-player-portraits.js"), "utf8"), {
    document: { body: root, readyState: "complete" }, window, fetch, URLSearchParams, queueMicrotask,
    MutationObserver: class { constructor(callback) { observe = callback; } observe() {} disconnect() {} }
  });
  const settle = () => new Promise(resolve => setImmediate(resolve));
  await settle();
  assert.equal(legacy.src, approved);
  assert.equal(missing.src, approved);
  assert.equal(unapproved.src, "players/123.png");
  assert.equal(custom.src, "https://example.test/other.jpg");
  assert.equal(unsafe.src, "players/99.png");
  const added = portrait("players/11918.png");
  observe([{ type: "childList", addedNodes: [added] }]);
  await settle();
  assert.equal(added.src, approved);
  assert.equal(calls, 1);
  legacy.error();
  await settle();
  assert.equal(legacy.src, "web-images/players/11918.png.webp");
  assert.equal(window.SEH_approvedPlayerPortraitUrl(11918), "");
  location.hash = "#/admin";
  mount();
  assert.equal(window.SEH_approvedPlayerPortraitUrl(11918), "");
  console.log("Approved portraits: priority, dynamic cards, fallbacks and admin exclusion verified.");
})().catch(error => { console.error(error); process.exitCode = 1; });
