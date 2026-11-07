(() => {
  const marker = "data-suiye-fx";
  const skip = "script,style,noscript,template,textarea,input,select,pre,code,svg,math,[hidden],[aria-hidden=true],[contenteditable]:not([contenteditable=false]),[" + marker + "]";
  let settings = Money.defaults;
  let quote, format, revision = 0, timer;
  const dirty = new Set();

  function annotate(anchor, matches) {
    const parts = [];
    for (const { code, value, label } of matches) {
      const rate = quote.rates[code];
      if (code === settings.target || !(rate > 0)) continue;
      const converted = value / rate * quote.rates[settings.target];
      if (Number.isFinite(converted)) parts.push((matches.length > 1 ? label + " " : "") + "≈ " + format.format(converted));
    }
    if (!parts.length) return;
    const badge = document.createElement("span");
    badge.setAttribute(marker, "");
    badge.style.cssText = "display:inline-block!important;margin-inline:0.32em!important;padding:0.03em 0.35em!important;color:#115344!important;background:#e5f4eb!important;border-radius:4px!important;font:500 0.82em/1.45 system-ui!important;vertical-align:baseline!important;";
    badge.textContent = parts.join(" · ");
    badge.title = "参考汇率 · " + new Date(quote.date).toLocaleDateString() + " · ExchangeRate-API";
    anchor.after(badge);
  }

  function scan(root) {
    if (!root.isConnected || root.closest(skip)) return;
    root.querySelectorAll("[" + marker + "]").forEach(el => el.remove());
    if (!settings.enabled || !quote?.rates[settings.target]) return;
    function visit(el) {
      if (el.matches(skip)) return;
      // Combine short, inline-only price fragments emitted by shopping sites.
      if (el.childElementCount && el.childNodes.length <= 6 &&
          [...el.children].every(child => child.matches("span,b,i,strong,small,sup") && !child.childElementCount && !child.matches(skip))) {
        const price = el.textContent.trim();
        if (price.length <= 80) {
          const found = Money.parse(price, settings);
          if (found.length === 1 && found[0].label === price) {
            annotate(el.lastChild, found);
            return;
          }
        }
      }
      for (const child of [...el.childNodes]) {
        if (child.nodeType === 1) visit(child);
        else if (child.nodeType === 3 && /\d/.test(child.data)) annotate(child, Money.parse(child.data, settings));
      }
    }
    visit(root);
  }

  const observer = new MutationObserver(records => {
    for (const record of records) {
      const el = record.target.nodeType === 1 ? record.target : record.target.parentElement;
      if (el && !el.closest(skip)) dirty.add(el.parentElement === document.documentElement ? el : el.parentElement || el);
    }
    if (dirty.size && !timer) timer = setTimeout(flush, 75);
  });
  function flush() {
    clearTimeout(timer);
    timer = null;
    observer.disconnect();
    for (const root of dirty) {
      let ancestor = root.parentElement;
      while (ancestor && !dirty.has(ancestor)) ancestor = ancestor.parentElement;
      if (!ancestor) scan(root);
    }
    dirty.clear();
    if (settings.enabled) observer.observe(document.documentElement, { childList:true, subtree:true, characterData:true });
  }
  function redraw() {
    dirty.clear();
    if (document.body) dirty.add(document.body);
    flush();
  }
  async function configure() {
    const id = ++revision;
    const next = await chrome.storage.local.get(Money.defaults);
    const rates = next.enabled ? await chrome.runtime.sendMessage("rates") : null;
    if (id !== revision) return;
    settings = next;
    quote = rates;
    format = new Intl.NumberFormat("zh-CN", { style:"currency", currency:settings.target, currencyDisplay:"code" });
    redraw();
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (Object.keys(changes).some(key => key in Money.defaults)) configure();
    else if (changes.quote) { quote = changes.quote.newValue; if (format) redraw(); }
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && settings.enabled && (!quote || quote.expires <= Date.now())) configure();
  });
  configure();
})();
