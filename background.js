let pending;
let retryAfter = 0;

async function loadRates() {
  const { quote } = await chrome.storage.local.get("quote");
  if (quote?.expires > Date.now()) return quote;
  if (Date.now() < retryAfter) return quote || null;
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", { signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const data = await response.json();
    if (data.result !== "success" || data.base_code !== "USD" || data.rates?.USD !== 1 ||
        !Number.isFinite(data.time_next_update_unix) || !Number.isFinite(data.time_last_update_unix)) throw new Error("Invalid quote");
    const fresh = { rates: data.rates, date: data.time_last_update_unix * 1000, expires: data.time_next_update_unix * 1000 };
    await chrome.storage.local.set({ quote: fresh });
    return fresh;
  } catch {
    retryAfter = Date.now() + 20 * 60000;
    return quote || null;
  }
}

chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (message !== "rates") return;
  pending ??= loadRates().finally(() => { pending = null; });
  pending.then(reply, () => reply(null));
  return true;
});
