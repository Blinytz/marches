// Spike de connectivité Marchés · Phase 0 (section 12.0 du handoff)
// Lecture seule, aucun VPN/proxy, aucune mutation. Node >= 22 (fetch + WebSocket natifs).
// Sortie : JSON sur stdout.

const results = { startedAt: new Date().toISOString(), region: "France (réseau résidentiel utilisateur)", tests: [] };

async function timedFetch(name, url, opts = {}) {
  const t0 = Date.now();
  const entry = { name, url, ok: false };
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    clearTimeout(to);
    entry.status = res.status;
    entry.latencyMs = Date.now() - t0;
    const text = await res.text();
    entry.bytes = text.length;
    try {
      const json = JSON.parse(text);
      entry.sample = summarize(json);
      entry.json = json;
    } catch { entry.sample = text.slice(0, 200); }
    entry.ok = res.ok;
  } catch (e) {
    entry.error = String(e && e.cause ? e.cause : e);
    entry.latencyMs = Date.now() - t0;
  }
  results.tests.push({ ...entry, json: undefined });
  return entry;
}

function summarize(json) {
  if (Array.isArray(json)) return { type: "array", length: json.length, firstKeys: json[0] ? Object.keys(json[0]).slice(0, 12) : [] };
  if (json && typeof json === "object") return { type: "object", keys: Object.keys(json).slice(0, 15) };
  return { type: typeof json, value: json };
}

function testWebSocket(name, url, onOpenSend, matchFn, timeoutMs = 20000) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const entry = { name, url, ok: false, messages: [] };
    let ws;
    const done = (why) => {
      entry.closeReason = why;
      entry.totalMs = Date.now() - t0;
      try { ws && ws.close(); } catch {}
      results.tests.push(entry);
      resolve(entry);
    };
    const timer = setTimeout(() => done("timeout"), timeoutMs);
    try {
      ws = new WebSocket(url);
    } catch (e) {
      clearTimeout(timer);
      entry.error = String(e);
      return done("constructor-error");
    }
    ws.onopen = () => {
      entry.openedMs = Date.now() - t0;
      if (onOpenSend) ws.send(JSON.stringify(onOpenSend));
    };
    ws.onmessage = (ev) => {
      const raw = typeof ev.data === "string" ? ev.data : "<binaire>";
      if (entry.messages.length < 3) entry.messages.push(raw.slice(0, 300));
      entry.messageCount = (entry.messageCount || 0) + 1;
      if (!matchFn || matchFn(raw)) {
        entry.ok = true;
        entry.firstUsefulMs = Date.now() - t0;
        clearTimeout(timer);
        done("match");
      }
    };
    ws.onerror = (e) => { entry.error = String(e && e.message || "erreur ws"); };
    ws.onclose = (e) => {
      if (!entry.ok) {
        entry.closeCode = e.code;
        clearTimeout(timer);
        done("closed");
      }
    };
  });
}

// ---------- MANIFOLD ----------
const mfList = await timedFetch("manifold.markets.list", "https://api.manifold.markets/v0/markets?limit=5");
let mfId = null, mfSlugMarket = null;
if (mfList.ok && Array.isArray(mfList.json) && mfList.json.length) {
  mfId = mfList.json[0].id;
  await timedFetch("manifold.market.detail", `https://api.manifold.markets/v0/market/${mfId}`);
}
await timedFetch("manifold.search", "https://api.manifold.markets/v0/search-markets?term=france&limit=3");
await testWebSocket(
  "manifold.websocket",
  "wss://api.manifold.markets/ws",
  { type: "subscribe", txid: 1, topics: ["global/updated-contract", "global/new-contract"] },
  (raw) => raw.includes("ack") || raw.includes("broadcast")
);

// ---------- POLYMARKET ----------
const gmEvents = await timedFetch("polymarket.gamma.events", "https://gamma-api.polymarket.com/events?limit=3&active=true&closed=false&order=volume24hr&ascending=false");
let tokenId = null, conditionId = null, eventId = null, marketId = null;
if (gmEvents.ok && Array.isArray(gmEvents.json)) {
  for (const ev of gmEvents.json) {
    for (const m of ev.markets || []) {
      if (m.clobTokenIds) {
        try {
          const toks = JSON.parse(m.clobTokenIds);
          if (toks && toks.length) { tokenId = toks[0]; conditionId = m.conditionId; eventId = ev.id; marketId = m.id; break; }
        } catch {}
      }
    }
    if (tokenId) break;
  }
}
results.polymarketSampleIds = { eventId, marketId, conditionId, tokenIdPrefix: tokenId ? String(tokenId).slice(0, 12) + "…" : null };
if (eventId) await timedFetch("polymarket.gamma.event.detail", `https://gamma-api.polymarket.com/events/${eventId}`);
if (marketId) await timedFetch("polymarket.gamma.market.detail", `https://gamma-api.polymarket.com/markets/${marketId}`);
if (tokenId) {
  await timedFetch("polymarket.clob.midpoint", `https://clob.polymarket.com/midpoint?token_id=${tokenId}`);
  await timedFetch("polymarket.clob.price.buy", `https://clob.polymarket.com/price?token_id=${tokenId}&side=buy`);
  await timedFetch("polymarket.clob.book", `https://clob.polymarket.com/book?token_id=${tokenId}`);
  await timedFetch("polymarket.clob.history", `https://clob.polymarket.com/prices-history?market=${tokenId}&interval=1d&fidelity=60`);
  await testWebSocket(
    "polymarket.websocket.market",
    "wss://ws-subscriptions-clob.polymarket.com/ws/market",
    { assets_ids: [tokenId], type: "market" },
    (raw) => raw.includes("book") || raw.includes("price_change") || raw.includes("last_trade_price")
  );
}
await timedFetch("polymarket.data.trades", "https://data-api.polymarket.com/trades?limit=2");

results.finishedAt = new Date().toISOString();
console.log(JSON.stringify(results, null, 2));
